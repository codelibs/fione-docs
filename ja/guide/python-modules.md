---
title: データ操作のための Python モジュール
description: Fione 組み込みの Python モジュール（結合、計算列、ラグ、移動統計量、k-means）の使い方と、管理者が独自モジュールをアップロードする方法を説明します。
---

# データ操作のための Python モジュール

**Python モジュール**は、サーバー上のジョブとして実行されるデータ操作です。データセットといくつかのパラメーターを受け取り、新しいデータセットを作ります。Fione には、表の基本的な操作（結合、形の変換、計算列、前の時点の値、移動統計量、順位）、k-means クラスタリング、低ランク分解の組み込みモジュールがあり、管理者は独自のモジュールをアップロードできます。

モジュールは入力を変更しません。結果は同じプロジェクトの新しいデータセットとして保存されるので、中身を確認したり、学習に使ったり、別のモジュールに渡したりできます。

## モジュールの場所

アカウントメニューから **Python モジュール**を選びます。管理者には常にこの項目が表示され、ほかのユーザーには、同じメニューの**表示**を**詳細**にしたときに表示されます。ページには、すべてのモジュールのモジュール ID、名前、種類、パラメーター、提供元（**組み込み**または**アップロード**）、アップロードしたものはサイズとアップロード日時が一覧で表示されます。

![Python モジュールのページ](./img/modules.png)

ログインできるユーザーなら誰でも一覧を見られます。モジュールの実行にはプロジェクトの書き込み権限が、アップロードと削除には管理者ロールが必要です。

モジュールは [Python クライアント](/ja/guide/sdk)、[REST API](/ja/docs/rest-api)、[MCP クライアント](/ja/guide/mcp)からジョブとして実行します。このページは一覧（カタログ）です。アシスタントが結合を提案し、あなたが確認して実行することもできます（[アシスタント](/ja/guide/assistant)を参照）。

## モジュールの種類

| 種類 | ページでの表示 | 内容 |
|---|---|---|
| `frame` | データ操作 | データセットを別のデータセットに変換します。 |
| `train` | モデルの学習 | データセットを新しいデータセットに変換し、**同時に**小さな学習済みの状態（Fione ではモジュールモデルと呼びます）を保存します。 |
| `predict` | 予測 | モジュールモデルの状態をデータセットに適用します。状態の ID は `module_model_id` で渡します。 |

`predict` モジュールの結果は `predict` タイプのデータセット、ほかのモジュールの結果は `train` タイプのデータセットとして保存されます。`name` を指定しない場合、新しいデータセットの名前は `<モジュール ID>_<入力データセット名>` になります。

## 組み込みモジュール

### データ操作

| ID | 名前 | 内容 |
|---|---|---|
| `cbind` | Combine columns | 2 つ目のデータセット（`other_dataset_id`）の列を、1 つ目の列の右に並べます。行数が同じである必要があります。 |
| `rbind` | Combine rows | 2 つ目のデータセット（`other_dataset_id`）の行を、1 つ目の下に積みます。列の集合が同じである必要があります（順序は問いません）。 |
| `concat` | Concatenate datasets | 2 つのデータセットを横に並べる（`axis` が 1、初期値）か、縦に積みます（`axis` が 0。片方にしかない列は、もう片方の行では空になります）。 |
| `join` | Join datasets by key columns | キーが同じ行に、もう一方のデータセットの列を追加します。1 つ目の行はすべて残ります。[結合](#joining)を参照してください。 |
| `cslice` | Slice columns | 指定した `columns` だけを残します。 |
| `rslice` | Slice rows | `row_conditions` に合う行だけを残します。 |
| `replace` | Replace values | `row_conditions` に合う行（空ならすべての行）の `column` を `value` に置き換えます。 |
| `sort` | Sort | `column` で並べ替えます（`ascending`、初期値は `true`）。空の値は最後に並びます。 |
| `fillna` | Fill missing values | 欠損値を前の値（`method` が `forward`、初期値）または次の値（`backward`）で、列の方向（`axis` が 0）または行の方向（`axis` が 1）に、連続する欠損を最大 `maxlen` セル（初期値 1）まで埋めます。 |
| `floor` | Apply floor | 数値の `columns` だけを、切り捨てて返します。 |
| `cor` | Compute correlation | 数値の `columns` の相関行列を返します（`method` は `pearson` か `spearman`）。 |
| `pivot` | Pivot table | `index` の値ごとに 1 行、`column` の値ごとに 1 列を作り、`value` で埋めます。[形の変換](#reshaping)を参照してください。 |
| `unpivot` | Unpivot columns into rows | 列を行に変換します。入力の 1 行・1 列ごとに 1 行になります。[形の変換](#reshaping)を参照してください。 |
| `calc` | Add a calculated column | ほかの列から `expression` で計算した列 `name` を追加します。[計算列](#calculated-columns)を参照してください。 |
| `lag` | Add values from earlier times | `columns` の、`time` で見て前の時点の値を追加します。[時間と順序](#time-and-order)を参照してください。 |
| `rolling` | Add statistics of nearby values | `order` の順で各行の前・前後・後の行について、`columns` の統計量を追加します。[時間と順序](#time-and-order)を参照してください。 |
| `rank` | Add the rank within a group | `by` のグループ内での `column` の順位を追加します。[時間と順序](#time-and-order)を参照してください。 |
| `split` | Split into train, valid and test | `train_ratio`、`valid_ratio`、`test_ratio`（相対的な重み。初期値は 70、15、15）と `seed` によるランダム分割のうち、`part`（`train`、`valid`、`test`）の 1 つを返します。行の順序は保たれます。 |
| `tokenize` | Tokenize text | テキスト列（`target_column`）を 1 行 1 トークンに分割します。各文書の後ろに空行が入ります。`mode` は `word`（文字・数字・`_` の連なり。初期値）、`whitespace`、`delimiter`（`delimiter` を指定）です。 |

`row_conditions` は `age >= 30 & country == JP` のような文字列です。`列 演算子 値` の形の条件（演算子は `==`、`!=`、`<`、`<=`、`>`、`>=` で、前後に空白が必要です）または `列 is empty` / `列 is not empty` を、`&`（かつ）と `|`（または）でつなぎます。`&` のほうが先に評価されます。括弧は使えず、値に `&` や `|` を含めることはできません。空のセルはどの比較にも（`!=` にも）一致しません。空の文字列は、すべての行に一致します。

列を使って計算するモジュール（`calc`、`lag`、`rolling`、`rank`、`floor`、`cor` と後述のクラスタリングのモジュール）には、整数または浮動小数点の列が必要です（`calc` では真偽値を 1 と 0 として扱います）。テキスト列や日付列を指定するとジョブは失敗し、その列の名前が示されます。列名と列の型はジョブの実行時に検証されます。

#### 結合 {#joining}

`join` は、1 つ目のデータセットのキーと、もう一方のデータセットのキーを照合します。キー列が 1 つなら `key` に、複数の列の組み合わせで行が決まるなら `keys` に指定します。もう一方のデータセットでは `other_key` または `other_keys` に指定します（どちらも空なら同じ名前の列）。キーが空の行はどの行とも一致しません。数値のキーは同じ文字列と一致します（`7` は `"7"` と一致）。

もう一方のデータセットでは、同じキーが 1 行にだけ現れる必要があります。複数行に現れる場合は `summarize` を `true` にします。もう一方のデータセットがキーごとの 1 行にまとめられ、行数（`rows`）、数値列ごとに `stats` の統計量（`mean`、`min`、`max`、`sum`、`std`、行の順で最後の値 `last` から選びます。初期値は `mean,min,max,sum`）、その他の列の値の種類数が追加されます。`columns` を指定すると、もう一方のデータセットのその列だけが追加（または集計）されます。ジョブは、一致する行がなかった行数を報告します。

#### 形の変換 {#reshaping}

`pivot` は `index`、`column`、`value` を取ります。1 つのセルに複数の行が当たる場合、その値は `agg` で決まります。`first`（初期値。複数の値があったセルの数をジョブが報告します）、`sum`、`mean`、`min`、`max`、`count` です。`index` または `column` が空の行は除かれます。

`unpivot` は `keep` の列を各行に残し、それ以外の列（または `columns` の列だけ）を 2 つの列に変換します。列名が入る `name`（初期値 `variable`）と、その値が入る `value`（初期値 `value`）です。

#### 計算列 {#calculated-columns}

`calc` は、`expression` から浮動小数点の列 `name`（まだない名前）を追加します。たとえば `price * quantity` や `where(age >= 65, 1, 0)` です。

- 列名はそのまま書きます。空白や記号を含む名前や、単純な単語でない名前は `col("unit price")` と書きます。
- 四則演算と累乗 `+ - * / **`。比較 `== != < <= > >=` と論理演算 `&`、`|`、`~` は 1 か 0 になります。比較を `&` や `|` でつなぐときは、それぞれを括弧で囲みます。
- 関数: `abs`、`sqrt`、`log`、`log1p`、`exp`、`floor`、`sin`、`cos`、`radians`、`min2(a, b)`、`max2(a, b)`、`mod2(a, b)`、`atan2(y, x)`、`clip(x, lo, hi)`、`isnull(x)`、`where(cond, x, y)` と定数 `nan`。
- 行の関数 `rowsum`、`rowmean`、`rowcount` は、値と、`rowsum("score_*")` のように引用符で囲んだ列名のパターンを取り、空の値は飛ばします。

結果が無限大になった値（0 での除算、`log(0)` など）は空になり、それが起きた行数をジョブが報告します。

#### 時間と順序 {#time-and-order}

`lag` は `<列>_lag<k>` を追加します。`by` のグループごとに、`columns` の各列の、`time` で `k` ステップ前の値です（`k` は `lags` にカンマ区切りで指定、初期値 `1`）。`time` には整数、`step` 間隔の数値、または日付（1 ステップは 1 日なので、週ごとのデータでは `step` を 7 にします）を使えます。グループ内で時間が同じ行は、まず平均または合計（`how` が `mean` か `sum`）にまとめられます。その前の時点の行がなければ値は空になり、ほとんどの行で空になったラグ列はジョブが報告します。

`rolling` は、`by` のグループごとに `order`（数値または日付）で並べて、`columns` の各列について `<列>_<side><window>_<stat>`（または `<列>_<side>_span<span>_<stat>`）を追加します。

- `window` は行数で、`span` は `order` での距離（日付なら日数）で範囲を指定します。どちらか一方だけを指定します。
- `side` は `before`（その行を含まない前の行。初期値）、`after`（後の行）、`around`（その行を中心とする奇数の `window`。その行を含みます）です。`after` と `around` は後の行を読むので、将来の予測には向きません。
- `stats` は `mean`、`std`、`min`、`max`、`sum`、`count` からカンマ区切りで選びます（初期値 `mean`）。

`rank` は、`by` のグループごとに、1/n から 1 までの割合で表した順位 `<列>_rank`（`how` が `percent`、初期値）、または同じ値が同じ順位になる 1, 2, 3 の順位 `<列>_dense_rank`（`how` が `dense`）を追加します。`among` を指定すると、`among` のグループごとにまず平均をとり、1 つとして順位を付けます。

### クラスタリングと低ランク分解

どちらも組になっています。`train` モジュールがデータセットから学習し、`predict` モジュールが同じ列を持つ任意のデータセットに学習結果を適用します。

| ID | 名前 | 主なパラメーター |
|---|---|---|
| `kmeans_train` | K-means (train) | `columns`（空ならすべての列。どれも数値列であること）、`k`（初期値 3）、`init`、`max_iterations`、`standardize`（初期値 `true`）、`seed`、`output_columns` |
| `kmeans_predict` | K-means (assign clusters) | `module_model_id`（`kmeans_train` の状態）、`output_columns` |
| `lowrank_train` | Low-rank projection (train) | `columns`、`method`（`svd` か `nmf`）、`n_components`（初期値 2）、`seed`、`output_columns` |
| `lowrank_predict` | Low-rank projection (project) | `module_model_id`（`lowrank_train` の状態）、`output_columns` |

k-means は `cluster` 列（0 からの番号）を、低ランク分解は `component_1`、`component_2` などの列を追加します。結果にはこれらの列と、`output_columns` で指定した入力列だけが含まれます。欠損値は学習時の列の平均値で置き換えられます。選んだ列はすべて整数または浮動小数点の列（テキスト、日付、真偽値は不可）である必要があり、そうでないとジョブは失敗し、該当する列の名前が示されるので、数値列を `columns` に列挙してください。`nmf` には 0 以上の値が必要です。`predict` モジュールは、同じプロジェクトにある、対応する `train` モジュールの状態だけを受け付けます。

各モジュールのパラメーターの全一覧（型、初期値、上限・下限）は、`GET /api/v1/modules` で取得できます。

## モジュールを実行する

モジュールの実行はジョブです。[Python クライアント](/ja/guide/sdk)では次のようにします。

```python
from fione_sdk import Client

fione = Client()
job = fione.run_module(
    "<project-id>", "sort", dataset_id, {"column": "age"}, name="sorted by age"
)
job.wait()
sorted_frame = fione.read("<project-id>", job.result["dataset_id"])
```

[REST API](/ja/docs/rest-api) では、`POST /api/v1/projects/<project-id>/jobs/module` にモジュール、データセット、パラメーターを渡します。

```sh
curl -X POST http://localhost:8080/api/v1/projects/<project-id>/jobs/module \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"module_id": "sort", "dataset_id": 1, "params": {"column": "age"}}'
```

ジョブが完了すると、`result.dataset_id` が新しいデータセットです。`train` モジュールは `result.module_model_id` も返します。これを対応する `predict` モジュールの `module_model_id` に渡します。

```python
train = fione.run_module(
    project_id, "kmeans_train", train_id, {"k": 3, "columns": ["sepal_length", "sepal_width"]}
).wait()
clusters = fione.run_module(
    project_id, "kmeans_predict", new_rows_id, {"module_model_id": train.result["module_model_id"]}
).wait()
```

パラメーターはジョブをキューに入れる前に検証されます。未知のパラメーター名、必須パラメーターの不足、型の違いや範囲外の値、別のプロジェクトのデータセットやモジュールモデルはその場で拒否されます。列名と列の型はジョブの実行時に検証されます。モジュールによっては、結合で一致しなかった行数などの通知を、完了したジョブに追加します。ジョブは短時間ジョブのキューで実行され（同時実行数は `FIONE_MAX_CONCURRENT_SHORT_JOBS`）、データセット全体をメモリに読み込みます。

## 独自のモジュールをアップロードする（管理者）

モジュールは、UTF-8 で 256 KB までの Python ファイル 1 つです。モジュールを説明する辞書 `MODULE` と、処理を行う関数 `run(df, params, ctx)` の 2 つを定義します。

```python
# sepal_area.py
MODULE = {
    "name": "Add sepal area",
    "kind": "frame",
    "params": {
        "properties": {
            "scale": {"type": "number", "default": 1.0},
        },
        "required": [],
    },
}


def run(df, params, ctx):
    return df.assign(sepal_area=df["sepal_length"] * df["sepal_width"] * params["scale"])
```

### `MODULE`

`MODULE` には 3 つのキーがすべて必要です。

| キー | 意味 |
|---|---|
| `name` | ページに表示する名前です（100 文字を超えると短縮されます）。 |
| `kind` | `"frame"`、`"train"`、`"predict"` のどれか。 |
| `params` | パラメーターを `{"properties": {...}, "required": [...]}` の形で記述します。各プロパティには `type` が必要で、`default`、`description`、`enum`、`minimum`、`maximum`、`maxLength`、`maxItems`、`items` も指定できます。 |

パラメーターの `type` は `string`、`integer`、`number`、`boolean`、`array`（文字列の配列）のいずれかで、これ以外は使えません。入れ子の辞書は受け取れません。Fione はジョブごとに、この記述に沿ってパラメーターを検証し、`run` を呼ぶ前に初期値を補います。

次の 2 つのパラメーター名には特別な意味があり、型は整数にする必要があります。

- `other_dataset_id`: `ctx.other` に、そのデータセットが 2 つ目のデータフレームとして入ります。
- `module_model_id`: `ctx.state` に、`train` モジュールが保存した状態が入ります。`predict` モジュールでは必ず宣言します。

### `run(df, params, ctx)`

- `df` は入力データセットで、pandas の DataFrame です。
- `params` は検証済みのパラメーターで、初期値が補われています。
- `ctx` には `other`（2 つ目のデータセット。なければ `None`）と `state`（保存された状態。なければ `None`）があります。
- `frame` と `predict` のモジュールは DataFrame を返します。`train` モジュールは `(DataFrame, state)` の組を返します。`state` は JSON オブジェクト（文字列、数値、真偽値、リスト、辞書でできた辞書）で、8 MB までです。pickle は使いません。状態は単なる JSON なので、読み込んでもコードは実行されません。

返す DataFrame には 1 列以上が必要で、列名は重複しない文字列にし、セル数（行数 × 列数）は 1 億 5,000 万以下にします。`run` が例外を送出するとジョブは失敗し、メッセージには例外の種類が含まれます。メッセージからはファイルパスが取り除かれます。

`train` と `predict` の組は次のようになります。

```python
# column_mean_train.py
MODULE = {
    "name": "Column mean (train)",
    "kind": "train",
    "params": {
        "properties": {"column": {"type": "string"}},
        "required": ["column"],
    },
}


def run(df, params, ctx):
    column = params["column"]
    return df, {"column": column, "mean": float(df[column].mean())}
```

```python
# column_mean_apply.py
MODULE = {
    "name": "Center on the column mean",
    "kind": "predict",
    "params": {
        "properties": {"module_model_id": {"type": "integer"}},
        "required": ["module_model_id"],
    },
}


def run(df, params, ctx):
    column, mean = ctx.state["column"], ctx.state["mean"]
    return df.assign(**{column + "_centered": df[column] - mean})
```

### アップロードする

Web アプリでは、**Python モジュール**を開き、**モジュールをアップロード**を選び、**モジュール ID** を入力し、**Python ファイル(.py)** を選びます。コードがサンドボックスなしで実行されることを理解したことを確認するチェックを入れて、**モジュールをアップロード**を選びます。ID は 1〜40 文字の英小文字・数字・`_` で、英字から始めます。組み込みモジュールや、すでにあるモジュールの ID は使えません。

API では、`id` と `file` のフィールドを持つ multipart フォームでファイルをアップロードします。

```sh
curl -X POST http://localhost:8080/api/v1/modules \
  -H "Authorization: Bearer <your-token>" \
  -F id=sepal_area \
  -F file=@sepal_area.py
```

Fione は、ファイルを短時間だけ動く別プロセスで 1 度インポートして `MODULE` を読み取り、記述を検証します（10 秒以内に読み込める必要があるため、ファイルの先頭レベルの処理は軽くしてください）。構文エラー、`MODULE` や `run` の欠落、未知の `kind`、整数の `module_model_id` を持たない `predict` モジュールは、メッセージ付きで拒否されます。

モジュールを置き換えるには、先に削除してからアップロードし直します。モジュールの削除（ページの**削除**、または `DELETE /api/v1/modules/<module-id>`）では、そのモジュールが学習した状態も削除されます。データセットと完了したジョブの結果は残ります。組み込みモジュールは削除できません。

::: warning アップロードしたモジュールはサンドボックス化されていません
アップロードしたモジュールは、ジョブのワーカーで Fione 自身と同じ権限で実行されます。インストールの秘密鍵、環境変数、すべてのプロジェクトのデータを読めます。内容を確認して信頼できるコードだけをアップロードしてください。そのため、アップロードできるのは、警告を確認した管理者だけです。組み込みモジュールには影響しません。
:::

モジュールを置き換えたとき、まだ待機中のジョブは、キューに入れた時点のソースではなく、新しいソースで実行されます。この点とモジュールに関するその他の注意は、[既知の制限](/ja/docs/known-limitations)を参照してください。
