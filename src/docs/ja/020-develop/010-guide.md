---
title: 開発方法
---

## はじめに

FioneはFessの拡張機能として開発されています。
そのため、開発に必要な環境等は、Fessの[開発ガイド](https://fess.codelibs.org/ja/dev/getting-started.html)を参照してください。

## Fione

### 開発環境構築

FessとFioneのソースコードをGitHubから取得します。

```
git clone https://github.com/codelibs/fione.git
git clone https://github.com/codelibs/fess.git
```

FioneのソースコードをFessのソースコードにマージします。

```
cd fione
bash ./tools/devcmd.sh copy
```

### 開発作業

FioneはFess以外にH2OサーバとMinIOサーバが必要になるため、devcmd.shを利用して起動します。
devcmd.shはDocker Composeでそれらを起動しています。

```
bash ./tools/devcmd.sh start
```

ここまでできたら、Fessのソースコードに移動して開発を始めます。

```
cd ../fess
```

Fessの[開発ガイド](https://fess.codelibs.org/ja/dev/getting-started.html)を参考にして、開発をしてください。


### 作業完了後

Fess上で変更したFioneのコードをFione側に戻します。

```
cd ../fione
bash ./tools/devcmd.sh restore
```

H2Oサーバなどを停止します。

```
bash ./tools/devcmd.sh stop
```

## Fione Serving

[Fione Serving](https://github.com/codelibs/fione-serving)はH2OのモデルをAPI化するウェブサーバーです。
Java 11環境で、Spring Bootで作られています。
