# Proposal: Dependency Update (playwright + MCP SDK + stable toolchain)

## Intent

Leverage the infrastructure isolation from the clean-architecture refactor to update runtime and toolchain dependencies to their latest stable versions without breaking anything. The MCP contract (15 tools, snake_case schemas, JSON outputs) and server behavior MUST remain identical. Verified via typecheck, build, scripted smoke, and a real smoke (navigate → screenshot → analyze with the local vision model).

## Scope

### In Scope
- Update `playwright` ^1.52.0 → ^1.62.1 (latest stable).
- Update `@modelcontextprotocol/sdk` ^1.13.0 → ^1.30.0 (latest stable).
- Update `zod` ^3.24.1 → ^3.25.x (required by SDK 1.30 peer dep `zod ^3.25 || ^4.0`; stays on v3 API — NO v4 migration).
- Update `esbuild` ^0.28.0 → ^0.28.2 (patch).
- Update `typescript` ^5.7.2 → ^6.0.2 (stable; NOT 7.0.2 preview).
- Update `@types/node` ^22.10.2 → ^24 (aligned with Node 26).
- Regenerate `package-lock.json`.
- `npx playwright install chromium` for the new Playwright browser binary.
- SDD artifacts for change `deps-update` + archive.

### Out of Scope
- zod v4 migration (breaking API; not needed — SDK accepts zod ^3.25).
- TypeScript 7.0.2 (preview).
- Changes to `src/` behavior (only minimal type fixes if typecheck demands it — not expected).
- MCP protocol/tools/schemas changes.
- Adding a test runner (repo convention: `strict_tdd: false`).

## Capabilities

### New Capabilities
None — dependency updates only, no new user-facing behavior.

### Modified Capabilities
None — MCP contract unchanged. The isolation from the clean-architecture refactor is validated: dependencies update while `src/` stays untouched.

## Approach

1. SDD pipeline for change `deps-update` (proposal → spec → design → tasks → apply → verify → archive), mirroring `command-code-compat`.
2. Apply: `npm install playwright@^1.62.1 @modelcontextprotocol/sdk@^1.30.0 zod@^3.25.1` and `npm install -D esbuild@^0.28.2 typescript@^6.0.2 @types/node@^24`; `npx playwright install chromium`.
3. Verify: `npm run typecheck`, `npm run build`, `npm run smoke`, plus a real smoke (navigate → screenshot → analyze_image with local qwen3-vl:8b).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Version bumps |
| `package-lock.json` | Modified | Regenerated |
| `src/` | Unchanged (expected) | Only minimal type fixes if typecheck demands |
| `scripts/smoke-mcp.mjs` | Unchanged (expected) | Protocol 2024-11-05 still supported |
| `openspec/` | Modified | SDD artifacts |
| `docs/README.md` | Modified | Index + change status |
| `.mcp.json` | Unchanged | Still points to dist/main.js |

### DI impact
None — container registrations and tokens untouched.

### Mapper impact
None — mapper/schema code untouched.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Playwright 1.62 breaking API | Low | Code uses only stable APIs; typecheck + real smoke verify |
| SDK 1.30 protocol defaults change | Low | Smoke test with 2024-11-05 validates; adjust protocolVersion in smoke if needed |
| zod 3.25 type inference changes | Low | typecheck + smoke cover; no code migration |
| TypeScript 6.0.2 build break | Low | tsc --noEmit + esbuild validate; pin to 5.9.x if needed |
| Playwright browser binary mismatch | Med | `npx playwright install chromium` post-update |

## Rollback Plan

`git revert` the `deps-update` commit(s): touches only package.json, lockfile, docs. `src/` does not depend on old versions.

## Dependencies

- Updated: playwright, @modelcontextprotocol/sdk, zod, esbuild, typescript, @types/node.
- Unchanged (already latest): openai 7.4.0, sharp 0.35.3, tsyringe 4.10.0, @automapper/core+pojos 9.0.2, reflect-metadata 0.2.2, tsx 4.23.11.

## Success Criteria

- [ ] `npm run typecheck` passes with TS 6.
- [ ] `npm run build` emits `dist/main.js`.
- [ ] `npm run smoke` passes unchanged (initialize, 15 tools, deterministic error, clean stdout).
- [ ] Real smoke: navigate → screenshot → analyze_image (local qwen3-vl:8b) returns JSON identical in shape to pre-update.
- [ ] MCP contract unchanged (15 tools, snake_case schemas, byte-identical outputs).
- [ ] `src/` unchanged (or only documented minimal type fixes).
