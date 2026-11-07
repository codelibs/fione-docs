---
title: Known limitations
description: "What Fione 20.0 does not do, or does with a catch, by topic: security, models, jobs, training, explanations, deployment, the assistant, browsers."
---

# Known limitations

What Fione does not do, or does with a catch, grouped by topic. Read the sections that match what you plan to do; the first one and the deployment section matter for everyone who runs Fione for other people.

- [Security and accounts](#security-and-accounts)
- [Models and imports](#models-and-imports)
- [Jobs and data](#jobs-and-data)
- [Training and scores](#training-and-scores)
- [Explanations and leak warnings](#explanations-and-leak-warnings)
- [Deployment and Fione Serving](#deployment)
- [The assistant and MCP](#assistant-and-mcp)
- [Browser](#browser)

## Security and accounts {#security-and-accounts}

- **Sessions cannot be revoked on the server.** A session cookie is signed and holds no server state. Signing out deletes the cookie in that browser only; a copied cookie stays valid until it expires (`FIONE_SESSION_MAX_AGE_SECS`, 7 days by default). Changing a password ends every session of that user, because sessions are bound to the password.
- **A password reset by an administrator keeps the user's API tokens.** Revoke them as well if the account is compromised; the user can do so on the Account page, and an administrator can through the API (`DELETE /api/v1/tokens/{id}`). There is no screen for an administrator to manage other users' tokens. Deleting the user removes their tokens, but is refused while they own projects or jobs.
- **API tokens you create never expire**, and Fione does not record when one was last used. Revoke tokens you no longer need on the Account page.
- **Uploaded Python modules are not sandboxed.** They run in the job worker with the server's privileges and can read its secret key and environment. Only administrators can upload them, after confirming a warning. Built-in modules are not affected.
- **Replacing a module affects queued jobs.** A job that is still waiting runs the module's source as it is when the job starts, not as it was when the job was queued.
- **Error messages shown to non-administrators lose file paths, but not URLs or host names** (for example `seaweedfs:8333` in a storage error).
- **CSV downloads are not protected against spreadsheet formula injection.** A cell starting with `=` is written as it is; spreadsheets may evaluate it.
- **The first-administrator setup token is in the log** until an administrator exists, unless you set `FIONE_SETUP_TOKEN`. Create the administrator soon after the first start.
- **The S3 credentials are visible** in the containers' environment (`docker inspect`, `docker exec`) to anyone who can use Docker on the host.

## Models and imports {#models-and-imports}

- **Imported models are trusted only on request.** A model from an installation that did not sign it loads only if an administrator ticks the trust option on import, and the model is then marked **Imported, unverified**. Loading a model file runs code, so trust only files you know.
- **An import with unexpected content is refused.** That includes a record with a number that is not finite or an integer beyond the range of a float anywhere in it (diagnostics included), and diagnostics that have unknown fields or nest deeper than training writes them. Exports made by Fione never hold such values.
- **A model's diagnostics hold training values.** They keep the class labels and, for regression, up to 2,000 actual target values sampled from the training rows, with the model's predictions for them. Every reader of the project sees them (the **Metrics** tab and `GET /api/v1/models/{id}/diagnostics`), they go into the model's export, and they stay when the training dataset is deleted. The stored explanation likewise keeps category levels and class labels after the dataset is gone (it is not exported). The model file and the serving bundle carry no diagnostics.
- **Models are tied to the image tag.** Fione Serving loads only models trained by an image of the same tag, and a model trained by an older version is not guaranteed to load in a newer one: retrain the models you rely on after an upgrade, and serve their bundles with the image you kept until then (see [Operations](/docs/operations)).
- **Only the latest export of all models is kept** per project; a new one replaces it. Anyone who can read the project can start an export.

## Jobs and data {#jobs-and-data}

- **Cancelling a running job can take up to 10 seconds.** The worker gets that long to stop before it is killed, and the cancel request waits for it.
- **Jobs that belong to no project are not listed** by `GET /api/v1/jobs`; administrators can still read them by id.
- **Explanation jobs are listed with the other jobs**, but the project overview's recent jobs leave them out.
- **Deleting a project or a dataset removes its record first and its files second.** If the storage fails in between, files can be left behind in the bucket.
- **Datasets are loaded whole into memory** for training, batch predictions and Python modules (there is no out-of-core processing). Measured on a 16-core Mac, a training job peaked at about 1.9 GB of memory for a 150 MB CSV (200,000 rows by 42 columns) and 2.5 GB for a 750 MB CSV (1,000,000 by 42); roughly 1.5 to 1.7 GB of that does not grow with the data (the libraries). Plan for at least 4 GB of RAM, and more for wider data or larger files.
- **Wide one-hot data leaves some model families out.** Linear, TextLinear and DeepLearning work on a one-hot encoded copy of the data (up to 15 levels per category column, 8 bytes per cell, copied again per fold). When that copy would pass 100 million cells they are left out of the run, with a notice.
- **Training and engine messages are in English** in the Japanese UI.

## Training and scores {#training-and-scores}

- **Cross-validation scores are slightly optimistic.** Boosting models stop early on their validation fold, and the ensemble's weights are chosen on the same out-of-fold predictions it is scored on. The leaderboard's ensemble row, the Metrics tab and the star rating inherit this; test data held back from training gives the honest number.
- **The engine uses about two thirds of the maximum run time** in practice, because the search and the final refit leave budget unused.
- **Late TextLinear candidates need time.** For data with text columns, TextLinearWide, TextLinearChar and TextLinearPlain run after the other families, in 15% of the search time kept for them (taken from the other families, not from TextLinear) plus what the others leave unused. A very short run may not try them. They do not use the time kept for the final refit, except that a fold fit already running when the search time ends is not interrupted (as for every family). TextLinearChar is left out for more than about 5 million characters of text and for a text column without spaces, TextLinearPlain when no derived feature was added, and a late candidate whose model would be over the size limit is not run.
- **On a heavily loaded machine the time budget buys fewer boosting rounds.** CatBoost is affected most.
- **The choice of derived features uses the same rows as the cross-validation**, on different folds and with a strict rule, so the scores of a run are slightly optimistic. On small data a real but small gain (about 1% of the loss) often does not clear the rule and the feature is left out. If the time for the choice runs out, groups that passed but were not yet confirmed by the last check are dropped, unless they saved 5% of the loss or more, so short runs may add none. The check judges on a sample of at most 20,000 rows and a small LightGBM, so a feature that only a neural network or a linear model would use is not found; target encoding and categorical crosses as categories are not built. See [Derived features](/guide/automl#derived-features).
- **The group size of an identifier counts training rows only**, so a row of a training group counts itself and a new row does not, and rows that arrive later are not counted.
- **A text column with more than 200 distinct values is read by the models as how often each value occurs** (its share of the training rows); a name, a code or an id that is nearly unique therefore carries almost no signal by itself. Its parts and its text are read only through the derived features (and TextLinear for running text), when the choice of them keeps them. A value not seen in training gets the share of the rarest value in training, so new rows stay inside the range the models were fitted on.
- **Extra seeds make a model bigger and slower to predict.** Time left after the final refits buys up to four more refits of each boosting or forest member; their predictions, importances and contributions are averaged, so each costs that many times more (the size limits still hold). Linear and TextLinear are deterministic and are not repeated.

## Explanations and leak warnings {#explanations-and-leak-warnings}

How to read explanations is in [Model explanations](/guide/explanations).

### Contributions

- **Contributions are approximations.** Each row's contributions (on the result page, through the API, in batch predictions and from Fione Serving) add up to the prediction, to rounding, in probability for classification and in the target's units for regression, not in log-odds. They start from each library's own TreeSHAP (LightGBM, XGBoost, CatBoost), from Saabas path contributions for RandomForest and ExtraTrees, from the exact coefficient times the distance from the training mean for Linear and TextLinear (the words of a text column summed into one value per row) and from integrated gradients along the path from the training mean for DeepLearning, and are then converted to probabilities and combined over the ensemble. Exact Shapley values exist only for each booster on its own, before that conversion. With more than two classes the conversion is a numerical path integral whose small remainder is shared out so that the sum stays exact.
- **Derived features count for the columns they read.** A feature built from several columns (a sum, a missing-value count) splits its contribution and importance equally among them. Partial dependence is unaffected, because it varies the input column and recomputes every feature.
- **One output is explained per row**: with two classes the second one (the last `p_` column), with more the predicted class (the API takes a `class_index` for another), for regression the value. Batch predictions and Fione Serving have no option for every class.
- **Contribution columns in batch predictions** (**Explain each prediction**, `include_contributions` in the API) are a `contrib_<column>` per model input, then `contrib_bias` (`contrib_bias_2` when an input is named `bias`); an input column whose name is taken is kept as `input_<name>`. Each row gains one float64 column per input plus one, so 100,000 rows of a 2,000-column model make about 1.6 GB of output. At most 100,000 rows are explained; the work runs on at most 4 threads (not for Linear, TextLinear and DeepLearning, which use the numerical library's own), in chunks of at most 5,000 rows, and is much slower than a plain prediction.

### The stored explanation

- **Explanations need a dataset.** The explanation job (queued after each training unless `FIONE_EXPLAIN_AFTER_TRAINING` is `false`) and the curves computed on request use the model's training data. An imported model, or one whose training data was deleted, has none: choose a dataset with the model's columns under **Compute the explanation** on the **Explain** tab. Until then the web pages show only curves already stored for it.
- **What the job stores**: importance from the contributions of at most 1,000 rows (fewer for models with many classes by columns), sampled by class, and the partial dependence of the 10 most important columns. Each curve takes its grid from a 10,000-row sample and averages over 300 of those rows (fewer for wide models). A result above 1 MiB, which only very wide models or very long names reach, is trimmed: the least important columns beyond 1,000 first, then the single-row (ICE) lines, then whole curves. Nothing marks a trimmed result.
- **Partial dependence grids** run from the 2nd to the 98th percentile, so a long tail is not shown. Numeric grids have no point for missing values; category grids do. Times with a time zone are shown in UTC. Category levels the model never saw in training can take places on a grid, and count as unknown there. A curve computed on request (a column without a stored curve, or the API) takes its grid as well as its rows from at most 300 rows (fewer for wide models), so its points can differ from those of a stored curve.
- **Diagnostics** (the **Metrics** tab) come from the ensemble's out-of-fold predictions, so they are slightly optimistic, like the cross-validation scores. Above 200,000 rows they come from a random sample. A model has none when it was imported without them, or when they could not be computed or took more than 256 KiB.

### Explaining on request

- **The web process loads trusted models to explain on request.** Viewers can ask for the reasons for the first 5 rows when a prediction's result page is opened, for contributions of up to 100 rows, and for the partial dependence of one column. Up to 2 models and 512 MiB of model files stay loaded.
- **Explanations asked for on the spot are computed one at a time** for the whole server. While one runs, up to four more wait, for 15 seconds at most; any others get a "busy" answer (HTTP 503) at once, so one busy reader can delay everyone's. Models whose file is over 512 MiB (409), imports not vouched for (409), and models with too many rows by classes by columns for the request (422) are refused there and explained only by the explanation job, which needs write access. The rows for one partial dependence curve come from the start of up to 8 parts of the dataset file; on a dataset with thousands of columns that read alone can take a few hundred MiB.

### Leak warnings

- **Only exact leaks are unchecked.** A column identical to the column to predict, or whose value determines it, is left out of the EasyML defaults (row IDs stay unchecked as IDs). A column that only scores high stays checked, with a warning: one that predicts the answer on its own, one whose order or gaps follow the answer, and one with a near-perfect correlation (an absolute r of 0.99 or more).
- **Leak scores are warnings and can be wrong both ways.** A strong legitimate column can be flagged, and a leak can be missed; no warning does not mean no leak. A column is flagged at a single-column AUC of 0.95 (R² of 0.90 for regression) and 0.10 above the best column under that line, or at 0.99 in any case. So beside a column that already scores 0.89 to 0.95, only a score of 0.99 warns: a copy of the answer with 1% of its values wrong (0.987, measured beside the breast cancer dataset's columns) goes unreported. A column that is zero for every row of one class and for some rows of the other (an amount filled in for 80% of the positives) scores at most 0.90 and is never flagged. Regression leaks are mostly missed below about 5,000 rows.
- **The check has limits.** Targets with more than 100 classes get no score at all, and the screens do not say so; only the exact checks run. Scores use at most 10,000 rows, datasets under 200 rows are not scored, and after 3 seconds the check stops and says that some columns were not scored.

## Deployment and Fione Serving {#deployment}

- **One process only.** Run the `fione` service with one worker and do not scale it (see [Configuration](/docs/configuration)).
- **Fione Serving has no authentication** and no rate or concurrency limit for predictions (only the request size limits). Requests for contributions are capped (2 at once by default, then 503), but each one holds the model while it runs, so plain predictions wait for it, and a request at the largest body size can take about 100 MiB of memory. The command the UI shows, `docker run --rm -p 8081:8080 …`, publishes it on every network interface of the host; use `-p 127.0.0.1:8081:8080` to keep it on that machine, and a reverse proxy with authentication to serve others. See [Fione Serving](/docs/serving).
- **The images are large**: about 1.65 GB (`fione`) and 1.7 GB (`fione-serving`), mostly the machine-learning libraries.
- **No images are published yet.** You build them from the repository. On a version tag the release workflow publishes the `fione` and `fione-serving` images, for amd64 only, and it does not wait for the tests of the tagged commit: tag only commits whose CI has passed.
- **On Linux, XGBoost brings NVIDIA's NCCL library** (`nvidia-nccl-cu13`, about 350 MB of the `fione` and `fione-serving` images), although Fione trains on CPUs only. Its package metadata declares the licence `LicenseRef-NVIDIA-Proprietary`, while the licence file inside the wheel is a BSD-3-Clause-style text; the licence check reports it for review rather than as allowed. Review it before redistributing the images. The CPU-only `xgboost-cpu` package (Apache-2.0, no NCCL) has no macOS wheels, so it is not used.
- **Base images are pinned by tag, not by digest**, so a rebuild can pick up a patched base image.

## The assistant and MCP {#assistant-and-mcp}

See [The assistant](/docs/assistant) for how it works.

- **Answers can be wrong.** The default model is small. Check results you rely on; a training it suggests runs only after a person confirms it.
- **Names, statistics and cell values reach the language model server.** Dataset and column names, statistics and example values (the most frequent values of a column, class labels, job messages) are sent with each question to the configured model; MCP clients never receive example values. A server outside this machine needs an administrator's one-time consent, and every chat user is warned.
- **Text from the data can steer what the assistant says, not what it does.** The assistant can only read and propose, and a proposal starts nothing until a person confirms it.
- **Calls to a real model's tools are checked only by an opt-in test.** The tests of the default suite use a fake server; the tests that use a real one are run by hand.
- **MCP uses an API token** (the same rights as the REST API), runs at most two tool calls at once and has no other rate limit. It is off by default.
- **A long conversation is shortened silently.** Only the newest part of it fits the model's context, so the assistant may not remember what was said earlier; start a new conversation for a new topic. A server whose real context is smaller than `FIONE_LLM_CONTEXT_TOKENS` cuts the prompt on its own, which Fione cannot see.
- **An answer that is running when Fione restarts is lost** (it ends as interrupted).
- **Conversations are stored unencrypted** in the database, and not even administrators can see them in Fione.
- **In Docker on macOS, Ollama runs on the CPU only**, so the default is the Ollama app on the host, which Compose reaches as `host.docker.internal`.
- **The Ollama image is about 3.8 GB and the default model about 8 GB.**
- **Abandoned requests to a misbehaving model server can hold connections** of the shared pool (about 100) until the server's own timeout; see [Configuration](/docs/configuration).
- **A server name without dots counts as local**, but a resolver's search domain can make it reach a remote host; see `FIONE_LLM_BASE_URL` in [Configuration](/docs/configuration).
- **The context warning on the System page appears only while the model is loaded**, because Ollama reports the context length of a loaded model only.

## Browser {#browser}

- **Dark mode needs Chrome or Edge 123+, Firefox 120+ or Safari 17.5+** (CSS `light-dark()`); older browsers get the light theme only. There is no "follow the system" setting once the theme was switched by hand (clear the site data to reset it).
- **Japanese line breaking by phrase** (`word-break: auto-phrase`) needs Chrome or Edge 119+; other browsers wrap normally.
- **Sign-in needs JavaScript.**
- **The simple / detailed view is remembered per browser** (a cookie), not per user.
