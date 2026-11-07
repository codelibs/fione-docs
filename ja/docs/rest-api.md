---
title: REST API リファレンス
description: Fione の /api/v1 REST API。API トークンで認証し、プロジェクト、データセット、ジョブ、モデル、説明、モジュール、ユーザーを curl の例つきで操作します。
---

# REST API リファレンス

Web アプリでできる操作の大半は、`/api/v1` の JSON REST API からも行えるので、スクリプトから使えます。このページでは、認証の方法、リクエスト・レスポンス・エラーの形、リソースごとのエンドポイント一覧、`curl` の実例を説明します。Python を使う場合は、[Python クライアント](/ja/guide/sdk)が主な呼び出しをラップしています。

例では、Fione が `http://localhost:8080` にあり、API トークンを `<your-token>` と表記します。

## 対話的なスキーマ

稼働中の Fione は自分自身の OpenAPI スキーマを配信しています。実行しているバージョンに対して常に正確です。

| アドレス | 内容 |
|---|---|
| `/api/docs` | 対話的なドキュメント（Swagger UI）。各呼び出しをその場で試せます。 |
| `/api/openapi.json` | OpenAPI スキーマ。クライアントの自動生成に使えます。 |

どちらもトークンは不要です。このページは API の案内で、各リクエストの全フィールドはスキーマで確認できます。

## 認証

スクリプトは、`Authorization` ヘッダーに **API トークン**を付けて認証します。トークンは**アカウント**画面で作成します（[ユーザー・ロール・共有](/ja/guide/users-sharing)を参照）。

```sh
curl -H "Authorization: Bearer <your-token>" http://localhost:8080/api/v1/auth/me
```

```json
{
  "user": { "id": 1, "username": "alice", "role": "editor" },
  "csrf_token": null
}
```

トークンは持ち主として動作し、持ち主のロールとプロジェクトがそのまま使われます。リクエストに `Authorization: Bearer` ヘッダーがあるときは、トークンだけが検証されます。トークンがない、不明、または無効の場合は `401`（`WWW-Authenticate: Bearer` つき）になります。

トークンでトークンの作成や無効化もできるため（`POST /tokens`、`DELETE /tokens/{id}`）、秘密にしてください。

::: info ブラウザのセッション
Web アプリは `POST /auth/login` とセッション Cookie でログインします。Cookie を使ってデータを変更するリクエスト（`POST`、`PUT`、`PATCH`、`DELETE`）では、セッションの `csrf_token` を `X-CSRF-Token` ヘッダーでも送る必要があります。送らないと、コード `csrf` の `403` で拒否されます。ベアラートークンのリクエストでは CSRF ヘッダーは不要なので、スクリプトではトークンを使ってください。
:::

## 共通の規則

- **本文**: リクエストとレスポンスは JSON（`Content-Type: application/json`）です。ファイルのアップロード（`multipart/form-data`）とダウンロードは例外です。エンドポイントが知らないフィールドを含む本文は拒否されます（`422`）。
- **ID**: プロジェクトの ID は `iris-demo-2e9b75` のような文字列です。データセット、ジョブ、モデル、ユーザー、トークンの ID は整数です。
- **日時**: プロジェクト、データセット、トークンの `created_at` は UTC の `"YYYY-MM-DD HH:MM:SS"` です。ジョブ、モデル、ジョブのイベントは秒単位の Unix 時間です。
- **一覧**はページングなしの JSON 配列で返ります。`GET /jobs` は新しい順に `limit` 件（初期値 200、最大 1000）を返します。
- **サイズの上限**: JSON 本文は 1 MiB まで、CSV のアップロードは `FIONE_MAX_UPLOAD_BYTES`（初期値 1 GiB。[設定リファレンス](/ja/docs/configuration)を参照）まで、モデルのインポートは 512 MiB までです。
- **見え方**: 読めないプロジェクトは、あなたにとっては存在しないものとして扱われ、`403` ではなく `404` になります。プロジェクトを読めても、呼び出しに必要な権限がない場合は `403` です。

## 使用例

### データをアップロードしてモデルを学習する

プロジェクトを作成し、CSV をアップロードし、AutoML の学習をキューに入れます。アップロードは、`name`、`type`（`train`、`test`、`predict`）、`file` を持つ multipart フォームです。

```sh
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Iris demo"}'
# {"id": "iris-demo-2e9b75", "name": "Iris demo", "owner_id": 1, "created_at": "2026-11-07 06:02:46"}

curl -X POST http://localhost:8080/api/v1/projects/<project-id>/datasets \
  -H "Authorization: Bearer <your-token>" \
  -F name=train -F type=train -F file=@train.csv
# {"id": 1, "name": "train", "type": "train", "n_rows": 120, "n_cols": 4, "schema": [...], ...}

curl -X POST http://localhost:8080/api/v1/projects/<project-id>/jobs/automl \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"dataset_id": 1, "config": {"target": "species", "max_runtime_secs": 300}}'
# {"id": 1, "kind": "automl", "status": "queued", ...}
```

`config` に指定できるオプションは、[Python クライアント](/ja/guide/sdk)の「学習・待機・予測」にある表のとおりです。無効な設定や、エンジンが受け付けない目的列は `422` になり、ジョブはキューに入りません。

### ジョブの進行を確認する

学習はバックグラウンドで実行されます。`status` が `done`、`failed`、`cancelled` のいずれかになるまでジョブを取得します。

```sh
curl -H "Authorization: Bearer <your-token>" http://localhost:8080/api/v1/jobs/1
```

```json
{
  "id": 1,
  "kind": "automl",
  "status": "done",
  "result": { "model_id": 1, "best_model": "Ensemble", "stop_reason": "time", "metrics": { "accuracy": 0.92 } },
  "message": null,
  "created_at": 1794031373.97,
  "started_at": 1794031377.2,
  "finished_at": 1794031418.1
}
```

`result.model_id` が学習済みモデルです（上のレスポンスは省略したもので、実際のジョブには `payload` などもあります）。実行中の進捗は、ジョブのイベントで確認できます。返ってきた `last_id` を次の `after` に渡します。

```sh
curl -H "Authorization: Bearer <your-token>" "http://localhost:8080/api/v1/jobs/1/events?after=0&limit=100"
# {"events": [{"id": 1, "type": "started", "ts": ..., "data": {...}}, ...], "last_id": 3, "status": "running"}
```

### データセットを予測する

予測したい行を `predict` データセットとしてアップロードし、バッチ予測をキューに入れ、結果をダウンロードします。

```sh
curl -X POST http://localhost:8080/api/v1/projects/<project-id>/jobs/batch-predict \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"model_id": 1, "dataset_id": 2}'

# ジョブが完了すると、result.dataset_id が予測結果のデータセットです
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:8080/api/v1/projects/<project-id>/datasets/3/download
```

```text
"predict","p_setosa","p_versicolor","p_virginica","sepal_length","sepal_width","petal_length"
"virginica",0.0009,0.0068,0.9923,6.6,3.3,5
```

結果には、`predict` 列、分類ではクラスごとの `p_<クラス名>` 列、そして入力列（`include_columns` を指定した場合はその列だけ）が含まれます。`"include_contributions": true` を加えると、各行の寄与度も得られます（最大 100,000 行）。

### 1 行ずつ説明する

`POST /models/{id}/contributions` はジョブを使わず、すぐに答えを返します。列名をキーにしたオブジェクトを最大 100 件、`instances` で送ります。

```sh
curl -X POST http://localhost:8080/api/v1/models/1/contributions \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"instances": [{"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 3.6}]}'
```

```json
{
  "model_id": 1,
  "outputs": ["setosa", "versicolor", "virginica"],
  "rows": [
    {
      "row": 0,
      "prediction": 0.987,
      "class_index": 0,
      "bias": 0.109,
      "contributions": { "sepal_length": 0.294, "sepal_width": 0.233, "petal_length": 0.351 }
    }
  ]
}
```

各行の `bias` と `contributions` を合計すると `prediction` になります。`instances` の代わりに、`dataset_id` と `offset`、`limit` を指定することもできます。

## エンドポイント

パスはすべて `/api/v1` からの相対パスです。最後の列は、そのエンドポイントを呼べる人です。「読み取り」「書き込み」「所有者」は、そのオブジェクトが属するプロジェクトでの権限です（[ユーザー・ロール・共有](/ja/guide/users-sharing)を参照）。管理者はどこでもすべての権限を持ち、ロールが閲覧者のユーザーは読み取りまでです。

### システム

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /health` | 稼働確認: `{"status": "ok", "version": "..."}` | 誰でも（トークン不要） |
| `GET /system/status` | バージョン、イメージタグ、ストレージの種類、ジョブランナーの状態、待機中・実行中のジョブ数、言語モデルの状態。 | ログイン済み |

### 認証

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /auth/me` | 現在のユーザー。 | ログイン済み |
| `GET /auth/status` | `{"needs_first_admin": true または false}` | 誰でも |
| `POST /auth/first-admin` | `username`、`password`、`setup_token` で最初の管理者を作成します。管理者がいる場合は拒否されます（`409`）。 | 誰でも（セットアップトークンが必要） |
| `POST /auth/login`、`POST /auth/logout` | ブラウザのセッションを開始・終了します。 | 誰でも / ログイン済み |
| `POST /auth/password` | 自分のパスワードを変更します: `current_password`、`new_password`（8 文字以上）。ほかのセッションは終了し、トークンはそのまま使えます。 | ログイン済み |

### ユーザーとトークン

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /users` | 全ユーザー: `id`、`username`、`role`。 | 管理者 |
| `POST /users` | `username`、`password`、`role`（`admin`、`editor`、`viewer`）でユーザーを作成します。 | 管理者 |
| `PATCH /users/{user_id}` | `role` や `password` を変更します。自分の管理者ロールを外す操作は拒否されます（`409`）。 | 管理者 |
| `DELETE /users/{user_id}` | ユーザーを削除します。最後の管理者、自分自身、プロジェクトやジョブを持つユーザーは拒否されます（`409`）。 | 管理者 |
| `POST /tokens` | `name` を指定して自分のトークンを作成します。レスポンスに平文の `token` が含まれ、表示されるのは一度だけです。 | ログイン済み |
| `GET /tokens` | 自分のトークン一覧（トークン本体は含まれません）。管理者は `user_id` を指定できます。 | ログイン済み |
| `DELETE /tokens/{token_id}` | トークンを無効にします。 | 持ち主または管理者 |

### プロジェクトと共有

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /projects` | 見られるプロジェクト一覧。 | ログイン済み |
| `POST /projects` | `name`（1〜100 文字）でプロジェクトを作成します。 | 管理者または編集者 |
| `GET /projects/{project_id}` | プロジェクトと、その `owner`、あなたの `access`（`owner`、`editor`、`viewer`）、`members`。 | 読み取り |
| `DELETE /projects/{project_id}` | ジョブを停止してから、データセット、モデル、ジョブごとプロジェクトを削除します。 | 所有者 |
| `POST /projects/{project_id}/share` | `username` と `access`（`editor` か `viewer`）で共有します。もう一度共有すると権限が変わります。 | 所有者 |
| `DELETE /projects/{project_id}/share/{username}` | メンバーを外します。 | 所有者 |

### データセット

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /projects/{project_id}/datasets` | プロジェクトのデータセット一覧。 | 読み取り |
| `POST /projects/{project_id}/datasets` | multipart の `name`、`type`、`file` で CSV をアップロードします。 | 書き込み |
| `GET /projects/{project_id}/datasets/{dataset_id}` | 列の `schema` つきの 1 つのデータセット。 | 読み取り |
| `DELETE /projects/{project_id}/datasets/{dataset_id}` | データセットを削除します。 | 書き込み |
| `GET /projects/{project_id}/datasets/{dataset_id}/download` | UTF-8 の CSV としてのデータセット。 | 読み取り |
| `GET /projects/{project_id}/datasets/{dataset_id}/preview?rows=50` | 先頭の行（最大 200）を `{"columns": [...], "rows": [[...]]}` の形で。 | 読み取り |
| `GET /projects/{project_id}/datasets/{dataset_id}/profile` | 先頭 100,000 行の列の統計量、ヒストグラム、相関。`?target=<列名>` を付けるとリークの疑いも返します。 | 読み取り |
| `GET /projects/{project_id}/datasets/{dataset_id}/columns/{column}` | 1 列のプロファイル。 | 読み取り |

### ジョブ

学習、予測、説明、モジュール、エクスポートは、すべてジョブです。ジョブを投入すると、キューに入ったジョブがステータス `201` で返ります。

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `POST /projects/{project_id}/jobs/automl` | `train` データセットで学習します: `dataset_id`、`config`（`target` を含む）、任意で `name`。 | 書き込み |
| `POST /projects/{project_id}/jobs/batch-predict` | モデルでデータセットを予測します: `model_id`、`dataset_id`、任意で `include_columns`、`name`、`include_contributions`。 | 書き込み |
| `POST /projects/{project_id}/jobs/explain` | モデルの保存済みの説明を計算し直します: `model_id`、任意で `dataset_id`。 | 書き込み |
| `POST /projects/{project_id}/jobs/module` | [Python モジュール](/ja/guide/python-modules)を実行します: `module_id`、`dataset_id`、`params`、任意で `name`。 | 書き込み |
| `POST /projects/{project_id}/jobs/export` | プロジェクトの全モデルを 1 つの zip にエクスポートします。完了後に `GET /projects/{project_id}/exports/{job_id}` でダウンロードします。プロジェクトごとに同時に 1 つまでです（超えると `409`）。 | 読み取り |
| `GET /jobs` | 新しい順のジョブ一覧。`project_id` と `status` で絞り込めます。`limit` の初期値は 200 です。 | ログイン済み |
| `GET /jobs/{job_id}` | 1 つのジョブ。 | 読み取り |
| `GET /jobs/{job_id}/events` | イベント ID `after` より後のイベントを `limit` 件まで（初期値 500、最大 1000）。`last_id` とジョブの `status` も返ります。 | 読み取り |
| `POST /jobs/{job_id}/cancel` | 待機中または実行中のジョブをキャンセルします。終了済みのジョブは `409` です。 | 書き込み |
| `DELETE /jobs/{job_id}` | 終了済みのジョブを、イベントとログごと削除します。 | 書き込み |
| `DELETE /jobs?project_id=<id>` | プロジェクトの終了済みジョブをすべて削除します。 | 書き込み |

ジョブには、`id`、`kind`（`automl`、`batch_predict`、`explain`、`module`、`export_models`）、`project_id`、`owner_id`、`status`（`queued`、`running`、`done`、`failed`、`cancelled`）、投入時の `payload`、`result`、`message`、`stop_reason`、`degraded`、日時の `created_at`、`started_at`、`finished_at` があります。管理者以外には、エラーメッセージの最初の行だけが表示され、スタックトレースやファイルパスは含まれません。

### モデル

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /projects/{project_id}/models` | プロジェクトのモデルと指標。 | 読み取り |
| `GET /models/{model_id}` | 設定、リーダーボード、試行、変数の重要度を含む 1 つのモデル。 | 読み取り |
| `DELETE /models/{model_id}` | モデルを削除します。 | 書き込み |
| `GET /models/{model_id}/export` | 再びインポートできる zip としてのモデル。 | 読み取り |
| `POST /projects/{project_id}/models/import` | エクスポートした zip をインポートします（multipart の `file`、任意で `trust_foreign`）。 | 管理者 |
| `GET /models/{model_id}/serving` | [Fione Serving](/ja/docs/serving) 用のバンドル（zip）。 | 読み取り |
| `GET /models/{model_id}/serving/info` | バンドルを動かすコマンド、呼び出し例、zip に含まれるファイル。 | 読み取り |
| `GET /projects/{project_id}/exports/{job_id}` | 完了したエクスポートジョブの zip。 | 読み取り |

### 説明

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /models/{model_id}/diagnostics` | 交差検証による混同行列、クラスごとの指標、曲線、残差。 | 読み取り |
| `GET /models/{model_id}/explanations` | 保存済みの説明（重要度と部分依存曲線）と、その `status`。 | 読み取り |
| `POST /models/{model_id}/contributions` | 各行の寄与度。最大 100 件の `instances`、または `dataset_id` と `offset`、`limit`。任意で `class_index`。 | 読み取り |
| `POST /models/{model_id}/partial-dependence` | `column` を変えたときの平均出力の変化。任意で `dataset_id`、`grid`、`rows`、`ice`、`class_index`。 | 読み取り |

### Python モジュール

| メソッドとパス | 内容 | 呼べる人 |
|---|---|---|
| `GET /modules` | 組み込みとアップロード済みのすべてのモジュールと、その `kind`、パラメーターのスキーマ。 | ログイン済み |
| `POST /modules` | multipart の `id` と `file` でモジュールをアップロードします。レスポンスに、アップロードしたモジュールがサンドボックス化されないことを示す `warning` が含まれます。 | 管理者 |
| `DELETE /modules/{module_id}` | アップロード済みのモジュールを削除します。組み込みは削除できません。 | 管理者 |

## エラー

エラー応答は常に JSON で、人間向けの `error` と、変わらない `code` を持ちます。

```json
{ "error": "target column 'nope' is not in the data", "code": "invalid" }
```

| ステータス | `code` | 発生する場合 |
|---|---|---|
| `400` | `bad_request` | リクエストの形式が不正です。 |
| `401` | `unauthorized` | トークンがない、または無効・取り消し済みです。ログイン情報の誤りは `invalid_credentials` です。 |
| `403` | `forbidden` | プロジェクトは見られるが、呼び出しに必要なロールや権限がありません。ほかに、CSRF トークンのない Cookie リクエストの `csrf`、ほかのサイトの `Origin` の `cross_origin`、セットアップトークンの誤りの `invalid_setup_token`、`POST /auth/password` で現在のパスワードが違う場合の `invalid_credentials` があります。 |
| `404` | `not_found` | オブジェクトが存在しないか、そのプロジェクトを読めません。 |
| `405` | `method_not_allowed` | そのパスはありますが、この HTTP メソッドでは使えません。 |
| `409` | `conflict` | 今はその変更ができません（最後の管理者、終了済みのジョブ、実行中のエクスポートなど）。ほかに `already_set_up`、説明での `untrusted`、`too_large` があります。 |
| `413` | `too_large` | リクエスト本文やアップロードが上限を超えています。 |
| `415` | `unsupported_media_type` | サインインまたは最初の管理者の作成で `Content-Type` が JSON でない場合、またはアップロードで `multipart/form-data` でない場合です。そのほかの JSON の呼び出しで `Content-Type` が違うときは `422 invalid` が返ります。 |
| `422` | `invalid` | フィールドが不足または不正、あるいはサービスが値を拒否しました。読み取れない CSV は `invalid_csv` です。 |
| `429` | `throttled` | パスワードの確認の失敗が多すぎます。`Retry-After` ヘッダーの秒数だけ待ってください。 |
| `500` | `internal` | 想定外のエラーです。詳細はレスポンスではなく、サーバーのログにあります。 |
| `503` | `busy` | ほかの説明を計算中です。`Retry-After` ヘッダーの後で再試行してください。 |

この表は代表的なステータスです。呼び出しによっては、ステータスに独自の `code` が付きます(たとえばモデルのインポートでの `untrusted` は `422` です)。ログインの制限については、[ユーザー・ロール・共有](/ja/guide/users-sharing)と[設定リファレンス](/ja/docs/configuration)を参照してください。
