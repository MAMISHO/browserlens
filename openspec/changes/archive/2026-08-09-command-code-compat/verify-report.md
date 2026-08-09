# Verify Report: Command Code Compatibility

> Change: `command-code-compat` · Phase: verify · Branch: `feat/command-code-compat` · Date: 2026-08-09

## Result: PASS

All tasks completed; BrowserLens is verified working inside Command Code, including the Ollama + local vision wiring.

## Checks

### 5.1 Typecheck — PASS
`npm run typecheck` (`tsc --noEmit`) green, no errors.

### 5.2 Build — PASS
`npm run build` emits `dist/main.js` (esbuild bundle, `packages: external`). `dist/` also contains the declaration output.

### 5.3 Scripted smoke — PASS
`npm run smoke` (build + `node scripts/smoke-mcp.mjs`):
- initialize → `serverInfo.name === "browserlens"` v0.1.0
- tools/list → exactly 15 tools
- tools/call `browser_navigate` invalid URL → structured error (`isError: true`), process stays alive
- stdout clean (all lines JSON-RPC, no pollution)

### 5.4 Real Command Code test — PASS
- `.mcp.json` (project scope) configured with `node .../dist/main.js` + `env` block (`OLLAMA_BASE_URL`, `VISION_MODEL=qwen3-vl:8b`, `OCR_MODEL=deepseek-ocr`).
- `cmd mcp list` / `cmd mcp get browserlens` show the server enabled with env vars applied.
- Stdio end-to-end (same protocol Command Code uses): `execute_code` → `exit_code:0, stdout "ok"`; `browser_navigate https://example.com` → title "Example Domain", status 200; `capture_screenshot` → 1440x1000, `blank_like:false`; `analyze_image` with local `qwen3-vl:8b` → `matches_expectations:true, confidence:0.95`.
- In-Command-Code test via `cmd -p` (headless, auto-accept): `execute_code` returned `mcp-ok`; `browser_navigate` + `capture_screenshot` returned title + image_path. Tools discovered and invoked as MCP tools.

### 5.5 Server code untouched — PASS
`src/` unchanged. MCP contract (15 tool names, snake_case schemas, JSON outputs) identical.

## Findings

1. **opencode.json stale entrypoint (outside repo)**: `~/.config/opencode/opencode.json` points to `dist/mcpServer.js` (pre-refactor). Documented in `docs/notes/command-code-compat.md`. Updating it requires user approval — NOT done.
2. **OCR model tag**: local Ollama has `deepseek-ocr:latest`; `OCR_MODEL=deepseek-ocr` resolves to it via Ollama tag alias — no issue found in practice.
3. **cmd mcp add flag placement**: `--env` must go BEFORE the server name (after `--` they become node args). The README example already shows the correct placement (`cmd mcp add --scope project browserlens -- node ...`); the flag order in the docs reflects this.

## Artifacts
- `scripts/smoke-mcp.mjs` (new)
- README "Command Code Example" section + `dist/mcpServer.js` → `dist/main.js` fixes
- `docs/notes/command-code-compat.md`
- `.mcp.json` (project scope, verified working) — committed as part of the change
