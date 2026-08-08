# Tasks: Clean Architecture Refactor (DI + Slices)

> Change: `clean-architecture-refactor` · Phase: tasks · Branch: `feat/clean-architecture` · Date: 2026-08-08

## Review Workload Forecast

Estimated changed lines: ~4,000 (1,823 deleted + ~2,200 new across ~53 files).

Decision needed before apply: No (resolved: work-unit-commits-no-pr)
Chained PRs recommended: No (resolved by user: commits per work unit, NO PRs)
Chain strategy: work-unit-commits-no-pr
400-line budget risk: High (accepted: commits per work unit in feat/clean-architecture)

Commit units: U1 P0+P1 · U2 P2+P3 · U3 P4 · U4 P5 · U5 P6+P7 (switchover; rollback = git revert) · U6 P8.

**Global acceptance** (all tasks): file exists + `npm run typecheck` green (old flat src stays green until 7.2); moves are contract-preserving. Tree-wide green from 2.1 — 1.2's IProcessRunner type-only imports CommandResult.

## Phase 0: Foundation (deps + tsconfig)

- [ ] 0.1 package.json deps: tsyringe@^4.10.0, reflect-metadata@^0.2.2, @automapper/core@^9.0.2, @automapper/pojos@^9.0.2. (ADR-2, ADR-3)
- [ ] 0.2 tsconfig.json: `experimentalDecorators: true`; NOT emitDecoratorMetadata. (ADR-1, ADR-7)

## Phase 1: shared/ (ports + shared infra)

- [x] 1.1 `shared/tokens.ts`: SHARED_TOKENS — ImageProcessor, ScreenshotStorage, ModelClient, ProcessRunner. (ADR-1)
- [x] 1.2 `shared/application/Services/`: IModelClientService.ts (GenerateRequest, ProviderKind, generate + optional unload), IImageProcessorService.ts, IProcessRunnerService.ts + `Repositories/IScreenshotStorage.ts`. (D9/D10, Slice Layout; ports to infra go in Services/, only persistence stays in Repositories/)
- [x] 1.3 `shared/application/models/`: ToolResult.ts (ToolResult\<T\>, StructuredError), ProviderSelection.ts ({ client, model, provider }). 
- [x] 1.4 `shared/infra/`: ImageProcessor.ts (sharp trio, from imageUtils.ts) + ScreenshotStorage.ts (from screenshotStorage.ts). (D9)
- [x] 1.5 `shared/infra/providerConfig.ts`: createVisionProvider/createOcrProvider(client: IModelClientService) + selectedProvider/isEnabled (from modelClient.ts); `shared/index.ts`. (ADR-9)

## Phase 2: execution/

- [x] 2.1 `execution/tokens.ts` (ExecutionService) + `domain/models/CommandResult.ts` (exitCode, stdout, stderr, timedOut). (D10)
- [x] 2.2 `application/DTOs/execution.dto.ts` (ExecuteCodeInput: timeoutMs, env, shell) + `Services/execution.service.ts` (IExecutionService → ToolResult\<CommandResult\>).
- [x] 2.3 `infra/ProcessRunner.ts` (spawn impl, from executeService.ts).
- [x] 2.4 `Services/impl/ExecutionServiceImpl.ts` (@injectable; @inject ProcessRunner) + `execution/index.ts`.

## Phase 3: browser/

- [x] 3.1 `browser/tokens.ts` (BrowserService, BrowserDriver) + `domain/models/BrowserModels.ts` (PageSnapshot, ElementInfo.ariaLabel, ScreenshotResult camelCase).
- [x] 3.2 `application/DTOs/browser.dto.ts` (10 arg types, camelCase).
- [x] 3.3 `application/Services/IBrowserDriverService.ts` (lifecycle + primitives) + `Services/browser.service.ts` (IBrowserService: 11 methods incl. close()).
- [x] 3.4 `Services/impl/BrowserServiceImpl.ts` (@injectable; @inject BrowserDriver + ScreenshotStorage + ImageProcessor; logic from playwrightService.ts). (ADR-5)
- [x] 3.5 `infra/BrowserDriver.ts` (stateful Playwright impl — SINGLETON) + `browser/index.ts`.

## Phase 4: vision/ + ocr/

- [x] 4.1 `vision/tokens.ts` (VisionService, VisionModelConfig: ProviderSelection) + `domain/models/VisionModels.ts` (Severity, VisionIssue, VisionAnalysis, from types.ts).
- [x] 4.2 `application/DTOs/vision.dto.ts` + `Services/vision.service.ts` (IVisionService: analyzeImage, compareImages).
- [x] 4.3 `Services/impl/VisionServiceImpl.ts` (@injectable; @inject VisionModelConfig + ImageProcessor; prompts/retry/fallback, from visionService.ts).
- [x] 4.4 `application/Mappers/visionModel.mapper.ts` (zod .transform: LLM snake JSON → camelCase VisionAnalysis; no automapper).
- [x] 4.5 `infra/`: OllamaClientImpl.ts (queue/activeModel/unload, from ollamaClient.ts) + ChatCompletionsClientImpl.ts (from chatCompletionsClient.ts) + `vision/index.ts`.
- [x] 4.6 `ocr/tokens.ts` (OcrService, OcrModelConfig) + `domain/models/OcrModels.ts` + `application/DTOs/ocr.dto.ts` + `Services/ocr.service.ts` (IOcrService).
- [x] 4.7 `Services/impl/OcrServiceImpl.ts` (@injectable; @inject OcrModelConfig + ImageProcessor; prompts/fence-strip, from ocrService.ts) + `ocr/index.ts`.

## Phase 5: mcp/

- [ ] 5.1 `mcp/tokens.ts` (Mapper: InjectionToken\<Mapper\>, McpController).
- [ ] 5.2 `mcp/schemas.ts`: 15 zod schemas VERBATIM snake_case from mcpServer.ts. Accept: diff zero. (ADR-8, MCP Contract)
- [ ] 5.3 `mcp/toolDefinitions.ts`: 15 {name, description, inputSchema} VERBATIM from mcpServer.ts ListTools. Accept: diff zero. (ADR-8)
- [ ] 5.4 `mcp/formatter.ts`: json(value, isError=false) → CallToolResult (preserved semantics).
- [ ] 5.5 `mcp/mappers/wireMetadata.ts` (PojosMetadataMap.create all wire⇄internal pairs, nested shapes) + `wireMapper.ts` (createWireMapper: pojos, snake⇄camel, createMap per pair). (ADR-3/4/10)
- [ ] 5.6 `mcp/mappers/{browser,vision,ocr,execute}.mapper.ts`: per-tool wire fns; StructuredError short-circuit. (ADR-4)
- [ ] 5.7 `mcp/controller.ts`: McpController (@injectable; 4 services + Mapper; listTools → TOOL_DEFINITIONS; callTool: parse → map → service → map → json; unknown-tool error) + `mcp/index.ts`. Deps: 5.2–5.6. (ADR-6, DI Wiring)

## Phase 6: Composition root

- [ ] 6.1 `container.ts`: export container; order shared infra → ModelClient (OllamaClientImpl, Singleton) → Vision/OcrModelConfig (useFactory → createProvider(resolve(ModelClient))) → BrowserDriver (Singleton) + BrowserService → vision/ocr/execution services → Mapper (useFactory, Singleton) → McpController. (ADR-2/5/9/10)
- [ ] 6.2 `main.ts`: reflect-metadata FIRST; resolve McpController (fail-fast); Server("browserlens") + ListTools/CallTool → controller; stdio connect; SIGINT/SIGTERM: browser.close() + modelClient.unload?.() + exit. (ADR-6, DI Wiring)

## Phase 7: Entrypoint/build + cleanup

- [ ] 7.1 `scripts/bundle.mjs`: src/main.ts → dist/main.js (keep external/minify/chmod); package.json: bin/start/dev → main.ts. (ADR-7, Build Contract)
- [ ] 7.2 Delete 12 flat src files (mcpServer, playwrightService, visionService, ocrService, ollamaClient, chatCompletionsClient, providerConfig, executeService, imageUtils, screenshotStorage, modelClient, types). Accept: no dangling imports; rollback = git revert. (Slice Layout)

## Phase 8: Verification

- [ ] 8.1 `npm run typecheck` green on whole tree. (Build Contract)
- [ ] 8.2 `npm run build` → dist/main.js; `npm start` boots on stdio, no tsyringe resolve errors; unregister a token → boot fails fast. (Build Contract, DI Wiring)
- [ ] 8.3 Smoke: 15 tools listed; navigate → capture_screenshot → analyze_image → compare_images → extract_text → extract_markdown → execute_code (snake_case schemas, byte-identical JSON); singleton: browser_evaluate set var persists across calls. (MCP Contract, Singleton Semantics)
