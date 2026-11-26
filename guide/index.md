---
title: "Fione overview: an open-source AutoML server"
description: "Fione overview: train a model from a CSV and use its predictions from AI tools such as Claude Code or Codex, your own service or the browser."
---

# Overview

Fione is an open-source AutoML server that makes predictions your AI can use. You give Fione a CSV file, Fione trains a model on it, and you use the model's predictions where you work: from AI tools such as Claude Code or Codex over MCP, from your own service through the REST API or Fione Serving, or in the browser. Fione runs on your own server with one `docker compose up`, and training and prediction happen there.

You do not need machine-learning experience to get a first model. The **EasyML wizard** asks what you want to predict and how long Fione may work, then reports the result as a 1 to 5 star rating with a plain-language explanation. When you want more control, the detailed view opens every statistic, training setting and diagnostic.

## Who Fione is for

- **People new to machine learning** who have a table of data (a CSV with a header row) and want a model and its predictions without writing code.
- **People who work with AI tools** such as Claude Code or Codex and want them to train and use a prediction model on their own server, rather than guess from the data in the conversation.
- **Developers** who want to add a prediction (who will cancel, which machine will fail, how much a customer will spend) to their own service through an API they host themselves.
- **Data scientists and analysts** who want to train models quickly, read the cross-validation diagnostics and the model explanations, and script everything from Python when they prefer.
- **Teams** who want one shared place for datasets and models, with administrators, editors and viewers, and a prediction API they host themselves.

## Features at a glance

- **AI tools over MCP.** Claude Code, Claude Desktop, Codex and other MCP clients can upload a CSV, train, wait for the job, read the leaderboard and predict through Fione's MCP endpoint, on by default, with an API token. They bring their own language model. See [Run the AutoML loop from an AI tool with MCP](/guide/mcp).
- **EasyML wizard.** Upload, data analysis (the column to predict, the input columns, the prediction type, the maximum run time), run, prediction summary, predictions as a CSV. See [EasyML wizard](/guide/easyml).
- **AutoML screens.** Column statistics and charts, correlations, leak warnings, a proposed join of several tables, every training setting, the job list, leaderboards, variable importance, score history, CV metrics, and model export and import. See [AutoML screens](/guide/automl).
- **Model explanations.** Diagnostics from the cross-validation predictions, importance and partial dependence curves, the contributions behind each prediction, and warnings for columns that predict the answer suspiciously well. See [Explanations and leak warnings](/guide/explanations).
- **Its own AutoML engine.** Gradient boosting (LightGBM, XGBoost, CatBoost), random forest and extremely randomized trees, linear models (also over every value of the category columns, and boosted by small trees), a neural network and, for data with text columns, TF-IDF linear models; for some metrics also boosting models that learn the median. Models are tuned with Optuna and ensembled within the run time you set, and Fione builds derived features and keeps only those that clearly help.
- **Fione Serving.** A small prediction API (`/invocations`, `/model`, `/ping`) for any trained model, run from one shared Docker image and the model files. See [Fione Serving](/docs/serving).
- **Users and sharing.** Administrators, editors and viewers; projects are shared per user. API tokens and a REST API (`/api/v1`) for scripts. See [Users and sharing](/guide/users-sharing) and [REST API](/docs/rest-api).
- **Python modules.** Data operations such as built-in frame operations, k-means and low-rank factorization; administrators can upload their own. See [Python modules](/guide/python-modules).
- **Python client.** `fione-sdk` drives Fione from your own scripts and notebooks. See [Python client (fione-sdk)](/guide/sdk).
- **Assistant (optional).** A chat in the browser that answers questions about a project's datasets and models and suggests a training run that a person confirms. It is off by default and needs a language model. See [Assistant](/guide/assistant).
- **Storage.** Datasets and models live on SeaweedFS or any S3-compatible service; metadata is kept in SQLite.
- English and Japanese, light and dark themes, usable on phones.

## How the pieces fit

A Fione installation has a few moving parts, all started by Docker Compose:

- **The Fione application** (the `fione` container) serves the web app and the REST API and runs the job queue, as a single process. Training, predictions, explanations and exports are **jobs**: they run on the server, so you can close the page and come back later. By default one training runs at a time and the others wait in the queue.
- **Storage.** Datasets and models are stored in SeaweedFS (the `seaweedfs` container), which speaks the S3 protocol. The database, the secret key, job logs and temporary files live in the application's data volume.
- **The assistant's language model** is a separate server that you provide, only if you turn the optional assistant on: Ollama or Claude through the Anthropic API. The assistant is off by default, and the rest of Fione, MCP included, works without it.
- **Fione Serving** is a second image, built on request. It serves one downloaded model as a prediction API on a port of your choice, separate from the Fione application.

```text
Browser / scripts / MCP ──► fione (web app, REST API, job runner) ──► SeaweedFS (S3): datasets, models
                                    │                                  data volume: SQLite, secret key
                                    └──► language model (optional): Ollama or Claude

serving bundle (zip) ──► fione-serving ──► POST /invocations
```

## Where to go next

1. [Installation](/guide/installation): start Fione, create the administrator and get a sample CSV.
2. [EasyML wizard](/guide/easyml): train a model, make predictions and serve the model. Or let an AI tool do it: [Run the AutoML loop from an AI tool with MCP](/guide/mcp).
3. [AutoML screens](/guide/automl) and [Explanations and leak warnings](/guide/explanations): the detailed view.
4. [Users and sharing](/guide/users-sharing), [Python modules](/guide/python-modules), [Python client (fione-sdk)](/guide/sdk), [Assistant](/guide/assistant) and [AI tools with MCP](/guide/mcp).
5. For operators: [Configuration](/docs/configuration), [Operations](/docs/operations), [Fione Serving](/docs/serving) and [Known limitations](/docs/known-limitations).
6. Questions and bug reports: [Help and support](/guide/support).
