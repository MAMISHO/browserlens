# Spec: Clean Architecture

## Purpose

Internal refactor of the BrowserLens MCP server from a flat `src/` monolith to clean architecture by slices (tsyringe DI, @automapper, composition root). Zero behavior change: the MCP contract (tool names, snake_case schemas, JSON outputs) is unchanged. The following structural constraints MUST hold after the refactor.

## Requirements

### Requirement: Slice Layout

`src/` MUST be organized into slices — `shared/`, `mcp/`, `browser/`, `vision/`, `ocr/`, `execution/` — each with `domain/`, `application/`, and `infra/` layers (`shared/`: `application/` + `infra/`). Each slice MUST export its interfaces via `index.ts`. Services MUST NOT instantiate dependencies at module level; wiring MUST live only in the composition root.

#### Scenario: Structure reflects slices

- GIVEN a checkout of `feat/clean-architecture`
- WHEN the `src/` tree is inspected
- THEN every slice follows the `domain/application/infra` layout
- AND no slice imports implementation classes from another slice's `infra/`

#### Scenario: No module-level wiring

- GIVEN the refactored source
- WHEN scanning for direct `new ServiceImpl()` outside `container.ts`
- THEN none exist; infra classes are only referenced by DI registrations

### Requirement: DI Wiring Invariants

The composition root MUST be `src/container.ts` (dependency-ordered `useClass` registrations) plus `src/main.ts` (bootstrap). Services MUST resolve through tsyringe using explicit `InjectionToken<T>` with `@inject(TOKEN)`; `main.ts` MUST import `reflect-metadata` before any DI usage. The MCP server MUST NOT self-instantiate services; it MUST receive them from the container.

#### Scenario: Server starts and resolves DI

- GIVEN `npm start` launches the server
- WHEN tools are registered and the server begins listening
- THEN every dependency resolves without tsyringe errors
- AND every registered tool responds to calls

#### Scenario: Missing registration fails fast

- GIVEN an `@inject` token not registered in `container.ts`
- WHEN the server starts
- THEN startup fails with a clear resolution error — never a silent undefined

### Requirement: MCP Contract Preservation

The tool set, snake_case input schemas, and JSON output shapes MUST be identical to the pre-refactor server. Zod schemas MUST move verbatim to `mcp/schemas.ts`; tool registration MUST move to `mcp/controller.ts`.

#### Scenario: Tool list identical

- GIVEN the refactored server
- WHEN `tools/list` is requested
- THEN the 15 tool names are identical (browser_*, capture_screenshot, analyze_image, compare_images, extract_text, extract_markdown, execute_code)

#### Scenario: Schemas and JSON outputs preserved

- GIVEN a client calling each tool with the pre-refactor schema
- WHEN the call executes
- THEN the schema accepts the same snake_case fields
- AND the JSON output shape is unchanged for the same input

### Requirement: Singleton Semantics

`BrowserDriver` and `ModelClient` MUST be registered as singletons in the container. State MUST persist across tool calls within one MCP session; calls MUST NOT create a fresh browser or client.

#### Scenario: Browser state persists across calls

- GIVEN a running server session
- WHEN `browser_navigate` then `capture_screenshot` run in sequence
- THEN the screenshot reflects the first call's page (same browser instance)

#### Scenario: No browser per call

- GIVEN two sequential `browser_evaluate` calls in one session
- WHEN a page variable is set in the first call
- THEN it is still present in the second call

### Requirement: Mapper Wire Conventions

@automapper v9 `pojos()` mappers with snake⇄camel namingConventions MUST be used ONLY in `mcp/mappers/`. Internal slices MUST stay camelCase and MUST NOT apply wire conversion.

#### Scenario: Snake to camel at the boundary

- GIVEN an MCP tool call with snake_case fields
- WHEN `mcp/mappers/` converts them for the internal service
- THEN internal DTOs are camelCase
- AND no internal slice applies namingConventions

#### Scenario: Camel to snake on output

- GIVEN an internal service result in camelCase
- WHEN it passes through `mcp/mappers/`
- THEN the MCP JSON output uses snake_case keys

### Requirement: Build Contract

`npm run typecheck` MUST pass; `npm run build` MUST emit `dist/main.js` from entrypoint `src/main.ts`; `npm start` MUST boot the MCP server. The esbuild bundle MUST keep `packages: external`; `package.json` entrypoints MUST point to `src/main.ts`.

#### Scenario: Build and boot

- GIVEN a clean checkout
- WHEN `npm run build` then `npm start` run
- THEN `dist/main.js` is emitted and the server listens on stdio
- AND a navigate → screenshot → analyze smoke test succeeds end-to-end
