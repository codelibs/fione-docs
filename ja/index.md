---
layout: home
title: Fione
description: Fione はオープンソースの AutoML サーバーです。CSV からモデルを学習し、その予測を Claude Code や Codex などの AI ツールから、自分のサービスから、ブラウザーから使えます。自分のサーバーで動きます。

hero:
  name: Fione
  text: AI から使える予測
  tagline: 自分のサーバーで動かすオープンソースの AutoML。CSV からモデルを作り、Claude Code や Codex などの AI ツールから、自分のサービスから API で、ブラウザーから予測できます。機械学習の専門知識は要りません。
  image:
    src: /fione-logo.svg
    alt: Fione
  actions:
    - theme: brand
      text: クイックスタート
      link: /ja/guide/installation
    - theme: alt
      text: AI ツールから使う
      link: /ja/guide/mcp
    - theme: alt
      text: GitHub を見る
      link: https://github.com/codelibs/fione

features:
  - title: AI ツールから使える
    details: API トークンを渡せば、Claude Code や Codex などの AI ツールが MCP で Fione サーバー上の CSV のアップロード、学習、結果の確認、予測を行い、わかったことを説明してくれます。言語モデルは AI ツールの側のものを使います。
  - title: 機械学習の知識は不要
    details: EasyML ウィザードに沿って進めるだけで、CSV から星で評価されたモデルと予測ファイルが得られます。スコアの意味も平易な言葉で説明します。
  - title: 自分のサービスで予測
    details: REST API、API トークン、Python クライアント fione-sdk に加え、学習したモデルを単独で動かす小さな予測 API、Fione Serving があります。
  - title: 自分のサーバーで動く
    details: 学習と予測は docker compose up で起動したサーバーで行われます。データセットとモデルは、用意したストレージ(既定は SeaweedFS)に保存されます。
  - title: モデルを説明できる
    details: 診断情報、列の重要度、部分依存、予測ごとの理由を表示し、答えを漏らしている列には警告を出します。
  - title: オープンソース
    details: Apache License 2.0 で GitHub 上で開発されています。個人・商用を問わず無料で利用できます。
---
