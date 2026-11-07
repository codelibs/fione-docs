# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```sh
yarn install        # Node.js >= 18, Yarn v1
yarn docs:dev       # dev server with hot reload at http://localhost:5173
yarn docs:build     # production build -> .vitepress/dist/
yarn docs:preview   # preview the production build
yarn docs:check-anchors  # every internal #fragment resolves (run after docs:build)
```

## Documentation policy

**Documentation is managed as documentation.** Nothing in this repository reads a
`.md` file and asserts on what it says. When the product changes, fix the page; when
a page is wrong, fix the page. Do not add a script or a CI step that goes red on a
wording change. The checks that remain are functional: `docs:build` fails on a dead
internal link and `docs:check-anchors` fails on a `#fragment` that matches no heading.

The current docs describe the current product only: no history of what changed, no
mention of older versions, no migration notes. Older versions live in their own
version directory.

A page that is listed in a sidebar but missing on disk builds fine and 404s. After
adding or renaming a page, check that every sidebar `link` in `.vitepress/config.ts`
has a file.

### Heading anchors

VitePress does not validate `#fragment` links. Heading ids come from the
`markdown.anchor.slugify` override in `.vitepress/config.ts` (VitePress' slugify plus a
trailing NFC recomposition, so Japanese voiced kana match hand-written anchors). Keep
Markdown in NFC.

## Architecture

A **VitePress** site for Fione, English and Japanese, built as one project. Routing,
SEO, nav and sidebars are in `.vitepress/config.ts`.

### Versioning ("unversioned = latest stable")

| Path | Content | Indexed |
|---|---|---|
| `/` | Home | yes |
| `guide/`, `docs/` (+ `ja/…`) | **Current stable** (20.0). URLs are stable across releases. | yes |
| `14.6/` (+ `14.6/ja/…`) | Archive of the 14.x docs | no |

- Edit the current line at the **unversioned** root. Keep these URLs stable.
- Any directory matching `^\d+\.\d+/` is `noindex, follow` + self-canonical and left out of
  `sitemap.xml` and of the local search (handled in `transformPageData`,
  `sitemap.transformItems` and the search `_render`). No per-page front matter is needed.
- Version directories are self-contained: `x.y/` (English) and `x.y/ja/` (Japanese). VitePress
  routes `x.y/ja/…` to the `ja` locale, so a version's Japanese sidebar is registered under
  both locales in `config.ts`.

### Version lifecycle

When development of the next minor version starts (for example 20.1), seed a preview
directory `20.1/` from the root: copy `guide/`, `docs/`, `index.md` and the `ja/`
counterparts into `20.1/` and `20.1/ja/`, and rewrite absolute `](/docs/…)` and `](/guide/…)`
links to stay inside it (`](/20.1/docs/…)`). Register its sidebars in `config.ts` and add it
to `.vitepress/theme/VersionSwitcher.vue`.

At a release, the version directory is **kept** as the permanent archive and its content is
promoted to the root: copy it over `guide/ docs/ index.md` (+ `ja/…`), rewriting `/x.y/…` links
back to the root, and turn the preview banner in `x.y/index.md` into an archive notice. The
version that is current today (20.0) has no `20.0/` directory yet: create it by copying the
root, as above, when the next version's preview is seeded.

### Authoring conventions

- **SEO front matter on every content page**: a unique `title` (≤ ~60 chars) and a unique
  `description` (≤ ~155 chars), in the page's language. Quote a value that contains a colon.
- **Links**: at the root use absolute paths (`/guide/…`, `/docs/…`, `/ja/…`). Inside a version
  directory links stay inside it.
- **Bilingual**: add the English and Japanese pages together and keep them in sync. UI terms
  are the same in both languages as in the app (`src/fione/i18n/*.json` in the product repo).
- **Images** sit next to the Markdown file that uses them; shared assets (favicon, logo, OG
  image) go in `public/`.
- No local paths, host names, tokens or keys in pages, images or commit/PR text.

### Not published

`srcExclude` drops `specs/**`, `scripts/**`, `CLAUDE.md` and `README.md`. `specs/` is
git-ignored: design notes stay local.

### Build and deploy

CI (`.github/workflows/build.yml`) runs `yarn docs:build` and `yarn docs:check-anchors`. The
site is published by a Jenkins job that runs the same build and copies `.vitepress/dist/*` to
the web server without deleting existing files.

### Analytics

Production builds add the Google Analytics and AdSense scripts from the constants at the
top of `.vitepress/config.ts`.
