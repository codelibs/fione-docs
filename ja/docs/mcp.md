---
title: "MCP: AI ツール向けのエンドポイント"
description: "Claude Code や Codex などの AI ツールが使う Fione の MCP エンドポイント: オンとオフの切り替え、API トークン、ジョブを始めるツール、アップロードと予測。"
---

# MCP

Fione は MCP クライアント (Claude Code や Codex などの AI ツール、MCP に対応したエディター) にツールを提供します。読み取り専用のツールと、プロジェクトの作成、データセットのアップロード、ジョブの開始、予測を行うツールです ([MCP クライアントからジョブを開始する](#starting-jobs-from-an-mcp-client)を参照)。何を呼ぶかはクライアント自身の言語モデルが決めます。ツールは、提案する学習設定や Join の設定も含めて Fione 自身の計算なので、MCP には Fione 側の言語モデルは要らず、[アシスタント](/ja/docs/assistant)がオフでも動きます。想定している使い方は [MCP で AI ツールから AutoML を一通り実行する](/ja/guide/mcp)にあります。

エンドポイントは Fione 自身のポートの `/mcp` で、たとえば `http://127.0.0.1:8080/mcp` です。Streamable HTTP (POST 上の JSON-RPC、プロトコルバージョン 2025-03-26、2025-06-18、2025-11-25) で、セッションは持ちません。POST だけに JSON で応答し (イベントストリームとバッチはありません)、リクエストの本文は最大 1 MiB です。

## オンとオフ {#on-and-off}

MCP は**既定でオン**で、変更を行うツールも使えます。API トークンがなければ何も答えません。トークンは各自が自分で作り、REST API での持ち主と同じ権限を持ちます。

管理者は**システムの状態**ページの **MCP** カードで、MCP 全体、または変更を行うツールだけをオフにし、またオンに戻せます。項目は**プロジェクト・データセット・モデルの読み取り**と**プロジェクトの作成・データセットの追加・ジョブの開始**です。変更は次の呼び出しから効き、発行済みのアップロード URL にも及びます。上限はサーバーの設定で決まります。`FIONE_MCP_ENABLED=false` なら MCP は、`FIONE_MCP_WRITE_ENABLED=false` なら変更を行うツールは、システムの状態ページの表示にかかわらずオフのままです (Compose では `docker/.env`。[設定リファレンス](/ja/docs/configuration)を参照)。そのときカードには、どの設定でオフになっているかが表示されます。MCP がオフのとき、`/mcp` は 404 を返します。

## クライアントをつなぐ {#connecting-a-client}

1. **アカウント**ページで API トークンを作成します。
2. クライアントに URL と `Authorization: Bearer <your-token>` ヘッダーを設定します。多くのクライアントは次のような設定を受け付けます。

   ```json
   {"mcpServers": {"fione": {"type": "http", "url": "http://127.0.0.1:8080/mcp",
                             "headers": {"Authorization": "Bearer <your-token>"}}}}
   ```

クライアントはトークンの持ち主として動作し、その人が読めるプロジェクトを見られます。プロジェクト、データセット、モデルの一覧と、その説明、結果、説明を読めるほか、提案された学習設定や Join の設定を受け取れます (保存はされません)。変更を行うツールがオフのときは、何かを開始したり変更したりはできません。読み取りツールが値の例を返すことはありません。セッション Cookie は拒否され、API トークンだけがエンドポイントを開けます。トークンはあなたと同じ権限を持つので、秘密にしてください。

- リバースプロキシの背後では、ネットワーク外の MCP クライアントを許可しないなら `/mcp` をブロックしてください。Compose の構成は Fione を `127.0.0.1` にだけ公開します。
- ブラウザからのリクエスト (`Origin` ヘッダー付き) は、`localhost`、`127.0.0.1`、`[::1]` (ポートは問いません) または `FIONE_PUBLIC_URL` のオリジンからのものだけ受け付けます。ブラウザ上のクライアントが別のアドレスで Fione に接続するときは、これを設定してください。
- 同時に処理される MCP リクエストは最大 2 つです (`initialize` やツール一覧を含むすべてのリクエストが数えられます)。ほかのリクエストは最大 15 秒待ち、その後「busy」と返されます。

Claude Code や Codex にも、同じ URL とトークンを渡します。

```sh
claude mcp add --transport http fione http://127.0.0.1:8080/mcp \
  --header "Authorization: Bearer <your-token>"

# Codex はトークンを環境変数から読みます
export FIONE_TOKEN=<your-token>
codex mcp add fione --url http://127.0.0.1:8080/mcp --bearer-token-env-var FIONE_TOKEN
```

## 読み取りのツール {#reading-tools}

どのクライアントも、変更を行うツールがオフのときも含めて、次の 14 のツールを使えます。プロジェクトの読み取り権限が必要で、何も変更しません。

| ツール | できること |
|---|---|
| `list_projects` | ユーザーが読めるプロジェクトと、それぞれのデータセットとモデルの数。 |
| `list_datasets` | プロジェクトのデータセット (ID、名前、タイプ、大きさ)。 |
| `describe_dataset` | データセットの列 (種類、空の割合、統計量)、強い相関と、`target` を指定したときは答えを漏らすおそれのある列。 |
| `get_column_stats` | 1 つの列の統計量。 |
| `find_table_links` | プロジェクトの中で結合できるデータセット (名前が関係し、値がほぼ同じ列)。結合はしません。 |
| `propose_join`、`propose_first_join` | 土台のデータセットへのデータセットの Join、または予測する列のための最初の Join ([提案](#proposals)を参照)。何も開始しません。 |
| `propose_training_config` | データセットと予測する列の学習設定 ([提案](#proposals)を参照)。何も開始しません。 |
| `list_models` | プロジェクトの学習済みモデル (新しい順)。 |
| `get_leaderboard` | モデルのリーダーボード、指標、タスク。 |
| `get_feature_importance` | モデルの重要な入力。学習時に記録したもの (`gain`) か、説明のジョブで求めたもの (`contributions`)。 |
| `get_model_diagnostics` | モデルの交差検証の予測から求めた診断 (混同行列とクラスごとのスコア、ROC 曲線と適合率・再現率曲線と較正、または残差)。 |
| `get_partial_dependence` | 1 つの入力によってモデルの予測の平均がどう変わるか (説明のジョブが保存したもの)。 |
| `get_training_events` | ジョブの最新の進み具合のイベント。 |

## MCP クライアントからジョブを開始する {#starting-jobs-from-an-mcp-client}

変更を行うツールがオンのとき、クライアントは、トークンのユーザーとして次のツールも使えます。`create_project` は編集者または管理者のロールが必要です。`upload_dataset`、`create_upload_url`、`start_training`、`start_batch_predict`、`run_module`、`cancel_job` はプロジェクトへの書き込み権限が必要です (REST API と同じく、管理者、またはロールが閲覧者でないそのプロジェクトの所有者・編集者)。`list_modules` はどのトークンでも使えます。ほかは読み取り権限だけで使えます。プロジェクトに属さないジョブを読んだり取り消したりできるのは管理者だけです。

| ツール | できること |
|---|---|
| `create_project` | ユーザーが所有するプロジェクトを作り、`project_id` を返します。 |
| `upload_dataset` | インラインで送った CSV の文章 (UTF-8 で 512 KiB まで) から、データセット (タイプ `train`、`test`、`predict`) を追加します。 |
| `create_upload_url` | `FIONE_MAX_UPLOAD_BYTES` までの大きさの CSV ファイルを送るための、一度だけ使える URL を返します。 |
| `start_training`、`start_batch_predict`、`run_module` | ジョブを積み、`job_id` を返します。`start_training` は `project_id`、`dataset_id`、`config` (`target` を含む学習設定)、任意の `name` と、任意の `extra_dataset_ids` (学習だけに使う、プロジェクトのほかの学習データ。[追加の学習データ](/ja/guide/automl#extra-training-data)を参照) を受け取ります。 |
| `list_modules` | Python モジュールを、種類とパラメーターとともに一覧します。 |
| `get_job`、`wait_for_job`、`list_jobs` | ジョブの状態と、終了後はその結果 (学習の `model_id`、バッチ予測の `dataset_id`) を返します。`list_jobs` は新しい順に 50 件で、`project_id` と `status` (`queued`、`running`、`done`、`failed`、`cancelled`) で絞り込めます。 |
| `cancel_job` | 待機中または実行中のジョブをキャンセルします。 |
| `predict` | 1 行から 1000 行を、オブジェクトで受け取ってすぐに予測します。 |
| `get_predictions` | 終わったバッチ予測の結果を、ページ単位で読みます (既定 100 行、最大 1000 行)。 |

どのツールも何も削除しません。データの値を返すのは `predict` と `get_predictions` だけで、予測したラベルと `p_<class>` のクラス名です。この 2 つは読み取り権限だけで使えます。Fione は人に確認できないので、確認はクライアント側の承認だけです。クライアントが承認を求めるように、`create_project`、`upload_dataset`、`create_upload_url`、`start_training`、`start_batch_predict`、`run_module`、`cancel_job`、`predict` には「変更を行う」と印が付いています。ほかは読み取り専用の印です。トークンはそのユーザーの権限を持つので、ジョブを始めさせたくないクライアントには、閲覧しかできないユーザーのトークンを使ってください。

**ジョブを待つ。** `wait_for_job` は最長 `timeout_secs` (既定 10、最大 15) 秒待ち、ジョブが終わったかどうかを `done` で返します。`done` が false の間は、もう一度呼びます。待っている呼び出しは MCP の 2 つの枠の 1 つを使うので、待ちは短くしてあります。ジョブの `message` は MCP では送られません。`null` になり、ジョブにメッセージがあるときは `message_hidden` が `true` になります。何が起きたかは、状態と `get_training_events` でわかります (MCP では、イベントの種類、モデルの種類、例外の型は残りますが、メッセージの文面は除かれます)。

**データセットをアップロードする。** `upload_dataset` は小さなファイル向けです。大きなファイルでは、シェルのあるクライアントが `create_upload_url` を呼び、返された `example` のコマンド `curl -T file.csv '<url>'` (生の CSV を HTTP の PUT で送ります。認証は不要なので URL は秘密にします) でファイルを送ります。URL は 15 分間、アップロードが 1 回成功するまで有効です。失敗したアップロード (CSV として読めない、上限を超えた) では使い切られません。URL は、`FIONE_PUBLIC_URL` を設定していればその値で、なければリクエストのアドレスで始まります。リバースプロキシの背後では、公開用の URL になるように `FIONE_PUBLIC_URL` を設定してください。URL にはトークンが含まれます。Fione 自身のログとアクセスログでは伏せられますが、プロキシのアクセスログには記録されるので、`/api/v1/uploads/` で始まるパスはそこで伏せてください。

**予測する。** `predict` は `rows` を受け取ります。各行は、モデルが読むすべての列の値を持つオブジェクトです (ほかのキーは無視されます)。行の順に予測を 1 つずつ返します。`predict`、分類ではさらにクラスごとの `p_<class>` です。行は保存されません。結果は 32 KiB に収まる必要があり、超える要求は収まる行数の目安とともに断られます。もっと多くの行は、`predict` データセットをアップロードし、`start_batch_predict` を実行して、結果を `get_predictions` で読みます。このインストールが署名していないインポートしたモデルや、Web プロセスで読み込むには大きすぎるモデルは `predict` では断られるので、これも `start_batch_predict` を使います。`get_predictions` は予測の列だけを返し、入力の値は返しません。`offset` から `limit` 行ずつです。ページが 32 KiB に収まるように切られたときは `truncated` が true になり、次のページは `offset` に返された行数を足した位置から始まります。

## 提案 {#proposals}

`propose_join` の結果は、キー `proposal` (`true`)、`kind` (`join`)、`config` (Join モジュールのパラメーター)、`warnings`、`rationale` を持ちます。`propose_first_join` はプロジェクトと、予測する列 `target` を受け取り、同じキーに加えて、選んだ土台のデータセット `dataset_id` を返します。**結合を提案**ボタンが提案するのと同じ結合です ([データセットの結合](/ja/guide/automl#join-datasets)を参照)。

`propose_training_config` は `dataset_id` と `target`、任意で `notes`、`max_runtime_secs`、`decision` (`argmax`、`balanced`、`tuned`、`cost`)、`cost_miss` と `cost_false_alarm` (`cost` のとき。[予測クラスの決め方](/ja/guide/automl#choosing-the-predicted-class)を参照)、`target_transform`、`sort_metric`、`group_column` (**同じ値の行をまとめる列**)、`event_column`、`time_column` (**行の時間順**) を受け取ります。結果は、キー `proposal` (`true`)、`config`、`ignored_suggestions`、`warnings`、`rationale` を持ちます。各警告は `{code, message, params}` のオブジェクトで、`message` は英語の文、`code` と `params` はどの言語の文でも組み立てられる形で警告を表します。`ignored_suggestions` の各要素は `{column, reason, code}` で、`reason` も英語です。

提案の `config` は、ID のような列を、除くほかの列とともに `ignored_columns` に入れてあるので (200 列まで。それより多い ID のような列が残るときは警告が出ます)、そのまま `start_training` に渡せます。手で書いた設定は、除外しないすべての列で学習し、ID の列も使います。提案の `config` から始めるか、そのような列を自分で `ignored_columns` に書いてください。
