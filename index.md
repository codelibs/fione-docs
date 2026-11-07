---
layout: home
title: Fione
description: Fione is an open-source AutoML server. Upload a CSV, get a trained model and predictions, and serve the model as a prediction API. Fione itself starts with one docker compose up.

hero:
  name: Fione
  text: AutoML for everyone
  tagline: Upload a CSV in your browser, get a trained model, make predictions and serve the model as an API.
  image:
    src: /fione-logo.svg
    alt: Fione
  actions:
    - theme: brand
      text: Quick start
      link: /guide/installation
    - theme: alt
      text: Overview
      link: /guide/
    - theme: alt
      text: View on GitHub
      link: https://github.com/codelibs/fione

features:
  - title: No machine-learning expertise needed
    details: The EasyML wizard takes you from a CSV to a rated model and a prediction file, with a plain-language explanation of the score.
  - title: Its own AutoML engine
    details: Gradient boosting, random forests, linear and neural models, and TF-IDF models for text, tuned with Optuna and ensembled within the run time you set.
  - title: Explains its models
    details: Diagnostics, column importance, partial dependence and the reasons for each prediction, with warnings for columns that give the answer away.
  - title: Serve a model anywhere
    details: Fione Serving is a small prediction API for any trained model, built once as a Docker image and run on the model files.
  - title: Users, sharing and an API
    details: Administrators, editors and viewers, per-user project sharing, API tokens, a REST API and the fione-sdk Python client.
  - title: An assistant that only reads
    details: Ask questions about your datasets and models, and let the assistant suggest a training run that you confirm.
---
