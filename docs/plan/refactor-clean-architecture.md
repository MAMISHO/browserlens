# Plan maestro: Refactor a Clean Architecture + DI

> Estado: **en ejecución** · Rama: `feat/clean-architecture` · Última actualización: 2026-08-08

## Objetivo

Refactorizar BrowserLens de un `src/` plano (11 archivos, 1823 líneas) hacia una clean architecture por **slices** con DI (tsyringe), mappers (@automapper v9) y composition root, sin cambiar el contrato del protocolo MCP (tools, nombres y esquemas snake_case quedan idénticos).

## Contexto actual (antes del refactor)

```
src/
  mcpServer.ts          (427)  # MCP server + schemas zod + instanciación manual (líneas 106-110)
  playwrightService.ts  (425)  # control de navegador (Playwright)
  visionService.ts      (279)  # análisis visual
  ocrService.ts         (138)  # extracción de texto/markdown
  ollamaClient.ts       (156)  # cliente Ollama
  chatCompletionsClient.ts (65)  # cliente OpenAI/custom
  providerConfig.ts     ( 87)  # selección de provider por env var
  executeService.ts     ( 53)  # ejecución de comandos locales
  imageUtils.ts         ( 76)  # imagen → base64, contact sheet
  screenshotStorage.ts  ( 64)  # resolución de rutas de screenshots
  types.ts              ( 21)  # tipos compartidos
```

Ciclo de vida MCP: el server se spawn **una vez** y vive toda la sesión (StdioServerTransport, JSON-RPC por stdin/stdout, muere por SIGTERM/SIGINT/EOF). Es un proceso **long-running con estado** — NO stateless como HTTP. PlaywrightService/OllamaClient se instancian a nivel de módulo.

## Decisiones de diseño (validadas con el usuario)

| # | Tema | Decisión |
|---|---|---|
| D1 | Capa de aplicación | Se llama `application/` (NO "useCases"); servicios con interfaz + impl en `application/Services/` + `Services/impl/*ServiceImpl.ts` |
| D2 | Capa de infraestructura | Se llama `infra/` (NO "infrastructure") |
| D3 | Terminología | Evitar términos hexagonales (ports/adapters); usar "interfaces" e "infra" |
| D4 | Interfaz por paquete/capa | Cada slice exporta interfaces vía `index.ts` |
| D5 | DI | tsyringe con `InjectionToken<T>` explícitos + `@inject(TOKEN)` + `import "reflect-metadata"` |
| D6 | Build | esbuild bundle actual (sin cambios en `scripts/bundle.mjs`) |
| D7 | Mappers | @automapper v9, estrategia `pojos()`, `namingConventions` snake⇄camel |
| D8 | Mappers wire | Conversión snake_case (protocolo MCP) ⇄ camelCase (interno) SOLO en `mcp/mappers/` |
| D9 | Puertos compartidos | Interfaces en `shared/application/Repositories/`; impls en `shared/infra/` |
| D10 | Repositorios | Solo interfaces en `application/Repositories/`; impls en `infra/` (dominio anémico intencional) |
| D11 | Composition root | `src/main.ts` (bootstrap) + `src/container.ts` (registros DI en orden de dependencia) |
| D12 | Slice | Cada slice: `domain/` + `application/` + `infra/` |
| D13 | Persistencia SDD | hybrid: `openspec/` (archivos) + Engram (memoria) |
| D14 | Verificación | Sin test runner → `strict_tdd: false`; usar `tsc --noEmit` + build + smoke test MCP |

## Gotchas técnicos (verificados por ejecución)

1. **esbuild NO emite `emitDecoratorMetadata`** por diseño (doc oficial). Solo transforma la sintaxis de decorators con `experimentalDecorators`. → tokens explícitos obligatorios para DI por interfaces.
2. **Verificado**: esbuild transforma `@injectable()` y `@inject(TOKEN)` correctamente (`__decorateClass` + `__decorateParam`). La Opción 1 funciona con el build actual.
3. **Interfaces se borran en runtime** — incluso con metadata, tsyringe no resolvería una interfaz por tipo; el token es imprescindible.
4. **tsyringe 4.10.0** es dual CJS/ESM → interop OK con bundle ESM (`packages: external`).
5. **@automapper/pojos** no usa decorators en runtime (solo `PojosMetadataMap.create`) → sin conflicto con esbuild.
6. **Node 26** tiene type-stripping nativo pero es INCOMPATIBLE con tsyringe (no ejecuta decorators) → descartado como opción de build.
7. Config 100% env vars (`process.env`); `browserlens-config.example.json` es documentation-only (sin loader).
8. `packages: "external"` en bundle → tsyringe/reflect-metadata/automapper se importan de node_modules en runtime (igual que playwright/zod/openai hoy).

## Estructura target

```
src/
  main.ts                # bootstrap MCP: import "reflect-metadata" + crear server + StdioServerTransport
  container.ts           # composition root tsyringe: registros por orden de dependencia
  shared/
    application/
      Repositories/      # SOLO persistencia: IScreenshotStorage
      Services/          # puertos infra: IModelClientService, IImageProcessorService, IProcessRunnerService
    infra/               # impls: ImageProcessor, ScreenshotStorage (y helpers compartidos)
  mcp/
    controller.ts        # registra tools, maneja callTool (schemas zod snake_case)
    schemas.ts           # zod schemas = contrato del protocolo (snake_case)
    mappers/             # wire: snake_case ⇄ camelCase (automapper namingConventions)
    tokens.ts            # tokens DI del slice mcp
  browser/               # slice: control de navegador
    domain/models/       # BrowserSession, PageSnapshot, ElementInfo
    application/Services/         browser.service.ts (interfaz) + impl/BrowserServiceImpl.ts
    application/DTOs/             application/Mappers/
    infra/               # BrowserDriver (impl Playwright) — singleton stateful
  vision/                # slice: análisis visual
    domain/models/       # VisionAnalysis, VisionIssue, Severity, Screenshot
    application/Services/         vision.service.ts + impl/VisionServiceImpl.ts
    application/DTOs/             application/Mappers/
    infra/               # ModelClient impls (ollama + chatCompletions según provider)
  ocr/                   # slice: extracción
    domain/models/       # ExtractedText, ExtractedMarkdown
    application/Services/         ocr.service.ts + impl/OcrServiceImpl.ts
    application/DTOs/             application/Mappers/
    infra/               # OCR impl
  execution/             # slice: comandos locales
    domain/models/       # CommandResult
    application/Services/         execution.service.ts + impl/ExecutionServiceImpl.ts
    application/DTOs/
    infra/               # ProcessRunner
```

## Mapeo archivos actuales → destino

| Actual | Destino |
|---|---|
| `mcpServer.ts` (427) | `main.ts` (bootstrap) + `mcp/controller.ts` + `mcp/schemas.ts` + `mcp/mappers/` |
| `playwrightService.ts` (425) | `browser/infra/` (impl) + interfaces/DTOs |
| `visionService.ts` (279) | `vision/application/Services/impl/` |
| `ocrService.ts` (138) | `ocr/application/Services/impl/` |
| `ollamaClient.ts` + `chatCompletionsClient.ts` (221) | `vision/infra/` (ModelClient impls por provider) |
| `providerConfig.ts` (87) | Composición en `container.ts` / `shared/infra` |
| `executeService.ts` (53) | `execution/` |
| `imageUtils.ts` (76) | `shared/infra/ImageProcessor` |
| `screenshotStorage.ts` (64) | `shared/infra/ScreenshotStorage` |
| `types.ts` (21) | `vision/domain/models/` (Severity, VisionIssue, VisionAnalysis) + `shared` |

## Orden de implementación

1. Instalar deps: `tsyringe`, `reflect-metadata`, `@automapper/core`, `@automapper/pojos`.
2. `shared/` (interfaces + impls) — base de todo.
3. `execution/` (la más simple, sin ModelClient).
4. `browser/` (stateful singleton).
5. `vision/` + `ocr/` (consumen IModelClientService compartido).
6. `mcp/` (schemas, mappers wire, controller).
7. `container.ts` + `main.ts` (composition root + bootstrap).
8. Ajustar entrypoint del bundle si renombramos `mcpServer.ts` → `main.ts`.
9. Build + smoke test MCP (navigate/screenshot/analyze).

## Verificación (sin test runner)

- `npm run typecheck` (`tsc --noEmit`).
- `npm run build` (tsc --emitDeclarationOnly + esbuild bundle).
- Smoke test real: levantar el MCP y ejercitar las tools (browser_navigate, capture_screenshot, analyze_image) en opencode.
- Contrato MCP sin cambios: mismo set de tools, mismos schemas snake_case.

## Fuentes

- Análisis de referencias: `/Users/mamisho/dev/ia/rag-llm-nestjs/app-medicines` (NestJS, evolución) y `/Volumes/NVMe/dev/references/rempe-nomenclator` (tsyringe original: `loader.ts` + `index.ts` como composition root, tokens string `'IProductDAO'`, core de mappers con automapper).
- Patrón de las refs que NO replicar: controller importando instancias resueltas desde loader.ts (acoplamiento controller→loader).
- Artefactos SDD: `openspec/changes/clean-architecture-refactor/`.
