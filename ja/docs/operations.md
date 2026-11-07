---
title: "運用: 停止・バックアップ・アップグレード"
description: Fione の停止、Docker ボリュームと秘密鍵のバックアップ、新しいマシンへの復元、データを失わずに Fione 20 の新しい版へアップグレードする方法です。
---

# 運用: 停止・バックアップ・アップグレード

このページでは、[インストール](/ja/guide/installation) の Docker Compose 構成で動かしている Fione の、日々の管理を説明します。コマンドはすべてリポジトリのルートで実行してください。個々の設定は [設定](/ja/docs/configuration) にあります。

## データの置き場所

| 場所 | 内容 |
|---|---|
| Docker ボリューム `fione_fione-data`(`fione` コンテナの `/data`) | SQLite データベース(ユーザー、プロジェクト、ジョブなどのメタデータ)、**秘密鍵**(`secret.key`)、管理者ができるまでのセットアップトークン、ジョブのログ、一時ファイル。 |
| Docker ボリューム `fione_seaweed-data` | データセットと学習済みモデル。SeaweedFS(S3 互換)が保存します。 |
| `docker/.env` | Fione と SeaweedFS が共有する S3 の認証情報と、追加した任意の設定。ボリュームには入っていません。 |
| Docker ボリューム `fione_ollama-data` | 言語モデルのファイル。Compose のプロファイル `ollama` を使うときだけあります。 |

ボリュームの名前は、Compose のプロジェクト名 `fione` から Docker が付けます。SeaweedFS ではなく別の S3 互換サービスにデータセットとモデルを保存している場合は、2 行目のデータはそのサービスにあります。そのサービス自身のツールでバックアップしてください。

## 停止と起動

Fione を停止します。データは Docker ボリュームに残ります。

```sh
docker compose -f docker/compose.yaml --env-file docker/.env down
```

再び起動するには、インストールのときのコマンドを実行します。

```sh
docker compose -f docker/compose.yaml --env-file docker/.env up -d --build --wait
```

`down -v` を付けると、ボリュームが削除され、すべてのプロジェクト・モデル・ユーザーも消えます。最初からやり直すとき以外は、`-v` を付けないでください。

コンテナは、停止していなければ自動で再起動する設定です。Docker やマシンを再起動したときも、元に戻ります。

## バックアップ

バックアップは Fione を停止してから行います。次のコマンドで、カレントディレクトリに 2 つのアーカイブを書き出します。

```sh
docker run --rm -u 0 -v fione_fione-data:/data:ro --entrypoint tar ghcr.io/codelibs/fione:dev czf - -C /data . > fione-data.tgz
docker run --rm -u 0 -v fione_seaweed-data:/data:ro --entrypoint tar ghcr.io/codelibs/fione:dev czf - -C /data . > seaweed-data.tgz
```

`FIONE_IMAGE_TAG` を `dev` 以外にしてイメージをビルドした場合は、これらのコマンドの `dev` を自分のタグに置き換えてください。

次の点に注意してください。

- `fione-data.tgz` には、データベースと**秘密鍵**が入っています。外に出さないでください。
- 秘密鍵は、セッションと学習済みモデルのマニフェストの署名に使われます。なくしたり差し替えたりすると、全員がログインし直す必要があり、学習済みのモデルを Fione が読み込めなくなります。必ず `fione-data` ボリュームの残りと一緒にバックアップしてください。詳しくは [設定](/ja/docs/configuration) の秘密鍵の項を参照してください。
- `docker/.env` はアーカイブに入っていません。アーカイブと一緒に保管するか、[インストール](/ja/guide/installation) の `printf` コマンドで新しく作成してください。

## 復元

空のボリュームに復元するとき(たとえば新しいマシンで、初回の起動の前)は、イメージをビルドし、アーカイブを復元してから、通常どおり起動します。ボリュームがすでに存在するという警告が Compose から出ますが、問題ありません。

```sh
docker compose -f docker/compose.yaml --env-file docker/.env build
docker run --rm -i -u 0 -v fione_fione-data:/data --entrypoint tar ghcr.io/codelibs/fione:dev xzf - -C /data < fione-data.tgz
docker run --rm -i -u 0 -v fione_seaweed-data:/data --entrypoint tar ghcr.io/codelibs/fione:dev xzf - -C /data < seaweed-data.tgz
docker compose -f docker/compose.yaml --env-file docker/.env up -d --build --wait
```

## アップグレード

Fione 20 の新しい版へアップグレードする手順です。

1. 上記の手順でバックアップします。
2. 現在のサービング用イメージに別の名前を付けて残します。再ビルドすると `ghcr.io/codelibs/fione-serving:dev` が置き換わりますが、古いイメージがまだ必要になることがあります(後述)。
3. 新しい版を取得して、再ビルドします。

```sh
docker tag ghcr.io/codelibs/fione-serving:dev fione-serving:before-upgrade
git pull
docker compose -f docker/compose.yaml --env-file docker/.env up -d --build --wait
```

データはそのまま残ります。アップグレード後は、管理者がアカウントのメニューの**システムの状態**ページで、**バージョン**と**イメージタグ**を確認できます。

**モデルとイメージのタグ**: 学習済みのモデルは、学習したイメージのタグを記録していて、Fione Serving は同じタグのモデルしか読み込みません。また、古い版で学習したモデルは、Fione のコードを pickle 形式で保存したものなので、新しい版で読み込める保証がありません。アップグレード後は、使い続けるモデルを再学習してください。それまでは、残しておいたイメージでそのモデルのサービング用ファイルを動かします。`docker run` コマンドの `ghcr.io/codelibs/fione-serving:dev` を `fione-serving:before-upgrade` に置き換えてください。

版ごとに `docker/.env` で異なる `FIONE_IMAGE_TAG` を設定しておくと、この手間を避けられます。2 つのイメージのタグに版が入るので、古いサービング用イメージが新しいものと並んで残ります。

## 運用上の注意

- **プロセスは 1 つ**: `fione` サービスは 1 プロセス・1 ワーカーで動かし、スケールさせないでください。ログインの試行回数の制限、アップロードの制限、ジョブの実行は、そのプロセスのメモリ上にあります。詳しくは [設定](/ja/docs/configuration) のデプロイの注意を参照してください。
- **リバースプロキシ**: ポートは `127.0.0.1` だけに公開されています。ほかの人にも使ってもらうには、HTTPS のリバースプロキシを前に置き、`FIONE_TRUST_PROXY` と `FIONE_COOKIE_SECURE` を設定します。プロキシの設定例は [設定](/ja/docs/configuration) にあります。
- **ディスク容量**: **システムの状態**ページにはディスクの空き容量が表示されないので、サーバーで確認してください。アップロードとインポートはデータボリュームに一時保存され、変換の間はファイルの約 2 倍の容量が必要です。既定のアップロード上限 1 GiB なら、2 GiB 以上の空きを確保してください。
- **メモリ**: 学習・バッチ予測・Python モジュールは、データセット全体をメモリに読み込みます。目安として 4 GB 以上の RAM を用意し、列が多いデータや大きいファイルではさらに多く用意してください([既知の制限](/ja/docs/known-limitations)を参照)。
- **セットアップトークン**: 管理者ができるまでは、ログを読める人なら誰でも最初の管理者を作れます。最初の起動後すぐに作成してください。
