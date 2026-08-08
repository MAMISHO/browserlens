# SDD Workflow — BrowserLens

Cómo usamos SDD (Spec-Driven Development) con gentle-ai en este repo.

## Modo de persistencia

**hybrid**: cada artefacto SDD se persiste en `openspec/` (source of truth, git, shareable) Y en Engram (`sdd/{change}/{tipo}`, `capture_prompt: false` — recuperación cross-session y sobrevive compactaciones).

## Regla de delegación

Para mantener estable la ventana de contexto del orchestrator, **toda implementación y verificación se delega a subagentes**. El orchestrator:
- Crea documentación humana en `docs/` (tiene el contexto completo).
- Coordina fases, inyecta skills, integra resultados y persiste DAG state.
- NO implementa ni verifica código directamente.

## Fases y artefactos

| Fase | Subagente | Lee | Escribe |
|---|---|---|---|
| init | `sdd-init` | proyecto | `openspec/config.yaml`, contexto, `strict_tdd` |
| explore (opcional) | `sdd-explore` | — | `exploration.md` |
| propose | `sdd-propose` | contexto | `proposal.md` |
| spec | `sdd-spec` | proposal | `specs/{domain}/spec.md` (Given/When/Then) |
| design | `sdd-design` | specs | `design.md` |
| tasks | `sdd-tasks` | design | `tasks.md` |
| apply | `sdd-apply` | tasks | marca `[x]` en `tasks.md` + código |
| verify | `sdd-verify` | todo | `verify-report.md` |
| archive | `sdd-archive` | verify | merge specs + mueve a `archive/` |

## Estructura openspec

```
openspec/
  config.yaml
  specs/{domain}/spec.md          # specs principales (fuente de verdad)
  changes/{change-name}/
    state.yaml                    # DAG state (sobrevive compaction)
    proposal.md  design.md  tasks.md  verify-report.md
    specs/{domain}/spec.md        # delta spec
  changes/archive/                # cambios completados (fechados)
```

## Estado del DAG

El orchestrator persiste `state.yaml` (y `sdd/{change}/state` en Engram) tras cada transición de fase. Recuperación tras compactación: `mem_search("sdd/{change}/state")` → `mem_get_observation(id)`.

## Convenciones Engram para artefactos SDD

```
title:     sdd/{change-name}/{artifact-type}
topic_key: sdd/{change-name}/{artifact-type}
type:      architecture
project:   browserlens
scope:     project
capture_prompt: false
```

## Estado del proyecto

- Test runner: **ninguno** → `strict_tdd: false`.
- Verificación: `npm run typecheck` + `npm run build` + smoke test MCP.
- Change activo: `clean-architecture-refactor` (rama `feat/clean-architecture`).
