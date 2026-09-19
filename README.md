# Becca — design portfolio

A static portfolio site built with [Eleventy](https://www.11ty.dev/) v3. It outputs plain HTML and CSS and ships **no client-side JavaScript**.

## Commands

| Command | What it does |
| --- | --- |
| `npm start` | Dev server with live reload at http://localhost:8080 |
| `npm run build` | Production build into `_site/` |
| `npm run check` | Build, then validate every page’s HTML |
| `npm run clean` | Delete `_site/` and the image cache |

Requires Node 22+ (`.nvmrc` pins the version Netlify uses).

## Structure

```
src/
  _data/
    site.json          Site name, email, nav, social links  ← editable content
    build.js           Build-time values (site URL, year, production flag)
  _includes/
    layouts/           base → page / home / work / project / contact
    partials/          header, footer, meta tags, page header, project card
  assets/
    css/main.css       Entry point; imports the _partials in cascade-layer order
    css/_tokens.css    Colors, fonts, type scale, spacing  ← brand lives here
    fonts/             Self-hosted .woff2 files (Phase 2)
    images/            Source images (processed automatically at build)
  work/*.md            One file per project
  index.md             Home page
  work.md              Work index
  contact.md           Contact page
  404.md
```

## Content model

Everything a non-developer would edit is Markdown with front matter or JSON. That keeps the site ready for a Git-based CMS later.

**Project** (`src/work/<slug>.md` → `/work/<slug>/`)

```yaml
title: Project name
summary: One sentence; used on cards, as the page lede, and as the meta description
client: Client name        # optional
year: 2026                 # optional
role: Lead designer        # optional
services: [Branding, Web]  # optional
cover:
  src: /assets/images/project/cover.jpg
  alt: Describe what the image shows   # required for accessibility
featured: true             # show on the home page
order: 1                   # lower comes first
```

The body is Markdown. Images written as `![alt text](/assets/images/…)` are optimized automatically.

**Pages** use `title`, `summary`, and a Markdown body. The home page also takes `heading`, `featuredHeading`, `contactHeading` and `contactText`.

## How things work

- **CSS**: Lightning CSS bundles `main.css` and its `_*.css` partials into one minified file. It also lowers modern syntax for the targets in `package.json` → `browserslist` (Baseline widely available). Styles use cascade layers: `reset → tokens → base → layout → components → utilities`.
- **Images**: every `<img>` in the built HTML becomes a `<picture>` with AVIF and WebP at 480/800/1200/1600px, with `width`/`height` set to prevent layout shift. Images are lazy-loaded by default. The project cover loads eagerly with `fetchpriority="high"` because it's the likely LCP element. Don't put a `width` attribute on `<img>` in templates: the plugin treats it as the only output size.
- **Color**: the brand palette (Almond Silk, Deep Mocha, Muted Teal, Burnt Tangerine) is defined in `oklch()` in `_tokens.css`. Only Mocha on Almond is safe for text (7.14:1). Tangerine and Teal fail text contrast against both, so they are used only for decoration: hover underlines, dividers, list markers and arrows. They never carry text or state on their own. Muted text is a `color-mix()` of the two text-safe colors, tuned to stay above 5:1.
- **Theming**: colors use `light-dark()`, so the site follows the visitor's light or dark OS setting. Light mode is Mocha on Almond; dark mode swaps the pair. To ship light-only, set `color-scheme: light` in `_tokens.css` and in the `<meta name="color-scheme">` tag in `base.njk`.
- **Motion**: page-to-page cross-fades use cross-document View Transitions. They only run when the visitor hasn't asked for reduced motion; other browsers navigate normally.
- **SEO**: canonical URLs, Open Graph tags, `sitemap.xml` and `robots.txt`. Pages are marked `noindex` unless Netlify's `CONTEXT` is `production`, so deploy previews stay out of search results.

## Browser support

Target Baseline **widely available** features. Newer features (View Transitions, `font-size-adjust`, `:has()` for the card focus ring) are only used as progressive enhancements, and the site stays fully usable without them.

## Accessibility checklist (per change)

- One `<h1>` per page, headings in order
- Every content image has meaningful `alt`; decorative images use `alt=""`
- Text contrast ≥ 4.5:1 (3:1 for large text and UI boundaries) in **both** color schemes
- Keyboard: skip link works, every interactive element has a visible focus ring
- `npm run check` passes

## Roadmap

1. ~~Structure~~ ✅
2. Brand: colors, fonts, real content
3. QA and launch: pa11y-ci and Lighthouse checks, OG image, image build cache, Netlify deploy
4. CMS (stretch): Sveltia/Decap or Pages CMS at `/admin`, editing `src/work/*.md`, the page files and `src/_data/site.json`
