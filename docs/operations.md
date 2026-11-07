---
title: "Operations: stop, back up and upgrade"
description: Stop Fione, back up its Docker volumes and secret key, restore them on a new machine and upgrade to a newer version of Fione 20 without losing data.
---

# Operations: stop, back up and upgrade

This page covers the day-to-day care of a Fione installation that runs with the Docker Compose setup from [Installation](/guide/installation). Run every command from the repository root. The settings themselves are described in [Configuration](/docs/configuration).

## What lives where

| Where | What it holds |
|---|---|
| Docker volume `fione_fione-data` (`/data` in the `fione` container) | The SQLite database (users, projects, jobs and the other metadata), the **secret key** (`secret.key`), the setup token while no administrator exists, job logs and temporary files. |
| Docker volume `fione_seaweed-data` | The datasets and trained models, stored by SeaweedFS (S3-compatible). |
| `docker/.env` | The S3 credentials Fione and SeaweedFS share, and any optional settings you added. It is not in a volume. |
| Docker volume `fione_ollama-data` | The language model files, only when you use the `ollama` Compose profile. |

Docker names the volumes after the Compose project, `fione`. If you store datasets and models on another S3-compatible service instead of SeaweedFS, that service holds the second row's data and you back it up with its own tools.

## Stop and start

Stop Fione. The data stays in the Docker volumes:

```sh
docker compose -f docker/compose.yaml --env-file docker/.env down
```

Start it again with the command from the installation:

```sh
docker compose -f docker/compose.yaml --env-file docker/.env up -d --build --wait
```

`down -v` would delete the volumes, and with them every project, model and user. Do not use `-v` unless you mean to start from nothing.

The `fione` and SeaweedFS containers (and Ollama, when you use that profile) are set to restart unless they were stopped, so they come back when Docker or the machine restarts.

## Back up

Back up while Fione is stopped. The following commands write two archives in the current directory:

```sh
docker run --rm -u 0 -v fione_fione-data:/data:ro --entrypoint tar ghcr.io/codelibs/fione:dev czf - -C /data . > fione-data.tgz
docker run --rm -u 0 -v fione_seaweed-data:/data:ro --entrypoint tar ghcr.io/codelibs/fione:dev czf - -C /data . > seaweed-data.tgz
```

If you built the images with a `FIONE_IMAGE_TAG` other than `dev`, use your tag in place of `dev` in these commands.

Keep these points in mind:

- `fione-data.tgz` holds the database and the **secret key**. Keep it private.
- The secret key signs sessions and the manifests of trained models. If it is lost or replaced, everyone has to sign in again and Fione can no longer load the models already trained. Always back it up together with the rest of the `fione-data` volume. See the secret key notes in [Configuration](/docs/configuration).
- `docker/.env` is not in the archives. Keep it with them, or create a new one with the `printf` command from [Installation](/guide/installation).

## Restore

To restore into empty volumes (for example on a new machine, before the first start), build the images, restore the archives, then start as usual. Compose warns that the volumes already exist; that is expected.

```sh
docker compose -f docker/compose.yaml --env-file docker/.env build
docker run --rm -i -u 0 -v fione_fione-data:/data --entrypoint tar ghcr.io/codelibs/fione:dev xzf - -C /data < fione-data.tgz
docker run --rm -i -u 0 -v fione_seaweed-data:/data --entrypoint tar ghcr.io/codelibs/fione:dev xzf - -C /data < seaweed-data.tgz
docker compose -f docker/compose.yaml --env-file docker/.env up -d --build --wait
```

## Upgrade

To upgrade to a newer version of Fione 20:

1. Back up, as above.
2. Keep the current serving image under another name. Rebuilding the serving image replaces `ghcr.io/codelibs/fione-serving:dev`, and you may still need the old one (see below).
3. Get the new version and rebuild Fione and the serving image:

```sh
docker tag ghcr.io/codelibs/fione-serving:dev fione-serving:before-upgrade
git pull
docker compose -f docker/compose.yaml --env-file docker/.env up -d --build --wait
docker compose -f docker/compose.yaml --env-file docker/.env --profile serving build fione-serving
```

Your data stays. Afterwards, an administrator can check the **Version** and **Image tag** on the **System status** page (account menu).

**Models and image tags.** Every trained model records the tag of the image that trained it, and Fione Serving only loads models of its own tag. Models trained by an older version are also not guaranteed to load in a newer one, because they are pickles of Fione's code. After an upgrade, retrain the models you rely on. Until then, serve their bundles with the image you kept: in the `docker run` command, replace `ghcr.io/codelibs/fione-serving:dev` with `fione-serving:before-upgrade`.

Setting a different `FIONE_IMAGE_TAG` in `docker/.env` for each version avoids this: both images then carry the version in their tag, and the old serving image stays available beside the new one.

## Running notes

- **One process.** Run the `fione` service as a single process with one worker and do not scale it. The sign-in throttle, the upload limits and the job runner live in that process's memory. See the deployment notes in [Configuration](/docs/configuration).
- **Reverse proxy.** The ports are published on `127.0.0.1` only. To serve other people, put a reverse proxy with HTTPS in front of Fione and set `FIONE_TRUST_PROXY` and `FIONE_COOKIE_SECURE`; the example proxy configuration is in [Configuration](/docs/configuration).
- **Disk space.** The **System status** page does not report free disk space, so check it on the server. Uploads and imports are spooled to the data volume and need about twice their size while they are converted: keep at least 2 GiB free for the default 1 GiB upload limit.
- **Memory.** Training, batch prediction and Python modules load the whole dataset into memory. Plan for at least 4 GB of RAM, and more for wider data or larger files (see [Known limitations](/docs/known-limitations)).
- **Setup token.** Anyone who can read the log can create the first administrator until one exists, so create it soon after the first start.
