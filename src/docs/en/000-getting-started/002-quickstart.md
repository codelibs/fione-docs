---
title: Quick Start
---

## Prerequisite

* Docker
* Docker Compose

## Start Fione

First of all, start Fione with the following command:

```shell
$ git clone https://github.com/codelibs/docker-fione.git -b v13.6.2
$ cd docker-fione/compose
$ docker-compose up
```

## Create Project

Access http://localhost:8080/admin/easyml/ and login as fione user (password is fione). Type Project Name and Training Data. (for example, you can download train.csv for Titanic) Click Create button.

## Run Machine Learning

Select Predicted Column and Input Columns in Data Analysis page. (for Titanic data, the predicted column is Survived and the type is Enum) Select Max Execution Time. Click Run button. You can check the result in Prediction Summary page. For Machine Learning experts, you can also use H2O Flow in http://localhost:54321/flow/.

## Start Serving API with Docker

Fione provides Serving API container with Docker. To download Dockerfile for Serving API, you can find it at Serving page for each Model page.

## Stop Fione and Clean Up

```shell
$ docker-compose down
```

Some data remains in docker volumes. To delete them, run the following command:

```shell
$ docker volume rm fess-data es-data es-dict minio-data
```
