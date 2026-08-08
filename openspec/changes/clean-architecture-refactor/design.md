# Design: Refactor a Clean Architecture + DI

> Change: `clean-architecture-refactor` · Phase: design · Branch: `feat/clean-architecture` · Date: 2026-08-08

## Technical Approach

Split the flat `src/` monolith (12 files) into six slices — `shared`, `browser`, `vision`, `ocr`, `execution`, `mcp` — each with `domain/` + `application/` + `infra/` (`shared` = `application/` + `infra/` per spec). Services stop wiring each other at module level; all construction moves to a composition root (`src/container.ts` registrations + `src/main.ts` bootstrap). Dependencies resolve through tsyringe explicit `InjectionToken<T>` + `@inject(TOKEN)` because esbuild cannot emit `emitDecoratorMetadata` and interfaces are erased at runtime (see `docs/notes/DI-tokens-esbuild.md`). Snake⇄camel wire conversion happens ONLY at the MCP boundary via @automapper v9 `pojos()` + `namingConventions`; internal slices stay camelCase. `mcpServer.ts` decomposes into `main.ts` + `container.ts` + `mcp/` (schemas, toolDefinitions, controller, mappers). The esbuild single-file bundle stays (entrypoint swap only), satisfying the Build Contract spec. **Zero behavior change**: the 15 tool names, snake_case schemas, and JSON output shapes are preserved verbatim (MCP Contract Preservation spec).

## Architecture Decisions

| # | Topic | Options (tradeoff) | Decision |
|---|-------|--------------------|----------|
| ADR-1 | DI resolution | design:type metadata (esbuild can't emit it) vs string tokens (untyped) vs **explicit `InjectionToken<T>`** | Explicit typed tokens. Verified esbuild emits `__decorateParam`; interfaces erased at runtime make type-only resolution impossible regardless. |
| ADR-2 | DI container | awilix (name-based, fragile) vs manual root (no real DI) vs **tsyringe** | tsyringe 4.10.0 — dual CJS/ESM, matches reference pattern (rempe `loader.ts`). |
| ADR-3 | Mapper strategy | `classes()` + `@AutoMap` (needs `design:type`, esbuild-incompatible) vs **`pojos()` + `PojosMetadataMap.create`** | `pojos()` — no runtime decorators, esbuild-safe, ideal for interface/plain-object DTOs. |
| ADR-4 | Wire conversion scope | Everywhere vs **only `mcp/mappers/`** | Only at the MCP boundary. Internal slices stay camelCase; single conversion point (spec: Mapper Wire Conventions). |
| ADR-5 | Stateful singletons | Transient (new browser per call — breaks session) vs **Singleton for BrowserDriver + ModelClient** | Singleton. MCP server is long-running with state; spec scenario requires state persistence across calls. |
| ADR-6 | Composition root | `mcpServer.ts` self-instantiation (today) vs **`main.ts` + `container.ts`** | Module-level `export const container` in `container.ts` (composition root only); `main.ts` resolves `McpController` which forces full-graph resolution → fail fast on missing registrations. |
| ADR-7 | Build | Rewrite pipeline vs **keep esbuild, swap entrypoint** | Keep esbuild single-file bundle, `packages: external`, `tsc --emitDeclarationOnly`. Only entrypoint changes (`dist/main.js`). Add `experimentalDecorators: true` to tsconfig (required by tsc; esbuild transforms syntax). |
| ADR-8 | Tool schema source | Derive JSON schema from zod vs **verbatim copies** | Keep the hand-written `inputSchema` JSON (toolDefinitions.ts) AND the zod schemas (schemas.ts) verbatim — deriving would change the wire contract. |
| ADR-9 | Provider selection | Scattered in services (today) vs **`shared/infra/providerConfig.ts` factories registered via `useFactory`** | `createVisionProvider`/`createOcrProvider` become container factories resolving the shared `ModelClient` singleton; services receive a `ProviderSelection`. |
| ADR-10 | Mapper instance | Module-level const (wiring at module level, spec violation) vs **registered via DI (`TOKENS.Mapper`, singleton)** | DI-registered singleton built by `createWireMapper()` in `mcp/mappers/wireMapper.ts`. |

## Target File Tree (every file, one-line responsibility)

Current `src/` (12 files) maps as follows, then the full target tree:

| Current file | Destination |
|---|---|
| `mcpServer.ts` (427) | `main.ts` (bootstrap) + `container.ts` + `mcp/{schemas,toolDefinitions,controller,formatter}.ts` + `mcp/mappers/*` |
| `playwrightService.ts` (425) | `browser/infra/BrowserDriver.ts` + `browser/application/**` (service, impl, DTOs, IBrowserDriverService, models) |
| `visionService.ts` (279) | `vision/application/Services/impl/VisionServiceImpl.ts` + `vision/application/{Services,DTOs,Mappers}` + `vision/domain/models/VisionModels.ts` |
| `ocrService.ts` (138) | `ocr/application/Services/impl/OcrServiceImpl.ts` + `ocr/application/{Services,DTOs}` + `ocr/domain/models/OcrModels.ts` |
| `ollamaClient.ts` (156) | `vision/infra/OllamaClientImpl.ts` (implements shared `IModelClientService`) |
| `chatCompletionsClient.ts` (65) | `vision/infra/ChatCompletionsClientImpl.ts` (implements shared `IModelClientService`) |
| `providerConfig.ts` (87) | `shared/infra/providerConfig.ts` + `ProviderSelection` type → `shared/application/models/ProviderSelection.ts` |
| `executeService.ts` (53) | `execution/infra/ProcessRunner.ts` + `execution/application/Services/impl/ExecutionServiceImpl.ts` + DTOs + `CommandResult.ts` |
| `imageUtils.ts` (76) | `shared/infra/ImageProcessor.ts` (implements `IImageProcessorService`) |
| `screenshotStorage.ts` (64) | `shared/infra/ScreenshotStorage.ts` (implements `IScreenshotStorage`) |
| `modelClient.ts` (32) | `shared/application/Services/IModelClientService.ts` (+ `GenerateRequest`, `ProviderKind` types) |
| `types.ts` (21) | `shared/application/models/ToolResult.ts` + `vision/domain/models/VisionModels.ts` (`Severity`, `VisionIssue`, `VisionAnalysis`) |

```
src/
├── main.ts                      # Entrypoint: "reflect-metadata" FIRST, boot Server, signal handlers, connect stdio
├── container.ts                 # Composition root: dependency-ordered tsyringe registrations, exports `container`
├── shared/
│   ├── index.ts                 # Slice API re-exports
│   ├── tokens.ts                # SHARED_TOKENS: ImageProcessor, ScreenshotStorage, ModelClient, ProcessRunner
│   ├── application/
│   │   ├── Repositories/
│   │   │   └── IScreenshotStorage.ts# Port: resolveScreenshotPath, temporaryScreenshotDirectory (persistence → Repositories/)
│   │   ├── Services/
│   │   │   ├── IModelClientService.ts    # Port: generate() + optional unload() (infra port → Services/)
│   │   │   ├── IImageProcessorService.ts # Port: imageToOptimizedBase64, fileToBase64, comparisonContactSheetBase64
│   │   │   └── IProcessRunnerService.ts  # Port: run(cmd,args,opts) → CommandResult
│   │   └── models/
│   │       ├── ToolResult.ts        # ToolResult<T> = T | StructuredError
│   │       └── ProviderSelection.ts # { client: IModelClientService; model: string; provider: ProviderKind }
│   └── infra/
│       ├── ImageProcessor.ts        # sharp impl (was imageUtils.ts)
│       ├── ScreenshotStorage.ts     # path resolution impl (was screenshotStorage.ts)
│       └── providerConfig.ts        # createVisionProvider/createOcrProvider + selectedProvider/isEnabled
├── browser/
│   ├── index.ts                 # Slice API re-exports
│   ├── tokens.ts                # BROWSER_TOKENS: BrowserService, BrowserDriver
│   ├── domain/models/
│   │   └── BrowserModels.ts     # PageSnapshot, ElementInfo, ScreenshotResult (camelCase)
│   ├── application/
│   │   ├── Services/
│   │   │   ├── IBrowserDriverService.ts # Port: browser/context/page lifecycle + Playwright primitives
│   │   │   ├── browser.service.ts   # IBrowserService: 11 methods incl. close()
│   │   │   └── impl/BrowserServiceImpl.ts  # Orchestration: driver + storage, snapshot serialization, sharp inspect
│   │   ├── DTOs/
│   │   │   └── browser.dto.ts       # camelCase inputs: NavigateArgs, ScreenshotArgs, SnapshotArgs, ClickArgs, ...
│   │   └── Mappers/                 # reserved (no automapper here — camel only)
│   └── infra/
│       └── BrowserDriver.ts         # Playwright impl, stateful — SINGLETON (implements IBrowserDriverService)
├── vision/
│   ├── index.ts
│   ├── tokens.ts                # VISION_TOKENS: VisionService, VisionModelConfig
│   ├── domain/models/
│   │   └── VisionModels.ts      # VisionAnalysis { matchesExpectations, confidence, issues }, VisionIssue, Severity
│   ├── application/
│   │   ├── Services/
│   │   │   ├── vision.service.ts    # IVisionService: analyzeImage, compareImages
│   │   │   └── impl/VisionServiceImpl.ts  # prompts, retry, fallback, LLM-parse
│   │   ├── DTOs/
│   │   │   └── vision.dto.ts        # AnalyzeImageInput, CompareImagesInput (camelCase)
│   │   └── Mappers/
│   │       └── visionModel.mapper.ts# zod .transform: LLM snake JSON → camelCase VisionAnalysis (explicit, no automapper)
│   └── infra/
│       ├── OllamaClientImpl.ts      # IModelClientService impl (was ollamaClient.ts) — SINGLETON
│       └── ChatCompletionsClientImpl.ts # IModelClientService impl (was chatCompletionsClient.ts)
├── ocr/
│   ├── index.ts
│   ├── tokens.ts                # OCR_TOKENS: OcrService, OcrModelConfig
│   ├── domain/models/
│   │   └── OcrModels.ts         # ExtractedText { text, blocks }, ExtractedMarkdown { markdown }
│   ├── application/
│   │   ├── Services/
│   │   │   ├── ocr.service.ts       # IOcrService: extractText, extractMarkdown
│   │   │   └── impl/OcrServiceImpl.ts   # prompts, fence stripping, parse
│   │   ├── DTOs/
│   │   │   └── ocr.dto.ts           # ExtractTextInput, ExtractMarkdownInput (camelCase)
│   │   └── Mappers/                 # reserved
│   └── infra/                       # consumes shared IModelClientService via container
├── execution/
│   ├── index.ts
│   ├── tokens.ts                # EXECUTION_TOKENS: ExecutionService
│   ├── domain/models/
│   │   └── CommandResult.ts     # { exitCode, stdout, stderr, timedOut }
│   ├── application/
│   │   ├── Services/
│   │   │   ├── execution.service.ts # IExecutionService: execute(input)
│   │   │   └── impl/ExecutionServiceImpl.ts  # wraps IProcessRunnerService → ToolResult
│   │   ├── DTOs/
│   │   │   └── execution.dto.ts     # ExecuteCodeInput (camelCase: timeoutMs, shell, env...)
│   │   └── Mappers/                 # reserved
│   └── infra/
│       └── ProcessRunner.ts         # child_process spawn impl of IProcessRunnerService
└── mcp/
    ├── index.ts
    ├── tokens.ts                # MCP_TOKENS: Mapper, McpController
    ├── schemas.ts               # 15 zod schemas, VERBATIM snake_case (parse contract)
    ├── toolDefinitions.ts       # 15 {name, description, inputSchema} VERBATIM (list contract)
    ├── controller.ts            # McpController: listTools() + callTool() dispatch + json()/error formatting
    ├── formatter.ts             # json(value, isError=false) → CallToolResult (preserved semantics)
    └── mappers/
        ├── wireMapper.ts        # createWireMapper(): createMapper(pojos) + metadata + createMap pairs
        ├── wireMetadata.ts      # PojosMetadataMap.create<T> registrations (wire ⇄ internal)
        ├── browser.mapper.ts    # navigate/snapshot/screenshot wire functions
        ├── vision.mapper.ts     # analyze/compare wire functions
        ├── ocr.mapper.ts        # extract wire functions
        └── execute.mapper.ts    # execute wire functions
```

Counts: ~53 new files, 12 deleted (`src/*.ts` originals), 3 modified (`package.json`, `scripts/bundle.mjs`, `tsconfig.json`).

## DI Design

### Tokens — per-slice `tokens.ts` (typed, never raw strings)

```ts
// browser/tokens.ts
import type { InjectionToken } from "tsyringe";
import type { IBrowserService } from "./application/Services/browser.service.js";
import type { IBrowserDriverService } from "./application/Services/IBrowserDriverService.js";

export const BROWSER_TOKENS = {
  BrowserService: "IBrowserService" as InjectionToken<IBrowserService>,
  BrowserDriver: "IBrowserDriverService" as InjectionToken<IBrowserDriverService>
};
```

Each slice exports `{SLICE}_TOKENS`. `shared/tokens.ts` also exports `ModelClient` (the shared port), `VisionModelConfig`/`OcrModelConfig` live in their slice tokens (typed as `InjectionToken<ProviderSelection>`). Container imports all six token groups.

### `@inject` usage (service side)

```ts
// browser/application/Services/impl/BrowserServiceImpl.ts
@injectable()
export class BrowserServiceImpl implements IBrowserService {
  constructor(
    @inject(BROWSER_TOKENS.BrowserDriver) private readonly driver: IBrowserDriverService,
    @inject(SHARED_TOKENS.ScreenshotStorage) private readonly storage: IScreenshotStorage
  ) {}
}
```

### `container.ts` — registration order (shared infra → model clients → provider configs → services → mcp)

```ts
// src/container.ts
import { Container } from "tsyringe";
import { SHARED_TOKENS } from "./shared/tokens.js";
// ... BROWSER_TOKENS, VISION_TOKENS, OCR_TOKENS, EXECUTION_TOKENS, MCP_TOKENS

export const container = new Container();

// 1. shared infra (stateless)
container.register(SHARED_TOKENS.ImageProcessor, { useClass: ImageProcessor });
container.register(SHARED_TOKENS.ScreenshotStorage, { useClass: ScreenshotStorage });
container.register(SHARED_TOKENS.ProcessRunner, { useClass: ProcessRunner });
// 2. model client — SINGLETON (holds queue + activeModel state)
container.register(SHARED_TOKENS.ModelClient, { useClass: OllamaClientImpl }, { lifecycle: "Singleton" });
// 3. provider configs (factories select openai/custom/ollama per env)
container.register(VISION_TOKENS.VisionModelConfig, {
  useFactory: (c) => createVisionProvider(c.resolve(SHARED_TOKENS.ModelClient))
});
container.register(OCR_TOKENS.OcrModelConfig, {
  useFactory: (c) => createOcrProvider(c.resolve(SHARED_TOKENS.ModelClient))
});
// 4. browser — driver SINGLETON (browser state)
container.register(BROWSER_TOKENS.BrowserDriver, { useClass: BrowserDriver }, { lifecycle: "Singleton" });
container.register(BROWSER_TOKENS.BrowserService, { useClass: BrowserServiceImpl });
// 5. application services
container.register(VISION_TOKENS.VisionService, { useClass: VisionServiceImpl });
container.register(OCR_TOKENS.OcrService, { useClass: OcrServiceImpl });
container.register(EXECUTION_TOKENS.ExecutionService, { useClass: ExecutionServiceImpl });
// 6. mcp
container.register(MCP_TOKENS.Mapper, { useFactory: () => createWireMapper() }, { lifecycle: "Singleton" });
container.register(MCP_TOKENS.McpController, { useClass: McpController });
```

`tsyringe` resolves lazily, so strict order is not required for correctness — the shared→services→mcp order is a readability/fail-fast convention: reading top-to-bottom mirrors the dependency graph. `main.ts` resolves `McpController` at boot, which transitively resolves the whole graph → a missing registration fails fast at startup (spec: "Missing registration fails fast").

`main.ts` MUST have `import "reflect-metadata"` as its FIRST import (before any tsyringe import). It is idempotent; keep it only in `main.ts` (all dev/start paths enter through it).

## Mapper Design (@automapper v9 `pojos()`)

Singleton mapper built once by `createWireMapper()` and registered as `MCP_TOKENS.Mapper` (ADR-10). All `PojosMetadataMap.create` + `createMap` registrations live in `mcp/mappers/` ONLY (ADR-4).

```ts
// mcp/mappers/wireMapper.ts
import { createMapper, type Mapper, namingConventions } from "@automapper/core";
import { pojos, PojosMetadataMap } from "@automapper/pojos";
import { SnakeCaseNamingConvention, CamelCaseNamingConvention } from "@automapper/core";
import { registerWireMetadata } from "./wireMetadata.js";

export function createWireMapper(): Mapper {
  const mapper = createMapper({ strategyInitializer: pojos() });
  registerWireMetadata(mapper);
  // input: wire snake → internal camel
  createMap(mapper, "ScreenshotWireArgs", "ScreenshotArgs",
    namingConventions({ source: new SnakeCaseNamingConvention(), destination: new CamelCaseNamingConvention() }));
  // output: internal camel → wire snake
  createMap(mapper, "ScreenshotResult", "ScreenshotWireResult",
    namingConventions({ source: new CamelCaseNamingConvention(), destination: new SnakeCaseNamingConvention() }));
  // ... one createMap per wire pair (browser, vision, ocr, execute)
  return mapper;
}
```

```ts
// mcp/mappers/wireMetadata.ts (excerpt)
export function registerWireMetadata(mapper: Mapper): void {
  PojosMetadataMap.create<ScreenshotWireArgs>("ScreenshotWireArgs", {
    url: String, selector: String, full_page: Boolean,
    output_path: String, delay_ms: Number, viewport: ViewportWire
  });
  PojosMetadataMap.create<ScreenshotArgs>("ScreenshotArgs", {
    url: String, selector: String, fullPage: Boolean,
    outputPath: String, delayMs: Number, viewport: Viewport
  });
  // Nested shapes are their own pojos entries (ViewportWire ⇄ Viewport); arrays use [Type].
}
```

Per-tool wrapper functions keep the controller clean and handle error pass-through — **services return `ToolResult<T>`, so result mappers MUST short-circuit StructuredError unchanged** (error objects are already shape-neutral):

```ts
// mcp/mappers/browser.mapper.ts
export function mapScreenshotResult(mapper: Mapper, result: ToolResult<ScreenshotResult>): Record<string, unknown> {
  if (isStructuredError(result)) return result;              // {error:true,...} passes through untouched
  return mapper.map(result, "ScreenshotResult", "ScreenshotWireResult");
}
```

Internal result models contain exactly the fields that appear on the wire (no extras) so `namingConventions` produces byte-identical JSON keys. `VisionAnalysis` → `{ matches_expectations, confidence, issues: [{ type, description, severity }] }`; `ScreenshotResult` → `{ image_path, width?, height?, blank_like?, warning? }`; `CommandResult` → `{ exit_code, stdout, stderr, timed_out }`; `ElementInfo.ariaLabel` → `aria_label`.

## MCP Controller Design

`McpController` receives all four services + `Mapper` via constructor injection — **no self-instantiation** (spec: DI Wiring Invariants).

```ts
// mcp/controller.ts (excerpt)
@injectable()
export class McpController {
  constructor(
    @inject(BROWSER_TOKENS.BrowserService) private readonly browser: IBrowserService,
    @inject(VISION_TOKENS.VisionService) private readonly vision: IVisionService,
    @inject(OCR_TOKENS.OcrService) private readonly ocr: IOcrService,
    @inject(EXECUTION_TOKENS.ExecutionService) private readonly execution: IExecutionService,
    @inject(MCP_TOKENS.Mapper) private readonly mapper: Mapper
  ) {}

  listTools() { return { tools: TOOL_DEFINITIONS }; }   // verbatim 15 entries from toolDefinitions.ts

  async callTool(name: string, args: unknown): Promise<CallToolResult> {
    try {
      switch (name) {
        case "capture_screenshot": {
          const parsed = screenshotSchema.parse(args);                       // snake, defaults applied
          const dto = this.mapper.map(parsed, "ScreenshotWireArgs", "ScreenshotArgs");
          return json(mapScreenshotResult(this.mapper, await this.browser.captureScreenshot(dto)));
        }
        // ... 14 more cases, each: schema.parse → mapper input → service → mapper output → json()
        default:
          return json({ error: true, message: `Unknown tool: ${name}` }, true);
      }
    } catch (error) {
      return json({ error: true, message: error instanceof Error ? error.message : "Unknown MCP tool error.", details: error }, true);
    }
  }
}
```

**`json()`/error formatting preserved** (`mcp/formatter.ts`): `{ isError, content: [{ type: "text", text: JSON.stringify(value, null, 2) }] }`. Semantics unchanged: `isError: true` ONLY for unknown tool and thrown exceptions; service-returned `{ error: true, ... }` objects remain in-band with `isError: false`. `schemas.ts` (zod, parse-time) and `toolDefinitions.ts` (JSON inputSchema, list-time) are both verbatim copies — never derived from each other (ADR-8).

## Shared Ports

Ports to external infrastructure live in `shared/application/Services/` (they are driven ports, not persistence). Only true persistence lives in `Repositories/`. Implementations per plan D9/D10:

| Port | Interface | Impl location |
|---|---|---|
| `IModelClientService` | `shared/application/Services/IModelClientService.ts` (`generate` + optional `unload`) | `vision/infra/OllamaClientImpl.ts`, `vision/infra/ChatCompletionsClientImpl.ts` (provider-specific, consumed by vision+ocr via container) |
| `IImageProcessorService` | `shared/application/Services/IImageProcessorService.ts` | `shared/infra/ImageProcessor.ts` |
| `IProcessRunnerService` | `shared/application/Services/IProcessRunnerService.ts` | `execution/infra/ProcessRunner.ts` |
| `IScreenshotStorage` | `shared/application/Repositories/IScreenshotStorage.ts` (persistence) | `shared/infra/ScreenshotStorage.ts` |

Slice-local infra ports follow the same pattern: `IBrowserDriverService` in `browser/application/Services/`, impl in `browser/infra/BrowserDriver.ts`. No slice imports another slice's `infra/` impls — only shared ports (spec: "no slice imports implementation classes from another slice's infra/").

## Sequence Diagrams

### Boot (main.ts → container → controller → services)

```
npm start ──▶ main.ts
  import "reflect-metadata"                    (FIRST import, side-effect)
  import { container } from "./container.js"   (module eval: new Container + registrations
                                                order: shared → model client♛ → provider configs
                                                → browser driver♛/service → vision/ocr/execution → mcp)
  main.ts: resolve(MCP_TOKENS.McpController)   ──► forces full graph construction (fail-fast)
      container ──► BrowserServiceImpl  ctor  ──► resolve BrowserDriver (singleton, browser state)
                                                └─► resolve ScreenshotStorage (stateless)
      container ──► VisionServiceImpl   ctor  ──► resolve VisionModelConfig
                                                └─► useFactory → createVisionProvider(ModelClient♛)
      container ──► OcrServiceImpl      ctor  ──► resolve OcrModelConfig → createOcrProvider(ModelClient♛)
      container ──► ExecutionServiceImpl ctor ──► resolve ProcessRunner
      container ──► McpController       ctor  ──► 4 services + Mapper(createWireMapper, singleton)
  main.ts: new Server("browserlens", {tools:{}}) → setRequestHandler(ListTools, CallTool)
  main.ts: StdioServerTransport → await server.connect(transport) → listening on stdio
```

### Tool call (client → controller → mapper → service → infra)

```
MCP client ──► McpController.callTool("capture_screenshot", { full_page, output_path, delay_ms, ... })
  controller: screenshotSchema.parse(args)                        [snake validated, defaults applied]
  controller ──► Mapper.map(parsed, "ScreenshotWireArgs" → "ScreenshotArgs")   [snake→camel]
  controller ──► IBrowserService.captureScreenshot({ fullPage, outputPath, delayMs })
      service ──► IBrowserDriverService.getPage()                        [singleton page/context/browser]
      service ──► IScreenshotStorage.resolvePath(outputPath)      [mkdir + path resolution]
      service ──► driver.page.screenshot(path) / locator.screenshot
      service ──► sharp metadata+stats → { imagePath, width, height, blankLike, warning }  [camel]
  controller ──► Mapper.map(result, "ScreenshotResult" → "ScreenshotWireResult")  [camel→snake]
  controller ──► json(result, isError=false) → CallToolResult     [JSON.stringify(value, null, 2)]
  on throw ────► catch → json({error:true, message, details}, isError=true)
```

## Entrypoint / Build Changes

| File | Change |
|---|---|
| `scripts/bundle.mjs` | `entryPoints: ["src/main.ts"]`, `outfile: "dist/main.js"`; keep `packages: "external"`, `minify`, `target: node20`, `format: esm`, chmod 0o755 |
| `package.json` | `bin.browserlens` → `"./dist/main.js"`; `start` → `node dist/main.js`; `dev` → `tsx src/main.ts`; add deps: `tsyringe@^4.10.0`, `reflect-metadata@^0.2.2`, `@automapper/core@^9.0.2`, `@automapper/pojos@^9.0.2` |
| `tsconfig.json` | add `"experimentalDecorators": true` (tsc requires it for `@injectable`/`@inject`; esbuild transforms syntax). Do NOT add `emitDecoratorMetadata` (esbuild can't emit it; tokens don't need it) |

Keep the old `dist/mcpServer.js` buildable until the smoke test passes (rollback plan from proposal). Verify with `npm run typecheck`, `npm run build`, `npm start` (spec: Build Contract).

## Interfaces / Contracts

```ts
// shared/application/Services/IModelClientService.ts
export interface GenerateRequest { model: string; prompt: string; images?: string[]; format?: "json"; options?: Record<string, unknown>; }
export interface IModelClientService { generate(request: GenerateRequest): Promise<string>; unload?(model?: string): Promise<void>; } // unload added for shutdown; optional for OpenAI impl
```

```ts
// shared/application/Services/IProcessRunnerService.ts
export interface IProcessRunnerService { run(command: string, args: string[], opts: { cwd?: string; env?: Record<string,string>; shell?: boolean; timeoutMs?: number }): Promise<CommandResult>; }
```

`IImageProcessorService` (3 base64/sharp methods), `IScreenshotStorage` (2 path methods), `IBrowserDriverService` (page lifecycle + primitives: navigate, snapshot, click, fill, pressKey, waitFor, evaluate, screenshot, openInteractive, useHeadless, close) mirror current method signatures with camelCase params. Service interfaces (`IBrowserService`, `IVisionService`, `IOcrService`, `IExecutionService`) expose the same methods as today's classes, returning `ToolResult<T>` with camelCase models.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Type | Full graph compiles | `npm run typecheck` (`tsc --noEmit`) |
| Build | Entrypoint emits `dist/main.js` | `npm run build` + `npm start` boots and listens on stdio |
| Smoke (manual) | DI resolves; contract identical | MCP session: `browser_navigate` → `capture_screenshot` → `analyze_image` → `compare_images` → `extract_text` → `extract_markdown` → `execute_code`; verify 15 tools in `tools/list`, snake_case schemas, byte-identical JSON outputs |
| State | Singleton persistence | `browser_evaluate` set var → second `browser_evaluate` reads it (same page) |

No test runner (config: `strict_tdd: false`); verification is typecheck + build + smoke per `verify` rules.

## Migration / Rollout

No data/schema migration. Implement in dependency order (per master plan): deps install → `shared/` → `execution/` → `browser/` → `vision/` + `ocr/` → `mcp/` → `container.ts` + `main.ts` → bundle/package/tsconfig updates → build + smoke. Rollback: revert `feat/clean-architecture` to last green commit; flat `src/` remains functional; old entrypoint stays buildable until smoke passes.

## Open Questions

None blocking — all decisions locked via ADR-1..10. Minor implementation detail delegated to sdd-tasks: exact per-tool `PojosMetadataMap` entries for nested shapes (viewport, issues, blocks, elements).
