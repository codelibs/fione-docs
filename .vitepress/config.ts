import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitepress'
import type { DefaultTheme, HeadConfig } from 'vitepress'

// ---------------------------------------------------------------------------
// SEO helpers (canonical, hreflang, Open Graph / Twitter, JSON-LD)
// ---------------------------------------------------------------------------

const SITE = 'https://fione.codelibs.org'
const SITE_NAME = 'Fione'
const GITHUB_REPO = 'https://github.com/codelibs/fione'
const SITE_DESC_EN =
  'Fione is an open-source AutoML server: upload a CSV in the browser, get a trained model, make predictions and serve the model as an API. Self-hosted with one docker compose up.'
const SITE_DESC_JA =
  'Fione はオープンソースの AutoML サーバーです。ブラウザーで CSV をアップロードしてモデルを学習し、予測を行い、予測 API として提供できます。docker compose up だけで動かせます。'
const OG_IMAGE = `${SITE}/og-image.png`

// ---------------------------------------------------------------------------
// Google Analytics + AdSense (production builds only). Carried over from the
// previous site; to be replaced by Google Tag Manager later.
// ---------------------------------------------------------------------------

const GA_ID = 'UA-34667351-7'
const ADSENSE_ID = 'ca-pub-0248074489415800'
const IS_PROD = process.env.NODE_ENV === 'production'

// Map a VitePress page relativePath (e.g. "ja/docs/security.md") to its served
// URL, matching the default (cleanUrls: false) scheme so canonical / hreflang /
// og:url all agree with the generated sitemap.
function pathToUrl(rel: string): string {
  let p = '/' + rel.replace(/\.md$/, '')
  p = p.replace(/\/index$/, '/')
  if (!p.endsWith('/')) p += '.html'
  return p
}

// EN counterpart of a /ja/... URL.
function stripJa(url: string): string {
  return url.replace(/^\/ja(\/|$)/, '/')
}

function orgNode() {
  return {
    '@type': 'Organization',
    '@id': `${SITE}/#organization`,
    name: 'CodeLibs, Inc.',
    url: 'https://codelibs.co',
    logo: `${SITE}/fione-logo.svg`,
  }
}

function homeJsonLd(isJa: boolean) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      orgNode(),
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: SITE,
        name: SITE_NAME,
        inLanguage: isJa ? 'ja-JP' : 'en-US',
        publisher: { '@id': `${SITE}/#organization` },
      },
      {
        '@type': 'SoftwareApplication',
        name: SITE_NAME,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Linux, macOS, Docker',
        url: SITE,
        sameAs: [GITHUB_REPO],
        description: isJa ? SITE_DESC_JA : SITE_DESC_EN,
        license: 'https://www.apache.org/licenses/LICENSE-2.0',
        author: { '@id': `${SITE}/#organization` },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
    ],
  }
}
function articleJsonLd(o: {
  title: string
  desc: string
  url: string
  isJa: boolean
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: o.title,
    description: o.desc,
    inLanguage: o.isJa ? 'ja-JP' : 'en-US',
    url: o.url,
    image: OG_IMAGE,
    author: orgNode(),
    publisher: orgNode(),
  }
}

// ---------------------------------------------------------------------------
// Version directories
// ---------------------------------------------------------------------------

// `14.6/`, `20.0/`, … — archives and in-development previews. They stay
// served (the product links to them) but are kept out of every discovery
// surface: `noindex` + self-canonical in `transformPageData`, dropped from
// `sitemap.xml`, and excluded from the local search index. One regex so those
// three cannot drift apart.
const VERSION_DIR_RE = /^\d+\.\d+\//

// ---------------------------------------------------------------------------
// Sidebar helpers
// ---------------------------------------------------------------------------

function guideSidebar(lang: 'en' | 'ja'): DefaultTheme.SidebarItem[] {
  const p = lang === 'ja' ? '/ja/guide' : '/guide'
  const t = (en: string, ja: string) => (lang === 'ja' ? ja : en)
  return [
    {
      text: t('Getting started', 'はじめに'),
      collapsed: false,
      items: [
        { text: t('Overview', '概要'), link: `${p}/` },
        { text: t('Quick start', 'クイックスタート'), link: `${p}/installation` },
        { text: t('EasyML wizard', 'EasyML ウィザード'), link: `${p}/easyml` },
      ],
    },
    {
      text: t('Using Fione', '使い方'),
      collapsed: false,
      items: [
        { text: t('AutoML screens', 'AutoML 画面'), link: `${p}/automl` },
        { text: t('Model explanations', 'モデルの説明'), link: `${p}/explanations` },
        { text: t('Users and sharing', 'ユーザーと共有'), link: `${p}/users-sharing` },
        { text: t('Python modules', 'Python モジュール'), link: `${p}/python-modules` },
        { text: t('Python client (fione-sdk)', 'Python クライアント (fione-sdk)'), link: `${p}/sdk` },
        { text: t('The assistant', 'アシスタント'), link: `${p}/assistant` },
      ],
    },
  ]
}

function docsSidebar(lang: 'en' | 'ja'): DefaultTheme.SidebarItem[] {
  const p = lang === 'ja' ? '/ja/docs' : '/docs'
  const t = (en: string, ja: string) => (lang === 'ja' ? ja : en)
  return [
    {
      text: t('Reference', 'リファレンス'),
      collapsed: false,
      items: [
        { text: t('Overview', '概要'), link: `${p}/` },
        { text: t('Configuration', '設定'), link: `${p}/configuration` },
        { text: t('Fione Serving', 'Fione Serving'), link: `${p}/serving` },
        { text: t('REST API', 'REST API'), link: `${p}/rest-api` },
        { text: t('Assistant setup and MCP', 'アシスタントの設定と MCP'), link: `${p}/assistant` },
      ],
    },
    {
      text: t('Operations', '運用'),
      collapsed: false,
      items: [
        { text: t('Stop, back up, upgrade', '停止・バックアップ・更新'), link: `${p}/operations` },
        { text: t('Known limitations', '既知の制限'), link: `${p}/known-limitations` },
      ],
    },
  ]
}

// Archive of the 14.x docs (14.6/ and 14.6/ja/). One flat list per language.
function archiveSidebar(lang: 'en' | 'ja'): DefaultTheme.SidebarItem[] {
  const p = lang === 'ja' ? '/14.6/ja' : '/14.6'
  const t = (en: string, ja: string) => (lang === 'ja' ? ja : en)
  return [
    {
      text: t('Getting started', 'はじめに'),
      collapsed: false,
      items: [
        { text: t('Overview', '概要'), link: `${p}/getting-started/overview` },
        { text: t('Quick start', 'クイックスタート'), link: `${p}/getting-started/quickstart` },
      ],
    },
    ...(lang === 'ja'
      ? [
          {
            text: 'チュートリアル',
            collapsed: false,
            items: [{ text: 'Titanic', link: `${p}/tutorial/titanic` }],
          },
          {
            text: '開発',
            collapsed: false,
            items: [
              { text: '開発ガイド', link: `${p}/develop/guide` },
              { text: 'リソース', link: `${p}/develop/resource` },
            ],
          },
        ]
      : [
          {
            text: 'Development',
            collapsed: false,
            items: [{ text: 'Resources', link: `${p}/develop/resource` }],
          },
        ]),
    {
      text: t('Others', 'その他'),
      collapsed: false,
      items: [{ text: t('Forum', 'フォーラム'), link: `${p}/others/forum` }],
    },
  ]
}

// ---------------------------------------------------------------------------
// Published page inventory (language switcher)
// ---------------------------------------------------------------------------

// The default theme's language flyout assumes the locale is a single prefix at
// the front of the path. Here the language sits *inside* each version directory
// (`14.6/ja/docs/…`), so `.vitepress/theme/langs.ts` derives the counterpart from
// the directory layout instead — and needs to know which pages exist, because a
// few archived 1.0 pages were never translated. The exclusions mirror
// `srcExclude` below plus the directories VitePress never renders as pages, so
// the list only ever names pages the build actually writes.
const NON_PAGE_DIRS = new Set([
  'node_modules',
  'public',
  'scripts',
  'specs',
  'src',
  '.cache',
])
const NON_PAGE_FILES = new Set(['CLAUDE.md', 'README.md'])

function collectPageIds(dir: string, prefix = ''): string[] {
  const ids: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const id = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || NON_PAGE_DIRS.has(entry.name)) continue
      ids.push(...collectPageIds(join(dir, entry.name), id))
    } else if (entry.name.endsWith('.md') && !NON_PAGE_FILES.has(id)) {
      ids.push(id)
    }
  }
  return ids
}

const SRC_ROOT = fileURLToPath(new URL('..', import.meta.url))
const PAGE_IDS = collectPageIds(SRC_ROOT)

interface FioneThemeConfig extends DefaultTheme.Config {
  /** Every published page id (VitePress `relativePath`). */
  pageIds: string[]
}

// ---------------------------------------------------------------------------
// Heading slugs (Japanese anchors)
// ---------------------------------------------------------------------------

// VitePress' default slugify runs NFKD and then strips only U+0300–U+036F, the
// Latin combining block. NFKD also decomposes Japanese voiced kana — パ becomes
// ハ + U+309A, デ becomes テ + U+3099 — and those marks survive the strip. The
// heading id therefore ends up in decomposed form while `[…](#パスルール)`, and
// every other hand-written anchor, is composed. The two are visually identical
// but unequal, so the link opens the page and never scrolls. VitePress does not
// validate fragments, so nothing fails the build (see scripts/check-anchors.mjs).
//
// Recomposing with NFC after the strip fixes exactly that: canonical
// composition is restored, while NFKD's compatibility folding (full-width → ASCII,
// ｱ → ア) and Latin accent stripping (é → e) are unaffected, since NFC does not
// reverse compatibility mappings and the accents are already gone by then.
//
// Copied from vitepress 1.6.4 (dist/node/chunk-*.js, `slugify`), which inlines
// @mdit-vue/shared — that package is bundled rather than a resolvable dependency,
// so it cannot be imported and wrapped.
const rControl = /[\u0000-\u001f]/g
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g
const rCombining = /[\u0300-\u036f]/g

function slugify(str: string): string {
  return str
    .normalize('NFKD')
    .replace(rCombining, '')
    .replace(rControl, '')
    .replace(rSpecial, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
    .normalize('NFC')
}


// ---------------------------------------------------------------------------
// Main config
// ---------------------------------------------------------------------------

const prodHead: HeadConfig[] = IS_PROD
  ? [
      ['script', { async: '', src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` }],
      [
        'script',
        {},
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}');`,
      ],
      [
        'script',
        {
          async: '',
          src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_ID}`,
          crossorigin: 'anonymous',
        },
      ],
    ]
  : []

export default defineConfig({
  title: 'Fione',

  markdown: {
    // Heading ids. The default theme's outline reads ids back off the DOM, so
    // this is the only place the slug is minted.
    anchor: { slugify },
  },

  ignoreDeadLinks: [/^https?:\/\/localhost/, /^https?:\/\/127\.0\.0\.1/],

  head: [
    ['meta', { name: 'theme-color', content: '#2f54c8' }],
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    ...prodHead,
  ],

  sitemap: {
    hostname: SITE,
    // Version directories (14.6/, …) are noindexed (see transformPageData) but
    // still served; the current stable is the unversioned root tree.
    transformItems: (items) =>
      items.filter((i) => {
        const u = i.url.replace(/^\//, '')
        return !VERSION_DIR_RE.test(u) && u !== 'CLAUDE.html' && u !== 'README.html'
      }),
  },

  // Design/spec docs and scripts live in the repo but are not site pages.
  srcExclude: ['specs/**', 'scripts/**', 'CLAUDE.md', 'README.md'],

  // Per-page SEO: canonical + EN/JA hreflang alternates + Open Graph /
  // Twitter cards + JSON-LD, generated for every page from its relativePath.
  transformPageData(pageData) {
    const rel = pageData.relativePath
    const url = pathToUrl(rel)
    const head = (pageData.frontmatter.head ??= [])

    // Version-pinned directories (14.6/, …): kept accessible (the
    // product links to them; the current stable lives unversioned at the root)
    // but removed from search via noindex; self-canonical, no bilingual pairing.
    if (VERSION_DIR_RE.test(rel)) {
      head.push(['meta', { name: 'robots', content: 'noindex, follow' }])
      head.push(['link', { rel: 'canonical', href: SITE + url }])
      return
    }

    const isJa = rel.startsWith('ja/')
    const isHome = rel === 'index.md' || rel === 'ja/index.md'
    const enUrl = isJa ? stripJa(url) : url
    const jaUrl = isJa ? url : '/ja' + url
    const desc =
      (pageData.frontmatter.description as string) ||
      (isJa ? SITE_DESC_JA : SITE_DESC_EN)
    const title = pageData.title ? `${pageData.title} | ${SITE_NAME}` : SITE_NAME

    head.push(
      ['link', { rel: 'canonical', href: SITE + url }],
      ['link', { rel: 'alternate', hreflang: 'en', href: SITE + enUrl }],
      ['link', { rel: 'alternate', hreflang: 'ja', href: SITE + jaUrl }],
      ['link', { rel: 'alternate', hreflang: 'x-default', href: SITE + enUrl }],
      ['meta', { property: 'og:site_name', content: SITE_NAME }],
      ['meta', { property: 'og:type', content: isHome ? 'website' : 'article' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: desc }],
      ['meta', { property: 'og:url', content: SITE + url }],
      ['meta', { property: 'og:image', content: OG_IMAGE }],
      ['meta', { property: 'og:locale', content: isJa ? 'ja_JP' : 'en_US' }],
      ['meta', { property: 'og:locale:alternate', content: isJa ? 'en_US' : 'ja_JP' }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: title }],
      ['meta', { name: 'twitter:description', content: desc }],
      ['meta', { name: 'twitter:image', content: OG_IMAGE }],
      [
        'script',
        { type: 'application/ld+json' },
        JSON.stringify(
          isHome
            ? homeJsonLd(isJa)
            : articleJsonLd({
                title: pageData.title || SITE_NAME,
                desc,
                url: SITE + url,
                isJa,
              }),
        ),
      ],
    )
  },

  // i18n: the root locale is English, `ja` is Japanese. Version directories are
  // self-contained under the root locale (14.6/ and 14.6/ja/).
  locales: {
    root: {
      lang: 'en-US',
      label: 'English',
      description: SITE_DESC_EN,
      themeConfig: {
        nav: [
          { text: 'Guide', link: '/guide/' },
          { text: 'Docs', link: '/docs/' },
          { text: 'Forum', link: 'https://discuss.codelibs.org/c/fioneen/' },
          { text: 'Commercial Support', link: 'https://codelibs.co/' },
        ],
        sidebar: {
          '/guide/': guideSidebar('en'),
          '/docs/': docsSidebar('en'),
          '/14.6/ja/': archiveSidebar('ja'),
          '/14.6/': archiveSidebar('en'),
        },
      },
    },
    ja: {
      lang: 'ja-JP',
      label: '日本語',
      description: SITE_DESC_JA,
      themeConfig: {
        nav: [
          { text: 'ガイド', link: '/ja/guide/' },
          { text: 'ドキュメント', link: '/ja/docs/' },
          { text: 'フォーラム', link: 'https://discuss.codelibs.org/c/fioneja/' },
          { text: '商用サポート', link: 'https://codelibs.co/ja/' },
        ],
        sidebar: {
          '/ja/guide/': guideSidebar('ja'),
          '/ja/docs/': docsSidebar('ja'),
          // Every `X.Y/ja/**` page resolves to the ja locale, so the archive's
          // Japanese sidebar must be registered here as well as in root.
          '/14.6/ja/': archiveSidebar('ja'),
        },
      },
    },
  },

  // Swap the default theme's language-switcher composable for the layout-aware
  // one. Both translation components and the nav overflow menu import it, so
  // aliasing the module fixes all three call sites at once. See
  // .vitepress/theme/langs.ts for why `locales` cannot express this layout.
  vite: {
    resolve: {
      alias: [
        {
          find: /^.*\/composables\/langs$/,
          replacement: fileURLToPath(
            new URL('./theme/langs.ts', import.meta.url),
          ),
        },
      ],
    },
  },

  themeConfig: {
    logo: '/favicon.svg',
    pageIds: PAGE_IDS,
    search: {
      provider: 'local',
      options: {
        // Index only the current stable tree. Version directories (14.6/, …) are excluded here for the same reason `transformPageData` gives
        // them `noindex` and `sitemap.transformItems` drops them: they are
        // archives and previews, not the canonical docs, and mixing three
        // copies of "Configuration" into one result list makes the search
        // worse than no search. Returning '' from `_render` keeps a page out
        // of the index. Uses the same `/^\d+\.\d+\//` shape as those two rules
        // so the three cannot drift apart.
        _render(src, env, md) {
          if (VERSION_DIR_RE.test(env.relativePath ?? '')) return ''
          return md.render(src, env)
        },
        detailedView: true,
        miniSearch: {
          options: {
            // MiniSearch's default tokenizer splits on whitespace and
            // punctuation, which returns exactly one token for a Japanese
            // sentence — so the JA half of the site would be unsearchable.
            // Emit character bigrams for CJK runs, and split
            // `FIONE_S3_ACCESS_KEY` / `item-metadata` / `split.scheme` into
            // their parts as well as keeping the whole name, so both the full
            // identifier and any component of it find the page.
            //
            // Must stay a self-contained expression: VitePress serialises
            // these functions into the client bundle (`_vp-fn_`) and rebuilds
            // them with `new Function`, so it cannot close over anything
            // defined outside.
            tokenize: (text: string): string[] => {
              const CJK =
                /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/
              const out: string[] = []
              for (const chunk of text.split(/[^\p{L}\p{N}_.-]+/u)) {
                if (!chunk) continue
                out.push(chunk)
                if (/[_.-]/.test(chunk)) {
                  for (const part of chunk.split(/[_.-]+/)) {
                    if (part) out.push(part)
                  }
                }
                if (CJK.test(chunk)) {
                  for (let i = 0; i < chunk.length - 1; i++) {
                    out.push(chunk.slice(i, i + 2))
                  }
                }
              }
              return out
            },
          },
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 },
          },
        },
        locales: {
          ja: {
            translations: {
              button: {
                buttonText: '検索',
                buttonAriaLabel: 'ドキュメントを検索',
              },
              modal: {
                displayDetails: '詳細を表示',
                resetButtonTitle: '検索をリセット',
                backButtonTitle: '閉じる',
                noResultsText: '見つかりませんでした:',
                footer: {
                  selectText: '選択',
                  selectKeyAriaLabel: 'Enter',
                  navigateText: '移動',
                  navigateUpKeyAriaLabel: '上矢印',
                  navigateDownKeyAriaLabel: '下矢印',
                  closeText: '閉じる',
                  closeKeyAriaLabel: 'Esc',
                },
              },
            },
          },
        },
      },
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/codelibs/fione' },
    ],
    footer: {
      message: 'Sponsored by <a href="https://codelibs.co">Codelibs, inc</a>',
    },
  } as FioneThemeConfig,
})
