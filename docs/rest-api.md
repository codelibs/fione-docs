---
title: REST API reference
description: "Fione's REST API under /api/v1: authenticate with API tokens, then manage projects, datasets, jobs, models, explanations and modules, with curl examples."
---

# REST API reference

Most of what the web app does is also available through a JSON REST API under `/api/v1`, so scripts can use it too. This page explains how to authenticate and the shape of requests, responses and errors, and lists the endpoints by resource, with a few worked `curl` examples. If you work in Python, the [Python client](/guide/sdk) wraps the most common calls.

The examples assume Fione at `http://localhost:8080` and an API token in `<your-token>`.

## The interactive schema

A running Fione serves its own OpenAPI schema, which is always exact for the version you run:

| Address | What it is |
|---|---|
| `/api/docs` | Interactive documentation (Swagger UI), where you can try each call. |
| `/api/openapi.json` | The OpenAPI schema, for generating clients. |

Neither needs a token. This page is a guide to the API; the schema lists every field of every request.

## Authentication

Scripts authenticate with an **API token** in an `Authorization` header. Create one on the **Account** page (see [Users, roles and sharing](/guide/users-sharing)).

```sh
curl -H "Authorization: Bearer <your-token>" http://localhost:8080/api/v1/auth/me
```

```json
{
  "user": { "id": 1, "username": "alice", "role": "editor" },
  "csrf_token": null
}
```

A token acts as its owner, with the owner's role and projects. When a request has an `Authorization: Bearer` header, only the token is considered. A missing, unknown or revoked token is a `401` with `WWW-Authenticate: Bearer`.

Tokens can create and revoke tokens too (`POST /tokens`, `DELETE /tokens/{id}`), so keep them secret.

::: info Browser sessions
The web app signs in with `POST /auth/login` and a session cookie. A request that uses the cookie and changes data (`POST`, `PUT`, `PATCH`, `DELETE`) must also send the session's `csrf_token` in an `X-CSRF-Token` header, or it is refused with `403` and the code `csrf`. Bearer-token requests need no CSRF header, so use a token in scripts.
:::

## Conventions

- **Bodies.** Requests and responses are JSON (`Content-Type: application/json`), except file uploads (`multipart/form-data`) and downloads. A request body with a field the endpoint does not know is refused (`422`).
- **Ids.** Projects have text ids such as `iris-demo-2e9b75`. Datasets, jobs, models, users and tokens have integer ids.
- **Timestamps.** Projects, datasets and tokens carry `created_at` as `"YYYY-MM-DD HH:MM:SS"` in UTC. Jobs, models and job events carry Unix time in seconds.
- **Lists** are returned as JSON arrays with no paging. `GET /jobs` returns the newest `limit` jobs (200 by default, at most 1000).
- **Size limits.** A JSON body is at most 1 MiB. A CSV upload is at most `FIONE_MAX_UPLOAD_BYTES` (1 GiB by default; see [Configuration](/docs/configuration)). A model import is at most 512 MiB.
- **Visibility.** A project you cannot read does not exist as far as you are concerned: you get `404`, not `403`. You get `403` when you can read the project but lack the access the call needs.

## Examples

### Upload data and train a model

Create a project, upload a CSV, and queue AutoML training. The upload is a multipart form with `name`, `type` (`train`, `test` or `predict`) and `file`.

```sh
curl -X POST http://localhost:8080/api/v1/projects \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Iris demo"}'
# {"id": "iris-demo-2e9b75", "name": "Iris demo", "owner_id": 1, "created_at": "2026-11-07 06:02:46"}

curl -X POST http://localhost:8080/api/v1/projects/<project-id>/datasets \
  -H "Authorization: Bearer <your-token>" \
  -F name=train -F type=train -F file=@train.csv
# {"id": 1, "name": "train", "type": "train", "n_rows": 120, "n_cols": 4, "schema": [...], ...}

curl -X POST http://localhost:8080/api/v1/projects/<project-id>/jobs/automl \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"dataset_id": 1, "config": {"target": "species", "max_runtime_secs": 300}}'
# {"id": 1, "kind": "automl", "status": "queued", ...}
```

`config` takes the options listed in [Python client](/guide/sdk) under "Train, wait, predict". An invalid configuration, or a target column the engine refuses, is a `422` and nothing is queued.

### Follow a job

Training runs in the background. Poll the job until `status` is `done`, `failed` or `cancelled`:

```sh
curl -H "Authorization: Bearer <your-token>" http://localhost:8080/api/v1/jobs/1
```

```json
{
  "id": 1,
  "kind": "automl",
  "status": "done",
  "result": { "model_id": 1, "best_model": "Ensemble", "stop_reason": "time", "metrics": { "accuracy": 0.92 } },
  "message": null,
  "created_at": 1794031373.97,
  "started_at": 1794031377.2,
  "finished_at": 1794031418.1
}
```

`result.model_id` is the trained model. (The response above is abbreviated; a job also carries its `payload` and more.) For progress while it runs, read the job's events and pass the returned `last_id` back as `after`:

```sh
curl -H "Authorization: Bearer <your-token>" "http://localhost:8080/api/v1/jobs/1/events?after=0&limit=100"
# {"events": [{"id": 1, "type": "started", "ts": ..., "data": {...}}, ...], "last_id": 3, "status": "running"}
```

### Predict a dataset

Upload the rows to predict as a `predict` dataset, queue a batch prediction, and download the result:

```sh
curl -X POST http://localhost:8080/api/v1/projects/<project-id>/jobs/batch-predict \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"model_id": 1, "dataset_id": 2}'

# when the job is done, result.dataset_id is the predictions
curl -H "Authorization: Bearer <your-token>" \
  http://localhost:8080/api/v1/projects/<project-id>/datasets/3/download
```

```text
"predict","p_setosa","p_versicolor","p_virginica","sepal_length","sepal_width","petal_length"
"virginica",0.0009,0.0068,0.9923,6.6,3.3,5
```

The result has a `predict` column, one `p_<class>` column per class for classification, and the input columns (or only the ones in `include_columns`). Add `"include_contributions": true` to get each row's contributions too, for up to 100,000 rows.

### Explain single rows

`POST /models/{id}/contributions` answers at once, without a job. Send up to 100 `instances`, objects keyed by column name:

```sh
curl -X POST http://localhost:8080/api/v1/models/1/contributions \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{"instances": [{"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 3.6}]}'
```

```json
{
  "model_id": 1,
  "outputs": ["setosa", "versicolor", "virginica"],
  "rows": [
    {
      "row": 0,
      "prediction": 0.987,
      "class_index": 0,
      "bias": 0.109,
      "contributions": { "sepal_length": 0.294, "sepal_width": 0.233, "petal_length": 0.351 }
    }
  ]
}
```

Each row's `bias` and `contributions` add up to its `prediction`. Instead of `instances` you can give a `dataset_id` with `offset` and `limit`.

## Endpoints

All paths are relative to `/api/v1`. The last column says who may call the endpoint. "Read", "write" and "owner" are the access levels of the project the object belongs to (see [Users, roles and sharing](/guide/users-sharing)); administrators have all of them everywhere, and a user whose role is Viewer has read access at most.

### System

| Method and path | What it does | Who |
|---|---|---|
| `GET /health` | Liveness: `{"status": "ok", "version": "..."}`. | Anyone, no token |
| `GET /system/status` | Version, image tag, storage kind, job runner state, queued and running job counts, and the language model's status. | Signed in |

### Authentication

| Method and path | What it does | Who |
|---|---|---|
| `GET /auth/me` | The current user. | Signed in |
| `GET /auth/status` | `{"needs_first_admin": true or false}`. | Anyone |
| `POST /auth/first-admin` | Creates the first administrator from `username`, `password` and `setup_token`; refused (`409`) once an administrator exists. | Anyone, with the setup token |
| `POST /auth/login`, `POST /auth/logout` | Starts and ends a browser session. | Anyone / signed in |
| `POST /auth/password` | Changes your own password: `current_password`, `new_password` (at least 8 characters). Other sessions end; tokens keep working. | Signed in |

### Users and tokens

| Method and path | What it does | Who |
|---|---|---|
| `GET /users` | All users: `id`, `username`, `role`. | Administrator |
| `POST /users` | Creates a user from `username`, `password` and `role` (`admin`, `editor` or `viewer`). | Administrator |
| `PATCH /users/{user_id}` | Changes `role` and/or `password`. Giving up your own administrator role is refused (`409`). | Administrator |
| `DELETE /users/{user_id}` | Deletes a user. Refused (`409`) for the last administrator, yourself, and owners of projects or jobs. | Administrator |
| `POST /tokens` | Creates a token for you from a `name`. The response holds the plaintext `token`, shown only once. | Signed in |
| `GET /tokens` | Your tokens (never the token itself). Administrators can pass `user_id`. | Signed in |
| `DELETE /tokens/{token_id}` | Revokes a token. | Its owner or an administrator |

### Projects and sharing

| Method and path | What it does | Who |
|---|---|---|
| `GET /projects` | The projects you can see. | Signed in |
| `POST /projects` | Creates a project from a `name` (1 to 100 characters). | Administrator or editor |
| `GET /projects/{project_id}` | The project with its `owner`, your `access` (`owner`, `editor` or `viewer`) and its `members`. | Read |
| `DELETE /projects/{project_id}` | Stops its jobs, then deletes the project with its datasets, models and jobs. | Owner |
| `POST /projects/{project_id}/share` | Shares with `username` at `access` `editor` or `viewer`; sharing again changes the access. | Owner |
| `DELETE /projects/{project_id}/share/{username}` | Removes a member. | Owner |

### Datasets

| Method and path | What it does | Who |
|---|---|---|
| `GET /projects/{project_id}/datasets` | The project's datasets. | Read |
| `POST /projects/{project_id}/datasets` | Uploads a CSV as multipart `name`, `type` and `file`. | Write |
| `GET /projects/{project_id}/datasets/{dataset_id}` | One dataset with its column `schema`. | Read |
| `DELETE /projects/{project_id}/datasets/{dataset_id}` | Deletes the dataset. | Write |
| `GET /projects/{project_id}/datasets/{dataset_id}/download` | The dataset as UTF-8 CSV. | Read |
| `GET /projects/{project_id}/datasets/{dataset_id}/preview?rows=50` | The first rows (at most 200) as `{"columns": [...], "rows": [[...]]}`. | Read |
| `GET /projects/{project_id}/datasets/{dataset_id}/profile` | Column statistics, histograms and correlations of the first 100,000 rows. With `?target=<column>`, also leak suspects. | Read |
| `GET /projects/{project_id}/datasets/{dataset_id}/columns/{column}` | The profile of one column. | Read |

### Jobs

Training, prediction, explanation, module and export runs are all jobs. Submitting one returns the queued job with status `201`.

| Method and path | What it does | Who |
|---|---|---|
| `POST /projects/{project_id}/jobs/automl` | Trains on a `train` dataset: `dataset_id`, `config` (with `target`), optional `name`. | Write |
| `POST /projects/{project_id}/jobs/batch-predict` | Predicts a dataset with a model: `model_id`, `dataset_id`, optional `include_columns`, `name`, `include_contributions`. | Write |
| `POST /projects/{project_id}/jobs/explain` | Computes a model's stored explanation again: `model_id`, optional `dataset_id`. | Write |
| `POST /projects/{project_id}/jobs/module` | Runs a [Python module](/guide/python-modules): `module_id`, `dataset_id`, `params`, optional `name`. | Write |
| `POST /projects/{project_id}/jobs/export` | Exports every model of the project into one zip; download it from `GET /projects/{project_id}/exports/{job_id}` when done. One at a time per project (`409` otherwise). | Read |
| `GET /jobs` | The newest jobs, newest first. Filter with `project_id` and `status`; `limit` defaults to 200. | Signed in |
| `GET /jobs/{job_id}` | One job. | Read |
| `GET /jobs/{job_id}/events` | Events after the event id `after`, up to `limit` (500 by default, at most 1000), with `last_id` and the job's `status`. | Read |
| `POST /jobs/{job_id}/cancel` | Cancels a queued or running job; a finished job is a `409`. | Write |
| `DELETE /jobs/{job_id}` | Deletes a finished job with its events and logs. | Write |
| `DELETE /jobs?project_id=<id>` | Deletes every finished job of the project. | Write |

A job has `id`, `kind` (`automl`, `batch_predict`, `explain`, `module`, `export_models`), `project_id`, `owner_id`, `status` (`queued`, `running`, `done`, `failed`, `cancelled`), the submitted `payload`, `result`, `message`, `stop_reason`, `degraded` and the timestamps `created_at`, `started_at` and `finished_at`. Non-administrators see the first line of an error message, without tracebacks or file paths.

### Models

| Method and path | What it does | Who |
|---|---|---|
| `GET /projects/{project_id}/models` | The project's models with their metrics. | Read |
| `GET /models/{model_id}` | One model with its configuration, leaderboard, trials and variable importance. | Read |
| `DELETE /models/{model_id}` | Deletes the model. | Write |
| `GET /models/{model_id}/export` | The model as a zip that can be imported again. | Read |
| `POST /projects/{project_id}/models/import` | Imports an export zip (multipart `file`, optional `trust_foreign`). | Administrator |
| `GET /models/{model_id}/serving` | The [Fione Serving](/docs/serving) bundle as a zip. | Read |
| `GET /models/{model_id}/serving/info` | The command that serves the bundle, an example call and the files in the zip. | Read |
| `GET /projects/{project_id}/exports/{job_id}` | The zip of a finished export job. | Read |

### Explanations

| Method and path | What it does | Who |
|---|---|---|
| `GET /models/{model_id}/diagnostics` | Confusion matrix, per-class metrics, curves or residuals from cross-validation. | Read |
| `GET /models/{model_id}/explanations` | The stored explanation: importance and partial dependence curves, with its `status`. | Read |
| `POST /models/{model_id}/contributions` | Each row's contributions: up to 100 `instances`, or `dataset_id` with `offset` and `limit`; optional `class_index`. | Read |
| `POST /models/{model_id}/partial-dependence` | How the average output changes with `column`; optional `dataset_id`, `grid`, `rows`, `ice`, `class_index`. | Read |

### Python modules

| Method and path | What it does | Who |
|---|---|---|
| `GET /modules` | Every module, built-in and uploaded, with its `kind` and parameter schema. | Signed in |
| `POST /modules` | Uploads a module as multipart `id` and `file`. The response carries a `warning` that uploaded modules are not sandboxed. | Administrator |
| `DELETE /modules/{module_id}` | Deletes an uploaded module; built-in ones cannot be deleted. | Administrator |

## Errors

An error response is always JSON with a human-readable `error` and a stable `code`:

```json
{ "error": "target column 'nope' is not in the data", "code": "invalid" }
```

| Status | `code` | When |
|---|---|---|
| `400` | `bad_request` | The request is malformed. |
| `401` | `unauthorized` | No token, or an invalid or revoked one. Wrong sign-in details are `invalid_credentials`. |
| `403` | `forbidden` | You can see the project but lack the role or access the call needs. Also `csrf` for a cookie request without its CSRF token, `cross_origin` for a foreign `Origin`, `invalid_setup_token` for a wrong setup token, and `invalid_credentials` for a wrong current password in `POST /auth/password`. |
| `404` | `not_found` | The object does not exist, or you cannot read its project. |
| `405` | `method_not_allowed` | The path exists but not for this HTTP method. |
| `409` | `conflict` | The change is not possible now: a last administrator, a job that already finished, an export already running. Also `already_set_up`, `untrusted` and `too_large` for explanations. |
| `413` | `too_large` | The request body or upload is over its limit. |
| `415` | `unsupported_media_type` | Wrong `Content-Type` on sign-in or first-administrator setup (JSON is required) or on an upload (`multipart/form-data` is required). Other JSON calls with a wrong `Content-Type` answer `422 invalid`. |
| `422` | `invalid` | A field is missing or wrong, or the service refused the value. A CSV that cannot be read is `invalid_csv`. |
| `429` | `throttled` | Too many failed password checks. Wait for the number of seconds in the `Retry-After` header. |
| `500` | `internal` | An unexpected error. Details are in the server log, not in the response. |
| `503` | `busy` | Another explanation is being computed. Retry after the `Retry-After` header. |

The table lists the common statuses; some calls add their own `code` to a status (for example `untrusted` on a model import is `422`). For the sign-in limits, see [Users, roles and sharing](/guide/users-sharing) and [Configuration](/docs/configuration).
