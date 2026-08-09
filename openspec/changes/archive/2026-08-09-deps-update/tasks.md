# Tasks: Dependency Update (playwright + MCP SDK + stable toolchain)

> Change: `deps-update` · Phase: tasks · Branch: `feat/deps-update` · Date: 2026-08-09

## Review Workload Forecast

Estimated changed lines: ~10 in package.json + regenerated lockfile + docs. Small change; commits per work unit, NO PRs (repo convention).

Commit units: U1 P0-P3 (SDD artifacts) · U2 P4 (apply: npm install) · U3 P5 (verify: scripted + real) · U4 P6 (archive).

**Global acceptance** (all tasks): `npm run typecheck` + `npm run build` + `npm run smoke` green; `src/` unchanged (or only documented minimal type fixes); MCP contract identical.

## Phase 0: SDD artifacts

- [ ] 0.1 `state.yaml` (change `deps-update`).
- [ ] 0.2 `proposal.md` (intent, scope, version matrix, risks, rollback, success criteria).

## Phase 1: Spec

- [ ] 1.1 `specs/deps-update/spec.md` delta: 4 ADDED requirements (Dependency Versions Updated, Server Code Behavior Preserved, Browser Binary Installed, Toolchain Builds Green), Given/When/Then, RFC 2119.

## Phase 2: Design

- [ ] 2.1 `design.md`: ADR-1..8, version matrix, apply steps, verification matrix.

## Phase 3: Tasks

- [ ] 3.1 `tasks.md` (this file).

## Phase 4: Apply

- [x] 4.1 `npm install playwright@^1.62.1 @modelcontextprotocol/sdk@^1.30.0 zod@^3.25.1`. (Spec: Dependency Versions Updated)
- [x] 4.2 `npm install -D esbuild@^0.28.2 typescript@^6.0.2 @types/node@^24`. (Spec: Dependency Versions Updated)
- [x] 4.3 `npx playwright install chromium` (browser binary for 1.62). (Spec: Browser Binary Installed)
- [x] 4.4 If `npm run typecheck` surfaces type errors from updated typings: apply minimal documented fixes in `src/`. (Spec: Server Code Behavior Preserved — fixes only, no behavior change) — NOT NEEDED: typecheck green with zero src/ changes
- [x] 4.5 Commit U2 (apply unit), conventional message.

## Phase 5: Verify

- [x] 5.1 `npm run typecheck` green with TS 6. (Toolchain Builds Green)
- [x] 5.2 `npm run build` → `dist/main.js`. (Toolchain Builds Green)
- [x] 5.3 `npm run smoke` passes unchanged (initialize, 15 tools, deterministic error, clean stdout). (Server Code Behavior Preserved)
- [x] 5.4 Real smoke: `browser_navigate https://example.com` → `capture_screenshot` → `analyze_image` (local qwen3-vl:8b) via stdio/Command Code; JSON shapes identical to pre-update. (Browser Binary Installed, Server Code Behavior Preserved)
- [x] 5.5 `verify-report.md` written; update `state.yaml` (verify_result).

## Phase 6: Archive

- [x] 6.1 Merge spec delta → `openspec/specs/deps-update/spec.md`; move change → `openspec/changes/archive/2026-08-09-deps-update/`; update `docs/README.md` index.
- [x] 6.2 Commit U4 (archive unit), conventional message.
