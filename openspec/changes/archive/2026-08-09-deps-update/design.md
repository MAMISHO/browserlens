# Design: Dependency Update (playwright + MCP SDK + stable toolchain)

> Change: `deps-update` · Phase: design · Branch: `feat/deps-update` · Date: 2026-08-09

## Technical Approach

Update the dependency ranges in `package.json` to the latest stable versions verified against the npm registry, regenerate the lockfile, install the matching Chromium binary, and verify the whole thing (typecheck/build/smoke + real smoke). No `src/` changes are expected — the clean-architecture isolation is exactly what this change validates. The MCP SDK 1.30 requires zod `^3.25 || ^4.0`, so zod moves to ^3.25 (v3 API, no migration); the project stays on zod v3.

## Architecture Decisions

| # | Topic | Options (tradeoff) | Decision |
|---|-------|--------------------|----------|
| ADR-1 | Playwright | Stay 1.52 vs **1.62.1 latest** | 1.62.1. Code uses only stable APIs (launch, launchPersistentContext, newContext, goto, locator, screenshot, evaluate, keyboard, viewport, waitUntil). Browser binary reinstalled via `npx playwright install chromium`. |
| ADR-2 | MCP SDK | Stay 1.13 vs **1.30.0 latest** | 1.30.0. Server uses stable API (Server, StdioServerTransport, setRequestHandler, ListTools/CallTool schemas). Smoke test keeps protocol `2024-11-05` (still supported). |
| ADR-3 | zod | v3.24.1 vs **v3.25.x** vs v4 | v3.25.x. SDK 1.30 peer requires `^3.25 || ^4.0`; code uses v3 API only (`z.object`, `.enum`, `.string`, `.number`, `.int`, `.record`, `.transform`). v4 is breaking — deferred. |
| ADR-4 | TypeScript | 5.7.2 vs **6.0.2 stable** vs 7.0.2 preview | 6.0.2 (stable). 7.0.2 is preview; 6.0.2 is the latest stable line. If tsc breaks, fallback pin 5.9.x. |
| ADR-5 | @types/node | ^22 vs **^24** | ^24, aligned with Node 26 runtime and TS 6. |
| ADR-6 | esbuild | 0.28.0 vs **0.28.2** | 0.28.2 (patch). tsx 4.23.11 already depends on esbuild ~0.28.0 — compatible. |
| ADR-7 | src/ | Touch vs **don't touch** | Don't touch (D3). Only minimal type fixes if typecheck demands, documented. |
| ADR-8 | Verification | Scripted only vs **scripted + real** | Both (D4): `npm run smoke` (zero prereqs) + real smoke (navigate → screenshot → analyze_image with local qwen3-vl:8b) via stdio/Command Code. |

## Version Matrix (verified against npm registry 2026-08-09)

| Package | Before | After | Note |
|---|---|---|---|
| playwright | ^1.52.0 | ^1.62.1 | latest |
| @modelcontextprotocol/sdk | ^1.13.0 | ^1.30.0 | latest; peer zod ^3.25 \|\| ^4.0 |
| zod | ^3.24.1 | ^3.25.1 | v3 API kept |
| esbuild | ^0.28.0 | ^0.28.2 | patch |
| typescript | ^5.7.2 | ^6.0.2 | stable line |
| @types/node | ^22.10.2 | ^24 | aligned with Node 26 |
| openai | ^7.4.0 | (unchanged) | already latest |
| sharp | ^0.35.3 | (unchanged) | already latest |
| tsyringe | ^4.10.0 | (unchanged) | already latest |
| @automapper/core | ^9.0.2 | (unchanged) | already latest |
| @automapper/pojos | ^9.0.2 | (unchanged) | already latest |
| reflect-metadata | ^0.2.2 | (unchanged) | already latest |
| tsx | ^4.23.11 | (unchanged) | already latest |

## Apply Steps

```bash
# Runtime
npm install playwright@^1.62.1 @modelcontextprotocol/sdk@^1.30.0 zod@^3.25.1
# Dev
npm install -D esbuild@^0.28.2 typescript@^6.0.2 @types/node@^24
# Browser binary for the new Playwright
npx playwright install chromium
```

`npm install` regenerates `package-lock.json`. No `scripts/bundle.mjs` changes (esbuild 0.28.2 is API-compatible with the build script).

## Verification Matrix

| Check | Command | Prereqs |
|---|---|---|
| Typecheck | `npm run typecheck` (tsc 6) | none |
| Build | `npm run build` → `dist/main.js` | none |
| Scripted smoke | `npm run smoke` | Node + dist/main.js |
| Real smoke | stdio/Command Code: `browser_navigate https://example.com` → `capture_screenshot` → `analyze_image` (qwen3-vl:8b local) | Ollama + Playwright Chromium 1.62 |

The real smoke confirms the JSON shapes are identical to pre-update (navigate: url/title/status; screenshot: image_path/width/height/blank_like; analyze: matches_expectations/confidence/issues).

## Migration / Rollback

No data/schema migration. Rollback: `git revert` the `deps-update` commit(s) — only package.json, lockfile, docs.

## Open Questions

None blocking. If TypeScript 6.0.2 surfaces type errors, pin to ^5.9.x (documented fallback) and note it in verify-report.
