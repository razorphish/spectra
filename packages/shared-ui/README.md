# @spectra/shared-ui

Shared **design tokens**, **CSS patterns**, **binary assets** (under `src/assets/`, copied to `assets/spectra/` in Angular apps), and **Angular shell components** for `spectra-ui` and `sandbox-ui`.

## CSS

- `src/styles/spectra-tokens.css` — `:root` variables and global base styles.
- `src/styles/spectra-patterns.css` — `.spectra-page`, `.spectra-probe`, `.spectra-auth-shell`, `.spectra-shell-header`, skip link, **`.spectra-doc-layout`** (side nav + main + in-page TOC for long-form pages), etc.
- `src/styles/spectra-forms.css` — Bootstrap-inspired **buttons** (`.btn`, `.btn-primary`, `.btn-danger`, `.btn-outline-secondary`, `.btn-outline-light`, `.btn-link`), **forms** (`.form-control`, `.form-label`, `.form-check`, …), **tabs** (`.int-card`, `.nav-tab`, `.tab-panels`), **alerts**, **modals**, and small layout utilities. Used by `spectra-ui` and `sandbox-ui` for consistent developer-portal UI.

Apps list these files first in `project.json` `build.options.styles`, then app-local `styles.css`.

## Angular components

- `SpectraBrandBarComponent` — logo, Spectra wordmark, Aviate tagline, and home link; use `[homeRouterPath]="'/'"` in the marketing app or `[homeHref]="url"` when linking out (e.g. sandbox → spectra-ui).
- `SpectraAppShellComponent` — full-height layout with sticky navy header + scrollable main. Use a direct child with class `spectra-shell-header` for the top row; default projected content goes in `<main>`.

## Building

Run `nx build shared-ui` to compile the TypeScript API (apps import components via `@spectra/shared-ui` path mapping).

## Running unit tests

Run `nx test shared-ui` to execute unit tests via [Jest](https://jest.io).
