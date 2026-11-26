---
title: Installation and quick start
description: Install Fione with Docker Compose, set its secrets, start it, create the administrator with the setup token and get a sample CSV to try.
---

# Installation and quick start

This page takes you from nothing to a running Fione with an administrator account, using Docker. Allow a few minutes for the first build.

## What you need

- Docker with Compose v2 (Docker Desktop, or Docker Engine with the compose plugin).
- About 6 GB of disk space for the images and their build cache, plus room for your data.
- `git` and `openssl` (and `unzip` and `curl` for the Fione Serving and REST API examples).
- A current browser. Dark mode needs Chrome or Edge 123+, Firefox 120+ or Safari 17.5+; older ones get the light theme only.

The images are built on your machine from the Fione repository, on amd64 or arm64 (Apple silicon).

## 1. Get Fione and set its secrets

```sh
git clone https://github.com/codelibs/fione.git
cd fione
printf 'FIONE_S3_ACCESS_KEY=%s\nFIONE_S3_SECRET_KEY=%s\n' "$(openssl rand -hex 16)" "$(openssl rand -hex 32)" > docker/.env
```

`docker/.env` holds the credentials that Fione and its storage (SeaweedFS) share. Git ignores it; keep it private. Compose refuses to start while either value is empty. `docker/.env.example` lists the other optional values, and [Configuration](/docs/configuration) describes every setting.

## 2. Start it

```sh
docker compose -f docker/compose.yaml --env-file docker/.env up -d --build --wait
```

![The first administrator page](./img/setup.png)

The first build downloads and installs the machine-learning libraries and takes a few minutes. `--wait` returns when the containers (`fione` and `seaweedfs`) are healthy. Fione is then at <http://127.0.0.1:8080/>. The port is published on this machine only; to serve other people, put a reverse proxy with HTTPS in front of it (see the reverse proxy notes in [Configuration](/docs/configuration)).

## 3. Create the administrator

Fione has no default password. Until an administrator exists, it writes a setup token to its log at every start:

```sh
docker compose -f docker/compose.yaml --env-file docker/.env logs fione | grep "Setup token"
```

Open <http://127.0.0.1:8080/>. The page **Create the administrator account** asks for:

- the **Setup token** from the log,
- an **Administrator username** (letters, digits, dot, underscore and hyphen; up to 64 characters),
- a **Password** of 8 characters or more, and **Confirm password**.

Press **Create administrator** and you are signed in.

Do this soon after the first start: until an administrator exists, anyone who can read the log can do it. If you prefer to choose the token yourself, set `FIONE_SETUP_TOKEN` (16 characters or more) in `docker/.env` before starting. Fione then does not print a token in its log, so the `grep` above finds nothing. The token stops working once an administrator exists.

Afterwards, people sign in on the login page with their username and password. An administrator adds the other users; see [Users and sharing](/guide/users-sharing).

## 4. Get a CSV to try

Any CSV with a header row works. To try with the classic iris flowers, export the copy that ships with scikit-learn from the running container:

```sh
docker compose -f docker/compose.yaml --env-file docker/.env exec -T fione python -c "from sklearn.datasets import load_iris; d = load_iris(as_frame=True); f = d.frame; f['species'] = d.target_names[f.pop('target')]; f.to_csv('/dev/stdout', index=False)" > iris.csv
```

This writes `iris.csv`: 150 rows, four measurements and the `species` column. Fione accepts CSV files in UTF-8, Shift_JIS or EUC-JP, separated by commas, semicolons, tabs or `|`, with the column names in the first row. The default upload limit is 1 GiB.

## Use it from AI tools

MCP is on, so AI tools such as Claude Code or Codex can use this Fione right away: create an API token on the **Account** page and give it to the tool with the address `http://127.0.0.1:8080/mcp`. The tool brings its own language model. See [Run the AutoML loop from an AI tool with MCP](/guide/mcp).

## The assistant (optional)

Fione needs no language model: training, predictions, explanations, serving and MCP work without one. The assistant, a chat that answers questions about your data and models in the browser, is off. To turn it on, set `FIONE_LLM_PROVIDER` in `docker/.env` and start the stack again: `ollama` with the Ollama app on a Mac, or with an Ollama in Compose on Linux, or `claude` with an Anthropic API key. See [Assistant setup and privacy](/docs/assistant).

## Next step

Continue with the [EasyML wizard](/guide/easyml) to train your first model on `iris.csv`. To stop, back up or upgrade Fione later, see [Operations](/docs/operations).
