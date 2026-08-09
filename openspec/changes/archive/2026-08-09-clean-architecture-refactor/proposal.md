# Proposal: Refactor a Clean Architecture + DI

## Intent

Flat `src/` monolith (12 files, 1823 lines): services wire each other at module level, the MCP server self-instantiates, and provider selection is scattered. Refactor to clean architecture by slices with DI (tsyringe), mappers (@automapper v9), and a composition root. **Zero behavior change**: MCP contract (tools, snake_case schemas, JSON outputs) stays identical.

## Scope

### In Scope
- Slice `src/` into `browser`, `vision`, `ocr`, `execution`, `mcp`, `shared`.
- DI: tsyringe, explicit `InjectionToken<T>`, `@inject(TOKEN)`, `import "reflect-metadata"`.
- Composition root: `src/main.ts` (bootstrap) + `src/container.ts` (dependency-ordered registrations).
- Mappers: @automapper v9 `pojos()` + namingConventions; wire snake⇄camel ONLY in `mcp/mappers/`.
- Shared ports: interfaces in `shared/application/Repositories/`, impls in `shared/infra/`.
- Entrypoint rename `mcpServer.ts` → `main.ts`; update `package.json` + `scripts/bundle.mjs`.
- Add deps: tsyringe@^4.10.0, reflect-metadata@^0.2.2, @automapper/core@^9.0.2, @automapper/pojos@^9.0.2.
- Singletons: BrowserDriver, ModelClient (MCP server is long-running with state).

### Out of Scope
- MCP protocol changes (tool names, schemas, JSON format).
- Provider/config changes (ollama/openai/custom already supported).
- Test runner (none exists; `strict_tdd: false`).
- Build pipeline beyond entrypoint (single-file esbuild bundle, `packages: external` kept).
- Hexagonal naming — we use interfaces/infra.

## Capabilities

> Contract for sdd-spec. `openspec/specs/` currently has no specs.

### New Capabilities
None — pure internal refactor, no new user-facing behavior.

### Modified Capabilities
None — MCP contract unchanged; no spec-level requirement changes.

## Approach

Migrate files into slices in dependency order (shared → execution → browser → vision/ocr → mcp → container/main), then build + smoke test. DI uses explicit tokens because esbuild cannot emit `emitDecoratorMetadata` (verified); `container.ts` registers by dependency order. Snake⇄camel wire mapping lives only at the MCP boundary; internal slices stay camelCase.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/` (12 files) | Modified | Split into slices; `mcpServer.ts` → `main.ts` + `container.ts` |
| `src/shared/` | New | Ports interfaces + shared infra impls |
| `src/{browser,vision,ocr,execution,mcp}/` | New | domain/models, application/{Services,DTOs,Mappers,Repositories}, infra |
| `package.json` | Modified | Deps + bin/dev/start entrypoint |
| `scripts/bundle.mjs` | Modified | Entrypoint → `main.ts` |
| `docs/`, `openspec/` | Modified | Docs + SDD artifacts |

### DI impact
Explicit `InjectionToken<T>` everywhere; `container.ts` registers `useClass`; BrowserDriver/ModelClient registered as singletons.

### Mapper impact
@automapper v9 `pojos()` with snake⇄camel namingConventions used ONLY in `mcp/mappers/`.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| DI misregistration → runtime resolve errors | Med | `container.ts` dependency-ordered; smoke test every tool |
| MCP schema drift (snake_case) | Med | Schemas moved verbatim to `mcp/schemas.ts`; verify tool list + JSON outputs |
| Singleton state lost (new browser per call) | Med | Register BrowserDriver/ModelClient singleton; test session persistence |
| esbuild decorator transform fails | Low | Transform verified; explicit tokens need no metadata |

## Rollback Plan

Revert `feat/clean-architecture` to the last green commit (`git revert` or checkout `src/`, `package.json`). Flat `src/` and manual wiring remain fully functional — no schema or data migration involved. Keep the old entrypoint buildable until the smoke test passes.

## Dependencies

- Add: tsyringe@^4.10.0, reflect-metadata@^0.2.2, @automapper/core@^9.0.2, @automapper/pojos@^9.0.2 (runtime; bundle keeps `packages: external`).
- Existing: @modelcontextprotocol/sdk, playwright, sharp, openai, zod (unchanged).

## Success Criteria

- [ ] `npm run typecheck` passes.
- [ ] `npm run build` emits `dist/main.js`; `npm start` boots the MCP server.
- [ ] Smoke test: navigate, screenshot, analyze, extract, execute work end-to-end.
- [ ] MCP contract identical (tool names, snake_case schemas, JSON outputs).
- [ ] DI resolves at runtime (server starts and responds).
- [ ] Stateful singletons persist across calls in one session.
