# Proposal: Command Code Compatibility (docs + smoke test + real verification)

## Intent

BrowserLens is already an MCP server built on the official `@modelcontextprotocol/sdk` with a standard stdio transport, so the protocol is client-agnostic: it works with any MCP client, including Command Code. The gap is documentation and verification, not server code. This change: (1) documents Command Code configuration (`.mcp.json` project scope + `cmd mcp add`), (2) fixes stale entrypoint paths in the README (`dist/mcpServer.js` → `dist/main.js`) left over from the clean-architecture refactor, (3) adds a scripted MCP smoke test (`scripts/smoke-mcp.mjs`, no new dependencies, no Ollama/Playwright required), and (4) verifies real connectivity inside Command Code with a simple end-to-end test that confirms the wiring to Ollama and the local vision model.

## Scope

### In Scope
- README: new "Command Code" configuration section alongside the OpenCode one; fix every stale `dist/mcpServer.js` example to `dist/main.js`.
- `scripts/smoke-mcp.mjs`: stdio smoke test against `dist/main.js` (initialize, tools/list with 15 tools, deterministic tools/call error, stdout cleanliness check).
- `package.json`: `smoke` script (`npm run build && node scripts/smoke-mcp.mjs`).
- Docs: `docs/README.md` index update; optional short note in `docs/notes/`.
- SDD artifacts for change `command-code-compat` (proposal, spec delta, design, tasks, state.yaml, verify-report).
- Verification: typecheck, build, scripted smoke, and a real Command Code test (`cmd mcp add` + `/mcp` connect + simple tool calls confirming Ollama + local vision wiring).

### Out of Scope
- Any change to `src/` server code (`main.ts`, `container.ts`, slices, schemas, tools). The MCP contract stays identical.
- Changing the user's `~/.config/opencode/opencode.json` (outside the repo). The stale `dist/mcpServer.js` path there is documented as a finding; updating it requires explicit user approval.
- Test runner or CI (repo convention: `strict_tdd: false`).
- New MCP tools or protocol features.

## Capabilities

### New Capabilities
- **Command Code configuration**: BrowserLens can be connected to Command Code via `.mcp.json` (project scope, checked into git) or `cmd mcp add --scope project browserlens -- node .../dist/main.js`, with `--env` for Ollama endpoint and vision/OCR model selection.

### Modified Capabilities
- **Documentation accuracy**: README MCP examples now point to the real entrypoint `dist/main.js` (post-refactor), so users of any client (OpenCode, Command Code, Claude, etc.) no longer hit a missing file.

## Approach

1. Run the SDD pipeline for change `command-code-compat` (proposal → spec → design → tasks → apply → verify → archive), mirroring the archived `clean-architecture-refactor` change.
2. Apply: write `scripts/smoke-mcp.mjs` (vanilla Node, spawns `dist/main.js`, JSON-RPC over stdio); add the `smoke` npm script; add the README "Command Code" section; fix stale `dist/mcpServer.js` paths; update `docs/README.md`.
3. Verify: `npm run typecheck`, `npm run build`, `npm run smoke`; then add BrowserLens to Command Code (`cmd mcp add --scope project`) and run a simple end-to-end test (execute_code → browser_navigate → capture_screenshot → analyze_image) confirming the Ollama + local vision wiring documented from the existing opencode config.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `README.md` | Modified | "Command Code" section + stale entrypoint path fixes |
| `scripts/smoke-mcp.mjs` | New | Stdio MCP smoke test (no new deps) |
| `package.json` | Modified | `smoke` script |
| `docs/README.md` | Modified | Index + plan status |
| `docs/notes/` | New (optional) | Multi-client MCP compat + stale-path finding |
| `openspec/` | Modified | SDD artifacts for `command-code-compat` |
| `src/` | Unchanged | Server code untouched |
| `~/.config/opencode/opencode.json` | Unchanged (finding) | Stale `dist/mcpServer.js` path documented; update only with user approval |

### DI impact
None — no `src/` changes; the container and composition root are untouched.

### Mapper impact
None — no mapper or schema changes; MCP contract preserved.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| stdout noise breaks stdio transport | Low | Verified no `console.log` in `src/`; smoke test re-checks |
| Stale `dist/mcpServer.js` paths in docs/config | Med | README fixed (D5); opencode.json finding documented |
| `{env:VAR}` (opencode syntax) copied into Command Code docs | Low | Separate docs; Command Code resolves `${VAR}` at runtime |
| Real Command Code test needs Ollama/Playwright available | Med | Scripted smoke has zero deps; real test is a documented manual step with prereqs |
| Smoke test fragile against SDK v1.13 | Low | Only `initialize`/`tools/list`/`tools/call` with a deterministic invalid payload |

## Rollback Plan

Revert the `command-code-compat` commit (or `git revert` the branch): the change touches only docs, one script, and `package.json`. Server code and the MCP contract are untouched, so rollback is a plain doc/script revert with no migration.

## Dependencies

- Existing only: `@modelcontextprotocol/sdk` (runtime, already present), Node 20+.
- No new runtime or dev dependencies.

## Success Criteria

- [ ] `npm run typecheck` passes.
- [ ] `npm run build` emits `dist/main.js`; `npm start` boots the MCP server.
- [ ] `npm run smoke` passes: initialize, 15 tools listed, deterministic call error, clean stdout.
- [ ] README has a "Command Code" section and no `dist/mcpServer.js` references.
- [ ] Real test in Command Code: `cmd mcp add --scope project browserlens` + `/mcp` connect (green) + `execute_code` → `browser_navigate` → `capture_screenshot` → `analyze_image` with local `VISION_MODEL` confirm the Ollama + vision wiring.
- [ ] SDD change `command-code-compat` archived with merged spec.
