# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Vue 3 single-page app providing a searchable/filterable reference for the **Dungeonslayers** RPG system (https://www.dungeonslayers.net/). The intended flow: a user uploads the Dungeonslayers rules PDF (`ds-rules.pdf` in the repo root is the source document), the app parses it client-side, and renders the extracted data across three sections — Talente (talents), Ausrüstung (equipment), and Zaubersprüche (spells). UI labels are in German.

Status: talents are fully implemented end-to-end (upload → parse → store → render). Spells and equipment are not yet parsed — only the `DSTalent` model and `addTalents` action exist; `spells`/`equipment` are untyped empty refs awaiting models and parsers.

### PDF parsing pipeline (`src/dungeonslayers/parsing/`)
Parsing runs entirely in the browser via **PDF.js** (`pdfjs-dist`). The rules PDF is two-column, so flat text extraction interleaves unrelated entries — the pipeline is built around text-item coordinates:
- `pdf-text.ts` — `extractLines()` is the shared, section-agnostic layer. It reads each page's text items, drops rotated side-tabs and header/footer margins, splits items into left/right columns by x, groups them into lines by y, and emits them in reading order (left column fully, then right) as `TextLine[]`. Reports per-page progress. Also configures the PDF.js worker (`?worker` import).
- `parse-talents.ts` — `parseTalents(lines)` slices the alphabetical list (`ABKLINGEN` … `REGELN`), detects all-caps headings (incl. trailing punctuation like `ICH MUSS WEG!`), joins each talent's body (handling requirement blocks that wrap mid-token), and splits leading `CLASS level (roman-rank)` tokens from the description. It also handles three interruptions woven into the list: running headers (`TALENTE`) and full-page class summaries (`TALENTE DER …`) are dropped; creature **stat blocks** (a heading immediately followed by a `KÖR:`-style stat row, e.g. the second `HOMUNKULUS` or `TEUFELCHEN I`) are skipped while keeping the surrounding description on the real talent. Finally filters out zero-requirement entries (false headings from tables/sidebars like `KLASSE VERTRAUTENBONUS`, `LICHT UND DUNKELHEIT`).
- `roman.ts` — `romanToInt()` for the parenthesized max-rank.
- `UploadMenu.vue` drives the pipeline and shows a `ProgressBar`; on success it calls `store.resetStore()` + `store.addTalents()`, which flips `isDataLoaded` so the view swaps from upload to list automatically.

When adding spell/equipment parsers, reuse `extractLines` (don't re-extract) and follow the same section-slice + per-entry-parse shape.

The parser has many layout-specific edge cases, so it is verified two ways: synthetic-fixture unit tests in `parse-talents.spec.ts`, and `scripts/verify-talents.mjs` which runs the **real** `parseTalents` against `ds-rules.pdf` (extraction mirrors `pdf-text.ts`; the parser is loaded from source via jiti). `npm test` runs both; `npm run verify:talents` runs just the PDF check. When changing parser logic, add a fixture test and a corresponding assertion in the verify script.

## Commands

```sh
npm run dev          # Vite dev server with HMR
npm run build        # type-check + production build (runs both in parallel)
npm run type-check   # vue-tsc only
npm run test:unit    # Vitest (watch mode); append a path/name to scope, e.g. npm run test:unit -- src/foo
npm test             # unit tests once + verify:talents (PDF check)
npm run verify:talents  # run parseTalents against ds-rules.pdf with assertions
npm run lint         # runs oxlint then eslint, both with --fix
npm run format       # prettier --write over src/
```

Node is pinned to 24.16.0 via `mise.toml`.

## Architecture

- **State** lives in a single Pinia store, `src/store/rules-store.ts` (`useRulesStore`, setup-style). It holds `talents`/`spells`/`equipment` arrays and derives `isDataLoaded` from whether talents have been populated. Views read it via `storeToRefs`. This store is the seam between the (future) PDF parser and the views — parsed data should flow in through store actions like `addTalents`.
- **Views** (`src/views/DSTalents.vue`, `DSEquipment.vue`, `DSSpells.vue`) follow an identical pattern: if `isDataLoaded`, show the data; otherwise render `<UploadMenu>`. They are wired to routes in `src/router/index.ts` (`/talents`, `/equipment`, `/spells` — note there is no `/` root route).
- **Domain models** go under `src/dungeonslayers/model/` (currently only `talent.ts`).
- `@/` is aliased to `src/` (defined in both `vite.config.ts` and tsconfig).

## UI conventions

- UI is built with **PrimeVue 4** (Aura theme, configured in `src/main.ts` with the `ds` CSS-variable prefix) and `primeicons`. Import components directly, e.g. `import Card from 'primevue/card'`.
- Components use `<script setup lang="ts">` with scoped `<style>`.

## Deployment

Pushing to any branch triggers `.github/workflows/build-publish-gh-pages.yaml`, which builds and publishes to GitHub Pages. The Vite `base` is hardcoded to `/ds-rules-reference` (the repo/Pages path) — keep this in mind when adding assets or routes.
