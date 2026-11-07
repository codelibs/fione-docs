---
title: "Reference overview"
description: "Fione reference: settings, Fione Serving, REST API, assistant setup, operations, known limitations, and how the components of a Fione install fit together."
---

# Reference overview

The reference describes how Fione is configured, run and operated. For task-oriented walk-throughs, see the [guide](/guide/).

## Reference pages

| Page | What it covers |
|---|---|
| [Configuration](/docs/configuration) | Every setting: Fione settings, Docker Compose variables, Fione Serving and `fione-sdk` variables, reverse proxy, setup token, secret key, temporary space and storage. |
| [Fione Serving](/docs/serving) | Running a trained model as a prediction API: the image, `POST /invocations` (with contributions), `GET /model`, `GET /ping`, model files and trust. |
| [REST API](/docs/rest-api) | The `/api/v1` API and API tokens, for scripts and other programs. |
| [Assistant setup and MCP](/docs/assistant) | Connecting a language model (Ollama or Claude), the administrator's consent, what is sent, limits, the MCP endpoint and troubleshooting. |
| [Stop, back up, upgrade](/docs/operations) | Running a Fione install over time. |
| [Known limitations](/docs/known-limitations) | What Fione does not do or does only within limits. |

## Architecture

A Fione install is one application with a few services around it.

**The web app and API.** One container, `fione`, runs the web UI, the REST API (`/api/v1`) and the optional MCP endpoint (`/mcp`) on port 8080, as a single uvicorn process. The same process holds the job queue. Users sign in with a username and password and have one of three roles (administrator, editor or viewer); scripts use API tokens. Because the sign-in throttle, the upload limits and the job runner live in that process's memory, Fione runs as exactly one worker process (see [Configuration](/docs/configuration)).

**The job runner.** Training, predictions, explanations, model exports and Python modules run as jobs. The runner takes queued jobs and starts each one in its own worker process, so a job that crashes or is cancelled does not take the web app down. By default one training runs at a time and up to four other jobs run beside it. The AutoML engine inside the workers trains gradient boosting models, random forests, linear models and neural networks within the run time you set, and ensembles the best of them.

**Metadata in SQLite.** Users, projects, datasets, jobs, models and assistant conversations are rows in a SQLite database (`fione.db`) in the data directory, which is the `fione-data` volume in the Compose setup. The data directory also holds the secret key, job logs and temporary files.

**Object storage.** Dataset files and trained models are stored as objects. Compose runs SeaweedFS with an S3 API for this, and the `fione` container creates the bucket at its first start; any S3-compatible service works, and a local directory can be used instead. Only the `fione` container reaches the storage.

**Fione Serving.** A separate, small image that serves one trained model over HTTP. You download a model as a serving bundle and run the image on it; it needs neither Fione nor the storage, and runs on a Compose network of its own. See [Fione Serving](/docs/serving).

**The language model (optional).** The assistant calls a language model server: an Ollama server (on the host, or in Compose with the `ollama` profile) or Claude through the Anthropic API. Nothing is bundled and Fione works without it. See [Assistant setup and MCP](/docs/assistant).

```text
 browser / script / MCP client
            |
            v
   +--------------------+        +----------------------+
   | fione              | -----> | SeaweedFS (S3)       |
   |  web UI, REST API, |        | datasets and models  |
   |  job runner        |        +----------------------+
   |  --> worker procs  |
   |  SQLite (fione.db) | -----> language model (optional)
   +--------------------+        Ollama or Claude

   fione-serving: one model, own network
```
