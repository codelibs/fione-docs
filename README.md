# Fione Documentation

Source repository for the [Fione](https://github.com/codelibs/fione) documentation site, built with [VitePress](https://vitepress.dev/).

## Live Site

| Version | English | Japanese |
|---------|---------|----------|
| 20.0 (latest) | https://fione.codelibs.org/ | https://fione.codelibs.org/ja/ |
| 14.6 (archive) | https://fione.codelibs.org/14.6/ | https://fione.codelibs.org/14.6/ja/ |

## Project Structure

```
fione-docs/
├── .vitepress/
│   ├── config.ts          # Site configuration (nav, sidebar, i18n, SEO)
│   └── theme/             # Theme extensions (version switcher, language links)
│
├── public/                # Static assets (favicon, logo, OG image, robots.txt)
├── index.md               # English home
├── guide/                 # English guide
├── docs/                  # English reference
├── ja/                    # Japanese (index.md, guide/, docs/)
│
├── 14.6/                  # Archive of the 14.x docs (noindex)
│   └── ja/                # Japanese archive
│
├── scripts/               # check-anchors.mjs, make_og_image.py
├── package.json
└── yarn.lock
```

All versions and languages are built together as a single VitePress project.

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18 (22 in CI)
- [Yarn](https://classic.yarnpkg.com/) v1

## Getting Started

```sh
yarn install
yarn docs:dev             # dev server with hot reload at http://localhost:5173
yarn docs:build           # production build into .vitepress/dist/
yarn docs:preview         # preview the production build
yarn docs:check-anchors   # verify every internal #fragment (run after docs:build)
```

## Editing Content

- The current docs (Fione 20.0) are in the root (`index.md`, `guide/`, `docs/`) and in `ja/`. Add the English and Japanese page together.
- `14.6/` is the archive of the 14.x docs and generally should not change.
- Navigation and sidebars are in `.vitepress/config.ts`: when you add a page, register it in `guideSidebar` or `docsSidebar`.
- Images are kept next to the Markdown file that uses them.

See `CLAUDE.md` for the conventions and the version lifecycle.
