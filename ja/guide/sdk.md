---
title: Python クライアント fione-sdk
description: Python クライアント fione-sdk で、ノートブックやスクリプトから Fione を操作します。インストール、API トークンの設定、学習、ジョブの待機、予測、モジュールの実行を説明します。
---

# Python クライアント `fione-sdk`

`fione-sdk` は、Fione API 用の小さな Python クライアントです。ノートブックやスクリプトから、データセットのアップロード、AutoML による学習、リーダーボードの取得、予測、[Python モジュール](/ja/guide/python-modules)の実行ができます。データは pandas の DataFrame で受け渡します。Python 3.12 以上が必要です。

[API トークン](/ja/guide/users-sharing)を使って [REST API](/ja/docs/rest-api) と通信するので、トークンの持ち主ができることだけが実行でき、それ以上のことはできません。

## インストール

クライアントは Fione リポジトリの `sdk/` フォルダーにあります。クローンからインストールします。

```sh
git clone https://github.com/codelibs/fione.git
pip install ./fione/sdk
```

依存する `httpx` と `pandas` は pip が一緒にインストールします。

## 設定

**アカウント**画面で API トークンを作成し（[ユーザー・ロール・共有](/ja/guide/users-sharing)を参照）、サーバーのアドレスとトークンをクライアントに渡します。`Client()` は 2 つの環境変数を読みます。

| 変数 | 内容 |
|---|---|
| `FIONE_URL` | Fione サーバーのアドレス。例: `http://localhost:8080` |
| `FIONE_TOKEN` | API トークン |

```sh
export FIONE_URL=http://localhost:8080
export FIONE_TOKEN=<your-token>
```

同じ 2 つの値は、`Client(url=..., token=...)` のように引数でも渡せます。そのほかのオプションは次の 2 つです。

- `timeout=` はリクエストのタイムアウト（秒）です。初期値は 60 です。
- `http=` には、クライアント自身のものの代わりに使う `httpx.Client` を渡します。このとき `url` と `timeout` は無視され、トークンはその `httpx.Client` の送信先に送られます。

トークンやアドレスがないと、`Client()` はコード `config` の `FioneError` を送出します。共有するコードにトークンを書かず、環境変数やシークレット管理から読み込んでください。

## 例

```python
import pandas as pd
from fione_sdk import Client

fione = Client()
project = fione.create_project("demo")
dataset = fione.upload(project["id"], pd.read_csv("train.csv"), "train")
print(fione.profile(project["id"], dataset["id"]))
frame = fione.read(project["id"], dataset["id"])
```

`create_project` と `upload` は、API が返す内容を辞書として返します。プロジェクトの `id` は `demo-1a2b3c` のような文字列、データセットの `id` は数値です。`upload` の 4 番目の引数でデータセットの `type` を指定できます。`"train"`（初期値）、`"test"`、`"predict"` のどれかです。

## 学習・待機・予測

`train` は AutoML の学習をキューに入れ、`Job` を返します。`wait` はジョブが終わるまで待ちます。

```python
job = fione.train(project["id"], dataset["id"], "species", max_runtime_secs=300)
for event in job.events(follow=True):  # ジョブが終わるまで進捗を受け取る
    print(event["type"], event["data"])
job.wait()
model_id = job.result["model_id"]
print(fione.leaderboard(model_id))  # AutoML が試したモデルが 1 行ずつ
print(fione.models(project["id"]))  # プロジェクトのモデルが 1 行ずつ

new_rows = pd.read_csv("new_rows.csv")  # 同じ入力列。"species" は含めない
predictions = fione.predict(project["id"], model_id, new_rows)  # "predict" 列つき
```

`train(project_id, dataset_id, target, *, name=None, **config)` は、予測する列と、そのほかの学習オプションをキーワード引数で受け取ります。データセットは `train` タイプである必要があります。オプションは次のとおりです。

| オプション | 初期値 | 意味 |
|---|---|---|
| `task` | `"auto"` | `"auto"`、`"classification"`、`"regression"` のどれか。 |
| `max_runtime_secs` | `3600` | この時間で学習を止め、それまでの最良のモデルを残します。 |
| `max_runtime_secs_per_model` | なし | 1 つのモデルの学習時間の上限。 |
| `max_models` | なし | この数のモデルを試したら止めます。 |
| `nfolds` | `5` | 交差検証の分割数（2 以上）。 |
| `seed` | `0` | 同じ値なら同じ分割と探索になります。 |
| `balance_classes` | `False` | 少数のクラスに大きな重みを付けて学習します。 |
| `decision` | `"argmax"` | `"argmax"` か `"balanced"`（クラスの大きさで調整）。`balance_classes` とは併用できません。 |
| `target_transform` | `"none"` | `"none"` か `"log1p"`（回帰のみ）。 |
| `feature_engineering` | `True` | 明らかに効果のある派生特徴量を追加します。 |
| `stopping_rounds`、`stopping_metric`、`stopping_tolerance` | `10`、`"auto"`、`0.001` | モデルの種類ごとの早期停止。 |
| `sort_metric` | `"auto"` | リーダーボードの順位付けに使うスコア。 |
| `keep_cv_predictions`、`keep_cv_models`、`keep_cv_fold_assignment` | `False` | 交差検証の結果を残します（モデルを残すとモデルファイルがかなり大きくなります）。 |
| `ignored_columns` | `[]` | 入力として使わない列。 |

Web アプリの学習画面にも同じ設定があります（[AutoML 画面](/ja/guide/automl)を参照）。エンジンが受け付けない設定（未知のオプション、欠損のある、または値が 1 種類しかない目的列など）は、HTTP ステータス 422 の `FioneError` になり、ジョブはキューに入りません。

### ジョブ

時間のかかる処理（学習、バッチ予測、モジュール）はすべてサーバー上のジョブです。`Job` には次のものがあります。

- `job.id`、`job.data`（最後に取得したジョブ）、`job.data` から読み取る `job.status`（`queued`、`running`、`done`、`failed`、`cancelled`）と `job.result`。
- `job.data` を更新する `job.refresh()` と `job.cancel()`。終了済みのジョブをキャンセルすると `FioneError`（409）になります。`fione.job(job_id)` で、あとからジョブを取得し直せます。
- `job.events(after=0, follow=False)`。ジョブのイベントを古いものから、`id`、`type`、`ts`、`data` を持つ辞書として返します。`follow=True` にすると、ジョブが終わるまで新しいイベントを待ちます。
- `job.wait(timeout=None, poll=1.0, max_poll=10.0)`。ポーリング間隔は `poll` 秒から始まり、`max_poll` まで倍々に増えます。ジョブが `done` になるとそのジョブを返します。ジョブが失敗またはキャンセルされると `fione_sdk.JobFailed`（`FioneError` の一種）を送出します。`code` は `"failed"` か `"cancelled"`、`message` はジョブのメッセージ、`job` はそのジョブ、`status` は 0（HTTP 応答がないため）です。`timeout` 秒たつと `TimeoutError` を送出し、ジョブは動き続けます。**待機を中断する（ノートブックで Ctrl-C を押す）と、ジョブはキャンセルされます。**

### 予測

`predict(project_id, model_id, df, *, include_columns=None, timeout=None)` は、DataFrame を一時的なデータセットとしてアップロードし、サーバー上で予測し、結果を行の順序どおりに読み戻して、一時的なデータセットを削除します。予測が失敗したりタイムアウトしたりしたときも、アップロードしたデータセットは削除されます。`timeout` 秒後（または失敗時）には、バッチ予測のジョブをキャンセルして `TimeoutError`（または `JobFailed`）を送出します。

結果には、予測値またはクラスを表す `predict` 列があり、分類ではクラスごとの確率を表す `p_<クラス名>` 列も付きます。既定では入力列が続きます。一部だけを含めたいときは `include_columns=[...]` を渡します。結果のデータセットはプロジェクトに残るので、プロジェクトのデータセットからあとで見つけられます。

## データセットとモデル

| 呼び出し | 戻り値 |
|---|---|
| `projects()`、`project(project_id)`、`create_project(name)` | 見られるプロジェクト一覧、1 つのプロジェクト、新しいプロジェクト（辞書）。 |
| `datasets(project_id)`、`dataset(project_id, dataset_id)` | プロジェクトのデータセット一覧、または列のスキーマ付きの 1 つのデータセット。 |
| `upload(project_id, df, name, type="train")` | 新しいデータセット。 |
| `read(project_id, dataset_id)` | データセットの DataFrame。 |
| `preview(project_id, dataset_id, rows=50)` | 先頭の行（最大 200）を `{"columns": ..., "rows": ...}` の形で。 |
| `profile(project_id, dataset_id)`、`column_profile(project_id, dataset_id, column)` | データセットの統計量・ヒストグラム・相関、または 1 列のプロファイル。 |
| `delete_dataset(project_id, dataset_id)` | なし。 |
| `models(project_id)` | プロジェクトのモデルが 1 行ずつ入った DataFrame。 |
| `model(model_id)` | 指標、設定、リーダーボード、変数の重要度を含む 1 つのモデル。 |
| `leaderboard(model_id)` | AutoML が試したモデルが良い順に 1 行ずつ入った DataFrame。 |

## モジュール

`modules()` は、サーバーが実行できるモジュールの一覧を返します。`run_module` はデータセットに対するモジュールをキューに入れ、`Job` を返します。モジュールはノートブックではなくサーバー上で動くので、手元に追加のパッケージは必要ありません。

```python
job = fione.run_module(project["id"], "sort", dataset["id"], {"column": "age"})
job.wait()
sorted_frame = fione.read(project["id"], job.result["dataset_id"])
```

`run_module(project_id, module_id, dataset_id, params=None, *, name=None)` は、モジュールのパラメーターを辞書で受け取り、必要なら新しいデータセットの名前も指定できます。組み込みモジュールと独自モジュールの書き方は [Python モジュール](/ja/guide/python-modules)を参照してください。

## エラーと制限

- 2xx 以外の応答は `fione_sdk.FioneError` になり、HTTP の `status`、API のエラー `code`、`message` を持ちます。たとえば、見られないプロジェクトを指定すると `FioneError: project not found (not_found, HTTP 404)` になります。
- リダイレクトもエラーです。たいていは `FIONE_URL` を `https` のアドレスにすべきという意味です。クライアントはリダイレクトを決して辿らないので、トークンがほかのアドレスに送られることはありません。
- 通信エラー（`httpx.ConnectError`、タイムアウト）はラップされず、そのまま送出されます。
- データフレームは CSV で受け渡すため、データ型は完全には往復しません。`read` は型を推測し直します（たとえば日付は文字列で返ります）。

```python
from fione_sdk import Client, FioneError, JobFailed

fione = Client()
try:
    fione.train(project_id, dataset_id, "species", max_runtime_secs=120).wait()
except JobFailed as e:
    print(e.code, e.message)  # "failed" か "cancelled" と、ジョブのメッセージ
except FioneError as e:
    print(e.status, e.code, e.message)
```

これらの呼び出しの元になっているエンドポイントや、Python を使わずに API を呼ぶ方法は、[REST API](/ja/docs/rest-api)を参照してください。
