================
クイックスタート
================

事前準備
========

事前に以下のソフトウェアをインストールしてください。

* Docker
* Docker Compose


Fioneの起動
===========

FioneのDocker環境を取得して、起動します。

.. code-block:: bash

   $ git clone https://github.com/codelibs/docker-fione.git
   $ cd docker-fione/compose
   $ docker-compose up

ログイン
========

\http://localhost:8080/admin/easyml/ にアクセスして、fioneユーザーでログインします。
デフォルトのパスワードはfioneです。

プロジェクトの作成
==================

左側のメニューでFione > EasyMLを表示します。
プロジェクト名と教師データのファイルを設定して、作成ボタンを押下してください。

教師データの読み込みが始まり、学習に利用する列の選択画面が表示されます。
実行ボタンを押下すると、学習アルゴリズムが開始されます。

学習が完了すると、予測結果サマリー画面が表示されます。

Dockerで予測APIの利用
=====================

FioneはDockerの予測APIコンテナを提供しています。
予測APIのDockerfileを含むZIPファイルをダウンロードして、利用することができます。

Fioneの停止
===========

Fioneを停止するには以下のコマンドを実行します。

.. code-block:: bash

   $ docker-compose down


Dockerボリュームにもデータが保存されているので、完全に削除するためには以下のコマンドを実行します。

.. code-block:: bash

   $ docker volume rm fess-data es-data es-dict minio-data

