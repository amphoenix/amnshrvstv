# amnshrvstv

Aman's personal site — a portfolio plus a private study-notes reader, built as a single React app.

Live: https://amnshrvstv.netlify.app

## What's in here

- **`/`** — animated developer portfolio (hero, about, experience, tech stack, projects, testimonials, contact). Uses `three.js` / `@react-three/fiber` for the 3D bits (Earth, stars, ball) and `framer-motion` for section animations.
- **`/prep/:category/:fileId`** — a personal study-notes library rendered from Markdown, with sidebar navigation, deep-linkable/shareable URLs, and runnable JS snippets for code examples.

## Tech stack

- React 18 + Vite 4
- React Router v6
- Tailwind CSS
- react-markdown + remark-gfm
- Vitest (unit tests)
- Deployed on Netlify

## Getting started

```bash
yarn install
yarn dev       # start dev server
yarn build     # production build to dist/
yarn preview   # preview the production build locally
yarn test      # run vitest
```

## Study notes system

Notes live under `src/study/<Category>/<file>.md`. There's no CMS or JSON config — the folder structure *is* the data model:

- Each top-level folder under `src/study/` becomes a sidebar **category**.
- Each `.md` file inside becomes a sidebar **file/chapter**. Titles are auto-generated from the filename (`01_A_LLM_Foundations.md` → "01 A LLM Foundations").

This is loaded at build time via `src/pages/study/loadNotes.js` using Vite's `import.meta.glob`, and rendered by `src/pages/study/StudyPage.jsx`. To add a new chapter, just drop a `.md` file in the right category folder (or a new folder for a new category) — no other wiring needed.

The current URL (`/prep/<category>/<fileId>`) always reflects the active category/file, so any note can be shared or bookmarked directly and will restore on refresh. Visiting bare `/prep` redirects to the first category's first file.

Fenced code blocks using `js-run` as the language are executed live in a sandboxed iframe (see `src/pages/study/RunnableCode.jsx`) — used for things like the JS polyfills playground.

## Project structure

```
src/
├── main.jsx / App.jsx        Entry point + router
├── components/                Portfolio sections + components/canvas (3D visuals)
├── constants/, assets/        Static data and images driving the portfolio
├── hoc/, utils/                Animation helpers
└── pages/
    ├── notFound/               404 page
    └── study/                  Study reader UI + markdown loader
src/study/                     The actual notes content (Markdown, by category)
public/                        Static assets, Netlify _redirects, resume PDF
```

## Deployment

Hosted on Netlify. `public/_redirects` rewrites all paths to `index.html` (SPA fallback) so client-side routes like `/prep/AI Materials/01_A_LLM_Foundations` resolve correctly on direct load/refresh. `netlify.toml` pins the build to Node 20.

## Security

See [SECURITY.md](SECURITY.md) for the vulnerability disclosure policy.
