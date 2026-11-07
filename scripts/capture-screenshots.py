#!/usr/bin/env python3
"""Capture the documentation screenshots from a running Fione 20.0 test stack.

The stack is the product repository's end-to-end stack (its docker/compose.e2e.yaml, which
publishes http://127.0.0.1:18080 and a fake language model). Start it on a fresh volume
(no administrator yet), then, with Playwright's Chromium installed:

    FIONE_SETUP_TOKEN=<token of docker/e2e.env> \
    uv run --project <path to the fione repository> --with pillow \
        python scripts/capture-screenshots.py [--base http://127.0.0.1:18080]

It creates a throwaway administrator, a project, trains the iris model with the 1-minute
preset, and writes the images to ``guide/img/`` (English) and ``ja/guide/img/`` (Japanese).
The assistant's comments are removed from the pages before the shots: the stack's model is a
stand-in that answers with canned text.
"""

from __future__ import annotations

import argparse
import os
import re
from pathlib import Path

from playwright.sync_api import Page, expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ADMIN, PASSWORD = "docs-admin", "docs-admin-password-1"  # throwaway, inside the test stack
VIEWPORT = {"width": 1280, "height": 800}

# One viewport-sized image per entry unless the name is in FULL_PAGE.
FULL_PAGE = {"analyze", "summary", "result", "dataset", "train", "model-explain"}

NOTE_SELECTORS = "#assistant-note, .assistant-note"


def iris_csvs(directory: Path) -> tuple[Path, Path]:
    from sklearn.datasets import load_iris

    frame = load_iris(as_frame=True).frame
    frame["species"] = frame.pop("target").map({0: "setosa", 1: "versicolor", 2: "virginica"})
    train, new = directory / "iris.csv", directory / "new.csv"
    frame.to_csv(train, index=False)
    frame.drop(columns=["species"]).iloc[[0, 60, 120]].to_csv(new, index=False)
    return train, new


def shoot(page: Page, name: str, out: Path) -> None:
    page.evaluate(
        "sel => document.querySelectorAll(sel).forEach(e => e.remove())", NOTE_SELECTORS
    )
    page.wait_for_timeout(400)
    out.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(out / f"{name}.png"), full_page=name in FULL_PAGE)


def run(base: str, token: str) -> None:
    import tempfile

    with tempfile.TemporaryDirectory() as tmp, sync_playwright() as p:
        train_csv, new_csv = iris_csvs(Path(tmp))
        browser = p.chromium.launch()

        def context(locale: str):
            return browser.new_context(
                base_url=base,
                viewport=VIEWPORT,
                locale=locale,
                color_scheme="light",
                accept_downloads=True,
            )

        # ---- English: the first administrator, a project, a trained model, a prediction
        ctx = context("en-US")
        page = ctx.new_page()
        page.goto("/")
        page.wait_for_url("**/first-admin")
        shoot(page, "setup", ROOT / "guide" / "img")
        ja_ctx = context("ja-JP")
        ja_page = ja_ctx.new_page()
        ja_page.goto("/")
        ja_page.wait_for_url("**/first-admin")
        shoot(ja_page, "setup", ROOT / "ja" / "guide" / "img")
        ja_ctx.close()
        page.fill("#setup-token", token)
        page.fill("#setup-username", ADMIN)
        page.fill("#setup-password", PASSWORD)
        page.fill("#setup-password2", PASSWORD)
        page.click("form[data-json-form] button[type=submit]")
        page.wait_for_url(f"{base}/")

        page.fill("#project-name", "Iris")
        page.click("#new-project button[type=submit]")
        page.click(".project-card__link:text-is('Iris')")
        page.wait_for_url("**/projects/*")
        project = page.url.removeprefix(base)

        page.goto("/admin/system")
        expect(page.locator("section[aria-labelledby=llm-title] .badge-success")).to_be_visible(
            timeout=60_000
        )
        page.goto(project + "/upload")
        page.set_input_files("#upload-file", str(train_csv))
        page.click("form[data-upload-form] button[type=submit]")
        page.wait_for_url("**/analyze")
        dataset = page.url.removeprefix(base).removesuffix("/analyze")
        page.check("#runtime-1")
        page.click("#run-button")
        page.wait_for_url("**/jobs/*")
        job = page.url.removeprefix(base)
        page.wait_for_url("**/summary", timeout=240_000)
        summary = page.url.removeprefix(base)
        model = summary.removesuffix("/summary")
        # the explain job the training queues
        model_id = model.rsplit("/", 1)[1]
        for _ in range(240):
            status = page.request.get(f"/api/v1/models/{model_id}/explanations").json()["status"]
            if status not in ("none", "queued", "running"):
                break
            page.wait_for_timeout(1000)
        assert status == "done", status
        page.goto(model + "?tab=explain")
        expect(page.locator("#contrib-chart canvas").first).to_be_visible(timeout=30_000)

        page.goto(model + "/predict")
        page.set_input_files("#upload-file", str(new_csv))
        page.click("form[data-upload-form] button[type=submit]")
        page.wait_for_url("**/predict?dataset=*")
        page.click("form[data-run-form] button[type=submit]")
        page.wait_for_url("**/result", timeout=120_000)
        result = page.url.removeprefix(base)
        expect(page.locator("#why .why-row")).to_have_count(3, timeout=60_000)
        ctx.storage_state(path=str(Path(tmp) / "state.json"))
        ctx.close()

        pages = {
            "projects": "/",
            "upload": f"{project}/upload",
            "analyze": f"{dataset}/analyze",
            "progress": job,
            "summary": summary,
            "predict": f"{model}/predict",
            "result": result,
            "dataset": dataset,
            "train": f"{dataset}/train",
            "jobs": f"{project}/jobs",
            "models": f"{project}/models",
            "model-explain": f"{model}?tab=explain",
            "members": f"{project}/members",
            "users": "/admin/users",
            "account": "/account",
            "modules": "/modules",
        }
        for locale, out in (
            ("en-US", ROOT / "guide" / "img"),
            ("ja-JP", ROOT / "ja" / "guide" / "img"),
        ):
            ctx = browser.new_context(
                base_url=base,
                viewport=VIEWPORT,
                locale=locale,
                color_scheme="light",
                storage_state=str(Path(tmp) / "state.json"),
            )
            page = ctx.new_page()
            if locale == "ja-JP":
                page.goto("/login")  # signed in: shows nothing useful, but sets the cookie jar
            for name, path in pages.items():
                page.goto(path)
                page.wait_for_load_state("networkidle")
                if name in {"model-explain", "result"}:
                    page.wait_for_timeout(1500)  # charts and per-row reasons draw late
                shoot(page, name, out)
            # the login page needs a signed-out context
            anon = browser.new_context(base_url=base, viewport=VIEWPORT, locale=locale)
            anon_page = anon.new_page()
            anon_page.goto("/login")
            shoot(anon_page, "login", out)
            anon.close()
            ctx.close()
        browser.close()
    print("done")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="http://127.0.0.1:18080")
    args = ap.parse_args()
    token = os.environ.get("FIONE_SETUP_TOKEN")
    if not token:
        raise SystemExit("set FIONE_SETUP_TOKEN (the stack's setup token)")
    if not re.fullmatch(r"https?://(127\.0\.0\.1|localhost)(:\d+)?", args.base):
        raise SystemExit("--base must be a local address")
    run(args.base, token)
