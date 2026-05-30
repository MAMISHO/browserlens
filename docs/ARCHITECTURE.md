# Architecture

BrowserLens uses a small clean-architecture layout.

## Boundaries

- `mcpServer.ts` is the delivery adapter. It owns MCP transport, tool names, input schemas, and JSON result formatting.
- `executeService.ts`, `playwrightService.ts`, `visionService.ts`, and `ocrService.ts` are application services. They implement the use cases exposed as tools.
- `ollamaClient.ts`, Playwright, filesystem access, and child-process execution are infrastructure details hidden behind service modules.
- `screenshotStorage.ts` owns the screenshot storage policy so browser capture logic does not need to know OS directory conventions.

## Dependency Direction

MCP transport depends on services. Services depend on small infrastructure adapters and shared types. Infrastructure does not call back into the MCP layer.

```text
MCP client
  -> mcpServer.ts
    -> services
      -> infrastructure adapters
```

## Distribution

The package is authored in native TypeScript. The release build compiles declarations with `tsc` and bundles the executable entrypoint with esbuild into a minified ESM file. Runtime dependencies remain external for portability, especially native and browser-related packages.

## Quality Targets

- strict TypeScript
- structured validation with Zod at tool boundaries
- predictable JSON errors instead of process crashes
- user-writable screenshot output by default
- no raw image bytes returned through MCP tools
- focused modules with a single operational responsibility
