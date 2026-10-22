# Design UI on GitHub Pages

Static preview of the Reflect-style shell with **dummy notes** (no Tauri, no Ollama).

| | |
|---|---|
| **Branch** | `design_upgrades` only (not `main`) |
| **URL** | https://singlesoup.github.io/vayu-ai/ |
| **Data** | In-memory sample notes from `src/dev/browserPreview.ts` |
| **Build** | `VITE_UI_PREVIEW=true` + `VITE_PAGES_BASE=/vayu-ai/` |

Workflow: `.github/workflows/design-pages.yml` builds on push to `design_upgrades` and publishes the `gh-pages` branch.

**One-time repo setting** (required once the branch exists):

1. Open https://github.com/singlesoup/vayu-ai/settings/pages  
2. **Build and deployment → Source:** Deploy from a branch  
3. **Branch:** `gh-pages` / `/ (root)` → Save  

Local check:

```powershell
$env:VITE_UI_PREVIEW="true"; $env:VITE_PAGES_BASE="/vayu-ai/"; npm run build:pages
npx vite preview --base /vayu-ai/
```
