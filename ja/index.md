---
layout: home
title: Fione
description: Fione はオープンソースの AutoML サーバーです。CSV をアップロードしてモデルを学習し、予測し、docker compose up だけで予測 API として提供できます。

hero:
  name: Fione
  text: 誰でも使える AutoML
  tagline: ブラウザーで CSV をアップロードするだけで、モデルの学習、予測、予測 API としての提供までできます。
  image:
    src: /fione-logo.svg
    alt: Fione
  actions:
    - theme: brand
      text: クイックスタート
      link: /ja/guide/installation
    - theme: alt
      text: 概要
      link: /ja/guide/
    - theme: alt
      text: GitHub を見る
      link: https://github.com/codelibs/fione

features:
  - title: 機械学習の知識は不要
    details: EasyML ウィザードに沿って進めるだけで、CSV から星で評価されたモデルと予測ファイルが得られます。スコアの意味も平易な言葉で説明します。
  - title: 独自の AutoML エンジン
    details: 勾配ブースティング、ランダムフォレスト、線形モデル、ニューラルネットワーク、テキスト向けの TF-IDF モデルを Optuna で調整し、指定した実行時間内でアンサンブルします。
  - title: モデルを説明できる
    details: 診断情報、列の重要度、部分依存、予測ごとの理由を表示し、答えを漏らしている列には警告を出します。
  - title: どこでもモデルを提供
    details: Fione Serving は、学習したモデルを提供する小さな予測 API です。共通の Docker イメージとモデルファイルだけで動きます。
  - title: ユーザー、共有、API
    details: 管理者・編集者・閲覧者、ユーザー単位のプロジェクト共有、API トークン、REST API、Python クライアント fione-sdk を備えています。
  - title: 読み取り専用のアシスタント
    details: データセットやモデルについて質問でき、学習の実行を提案してくれます。実行は人が確認してから行われます。
---
