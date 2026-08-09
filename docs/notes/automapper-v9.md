# Nota técnica: @automapper v9 como patrón de mappers

> Fecha: 2026-08-08 · Tipo: decisión

## Contexto

Las apps de referencia (`rempe-nomenclator`, `app-medicines`) usan @automapper con un `MapperService` singleton en el core (estrategias `classes()` + `pojos()`, metadata + `createMap`). El usuario prefiere automapper para **tener control sobre la evolución** de los mappers, pero preguntaba si las versiones nuevas mejoraron la generalización.

## Estado actual (investigado)

Versión actual: **@automapper 9.0.2** (jul 2026). Node 26.4.0 y `"type": "module"` en package.json → compatible (v9 es ESM-only, requiere Node 20+).

Mejoras de v9 vs. las versiones de las refs:

- **Real async mapping**: `mapAsync`/`mapArrayAsync`/`mutateAsync` resuelven promises en `mapFrom`, `beforeMap`, `afterMap`. (En v8 el async era fake/deferred.)
- **Errores tipados**: `AutoMapperError`, `MapMemberError` (con `memberPath`, `destinationName`).
- **AutoMapperLogger** configurable (`log/info/warn/error/...`, `configure()` restaurable).
- **v8+**: `createMapper({ strategyInitializer: pojos() })` (ya no `pluginInitializer`); `createMap` como función standalone; `PojosMetadataMap.create<T>` reemplaza `createMetadataMap`.
- **Identificadores de clase más amplios** (abstract classes, constructores no públicos).

## La generalización clave para nosotros: namingConventions

El caso wire (snake_case del protocolo MCP ⇄ camelCase interno) se resuelve **automáticamente por convención**, sin `forMember` por campo:

```ts
import { SnakeCaseNamingConvention, CamelCaseNamingConvention } from "@automapper/core";

createMap(
  mapper, SourceDto, TargetDto,
  namingConventions({
    source: new SnakeCaseNamingConvention(),
    destination: new CamelCaseNamingConvention(),
  })
);
```

## Decisión

- Estrategia **`pojos()`**: nuestros DTOs y modelos son interfaces/plain objects → `PojosMetadataMap.create<T>('Token', {...})` declara la metadata.
- **`pojos()` no usa decorators en runtime** → sin conflicto con esbuild (a diferencia de `classes()` con `@AutoMap()` sin argumento, que dependería de `design:type` que esbuild no emite).
- Si algún día se usa `classes()`, usar `@AutoMap(() => T)` con typeFn explícito.
- Singleton del mapper: `export const mapper = createMapper({ strategyInitializer: pojos() })`, registrado vía DI (reemplaza el `MapperService` de las refs).

## Dependencias a instalar

```
@automapper/core@^9.0.2
@automapper/pojos@^9.0.2
```

## Referencia

- docs: automapperts.netlify.app (migrate-v9, naming-conventions, pojos strategy)
- npm: @automapper/core@9.0.2
