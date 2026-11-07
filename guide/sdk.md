---
title: Python client fione-sdk
description: "Drive Fione from a notebook or script with the fione-sdk Python client: install, set an API token, upload data, train, wait for jobs, predict, run modules."
---

# Python client `fione-sdk`

`fione-sdk` is a small Python client for the Fione API. Use it in a notebook or a script to upload datasets, train models with AutoML, read leaderboards, make predictions and run [Python modules](/guide/python-modules). Data goes in and out as pandas DataFrames, and it needs Python 3.12 or later.

It talks to the [REST API](/docs/rest-api) with an [API token](/guide/users-sharing), so it can do what the person who owns the token can do, and nothing more.

## Install

The client lives in the `sdk/` folder of the Fione repository. Install it from a clone:

```sh
git clone https://github.com/codelibs/fione.git
pip install ./fione/sdk
```

It depends on `httpx` and `pandas`, which pip installs for you.

## Configure

Create an API token on the **Account** page (see [Users, roles and sharing](/guide/users-sharing)), then give the client your server's address and the token. `Client()` reads two environment variables:

| Variable | What it is |
|---|---|
| `FIONE_URL` | The address of your Fione server, for example `http://localhost:8080`. |
| `FIONE_TOKEN` | An API token. |

```sh
export FIONE_URL=http://localhost:8080
export FIONE_TOKEN=<your-token>
```

`Client(url=..., token=...)` takes the same two values as arguments instead. Two more options:

- `timeout=` is the request timeout in seconds (default 60).
- `http=` is an `httpx.Client` to send through instead of the client's own. `url` and `timeout` are then ignored, and the token goes to wherever that client points.

If the token or the address is missing, `Client()` raises `FioneError` with the code `config`. Do not put the token in code you share; read it from the environment or a secret store.

## Example

```python
import pandas as pd
from fione_sdk import Client

fione = Client()
project = fione.create_project("demo")
dataset = fione.upload(project["id"], pd.read_csv("train.csv"), "train")
print(fione.profile(project["id"], dataset["id"]))
frame = fione.read(project["id"], dataset["id"])
```

`create_project` and `upload` return the objects the API returns, as dicts: a project has an `id` (a text id such as `demo-1a2b3c`) and a dataset has a number `id`. `upload` takes the dataset `type` as its fourth argument: `"train"` (the default), `"test"` or `"predict"`.

## Train, wait, predict

`train` queues AutoML training and returns a `Job`. `wait` blocks until the job has ended.

```python
job = fione.train(project["id"], dataset["id"], "species", max_runtime_secs=300)
for event in job.events(follow=True):  # progress, until the job has ended
    print(event["type"], event["data"])
job.wait()
model_id = job.result["model_id"]
print(fione.leaderboard(model_id))  # one row per model AutoML tried
print(fione.models(project["id"]))  # one row per model of the project

new_rows = pd.read_csv("new_rows.csv")  # the same input columns, without "species"
predictions = fione.predict(project["id"], model_id, new_rows)  # a "predict" column
```

`train(project_id, dataset_id, target, *, name=None, **config)` takes the column to predict and the other training options as keyword arguments. The dataset must be a `train` dataset. The options are those of a training run:

| Option | Default | Meaning |
|---|---|---|
| `task` | `"auto"` | `"auto"`, `"classification"` or `"regression"`. |
| `max_runtime_secs` | `3600` | Training stops at this time and keeps the best model so far. |
| `max_runtime_secs_per_model` | none | Caps each model's training. |
| `max_models` | none | Stops after this many models. |
| `nfolds` | `5` | Cross-validation folds (2 or more). |
| `seed` | `0` | The same seed gives the same splits and search. |
| `balance_classes` | `False` | Gives rare classes more weight while learning. |
| `decision` | `"argmax"` | `"argmax"` or `"balanced"` (adjusts for class sizes); not together with `balance_classes`. |
| `target_transform` | `"none"` | `"none"` or `"log1p"` (regression only). |
| `feature_engineering` | `True` | Adds derived features that clearly help. |
| `stopping_rounds`, `stopping_metric`, `stopping_tolerance` | `10`, `"auto"`, `0.001` | Early stopping of a model family. |
| `sort_metric` | `"auto"` | The score the leaderboard is ranked by. |
| `keep_cv_predictions`, `keep_cv_models`, `keep_cv_fold_assignment` | `False` | Keep cross-validation results (the models make the model file much larger). |
| `ignored_columns` | `[]` | Columns that are not used as inputs. |

The web app offers the same settings on its training screen (see [AutoML screens](/guide/automl)). A configuration the engine refuses (an unknown option, or a target column with gaps or a single value) raises `FioneError` with HTTP status 422 and nothing is queued.

### Jobs

Everything that takes time is a job on the server: training, batch prediction, modules. A `Job` has:

- `job.id`, `job.data` (the job as last fetched), and `job.status` (`queued`, `running`, `done`, `failed` or `cancelled`) and `job.result`, which read from `job.data`.
- `job.refresh()` and `job.cancel()`, which update `job.data`. Cancelling a job that has already finished raises `FioneError` (409). `fione.job(job_id)` gets a job again later.
- `job.events(after=0, follow=False)`, which yields the job's events, oldest first, as dicts with `id`, `type`, `ts` and `data`. With `follow=True` it waits for new ones until the job has ended.
- `job.wait(timeout=None, poll=1.0, max_poll=10.0)`, which polls and doubles the interval up to `max_poll`. It returns the job when it is `done`. It raises `fione_sdk.JobFailed` (a `FioneError`) when the job failed or was cancelled: `code` is `"failed"` or `"cancelled"`, `message` is the job's message, `job` is the job, and `status` is 0 because no HTTP response is involved. After `timeout` seconds it raises `TimeoutError` and leaves the job running. **Interrupting a wait (Ctrl-C in a notebook) cancels the job.**

### Predict

`predict(project_id, model_id, df, *, include_columns=None, timeout=None)` uploads the frame as a temporary dataset, predicts on the server, reads the result back in the order of the rows and deletes the temporary dataset. The upload is deleted also when the prediction fails or times out. After `timeout` seconds (or on failure) it cancels its batch-prediction job and raises `TimeoutError` (or `JobFailed`).

The result has a `predict` column with the predicted value or class and, for classification, one `p_<class>` column per class with its probability. By default the input columns follow; pass `include_columns=[...]` to copy only those. The result dataset stays in the project, so you can find it again among its datasets.

## Datasets and models

| Call | Returns |
|---|---|
| `projects()`, `project(project_id)`, `create_project(name)` | The projects you can see, one project, or a new project (dicts). |
| `datasets(project_id)`, `dataset(project_id, dataset_id)` | The datasets of a project, or one dataset with its column schema. |
| `upload(project_id, df, name, type="train")` | The new dataset. |
| `read(project_id, dataset_id)` | The dataset as a DataFrame. |
| `preview(project_id, dataset_id, rows=50)` | The first rows (at most 200) as `{"columns": ..., "rows": ...}`. |
| `profile(project_id, dataset_id)`, `column_profile(project_id, dataset_id, column)` | Statistics, histograms and correlations of the dataset, or the profile of one column. |
| `delete_dataset(project_id, dataset_id)` | Nothing. |
| `models(project_id)` | A DataFrame with one row per model of the project. |
| `model(model_id)` | One model with its metrics, configuration, leaderboard and variable importance. |
| `leaderboard(model_id)` | A DataFrame, one row per model AutoML tried, best first. |

## Modules

`modules()` lists what the server can run. `run_module` queues one over a dataset and returns a `Job`; the module runs on the server, not in your notebook, so it needs no packages here.

```python
job = fione.run_module(project["id"], "sort", dataset["id"], {"column": "age"})
job.wait()
sorted_frame = fione.read(project["id"], job.result["dataset_id"])
```

`run_module(project_id, module_id, dataset_id, params=None, *, name=None)` takes the module's parameters as a dict and, optionally, a name for the new dataset. See [Python modules](/guide/python-modules) for the built-in modules and for writing your own.

## Errors and limits

- A response that is not a 2xx raises `fione_sdk.FioneError`, with the HTTP `status`, the API's error `code` and a `message`. For example, a project you cannot see raises `FioneError: project not found (not_found, HTTP 404)`.
- A redirect is an error too. It usually means `FIONE_URL` should be the `https` address. The client never follows redirects, so the token is never sent to another address.
- Transport errors (`httpx.ConnectError`, timeouts) are not wrapped and propagate as they are.
- Frames travel as CSV, so data types do not round-trip exactly: `read` infers them again (dates come back as text, for example).

```python
from fione_sdk import Client, FioneError, JobFailed

fione = Client()
try:
    fione.train(project_id, dataset_id, "species", max_runtime_secs=120).wait()
except JobFailed as e:
    print(e.code, e.message)  # "failed" or "cancelled", and the job's message
except FioneError as e:
    print(e.status, e.code, e.message)
```

For the endpoints behind these calls, and to call the API without Python, see the [REST API](/docs/rest-api).
