# Nota técnica: DI con tsyringe + esbuild (tokens explícitos)

> Fecha: 2026-08-08 · Tipo: decisión/gotcha

## Problema

El pipeline de build usa **esbuild** (single-file bundle, `packages: external`). esbuild **no soporta `emitDecoratorMetadata`** por diseño (requiere el type checker completo de tsc, ver issue esbuild #3680). Sin eso, tsyringe no puede resolver dependencias por tipo en runtime (`design:paramtypes` ausente).

Capa más profunda: aunque hubiera metadata, **las interfaces de TypeScript se borran en runtime** — no hay forma de resolver `IModelClient` por tipo. El token es imprescindible de todas formas.

## Verificado por ejecución

```
esbuild transformSync(loader: 'ts', experimentalDecorators: true)
→ emite __decorateClass + __decorateParam con @inject("IFoo")
```

esbuild transforma la **sintaxis** de decorators correctamente; solo no emite los `design:paramtypes`.

## Solución adoptada (Opción 1)

```ts
import { injectable, inject } from "tsyringe";
import "reflect-metadata"; // en main.ts, ANTES de todo

@injectable()
class VisionServiceImpl implements IVisionService {
  constructor(@inject(TOKENS.ModelClient) private modelClient: IModelClientService) {}
}
```

- Tokens: `InjectionToken<Interfaz>` tipados (o string, como `'IProductDAO'` en la referencia rempe).
- Registro en `container.ts` con `container.register(TOKEN, { useClass: Impl })`.
- `reflect-metadata` es requisito **siempre** de tsyringe (aunque uses `@inject` explícito — issue tsyringe #180).
- tsyringe 4.10.0 es dual CJS/ESM → interop OK con el bundle ESM.

## Alternativas descartadas

| Opción | Por qué no |
|---|---|
| Plugin `@anatine/esbuild-decorators` | Corre tsc por archivo → mata la performance de esbuild |
| Build con tsc puro | Pierde bundle single-file + `packages: external` |
| Node nativo type-stripping | Incompatible con tsyringe (no ejecuta decorators), rompe `engines: >=20` |
| Awilix | Resuelve por nombre de parámetro (frágil), rompe patrón de refs |
| Composition root manual | Cero DI real, contradice lo acordado |

## Referencia

- Doc esbuild: `emitDecoratorMetadata` no soportado (content-types#typescript).
- tsyringe issue #180 (uso sin Reflect) y issue esbuild #3680.
