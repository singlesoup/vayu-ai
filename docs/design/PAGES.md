# Design UI on GitHub Pages

Static preview of the Reflect-style shell with **dummy notes** (no Tauri, no Ollama).

| | |
|---|---|
| **Branch** | `design_upgrades` only (not `main`) |
| **URL** | https://singlesoup.github.io/vayu-ai/ |
| **Data** | In-memory sample notes from `src/dev/browserPreview.ts` |
| **Build** | `VITE_UI_PREVIEW=true` + `VITE_PAGES_BASE=/vayu-ai/` |

Workflow: `.github/workflows/design-pages.yml` (push to `design_upgrades` or manual dispatch).

Local check:

```powershell
$env:VITE_UI_PREVIEW="true"; $env:VITE_PAGES_BASE="/vayu-ai/"; npm run build:pages
npx vite preview --base /vayu-ai/
```

Repo Settings → Pages → Source must be **GitHub Actions**.
