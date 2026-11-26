---
layout: home
title: Fione
description: "Open-source AutoML server: train a model from a CSV and use its predictions from AI tools such as Claude Code or Codex, your own service or the browser."

hero:
  name: Fione
  text: Predictions your AI can use
  tagline: An open-source AutoML server you run yourself. Train a model from a CSV, then predict from AI tools such as Claude Code or Codex, from your own service through the API, or in the browser. No machine-learning expertise needed.
  image:
    src: /fione-logo.svg
    alt: Fione
  actions:
    - theme: brand
      text: Quick start
      link: /guide/installation
    - theme: alt
      text: Use it from AI tools
      link: /guide/mcp
    - theme: alt
      text: View on GitHub
      link: https://github.com/codelibs/fione

features:
  - title: Use it from AI tools
    details: With an API token, AI tools such as Claude Code or Codex can upload a CSV, train, read the results and predict on your Fione server over MCP, and tell you what it found. They bring their own language model.
  - title: No machine-learning expertise needed
    details: The EasyML wizard takes you from a CSV to a rated model and a prediction file, with a plain-language explanation of the score.
  - title: Predictions in your own service
    details: A REST API, API tokens and the fione-sdk Python client, and Fione Serving, a small prediction API that runs any trained model on its own.
  - title: Runs on your server
    details: Training and prediction run on the server you start with docker compose up. Datasets and models are kept in the storage you set up for it, SeaweedFS by default.
  - title: Explains its models
    details: Diagnostics, column importance, partial dependence and the reasons for each prediction, with warnings for columns that give the answer away.
  - title: Open source
    details: Apache License 2.0, developed on GitHub. Free for personal and commercial use.
---
