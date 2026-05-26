# `apps/platform` (Expo)

**Status:** Frozen for routine product work. The default local slice for public **spectra-ui** work is **Angular + [`local-edge`](../../apps/local-edge)** on **:3000** (see the root [README](../../README.md)).

## When to use this app

Use **`apps/platform`** when you need **Metro**, a **dev client**, or the **Expo web** dev server. It is **not** the same as **`/v1/platform/*`** HTTP routes on **aviate-api** (control-plane API naming).

## VS Code

- **Spectra slice (no Expo):** **`🛠 Launch Spectra`** / **`🐛 Debug Spectra`** in [`.vscode/launch.json`](../../.vscode/launch.json) — **spectra-ui**, **local-edge**, peer Angular apps, and the same core APIs as the old “Expo Platform” compounds.
- **Expo-only (optional VS Code):** Definitions for **`Launch Expo (aviate + Metro only)`**, **`Debug Expo (aviate + Metro only)`**, **`🌐 Debug Expo Web Only`**, **`Expo Metro (apps/platform)`**, and **`Expo Web (apps/platform)`** remain in [`.vscode/launch.json`](../../.vscode/launch.json) but use **`presentation.hidden: true`** so they do not appear in Run & Debug; use **CLI** below or clear **`hidden`** to reinstate the menu entries.

## CLI (from repo root)

```sh
npm --prefix apps/platform run start    # Metro
npm --prefix apps/platform run web      # Expo web dev
```

Nx targets are defined in [`project.json`](project.json) (including static **`expo export`** for web).
