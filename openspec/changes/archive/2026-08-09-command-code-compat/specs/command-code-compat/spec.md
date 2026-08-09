# Delta for command-code-compat

## Purpose

Make BrowserLens officially compatible with Command Code as an MCP client without changing server code. The MCP server already speaks the standard stdio protocol via the official SDK, so the work is documentation, fixing stale entrypoint paths, adding a scripted smoke test, and verifying real connectivity inside Command Code (including the Ollama + local vision wiring). The MCP contract (tool names, snake_case schemas, JSON outputs) MUST remain unchanged.

## ADDED Requirements

### Requirement: Command Code Configuration Documented

The README MUST include a "Command Code" section that documents how to connect BrowserLens, with BOTH of the following options (D2, D7):
- A `.mcp.json` file in the project root (project scope, checked into git) using the `"mcpServers"` schema with `command`/`args` and an `env` block for `OLLAMA_BASE_URL`, `VISION_MODEL`, and `OCR_MODEL`.
- The `cmd mcp add --scope project browserlens -- node <abs-path>/dist/main.js` command with `--env` flags.

The documented env wiring MUST reflect the working opencode setup (which uses the code defaults): `OLLAMA_BASE_URL=http://localhost:11434`, `VISION_MODEL=qwen3-vl:8b`, `OCR_MODEL=deepseek-ocr`. Command Code MUST NOT be documented with opencode's `{env:VAR}` interpolation syntax; Command Code resolves `${VAR}` from its own environment at runtime.

#### Scenario: README documents Command Code config

- GIVEN the README
- WHEN the "Command Code" section is read
- THEN it shows a `.mcp.json` project-scope example with `env` for the Ollama endpoint and vision/OCR models
- AND it shows the equivalent `cmd mcp add --scope project browserlens -- node .../dist/main.js` command
- AND it does not use `{env:VAR}` syntax (Command Code uses `${VAR}`)

### Requirement: Stale Entrypoint Paths Fixed

The README MUST NOT reference the pre-refactor entrypoint `dist/mcpServer.js`. All MCP configuration examples MUST point to the current bundle entrypoint `dist/main.js` (D5). The user-level opencode config (`~/.config/opencode/opencode.json`) is outside the repo: its stale `dist/mcpServer.js` path MUST be documented as a finding and MAY be updated only with explicit user approval.

#### Scenario: No stale entrypoint references

- GIVEN the README after this change
- WHEN searching for `mcpServer.js`
- THEN no matches exist

### Requirement: Scripted MCP Smoke Test

A `smoke` npm script MUST run `npm run build` followed by `node scripts/smoke-mcp.mjs`. The smoke test MUST spawn `dist/main.js`, speak JSON-RPC over stdio, and verify (D3):
- `initialize` succeeds.
- `tools/list` returns exactly the 15 BrowserLens tools.
- A deterministic `tools/call` with an invalid `browser_navigate` URL returns a structured error (`isError: true` or `error: true`) without crashing the process.
- No non-JSON (non-JSON-RPC) lines leak to stdout.

The smoke test MUST pass without Ollama or Playwright installed (Node + built `dist/main.js` only).

#### Scenario: Smoke test passes on a clean checkout

- GIVEN a clean checkout with `npm run build` already run
- WHEN `npm run smoke` executes
- THEN the process exits 0
- AND it reports initialize success, 15 tools listed, and the deterministic call-error verified
- AND stdout during the session contained only JSON-RPC lines

### Requirement: Real Command Code Connectivity Verified

The change MUST be verified inside an actual Command Code session (D4): add BrowserLens with `cmd mcp add --scope project browserlens -- node <abs>/dist/main.js` (with `--env` for the Ollama endpoint and local vision model), confirm the server connects (green in `/mcp`), and run a simple end-to-end test with the local Ollama + vision wiring: `execute_code` (echo), `browser_navigate` (simple URL), `capture_screenshot`, and `analyze_image` with the local `VISION_MODEL`. Any incompatibility found MUST be reported as a finding, not silently worked around.

#### Scenario: BrowserLens connects and responds in Command Code

- GIVEN BrowserLens added to Command Code via `cmd mcp add`
- WHEN the server is connected (via `/mcp`)
- THEN the connection status is green
- AND `execute_code` returns stdout for `echo ok`
- AND `browser_navigate` + `capture_screenshot` return structured JSON
- AND `analyze_image` on the captured screenshot returns a `VisionAnalysis` JSON using the local `VISION_MODEL`

### Requirement: Server Code Unchanged

The change MUST NOT modify `src/` (server code, schemas, tool definitions, DI container, or composition root). The MCP contract (15 tool names, snake_case schemas, JSON output shapes) MUST remain byte-identical to the pre-change server (D1, D8).

#### Scenario: No src/ changes

- GIVEN the change's diff
- WHEN `src/` is inspected
- THEN no files under `src/` are modified by this change

## MODIFIED Requirements

(none — this change adds capabilities and documentation only; it modifies no existing spec requirement)
