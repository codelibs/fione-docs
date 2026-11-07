---
title: "Fione Serving: 予測 API"
description: "fione-serving イメージで、学習済みの Fione モデルを HTTP の予測 API として動かします。/invocations、/model、/ping、寄与、上限を解説します。"
---

# Fione Serving

Fione Serving は、学習済みのモデル 1 つを提供する小さな予測 API です。Fione からモデルを*サービング用ファイル* (zip) としてダウンロードし、展開して、`fione-serving` イメージで動かします。イメージはどのモデルでも同じで、ファイルにはモデルのファイルだけが入っています。

## イメージを用意する

イメージは Fione のリポジトリからビルドします。モデルを学習した **`fione` イメージと同じ `FIONE_IMAGE_TAG`** でビルドする必要があります。モデルにはそのタグが記録されていて、サービングイメージは別のタグのモデルを受け付けないためです。

Docker Compose では、リポジトリのルートで次を実行します (タグは `docker/.env` から取られ、既定は `dev`)。

```sh
docker compose -f docker/compose.yaml --env-file docker/.env --profile serving build fione-serving
```

通常の Docker では次のとおりです。

```sh
docker build -f docker/Dockerfile.serving --build-arg FIONE_IMAGE_TAG=dev \
    -t ghcr.io/codelibs/fione-serving:dev .
```

イメージは Fione と同じ機械学習ライブラリを含みます。既定の名前 `ghcr.io/codelibs/fione-serving` は、Fione の UI が実行コマンドに書く名前です (`FIONE_SERVING_IMAGE` で変更できます。[設定リファレンス](/ja/docs/configuration)を参照)。

## モデルを動かす

モデルの**予測結果サマリー**ページにある**自分のシステムで使う**カードに、**サービング用ファイルをダウンロード**ボタンと、実行するコマンドが表示されます。タグ `dev` のイメージで学習したモデルでは次のとおりです。

```sh
docker run --rm -p 8081:8080 -v "$PWD/model:/model:ro" ghcr.io/codelibs/fione-serving:dev
```

ファイルを展開した場所で実行してください。zip には `model/` ディレクトリがあり、中に `manifest.json` と `model.joblib` が入っています。

```sh
unzip fione-serving-*.zip
docker run --rm -p 8081:8080 -v "$PWD/model:/model:ro" ghcr.io/codelibs/fione-serving:dev
```

API はコンテナ内のポート 8080 で待ち受けます (`-p 8081:8080` でホストの 8081 に、ホストのすべてのネットワークインターフェースで公開されます)。**この API には認証がありません**。予測にはリクエストサイズの上限 (後述) のほかに回数や同時実行の制限もありません (数を制限しているのは、[寄与](#寄与)を求めるリクエストの同時実行だけです)。このマシンの中に留めるには `-p 127.0.0.1:8081:8080` で公開し、ほかの人に提供するには認証付きのリバースプロキシを前に置いてください。プロセスは root ではないユーザーで動き、`/model` を読むだけです。

モデルを提供できないときは、コンテナが 1 行のメッセージを出力して終了ステータス 1 で終了します。例:

```text
ERROR: the model in /model was made for image tag 'dev', but this image is tag '9.9'; run it with the image tagged dev
```

同じファイルとコマンドは REST API からも取得できます。`GET /api/v1/models/{id}/serving` (zip) と `GET /api/v1/models/{id}/serving/info` (コマンドと `curl` の例) です。[REST API](/ja/docs/rest-api)を参照してください。

### Docker Compose で動かす

Compose ファイルにはオプションの `fione-serving` サービスがあります。`./model` に展開したモデルに対して、`serving` プロファイルで起動します。

```sh
FIONE_MODEL_DIR=$PWD/model docker compose -f docker/compose.yaml --env-file docker/.env \
    --profile serving up fione-serving
```

API は `127.0.0.1:8081` で公開され (ポートは `FIONE_SERVING_PORT` で変更できます)、専用の Compose ネットワークで動くので、提供中のモデルから Fione のストレージには接続できません。

## API

レスポンスは JSON です。リクエストボディに特定の `Content-Type` は必要ありません。

### POST /invocations

各インスタンスを予測します。リクエストは `{"instances": [...]}` で、1 行につき 1 つのオブジェクトに、すべての入力列の値を入れます。余分なキーは無視されます。

```sh
curl -s -X POST localhost:8081/invocations -H 'Content-Type: application/json' -d '{"instances":[
  {"sepal length (cm)":5.1,"sepal width (cm)":3.5,"petal length (cm)":1.4,"petal width (cm)":0.2},
  {"sepal length (cm)":6.3,"sepal width (cm)":3.3,"petal length (cm)":6.0}]}'
```

レスポンスには、インスタンスと同じ順序で 1 件ずつ予測が入ります。予測できない行は `{"exception": "..."}` になり、ほかの行には影響しません。iris のモデルで実際に実行した結果:

```json
{"predictions":[
  {"label":"setosa","index":0,"class_probabilities":[0.9934803442259019,0.003455065889847104,0.0030645898842508773]},
  {"exception":"missing columns: ['petal width (cm)']"}]}
```

- 分類 (2 クラス以上): `label` (予測したクラス)、`index` (`GET /model` のクラス一覧での位置)、`class_probabilities` (その順序の確率)。
- 回帰: `{"value": 12.3}`。
- 数値の列に数値でない文字列を渡した、列が足りない、行がオブジェクトでない場合: その行は `{"exception": "..."}` になります。

リクエスト全体を拒否するエラーは `{"error": "..."}` で返ります。

| ステータス | 条件 |
|---|---|
| 400 | ボディが JSON でない (または `NaN` / `Infinity` を含む)、オブジェクトでない、`instances` のリストがない、または `contributions` の値が `true`・`false`・`null` 以外。 |
| 413 | ボディが `FIONE_SERVING_MAX_BODY` (10 MiB) を超える、インスタンスが `FIONE_SERVING_MAX_INSTANCES` (10,000) を超える、または寄与を求めるインスタンスが `FIONE_SERVING_MAX_CONTRIBUTION_INSTANCES` (100) を超える。 |
| 422 | クラスと列が非常に多いモデルで寄与を求め、許されるインスタンス数がそれより少ない (または 0) 。 |
| 503 | 寄与を求めるリクエストが多すぎる。レスポンスに `Retry-After: 1` が付きます。 |

上限は変更できます ([サービングイメージの設定](#サービングイメージの設定)を参照)。

#### 寄与

リクエストに `"contributions": true` を加えると、予測した各行について、各入力列がモデルの平均予測 (`bias`) からどれだけ予測を動かしたかが得られます。

```sh
curl -s -X POST localhost:8081/invocations -H 'Content-Type: application/json' -d '{"instances":[
  {"sepal length (cm)":5.1,"sepal width (cm)":3.5,"petal length (cm)":1.4,"petal width (cm)":0.2},
  {"sepal length (cm)":6.3,"sepal width (cm)":3.3,"petal length (cm)":6.0}],
  "contributions":true}'
```

予測した各行は通常のキーに加えて、最後に `contributions` を持ちます。予測できない行は `{"exception": "..."}` のままです。別の学習で作った iris のモデルで実際に実行した結果です (確率は上の例と異なります)。

```json
{"predictions":[
  {"label":"setosa","index":0,"class_probabilities":[0.9958831248710637,0.0024227084186831337,0.0016941667102532],
   "contributions":{"bias":0.3770290408942638,"columns":{"sepal length (cm)":0.08218648759824686,
     "sepal width (cm)":0.12263535619818028,"petal length (cm)":0.20102939560338035,"petal width (cm)":0.21300284457699228}}},
  {"exception":"missing columns: ['petal width (cm)']"}]}
```

- `bias` と `columns` の値の合計が、説明している出力になります。
  - 2 クラス: 2 番目のクラスの確率 `class_probabilities[1]`。
  - 3 クラス以上: 予測したクラスの確率 `class_probabilities[index]`。
  - 回帰: `value`。
- `columns` には入力列ごとに 1 件が入り、順序は `GET /model` の `names` と同じです。`bias` は `columns` の外にあるので、`bias` という名前の入力列があっても衝突しません。
- 値は近似です。モデルは複数のモデルを組み合わせていて、その寄与も組み合わせているためです。合計は (丸めの範囲で) 出力に一致します。
- 寄与の計算は、予測よりずっと重い処理です。1 リクエストで受け付けるのは最大 100 インスタンスで (それ以上は 413)、クラスと列が非常に多いモデルではさらに少なくなります (422)。同時に実行できるのは最大 2 リクエストで、それを超えたリクエストは `Retry-After: 1` 付きですぐに 503 になります。どちらの数も変更できます (後述)。
- モデルは 1 回に 1 つの呼び出ししか処理しないので、寄与の計算中は通常の予測が待たされます。調整するのはインスタンス数の上限で、`FIONE_SERVING_MAX_CONTRIBUTION_INSTANCES` を小さくするほど 1 回の待ち時間が短くなります。
- `"contributions"` は `true`、`false`、`null` のいずれかでなければなりません (それ以外は 400)。指定しない場合や `false`・`null` の場合、レスポンスに `contributions` のキーはありません。

### GET /model

モデルが受け取るものと予測するもの。同じ iris のモデルの例:

```json
{"names":["sepal length (cm)","sepal width (cm)","petal length (cm)","petal width (cm)","species"],
 "domains":[null,null,null,null,["setosa","versicolor","virginica"]],
 "responseColumn":"species","category":"Multinomial","nclasses":3,"nfeatures":4,
 "uuid":"bae3b2e75a8474233aab6ce1ad9163b8",
 "instance":{"sepal length (cm)":"?","sepal width (cm)":"?","petal length (cm)":"?","petal width (cm)":"?"},
 "engine":"fione","fioneVersion":"20.0.0"}
```

| フィールド | 意味 |
|---|---|
| `names` | 入力列、続いて予測する列。 |
| `domains` | 名前ごとに、カテゴリ列の既知のカテゴリ (数値列、またはカテゴリが 1,000 を超える列は `null`)。最後がクラス (回帰では `null`)。 |
| `responseColumn` | 予測する列。 |
| `category` | `Binomial` (2 クラス)、`Multinomial` (3 クラス以上)、`Regression`。 |
| `nclasses` | クラス数 (回帰では `1`)。 |
| `nfeatures` | 入力列の数。 |
| `uuid` | モデルファイルの SHA-256 の先頭 32 桁 (16 進数)。 |
| `instance` | リクエストの 1 行のひな形。 |
| `engine`, `fioneVersion` | `fione`、およびモデルを学習した Fione のバージョン。 |

### GET /ping と GET /

サーバーが動いている間は、空の `200` レスポンスを返します。イメージの Docker ヘルスチェックは `/ping` を使います。Fione Serving に `/health` エンドポイントはありません。`/api/v1/health` は Fione サーバーのものです。

## モデルファイルと信頼

モデルは `model.joblib` (Fione のモデルクラスの joblib pickle) と `manifest.json` (イメージタグ、Fione のバージョン、タスク、予測する列、各ファイルの SHA-256) です。Fione の内部では、マニフェストにこのインストールの秘密鍵で署名もされていて、Fione は署名を検証できたモデルだけを読み込みます。

Fione Serving はその署名を確認できません (秘密鍵を持たないため)。イメージタグが一致することと、すべてのファイルが記録された SHA-256 に一致することを確認してから、モデルを unpickle します。**pickle の読み込みはコードを実行します**。自分の Fione からダウンロードしたファイルだけを動かしてください。Fione でのモデルのインポート (管理者だけができます) も同じです。このインストールが署名していないファイルをインポートするには、「このファイルを私が保証する」という意味の*信頼*オプションを明示的に選ぶ必要があり、そのモデルは出所が未確認のものとして表示されます。

## サービングイメージの設定

| 変数 | 既定値 | 内容 |
|---|---|---|
| `FIONE_MODEL_DIR` | `/model` | モデルのディレクトリ。 |
| `FIONE_IMAGE_TAG` | イメージのタグ | モデルのタグと同じである必要があります (ビルド時に設定)。 |
| `FIONE_SERVING_MAX_BODY` | `10485760` | リクエストボディの最大サイズ (バイト)。 |
| `FIONE_SERVING_MAX_INSTANCES` | `10000` | 1 リクエストのインスタンスの最大数。 |
| `FIONE_SERVING_MAX_CONTRIBUTION_INSTANCES` | `100` | `"contributions": true` を付けた 1 リクエストのインスタンスの最大数。 |
| `FIONE_SERVING_MAX_CONTRIBUTION_REQUESTS` | `2` | 寄与を求めるリクエストを同時に実行できる数。超えると 503。 |
| `PORT` | `8080` | コンテナ内のポート。 |

`docker run` の `-e` で渡します。例: `-e FIONE_SERVING_MAX_INSTANCES=1000`。1 つのコンテナでは、予測は 1 回に 1 つだけ実行されます (ライブラリが複数の CPU コアを使うため)。寄与を求めるリクエストは、予測と同じ順番で寄与も計算するので、その間は通常の予測が待たされます。すべての設定は[設定リファレンス](/ja/docs/configuration)にまとめています。
