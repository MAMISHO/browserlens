# Design: Command Code Compatibility (docs + smoke test + real verification)

> Change: `command-code-compat` · Phase: design · Branch: `feat/command-code-compat` · Date: 2026-08-09

## Technical Approach

BrowserLens is already a standard MCP server (official SDK, stdio transport), so no server code changes are needed. The work is a thin compatibility layer: documentation, stale-path fixes, a zero-dependency smoke test, and a real Command Code connectivity check. The opencode MCP config (`~/.config/opencode/opencode.json`) is the reference for the working Ollama + local vision wiring: it launches `node dist/mcpServer.js` with NO `env` block, so BrowserLens uses its code defaults — `OLLAMA_BASE_URL=http://localhost:11434`, `VISION_MODEL=qwen3-vl:8b`, `OCR_MODEL=deepseek-ocr`. The Command Code docs replicate that wiring (explicitly, via `env` / `--env`).

## Architecture Decisions

| # | Topic | Options (tradeoff) | Decision |
|---|-------|--------------------|----------|
| ADR-1 | Server code | Touch `src/` vs **no changes** | No `src/` changes (D1). Server is already client-agnostic; any incompatibility found during verification is reported as a finding, not patched blindly. |
| ADR-2 | Config docs format | `.mcp.json` only vs `cmd mcp add` only vs **both** | Both (D2/D7): `.mcp.json` (project scope, git-shared) as primary, `cmd mcp add --scope project` with `--env` as the CLI equivalent. |
| ADR-3 | Smoke test | SDK `Client` dependency vs **vanilla Node stdio** | Vanilla Node (`node:child_process` + `node:readline`), zero new deps: spawn `dist/main.js`, write JSON-RPC lines to stdin, parse stdout lines. Matches repo's "no test runner" convention and works on clean checkouts. |
| ADR-4 | Real verification | Manual-only vs **scripted + real** | Both (D3/D4): scripted smoke has zero prereqs (Node only); the real Command Code test is a documented manual step requiring Ollama + Playwright + built `dist/main.js`. |
| ADR-5 | Stale entrypoint paths | Leave vs **fix README** | Fix README `dist/mcpServer.js` → `dist/main.js` (D5). User's `opencode.json` stays untouched (outside repo); finding documented, update only with user approval. |
| ADR-6 | Verification trigger | npm script vs raw command | `package.json` `smoke` script = `npm run build && node scripts/smoke-mcp.mjs`. |
| ADR-7 | Doc placement | README section vs separate doc | README "Command Code" section next to the OpenCode one (D2); `docs/README.md` index + short `docs/notes/` note. |
| ADR-8 | Syntaxes | opencode `{env:VAR}` vs Command Code `${VAR}` | Docs use Command Code semantics only; `{env:VAR}` stays opencode-specific (D8, spec: Command Code Configuration Documented). |

## Target File Tree (change delta)

```
README.md                          # + "Command Code" section; fix dist/mcpServer.js → dist/main.js (all examples)
scripts/smoke-mcp.mjs              # NEW: vanilla Node stdio MCP smoke test
package.json                       # + "smoke": "npm run build && node scripts/smoke-mcp.mjs"
docs/README.md                     # + index entry for the new change + plan status
docs/notes/command-code-compat.md  # NEW (short): multi-client MCP compat + stale-path finding
openspec/changes/command-code-compat/   # SDD artifacts (proposal, spec, design, tasks, state.yaml, verify-report)
openspec/specs/command-code-compat/spec.md  # merged spec at archive
```

## Smoke Test Design (`scripts/smoke-mcp.mjs`)

Protocol: MCP JSON-RPC 2.0 over stdio, exactly what Command Code/OpenCode/Claude send.

```
┌─────────────────────────────────────────────────────────┐
│ smoke-mcp.mjs (vanilla Node, ESM)                        │
│  spawn("node", ["dist/main.js"], { stdio: ["pipe","pipe","inherit"] }) │
│  readline per stdout line → JSON.parse each (no non-JSON)│
│  requests:                                                │
│    1. initialize → expect serverInfo.name === "browserlens" │
│    2. notifications/initialized                            │
│    3. tools/list → expect exactly the 15 known tool names  │
│    4. tools/call browser_navigate { url: "not-a-valid-url" } │
│       → expect isError === true (or error:true) AND process alive │
│  close child (SIGTERM) → exit 0 on success, 1 on failure  │
└─────────────────────────────────────────────────────────┘
```

Checks:
1. **initialize** — response id matches, `serverInfo.name === "browserlens"`.
2. **Stdout cleanliness** — every stdout line parses as JSON; any non-JSON line fails the run (spec: Scripted MCP Smoke Test).
3. **tools/list** — the 15 tool names (from `src/mcp/toolDefinitions.ts`, hardcoded in the script as the contract snapshot):
   `execute_code`, `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_fill`, `browser_press_key`, `browser_wait_for`, `browser_evaluate`, `browser_open_interactive`, `browser_use_headless`, `capture_screenshot`, `analyze_image`, `compare_images`, `extract_text`, `extract_markdown`.
4. **tools/call (deterministic)** — `browser_navigate` with `url: "not-a-valid-url"`: Playwright rejects the URL before any network/Ollama dependency, so it returns `{ error: true, message, ... }` with `isError: true` — no Ollama/Playwright install needed. Process must stay alive afterward (a follow-up `tools/list` still works).
5. **exit code** — 0 on all-green, 1 otherwise.

No `console.log` anywhere in `src/` (verified) → stdout stays pure JSON-RPC; the smoke test re-verifies it (spec scenario).

## README "Command Code" Section (content plan)

Placement: a new `#### Command Code Example` block right after the existing OpenCode examples, plus a leading line in "MCP Configuration" noting the README covers both OpenCode and Command Code.

```markdown
#### Command Code Example

For Command Code, the simplest option is a project-scoped `.mcp.json` (committed to git, shared with the team):

```json
{
  "mcpServers": {
    "browserlens": {
      "command": "node",
      "args": ["/absolute/path/to/browserlens/dist/main.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "VISION_MODEL": "qwen3-vl:8b",
        "OCR_MODEL": "deepseek-ocr"
      }
    }
  }
}
```

Or add it with the CLI (equivalent, `--scope project`):

```bash
cmd mcp add --scope project browserlens -- node /absolute/path/to/browserlens/dist/main.js \
  --env OLLAMA_BASE_URL=http://localhost:11434 \
  --env VISION_MODEL=qwen3-vl:8b \
  --env OCR_MODEL=deepseek-ocr
```

Connect with `/mcp` (green = connected), then call the tools directly — they appear as `mcp__browserlens__<tool>`. For personal use, use `--scope user`.
```

Notes:
- All examples use `dist/main.js` (ADR-5).
- No `{env:VAR}`; Command Code resolves `${VAR}` at runtime from its own environment (spec: Command Code Configuration Documented).
- Point out the server name `browserlens` and the `mcp__browserlens__*` tool prefix (D8).
- The Ollama/vision env mirrors the working opencode wiring (code defaults).

## Verification Matrix

| Check | Command | Prereqs |
|---|---|---|
| Typecheck | `npm run typecheck` | none |
| Build | `npm run build` → `dist/main.js` | none |
| Scripted smoke | `npm run smoke` | Node + `dist/main.js` |
| Real Command Code | `cmd mcp add --scope project browserlens -- node <abs>/dist/main.js --env ...` then `/mcp` + tools | Ollama (localhost:11434) + `VISION_MODEL` local + Playwright Chromium + built `dist/main.js` |

The real test sequence inside Command Code: `execute_code` (`echo ok`) → `browser_navigate` (simple URL) → `capture_screenshot` → `analyze_image` (local `VISION_MODEL`) → confirms the wiring end-to-end.

## Migration / Rollback

No data/schema migration. Rollback: `git revert` the `command-code-compat` commit(s) — touches only docs, one script, and `package.json`; server code is untouched.

## Open Questions

None blocking. The user-level opencode config update (`dist/mcpServer.js` → `dist/main.js`) is offered during apply but requires explicit user approval (outside the repo).
