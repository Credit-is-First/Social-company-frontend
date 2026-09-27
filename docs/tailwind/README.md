# Tailwind CSS documentation

A documentation site for this frontend's Tailwind setup: every utility class it
can use with the exact CSS it produces, the Tailwind 4 colour palette, the theme
scales, and the newer syntax handled by the on-demand compiler — with live
previews rendered by the project's own CSS.

Nothing here is written by hand from the Tailwind website. `generate.js` reads
`../../tailwind.config.js`, `../../tailwind.palette.js` and
`../../scripts/tailwind-jit.js`, so the site always matches what the frontend
builds.

## Open it

Serve this folder over HTTP (browsers restrict pages opened straight from disk).
From `frontend/`:

```bash
python -m http.server 5050 --bind 127.0.0.1 --directory docs/tailwind
```

then open <http://localhost:5050>. In Claude Code, the `tailwind-docs` entry in
the project's `.claude/launch.json` does the same.

## Regenerate after changing the Tailwind setup

From `frontend/`, with Node 12.1.0:

```bash
npm run docs:tailwind
```

It rewrites `assets/data.js` and `assets/preview.css` and prints a summary,
including any class it could not place on a page (there should be none). Commit
the regenerated files with the change that caused them, so the committed docs
stay in step with the config.

## Files

| File | |
|---|---|
| `index.html` | Page shell |
| `assets/app.js` | The site: routing, search, pages, previews (no dependencies) |
| `assets/site.css` | The site's own styles, all prefixed `d-` |
| `assets/data.js` | **Generated** — utilities, palette, theme, compiled examples |
| `assets/preview.css` | **Generated** — the project's base layer plus every previewed class, compiled by the project's compiler and scoped to `.d-preview` |
| `generate.js` | The generator |

## What it covers

- **Overview / How it works** — the three layers (backfilled config, Tailwind 4
  palette, on-demand compiler), the rules to follow, and what is unsupported.
- **Colours** — 26 families × 11 shades, each with its OKLCH source and hex value.
- **Theme scales** — breakpoints, spacing, type scale, radii, shadows, opacity,
  widths, z-index and durations.
- **New syntax** — arbitrary values and properties, opacity modifiers, Tailwind 3
  utilities and variants, each shown with the compiler's actual output.
- **Utility reference** — 116 pages in Tailwind's docs order, 5,301 classes, with
  the variants 1.9 generates for each page and a `new` mark on classes this
  project adds on top of stock Tailwind 1.9.

Search with `/`; Enter opens the highlighted result and Shift+Enter shows every match.
