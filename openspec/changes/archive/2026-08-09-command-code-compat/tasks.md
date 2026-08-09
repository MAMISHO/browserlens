# Tasks: Command Code Compatibility (docs + smoke test + real verification)

> Change: `command-code-compat` · Phase: tasks · Branch: `feat/command-code-compat` · Date: 2026-08-09

## Review Workload Forecast

Estimated changed lines: ~250 (2 new files + 3 modified docs/package files). Small change; commits per work unit, NO PRs (repo convention, mirrors archived change).

Commit units: U1 P0-P3 (SDD artifacts) · U2 P4 (apply: smoke test + docs) · U3 P5 (verify: scripted + Command Code real + archive).

**Global acceptance** (all tasks): file exists + `npm run typecheck` green + `npm run build` green; no `src/` changes; README has zero `mcpServer.js` references after P4.

## Phase 0: SDD artifacts

- [ ] 0.1 `state.yaml` (change `command-code-compat`, phase tracking, commit units).
- [ ] 0.2 `proposal.md` (intent, scope, approach, risks, rollback, success criteria).

## Phase 1: Spec

- [ ] 1.1 `specs/command-code-compat/spec.md` delta: 5 ADDED requirements (Command Code Configuration Documented, Stale Entrypoint Paths Fixed, Scripted MCP Smoke Test, Real Command Code Connectivity Verified, Server Code Unchanged), Given/When/Then scenarios, RFC 2119. (Accept: requirements match proposal scope; no MODIFIED requirements.)

## Phase 2: Design

- [ ] 2.1 `design.md`: ADR-1..8, smoke test protocol diagram, README section content plan, verification matrix. (Accept: decision table complete; smoke test checks enumerated.)

## Phase 3: Tasks

- [ ] 3.1 `tasks.md` (this file). (Accept: phases 0-5, commit units, global acceptance.)

## Phase 4: Apply

- [x] 4.1 `scripts/smoke-mcp.mjs` — vanilla Node ESM: spawn `dist/main.js`, readline stdout, initialize → initialized → tools/list (15 tools) → tools/call `browser_navigate` invalid URL (isError true, process alive), every stdout line JSON, exit 0/1. (Spec: Scripted MCP Smoke Test)
- [x] 4.2 `package.json` — add `"smoke": "npm run build && node scripts/smoke-mcp.mjs"`. (Spec: Scripted MCP Smoke Test)
- [x] 4.3 `README.md` — add "Command Code Example" block (`.mcp.json` project scope + `cmd mcp add --scope project` with `--env`); note the server name `browserlens` and `mcp__browserlens__*` prefix; no `{env:VAR}`. (Spec: Command Code Configuration Documented)
- [x] 4.4 `README.md` — replace every `dist/mcpServer.js` with `dist/main.js` in MCP config examples. Accept: `grep mcpServer.js README.md` → zero. (Spec: Stale Entrypoint Paths Fixed)
- [x] 4.5 `docs/README.md` — index entry for the new change + update plan status line. (Design ADR-7)
- [x] 4.6 `docs/notes/command-code-compat.md` — short note: multi-client MCP compat + opencode.json stale-path finding (update only with user approval). (Design ADR-7)
- [x] 4.7 Commit U2 (apply unit). Message per repo convention (conventional commit).

## Phase 5: Verify

- [x] 5.1 `npm run typecheck` green. (Build Contract)
- [x] 5.2 `npm run build` → `dist/main.js`; `npm start` boots on stdio. (Build Contract)
- [x] 5.3 `npm run smoke` passes (initialize, 15 tools, deterministic error, clean stdout). (Scripted MCP Smoke Test)
- [x] 5.4 Real Command Code test: `cmd mcp add --scope project browserlens -- node <abs>/dist/main.js --env OLLAMA_BASE_URL=http://localhost:11434 --env VISION_MODEL=qwen3-vl:8b --env OCR_MODEL=deepseek-ocr`; `/mcp` connect green; `execute_code` (echo ok) → `browser_navigate` → `capture_screenshot` → `analyze_image` (local VISION_MODEL). (Real Command Code Connectivity Verified)
- [x] 5.5 `verify-report.md` written with results; update `state.yaml` (verify_result). (SDD archive convention)
- [x] 5.6 Archive: merge spec delta → `openspec/specs/command-code-compat/spec.md`; move change → `openspec/changes/archive/2026-08-09-command-code-compat/`; update `docs/README.md` + `docs/plan/refactor-clean-architecture.md` status if needed; commit U3. (SDD archive)
