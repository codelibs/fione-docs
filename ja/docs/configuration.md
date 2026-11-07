---
title: "設定リファレンス"
description: "Fione のすべての設定を一覧します。FIONE_* 環境変数、Docker Compose の変数、Fione Serving と fione-sdk の設定、リバースプロキシ、秘密鍵、ストレージ。"
---

# 設定リファレンス

Fione は環境変数で設定します。Docker Compose の構成 (`docker/compose.yaml`) では大半がすでに設定済みで、記入するのは `docker/.env` だけです ([クイックスタート](/ja/guide/installation)を参照)。

Compose 構成で `docker/.env` が効くのは、[Compose の変数](#compose-の変数)に挙げた変数だけです。それ以外の Fione の設定 (たとえば `FIONE_TRUST_PROXY` や `FIONE_LLM_MAX_TOKENS`) は、`docker/compose.yaml` の `fione` サービスの `environment` に書きます。Compose を使わない場合、設定は Fione プロセスの環境変数です。

## Fione の設定

`fione` コンテナが起動時に読み込みます。真偽値は `true` / `false` を受け付けます。

### データとストレージ

| 変数 | 既定値 | 内容 | 変更する場面 |
|---|---|---|---|
| `FIONE_DATA_DIR` | `/data` | データディレクトリ。SQLite データベース、秘密鍵、ジョブのログ、一時ファイル、ストレージがローカルのときはオブジェクトも置かれます。 | コンテナイメージの外で動かすときのみ。 |
| `FIONE_STORAGE_URL` | `file://<データディレクトリ>/objects` | データセットとモデルの保存先。`file:///絶対パス` または `s3://バケット[/プレフィックス]`。Compose は `s3://fione` (SeaweedFS) を設定します。 | 別の S3 互換ストレージを使うとき。バケットが存在するか、S3 の認証情報で作成できる必要があります (コンテナが起動時に作成します)。 |
| `FIONE_SECRET_KEY_PATH` | `<データディレクトリ>/secret.key` | このインストールの秘密鍵 (ランダムな 32 バイト。初回起動時に作成、パーミッション 0600)。セッションとモデルファイルに署名します。 | ほとんど変更しません。[秘密鍵](#秘密鍵)を参照。 |
| `FIONE_S3_ENDPOINT` | 未設定 | S3 のエンドポイント URL (パス形式のアドレス指定)。Compose では `http://seaweedfs:8333`。 | 別の S3 サーバーを使うとき。 |
| `FIONE_S3_ACCESS_KEY` | 未設定 | S3 のアクセスキー。Compose は `docker/.env` から取ります。 | 必ず自分の値を設定してください。 |
| `FIONE_S3_SECRET_KEY` | 未設定 | S3 のシークレットキー。Compose は `docker/.env` から取ります。 | 必ず自分の値を設定してください。 |
| `FIONE_S3_REGION` | `us-east-1` | S3 のリージョン名。 | `us-east-1` 以外の AWS S3 を使うとき。 |
| `FIONE_MAX_UPLOAD_BYTES` | `1073741824` (1 GiB) | アップロードできる CSV の最大サイズ。 | 上限を増減したいとき ([一時領域](#一時領域)に注意)。 |

### ジョブとモデル

| 変数 | 既定値 | 内容 | 変更する場面 |
|---|---|---|---|
| `FIONE_MAX_CONCURRENT_TRAIN_JOBS` | `1` | 同時に実行する学習ジョブの数。残りはキューで待ちます。学習 1 件がすべての CPU コアを使います。 | 大きなマシンのときのみ。 |
| `FIONE_MAX_CONCURRENT_SHORT_JOBS` | `4` | 同時に実行するその他のジョブ (予測、説明、エクスポート、Python モジュール) の数。 | ほとんど変更しません。 |
| `FIONE_EXPLAIN_AFTER_TRAINING` | `true` | 学習のたびに説明ジョブをキューに入れます。入力列の重要度と、重要な上位 10 列の部分依存曲線を、学習データのサンプルで計算します。 | 依頼があったときだけ説明したいなら `false` (混み合う環境で CPU を節約できます)。 |
| `FIONE_IMAGE_TAG` | `dev` (イメージに埋め込み) | イメージのバージョンタグ。学習したモデルにはすべてこのタグが記録され、Fione Serving は自分のタグのモデルだけを読み込みます。 | 実行時ではなくビルド時に指定します (`--build-arg FIONE_IMAGE_TAG=…`)。 |
| `FIONE_SERVING_IMAGE` | `ghcr.io/codelibs/fione-serving` | UI が表示する `docker run` コマンドに書かれるサービングイメージ。 | サービングイメージを別の場所で公開するとき。 |
| `FIONE_RUNNER_ENABLED` | `true` | アプリ内でジョブキューを動かします。`false` にするとジョブはキューに入るだけで実行されません。 | 通常は使いません (テスト用)。 |

### サインインとネットワーク

| 変数 | 既定値 | 内容 | 変更する場面 |
|---|---|---|---|
| `FIONE_COOKIE_SECURE` | `false` | セッションと表示設定の Cookie に `Secure` を付けます (HTTPS のみ)。 | HTTPS で Fione にアクセスするときは `true`。 |
| `FIONE_SESSION_MAX_AGE_SECS` | `604800` (7 日) | サインインが続く時間。 | もっと早くサインアウトさせたいとき。 |
| `FIONE_LOGIN_MAX_FAILURES` | `5` | 期間内に、クライアントアドレスとユーザー名ごとにパスワード確認が失敗できる回数。超えると一定時間サインインを拒否します。 | ほとんど変更しません。 |
| `FIONE_LOGIN_WINDOW_SECS` | `900` (15 分) | この上限と次の上限の対象期間。 | ほとんど変更しません。 |
| `FIONE_LOGIN_MAX_FAILURES_PER_IP` | `50` | 期間内に、ユーザー名に関係なくクライアントアドレスごとにパスワード確認が失敗できる回数。 | [リバースプロキシの背後で使う](#リバースプロキシの背後で使う)を参照。 |
| `FIONE_TRUST_PROXY` | `false` | クライアントアドレスとホストを `X-Forwarded-For` / `X-Forwarded-Host` から取ります (最後の値、つまりプロキシが追加した値)。 | これらのヘッダーを付けるリバースプロキシの背後でのみ `true`。 |
| `FIONE_SETUP_TOKEN` | 未設定 | 最初の管理者を作成するトークン (16 文字以上)。未設定のときは Fione が生成し、管理者ができるまで起動のたびにログへ出力します。 | 自分で決めたいとき (`docker/.env`)。 |
| `FIONE_PUBLIC_URL` | 未設定 | ブラウザから見た Fione 自身のオリジン (`scheme://host[:port]`、パスなし)。例: `https://fione.example.com`。MCP エンドポイントは、ブラウザからのリクエスト (`Origin`) をこのオリジンと `localhost` からのものだけ受け付けます。 | ブラウザ上の MCP クライアントが別のアドレスで Fione に接続するとき。TLS プロキシの背後では `https` のオリジンを指定してください。Fione には分かりません。 |

### アシスタント (言語モデル) と MCP

これらの設定は[アシスタントの設定と MCP](/ja/docs/assistant)で説明しています。

| 変数 | 既定値 | 内容 | 変更する場面 |
|---|---|---|---|
| `FIONE_LLM_PROVIDER` | `ollama` | Ollama サーバーなら `ollama` (思考の出力は、`FIONE_LLM_EXTRA_BODY` で指定しない限りオフ)、Anthropic API 経由の Claude なら `claude` (`FIONE_LLM_API_KEY` が必要で、Claude 5 ファミリーのモデル向けに作られています)。 | Claude を使うとき。 |
| `FIONE_LLM_BASE_URL` | プロバイダーの既定値 | 言語モデルのサーバー。`http(s)://host[:port][/path]` で、認証情報・クエリ・フラグメントは付けられません。空にはならず、未設定または空なら `ollama` では `http://host.docker.internal:11434/v1` (ホスト上の Ollama アプリ)、`claude` では `https://api.anthropic.com` です。`ollama` では `/v1` で終わる必要があります (Fione は `<ベース URL>/chat/completions` を呼びます)。`claude` では `<ベース URL>/v1/messages` を呼びます。Fione 自身の `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、`NO_PROXY` はこの通信にも適用されます。Docker の外で Fione を動かすときは、既定の `host.docker.internal` を `http://localhost:11434/v1` に置き換えてください。 | 別の場所の Ollama や、Anthropic API の前に置いたプロキシ・ゲートウェイを使うとき。 |
| `FIONE_LLM_API_KEY` | 未設定 | サーバーのキー (表示可能な ASCII 文字)。`claude` では必須 (なければ Fione は起動しません) で、`x-api-key` として送られます。`ollama` では任意で、`Authorization: Bearer <キー>` として送られます。ログにも画面にも出ず、設定したホストにだけ送られます。 | `claude` を使うとき、またはキーを求めるプロキシの背後の Ollama を使うとき。 |
| `FIONE_LLM_MODEL` | `gemma4:12b-mlx` (`claude` では `claude-opus-5-5`) | リクエストごとに送るモデル名 (表示可能な ASCII 文字で 1〜200 文字)。MLX モデルは、Apple Silicon の Mac のホストに入れた Ollama でだけ動き、Fione はその API 経由で使います。それ以外 (Linux やコンテナ内の Ollama) では `gemma4:12b` のような MLX ではないタグを使ってください。 | 別のモデルを使うとき、MLX が動かないマシンのとき。 |
| `FIONE_LLM_EXTRA_BODY` | 未設定 | `ollama` のみ (`claude` では拒否されます)。すべてのリクエストにマージする JSON オブジェクト。例: `{"reasoning_effort": "none"}`。キー `model`、`messages`、`tools`、`stream`、`stream_options`、`max_tokens` は指定できません。未設定のときは `{"reasoning_effort": "none"}` です。 | Ollama サーバーで思考をオンにしたり、サンプリングのオプションを指定したりするとき。 |
| `FIONE_LLM_AUTO_PULL` | `false` | `ollama` のとき、サーバーにモデルがなければダウンロードし、進み具合を**システムの状態**ページに表示します。`false` ならサーバーのモデルは利用者に任され、モデルがないときはページにダウンロードのボタンが出ます。`claude` では無視されます。 | 確認なしでダウンロードさせたいとき。たとえば Fione だけが使う Ollama サーバーなど。 |
| `FIONE_LLM_MAX_TOKENS` | `1024` (`claude` では `16000`) | 1 回の応答のトークン数の上限 (思考を含む)。64〜64000 で、`FIONE_LLM_CONTEXT_TOKENS` より 4954 以上小さくします。 | 長い答えが必要なとき、遅いモデルを抑えたいとき。 |
| `FIONE_LLM_CONTEXT_TOKENS` | `16384` (`claude` では `200000`) | 1 回のリクエストのトークン予算。Fione が送るプロンプトの最大長で、応答を含みます。262144 まで。`FIONE_LLM_CONTEXT_TOKENS` から `FIONE_LLM_MAX_TOKENS` を引いた値は 4954 以上が必要です。アシスタントのツールと指示で約 4,890 トークン使うため、それより小さいと質問を入れる余地がありません。モデルのコンテキストウィンドウを超えない値にしてください。Ollama では、Fione はサーバーがモデルを読み込んだときのコンテキストにも合わせます。Ollama の既定の 4096 でもツールには小さすぎます。Ollama サーバーに `OLLAMA_CONTEXT_LENGTH=16384` を設定してください (Compose の `ollama` プロファイルは設定済み。ホストの Ollama では自分で設定します)。 | モデルのコンテキストウィンドウに合わせるとき。 |
| `FIONE_LLM_MAX_TOOL_ROUNDS` | `6` | 1 つの答えがツールを呼べる回数。超えると「手順が多すぎる」として止まります。1〜20。 | 調べる回数が多い質問のとき。 |
| `FIONE_LLM_TURN_TIMEOUT_SECS` | `180` | 1 つの答えにかけられる時間 (ツールの全ラウンドを含む)。超えるとタイムアウトで終わります。10〜1800。 | モデルやハードウェアが遅いとき。 |
| `FIONE_LLM_MAX_CONCURRENT_TURNS` | `2` | 全ユーザー合計で同時に書く答えの数。超えた分は待ち行列に入ります。1〜16。 | 並列リクエストを処理できるサーバーのとき。 |
| `FIONE_MCP_ENABLED` | `false` | アシスタントの読み取り専用ツールを、Fione 自身のポートの `/mcp` で MCP として提供します (Streamable HTTP、POST 上の JSON-RPC、ステートレス)。クライアントには `Authorization: Bearer` の API トークンが必要で、セッション Cookie は拒否されます。 | MCP クライアントにプロジェクトを読ませたいときは `true`。 |

設定ではない固定の上限: モデルのインポートファイルは 512 MiB まで、アップロードする Python モジュールは 256 KiB までです。

## Compose の変数

`docker/compose.yaml` が使います。`docker/.env.example` を `docker/.env` にコピーして記入してください。

| 変数 | 必須 | 内容 |
|---|---|---|
| `FIONE_S3_ACCESS_KEY` | はい | Fione と SeaweedFS が共有する S3 の認証情報。たとえば `openssl rand -hex 16` で生成します。 |
| `FIONE_S3_SECRET_KEY` | はい | そのシークレット。たとえば `openssl rand -hex 32`。 |
| `FIONE_SETUP_TOKEN` | いいえ | 固定の最初の管理者用トークン (上記参照)。 |
| `FIONE_IMAGE_TAG` | いいえ | すべてのイメージをビルドするときのタグ (既定は `dev`)。 |
| `FIONE_PORT` | いいえ | Web UI のホスト側ポート (既定は `8080`、127.0.0.1 上)。 |
| `FIONE_PUBLIC_URL` | いいえ | ブラウザから見た Fione のオリジン。Fione に渡されます (上記参照)。 |
| `FIONE_SERVING_PORT` | いいえ | オプションの `fione-serving` サービスのホスト側ポート (既定は `8081`、127.0.0.1 上)。 |
| `FIONE_MODEL_DIR` | いいえ | `fione-serving` サービスがマウントするモデルのディレクトリ (既定は `./model`)。 |
| `FIONE_LLM_BASE_URL` | いいえ | Fione に渡されます (上記参照)。空ならプロバイダーの既定値で、`ollama` ではホスト上の Ollama、`http://host.docker.internal:11434/v1` です。`ollama` プロファイルでは `http://ollama:11434/v1`。 |
| `FIONE_LLM_PROVIDER` | いいえ | Fione に渡されます (既定は `ollama`。`claude` には下のキーが必要)。 |
| `FIONE_LLM_MODEL` | いいえ | Fione に渡されます。空ならプロバイダーの既定値 (`ollama` では `gemma4:12b-mlx`、`claude` では `claude-opus-5-5`)。`ollama` プロファイルでは `gemma4:12b` を指定します。 |
| `FIONE_LLM_API_KEY` | `claude` のとき | Fione に渡されます (上記参照)。 |
| `FIONE_LLM_AUTO_PULL` | いいえ | Fione に渡されます (既定は `false`。ボタンを押す人がいない `ollama` プロファイルでは `true` にします)。 |
| `FIONE_MCP_ENABLED` | いいえ | Fione に渡されます (既定は `false`、上記参照)。 |
| `COMPOSE_PROFILES` | いいえ | Docker Compose 自身の変数。`ollama` を指定すると Compose 内で Ollama サーバーを起動します ([アシスタントの設定と MCP](/ja/docs/assistant)を参照)。 |

`FIONE_S3_ACCESS_KEY` または `FIONE_S3_SECRET_KEY` が空のままだと、Compose は起動を拒否します。この 2 つの S3 の値に使える文字は `A-Z a-z 0-9 / + = . _ -` だけで、それ以外だと SeaweedFS が起動を拒否します。

## Fione Serving の設定

サービングイメージは次の変数を読みます ([Fione Serving](/ja/docs/serving)を参照)。

| 変数 | 既定値 | 内容 |
|---|---|---|
| `FIONE_MODEL_DIR` | `/model` | モデルのディレクトリ (`manifest.json` と `model.joblib`)。 |
| `FIONE_IMAGE_TAG` | イメージのタグ | モデルに記録されたタグと同じである必要があります。 |
| `FIONE_SERVING_MAX_BODY` | `10485760` (10 MiB) | `/invocations` のリクエストボディの最大サイズ (バイト)。 |
| `FIONE_SERVING_MAX_INSTANCES` | `10000` | 1 リクエストのインスタンスの最大数。 |
| `FIONE_SERVING_MAX_CONTRIBUTION_INSTANCES` | `100` | 寄与を求める (`"contributions": true`) 1 リクエストのインスタンスの最大数。寄与の計算中は通常の予測が待たされるため、小さくすると待ち時間が短くなります。 |
| `FIONE_SERVING_MAX_CONTRIBUTION_REQUESTS` | `2` | 寄与を求めるリクエストを同時に実行できる数。超えたリクエストはすぐに 503 になります。 |
| `PORT` | `8080` | コンテナ内のポート。 |

`FIONE_SERVING_*` の値は 1 以上の整数でなければならず、そうでないとコンテナは 1 行のメッセージを出力して終了ステータス 1 で終了します。

## fione-sdk の変数

Python クライアント [fione-sdk](/ja/guide/sdk) は、引数なしで `Client` を作るときに次の変数を読みます。

| 変数 | 内容 |
|---|---|
| `FIONE_URL` | Fione サーバーのアドレス。例: `http://localhost:8080`。 |
| `FIONE_TOKEN` | API トークン (**アカウント**ページで作成します)。`Authorization: Bearer` として送られます。 |

## 内部用の変数

`FIONE_JOB_DB` と `FIONE_JOB_HANDLER_MODULES` は、Fione がジョブのワーカープロセス用に設定します。設定しないでください。

## デプロイのメモ

### ワーカープロセスは 1 つ

Fione は uvicorn のワーカー **1 つ**の**1 プロセス**で動かす必要があります (イメージはそのようになっています)。サインインの制限、アップロードとパスワードハッシュの上限、新しい API トークンの一度きりの表示、ジョブランナーは、すべてそのプロセスのメモリ上にあります。ワーカーを複数にすると、それぞれが別の制限を持ち、ジョブキューも二重に動いてしまいます。`fione` サービスをスケールさせないでください。

### リバースプロキシの背後で使う

ポートは `127.0.0.1` だけに公開されています。ほかのマシンに提供するには、HTTPS のリバースプロキシを `127.0.0.1:8080` の前に置き、`fione` サービスの `environment` に次を設定します。

```yaml
FIONE_TRUST_PROXY: "true"     # クライアントアドレスを X-Forwarded-For から取る
FIONE_COOKIE_SECURE: "true"   # Cookie を HTTPS のみにする
```

`FIONE_TRUST_PROXY` がないと、すべてのクライアントがプロキシのアドレスから来たように見えるため、全ユーザーが「15 分あたり 50 回のサインイン失敗」という 1 つの枠 (`FIONE_LOGIN_MAX_FAILURES_PER_IP`) を共有します。1 人の入力ミスで全員がサインインできなくなることがあります。設定すると、Fione は `X-Forwarded-For` の**最後**の値、つまりプロキシが見たアドレスを使います。プロキシが連なっている場合は、最も近いプロキシが見たアドレスです。クライアントが Fione に直接アクセスできるときは決して設定しないでください。クライアントが自分のアドレスを自由に決められてしまいます。

nginx の例:

```nginx
server {
    listen 443 ssl;
    server_name fione.example.com;
    # ssl_certificate ...; ssl_certificate_key ...;

    client_max_body_size 1100m;          # アップロード上限 1 GiB とフォームの分

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $http_host;  # 必須: フォームは Origin と Host の一致を確認する
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_request_buffering off;       # 大きなアップロードをストリーミングする
        proxy_read_timeout 300s;
    }
}
```

`Host` の行は必ず残してください。サインインとすべてのフォーム送信は、ブラウザの `Origin` と Fione が見る `Host` を比べるため、ないと拒否されます (403)。

MCP エンドポイント (`/mcp`) は同じポートにあります。ネットワーク外の MCP クライアントを許可しないなら、プロキシでブロックしてください ([アシスタントの設定と MCP](/ja/docs/assistant)を参照)。

### セットアップトークン

管理者がまだいない間、最初の管理者のページはセットアップトークンを求めます。`FIONE_SETUP_TOKEN` を設定していなければ、Fione がトークンを生成して `<データディレクトリ>/setup-token` に保存し、管理者ができるまで起動のたびにログへ出力します。

```sh
docker compose -f docker/compose.yaml --env-file docker/.env logs fione | grep "Setup token"
```

ログを読める人は、あなたが作成するまで管理者を作成できます。最初の起動のあとすぐに管理者を作成してください (または `FIONE_SETUP_TOKEN` を設定します)。管理者ができると、トークンは使えなくなります。

### 秘密鍵

`/data/secret.key` (`fione-data` ボリューム上) は、セッションと学習済みモデルのマニフェストに署名します。ボリュームと一緒にバックアップしてください。失うか置き換えると、全員がもう一度サインインする必要があり、すでに学習したモデルは Fione が読み込めなくなります (署名の検証に通らなくなるため)。ダウンロード済みのサービング用ファイルは、Fione Serving が署名ではなくファイルのハッシュを確認するので、そのまま使えます。

### 一時領域

アップロードとインポートは `TMPDIR` に一時保存されます。イメージはこれをデータボリューム上の `/data/tmp` に設定しています。アップロードは変換中 (CSV とその Parquet コピー) に約 2 倍の容量が必要なので、既定の 1 GiB 上限なら 2 GiB 以上の空きを確保してください。

### ストレージ

SeaweedFS がデータセットとモデルを保存します (ボリューム `seaweed-data`。Docker は Compose プロジェクト名 `fione` にちなんで、ボリュームを `fione_seaweed-data` と `fione_fione-data` と名付けます)。S3 のポートはホストに公開されず、`fione` だけが Compose ネットワーク `backend` 経由で接続します。そのほかのポート (マスター、ファイラー、ボリューム) はそのネットワーク上では認証が不要ですが、そのネットワークに参加するのは `fione` と SeaweedFS だけです。オプションの `fione-serving` サービスは専用のネットワーク (`serving`) で動き、これらに接続できません。

### 言語モデルのサーバー

答えは、質問された時点から数えて `FIONE_LLM_TURN_TIMEOUT_SECS` で終わります。ユーザーが止めたときも、言語モデルのサーバーが応答しなくても、すぐに終わります。そのとき Fione はそのリクエストを待つのをやめますが、接続を必ず閉じられるとは限りません。1 バイトずつ送り続けるサーバーは、サーバー側のタイムアウトが来る (または Fione を再起動する) まで、そのリクエストの接続を握ったままにします。そうしたリクエストは共有プールの接続を 1 つずつ占有するため、おかしな動きをするサーバーのせいで、あとの答えがタイムアウトで終わることがあります。Fione が接続する言語モデルのサーバーは、自分で運用するものか信頼できるものだけにしてください。

Ollama がモデルのコンテキストを報告するのはモデルが読み込まれている間だけです。そのため、**システムの状態**ページの「サーバーのコンテキストが `FIONE_LLM_CONTEXT_TOKENS` より小さい」という警告も、モデルが読み込まれている間だけ表示されます。
