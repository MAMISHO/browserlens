# Architecture

> Status: clean-architecture refactor implemented + verified (2026-08-09). Source of truth: `openspec/specs/clean-architecture/spec.md`.

BrowserLens uses a clean-architecture layout by slices with tsyringe DI and a composition root.

## Slice Layout

`src/` is organized into six slices — `shared`, `mcp`, `browser`, `vision`, `ocr`, `execution` — each with `domain/`, `application/`, and `infra/` layers (`shared/` has `application/` + `infra/` only). Each slice exports its interfaces via `index.ts` and its DI tokens via `tokens.ts`.

```text
src/
  main.ts          # Entrypoint: import "reflect-metadata" FIRST, boot Server, stdio connect
  container.ts     # Composition root: dependency-ordered tsyringe registrations, exports container
  shared/          # Ports (application/Services, application/Repositories) + infra impls
  browser/         # Playwright control: domain/models, application, infra/BrowserDriver (SINGLETON)
  vision/          # Visual analysis: prompts, retry/fallback, LLM clients (Ollama/ChatCompletions)
  ocr/             # Text/markdown extraction
  execution/       # Local command execution: infra/ProcessRunner
  mcp/             # Delivery adapter: schemas.ts, toolDefinitions.ts, controller.ts, mappers/
```

## Boundaries

- `mcp/` is the delivery adapter. It owns MCP transport, tool names, snake_case input schemas, and JSON result formatting. Zod schemas live verbatim in `mcp/schemas.ts`; tool registration in `mcp/controller.ts`; wire snake⇄camel conversion via @automapper v9 `pojos()` ONLY in `mcp/mappers/`.
- Application services (`browser`, `vision`, `ocr`, `execution` slices) implement the use cases exposed as tools. They receive their dependencies through constructor injection (`@inject(TOKEN)`) — no self-instantiation, no module-level wiring.
- Infrastructure details (Playwright, sharp, child-process execution, model clients, filesystem) are hidden behind shared ports in `shared/application/` and implemented in each slice's `infra/`. No slice imports implementation classes from another slice's `infra/`.

## Dependency Direction

MCP transport depends on application services. Services depend on shared ports and infrastructure adapters. Infrastructure does not call back into the MCP layer.

```text
MCP client
  -> mcp/controller.ts
    -> application services (browser, vision, ocr, execution)
      -> shared ports + infra adapters
```

## DI & Composition Root

All construction happens in the composition root: `src/container.ts` registers services with dependency order, and `src/main.ts` resolves `McpController` at boot (forcing full-graph resolution → missing registrations fail fast). Services use explicit `InjectionToken<T>` + `@inject(TOKEN)` (esbuild cannot emit `emitDecoratorMetadata`, and interfaces are erased at runtime). `BrowserDriver` and `ModelClient` are registered as singletons — the MCP server is long-running with state that must persist across tool calls.

## Distribution

The package is authored in native TypeScript. The release build compiles declarations with `tsc` and bundles the executable entrypoint (`src/main.ts`) with esbuild into a minified ESM file (`dist/main.js`). Runtime dependencies remain external (`packages: external`) for portability, especially native and browser-related packages.

## Quality Targets

- strict TypeScript
- structured validation with Zod at tool boundaries
- predictable JSON errors instead of process crashes
- user-writable screenshot output by default
- no raw image bytes returned through MCP tools
- focused modules with a single operational responsibility
