# Feature: Refactor a Clean Architecture + DI

> Estado del pipeline SDD: propuesta/spec/design/tasks pendientes → apply → verify → archive
> Rama: `feat/clean-architecture`

## Resumen

Refactorizar la estructura interna de BrowserLens hacia clean architecture por slices con DI (tsyringe), mappers (@automapper v9) y composition root. **Sin cambio de comportamiento ni del contrato MCP**: mismo set de tools, mismos schemas snake_case, mismas salidas JSON.

## Alcance

### Incluye
- Reorganizar `src/` en slices: `browser`, `vision`, `ocr`, `execution`, `mcp`, `shared`.
- DI con tsyringe (tokens explícitos) + `reflect-metadata`.
- Composition root: `src/main.ts` + `src/container.ts`.
- Mappers con @automapper v9 (`pojos()`) y wire snake⇄camel en `mcp/mappers/`.
- Build: mantener esbuild bundle single-file.
- Documentación en `docs/` y artefactos SDD en `openspec/`.

### Excluye
- Cambios al protocolo MCP (nombres de tools, schemas, formato JSON).
- Cambios de providers/config (ya soportados: ollama, openai, custom).
- Migración de test runner (no existe; `strict_tdd: false`).
- Cambios de build pipeline (esbuild se mantiene).

## Criterios de aceptación

- [ ] `npm run typecheck` pasa sin errores.
- [ ] `npm run build` genera `dist/mcpServer.js` correctamente.
- [ ] Las tools MCP siguen funcionando end-to-end (navigate, screenshot, analyze, extract, execute).
- [ ] Contrato MCP idéntico (mismos tool names y schemas).
- [ ] DI resuelve en runtime (no solo en types): el server arranca y responde.
- [ ] Singleton stateful correcto (BrowserDriver, ModelClient persisten por sesión).

## Fuentes de decisión

- `docs/plan/refactor-clean-architecture.md` (plan maestro).
- `docs/notes/DI-tokens-esbuild.md`, `docs/notes/automapper-v9.md`.
- Artefactos SDD: `openspec/changes/clean-architecture-refactor/`.
