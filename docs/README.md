# Documentación de BrowserLens

Índice de la documentación del proyecto. El pipeline de cambios usa SDD (Spec-Driven Development) con gentle-ai — ver `notes/sdd-workflow.md`.

## Planes

- `plan/refactor-clean-architecture.md` — Plan maestro del refactor hacia clean architecture + DI. Estado: en ejecución (rama `feat/clean-architecture`).

## Features

- `features/clean-architecture-refactor.md` — Feature SDD del refactor: alcance, criterios de aceptación y estado del pipeline.

## Notas de desarrollo

- `notes/DI-tokens-esbuild.md` — Gotcha `emitDecoratorMetadata` con esbuild y la solución con tokens explícitos.
- `notes/automapper-v9.md` — Decisión del patrón de mappers (@automapper v9, `pojos()` + `namingConventions`).
- `notes/sdd-workflow.md` — Cómo usamos SDD en este repo: fases, artefactos y delegación de subagentes.

## Arquitectura

- `ARCHITECTURE.md` — Arquitectura del sistema. Se actualiza al cierre de cada feature/refactor.

## Pipeline SDD (resumen)

Los artefactos operativos del pipeline viven en `openspec/` (source of truth) y en Engram (recuperación cross-session). Cada fase produce un artefacto:

| Fase | Subagente | Artefacto |
|---|---|---|
| init | `sdd-init` | `openspec/config.yaml` |
| propose | `sdd-propose` | `openspec/changes/{change}/proposal.md` |
| spec | `sdd-spec` | `openspec/changes/{change}/specs/...` |
| design | `sdd-design` | `openspec/changes/{change}/design.md` |
| tasks | `sdd-tasks` | `openspec/changes/{change}/tasks.md` |
| apply | `sdd-apply` | Implementación + marca tareas |
| verify | `sdd-verify` | `verify-report.md` |
| archive | `sdd-archive` | Merge specs + cierre |

## Convenciones del repo

- Commits conventional (ver CONTRIBUTING.md).
- Sin test runner ni linter configurados → `strict_tdd: false`; verificación con `tsc --noEmit` + build + smoke test.
- Build: esbuild bundle single-file (`scripts/bundle.mjs`), deps externas.
