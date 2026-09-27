# Library Management System — Frontend

React 17 + TypeScript single-page app (Create React App 4 via CRACO). The full
feature list and API reference are in the [project README](../README.md); this
file covers working on the frontend itself.

## Requirements

- **Node.js 12.1.0** (declared in `package.json` `engines`), offline: work with
  the packages already in `node_modules`.
- The backend running on `http://localhost:5001`.

If Node 12.1.0 is not your default `node`, run npm through its own binary with
`--scripts-prepend-node-path=true` so CRACO, TypeScript and the Tailwind
compiler run on it too:

```bash
"C:/Users/root/AppData/Roaming/nvm/v12.1.0/npm.cmd" --scripts-prepend-node-path=true start
```

## Scripts

```bash
npm start              # dev server on http://localhost:5000 (API calls proxied to :5001)
npm run build          # production build in build/
npm test               # Jest via CRACO (runs the Tailwind compiler tests first)
npm run tailwind:jit   # regenerate src/tailwind-jit.css by hand (normally automatic)
npm run test:tailwind  # the Tailwind compiler's own tests
npm run docs:tailwind  # regenerate the Tailwind documentation site (docs/tailwind)
```

**Tailwind documentation site:** [`docs/tailwind`](docs/tailwind/README.md) documents
every class this setup provides, with its CSS and a live preview, generated from the
real config, palette and compiler. Serve it with
`python -m http.server 5050 --bind 127.0.0.1 --directory docs/tailwind` and open
<http://localhost:5050>. Regenerate it after changing any of the three.

`prestart`, `prebuild` and `pretest` run the Tailwind on-demand compiler first (`pretest`
also runs its tests), and `postinstall` applies two small patches to installed packages (see
below).

## Styling: modern Tailwind on Tailwind 1.9

The installed Tailwind is **1.9.6** and cannot be upgraded offline (Tailwind 2+
also needs Node 12.13 or newer). The components are nevertheless written with
current Tailwind class names, and three pieces make that work:

| File | Role |
|---|---|
| `tailwind.config.js` | Backfills Tailwind 2/3 utilities on 1.9 (rings, half-step spacing, `w-fit`, `line-clamp-*`, logical borders, …) and replaces 1.9's shadow, gradient and transform plugins with Tailwind 3 behaviour: shadows stack with rings and accept `shadow-{colour}`, gradients accept stop positions (`from-10%`), and `rotate-*`/`scale-*`/`translate-*` work without the `transform` class. Production builds purge unused utilities. |
| `tailwind.palette.js` | Tailwind 4's colour palette (tailwindcss@4.3.3), kept as its published OKLCH values and converted to sRGB hex when the config loads, because 1.9's opacity utilities need `rgba()` channels. |
| `scripts/tailwind-jit.js` | An on-demand compiler for what a static config cannot express: arbitrary values (`w-[250px]`, `grid-cols-[1fr_2fr]`), opacity modifiers (`bg-black/50`), and newer variants (`2xl:`, `dark:`, `aria-*:`, `data-[state=open]:`, `supports-[…]:`, `[&>*]:`, `group-*`/`peer-*`). It scans `src/`, skips anything 1.9 already generates, and writes `src/tailwind-jit.css` (git-ignored). It runs before start/build/test and keeps watching while the dev server runs. |

Two rules follow from how this works:

- **Write class names out in full.** Both the purge and the compiler find
  classes by reading the source, so `` `bg-${color}-500` `` produces nothing and
  gets purged. Use `isRed ? 'bg-red-500' : 'bg-blue-500'` instead.
- **Container queries (`@container`, `@md:`) are not supported.**

The compiler emits **every** class the source uses into `tailwind-jit.css`, including ones
1.9 already puts in `index.css`. That file loads last, so this is what lets plain and
new-syntax classes on one element cascade as they would in Tailwind 3
(`bg-[#123] bg-opacity-50`, `p-[3px] px-[5px]`): everything is sorted in one place, by media
condition (screen sizes last), then variant, then utility order taken from 1.9's own output.
`scripts/tailwind-jit.test.js` covers this and the value parsing; run it after changing the
compiler.

Colours are Tailwind 4's (`blue-500` is `#2b7fff`). Code that needs a colour as
a plain string — the Recharts charts in `pages/Dashboard` — uses the same hex
values via `CHART_COLORS`, since CRA cannot import files from outside `src/`.

## Installed-package patches

Run automatically from `postinstall`; both are idempotent.

- `scripts/fix-minimatch-types.js` — replaces broken `@types/minimatch` typings.
- `scripts/fix-react-error-overlay.js` — `react-error-overlay` 6.1.0 throws
  "process is not defined" in the dev error overlay on every rebuild. CRA 4
  expects 6.0.9, which cannot be installed offline, so the one unguarded
  `process.platform` read is guarded instead.

## Layout

```
src/
├── components/   AuthRoute, RoleProtectedRoute, Toast, UserAvatar
├── contexts/     AuthContext (session), ToastContext, UserSearchContext
├── hooks/        useUserPhoto (authenticated photo → object URL)
├── layouts/      UserLayout, ManagerLayout
├── pages/        Auth/*, BrowseBooks, Dashboard, MyPage/*, Manager/*, NotFound
├── services/     api.ts — the single Axios client, session refresh, all endpoints
├── types/        shared TypeScript types
└── utils/        confirm dialog, toast helpers
```

## Session handling

The access token lives only in memory and is attached by `services/api.ts`; the
refresh token is an `httpOnly` cookie the page cannot read. On load the app calls
`/auth/refresh` to restore the session, and on a 401 it refreshes once — shared
across concurrent requests — and retries. Change password and reset password
are exempt: their 401 means a wrong password, so it goes straight back to the
form instead of signing the user out.
