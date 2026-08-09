# Spec: Dependency Update

## Purpose

Update runtime and toolchain dependencies to their latest stable versions (playwright 1.62.1, @modelcontextprotocol/sdk 1.30.0, zod 3.25.x, esbuild 0.28.2, typescript 6.0.2, @types/node 24) without changing server behavior. This validates the infrastructure isolation from the clean-architecture refactor: dependencies update while the MCP contract stays identical. The MCP contract (15 tool names, snake_case schemas, JSON outputs) MUST remain byte-identical.

## ADDED Requirements

### Requirement: Dependency Versions Updated

The package.json MUST declare: `playwright` ^1.62.1, `@modelcontextprotocol/sdk` ^1.30.0, `zod` ^3.25.x (v3 API, NOT v4), `esbuild` ^0.28.2, `typescript` ^6.0.2 (stable, not 7.0.2 preview), `@types/node` ^24. The `package-lock.json` MUST be regenerated accordingly. `openai`, `sharp`, `tsyringe`, `@automapper/core`, `@automapper/pojos`, `reflect-metadata`, `tsx` MUST remain at their already-latest versions (7.4.0, 0.35.3, 4.10.0, 9.0.2, 0.2.2, 4.23.11).

#### Scenario: package.json declares updated versions

- GIVEN the package.json after this change
- WHEN dependency versions are inspected
- THEN playwright is ^1.62.1, sdk is ^1.30.0, zod is ^3.25.x, esbuild is ^0.28.2, typescript is ^6.0.2, @types/node is ^24
- AND the lockfile reflects those versions

### Requirement: Server Code Behavior Preserved

The change MUST NOT alter server behavior. `src/` MUST remain unchanged except for minimal type fixes required by the updated type definitions (documented if any). The 15 tool names, snake_case schemas, and JSON output shapes MUST be identical to the pre-update server. The scripted smoke test (`npm run smoke`) MUST pass without modification.

#### Scenario: MCP contract preserved

- GIVEN the updated server
- WHEN `tools/list` is requested
- THEN the 15 tool names are identical to pre-update
- AND `npm run smoke` passes unchanged (initialize, 15 tools, deterministic invalid-URL error, clean stdout)

#### Scenario: src/ unchanged

- GIVEN the change's diff
- WHEN `src/` is inspected
- THEN no files under `src/` are modified (or only documented minimal type fixes)

### Requirement: Browser Binary Installed

After updating `playwright`, the Chromium browser binary for the new version MUST be installed (`npx playwright install chromium`), so the real browser smoke works.

#### Scenario: Real smoke passes with new Playwright

- GIVEN the updated playwright with Chromium installed
- WHEN a real end-to-end run executes `browser_navigate` → `capture_screenshot` → `analyze_image` (local vision model)
- THEN navigation returns title/status, screenshot returns image_path with dimensions, and analyze returns a VisionAnalysis JSON
- AND the JSON shapes are identical to the pre-update results

### Requirement: Toolchain Builds Green

`npm run typecheck` (tsc --noEmit) MUST pass with TypeScript 6.0.2; `npm run build` MUST emit `dist/main.js` via esbuild 0.28.2 with the existing `scripts/bundle.mjs` (packages external, target node20).

#### Scenario: Build and typecheck green

- GIVEN a checkout with the updated dependencies
- WHEN `npm run typecheck` and `npm run build` run
- THEN both exit 0
- AND `dist/main.js` is emitted

## MODIFIED Requirements

(none — this change updates dependencies only; it modifies no existing spec requirement)
