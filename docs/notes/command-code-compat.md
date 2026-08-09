# Compatibilidad MCP multi-cliente + hallazgo de entrypoint stale

> Fecha: 2026-08-09 · Change: `command-code-compat`

## BrowserLens es un MCP estándar

El servidor (`src/main.ts`) usa el SDK oficial `@modelcontextprotocol/sdk` con `Server` + `StdioServerTransport`. El protocolo MCP es agnóstico del cliente: funciona igual en OpenCode, Command Code, Claude Code, etc. No hay código acoplado a ningún cliente — `opencode` solo aparece en `README.md` como sección de configuración del cliente.

## Hallazgo: path stale del entrypoint en la config de opencode

La config de usuario `~/.config/opencode/opencode.json` define el MCP `browserlens` como:

```json
{ "command": ["node", "/Users/mamisho/dev/ia/browserlens/dist/mcpServer.js"], "type": "local" }
```

Tras el refactor a clean architecture el entrypoint es `dist/main.js` (ver `scripts/bundle.mjs` y `bin` en `package.json`), así que ese path está roto. Esa config no tiene bloque `env`, por lo que BrowserLens usa los defaults del código para cablear con Ollama y la visión local: `OLLAMA_BASE_URL=http://localhost:11434`, `VISION_MODEL=qwen3-vl:8b`, `OCR_MODEL=deepseek-ocr`.

`opencode.json` está fuera del repo; el README ya apunta a `dist/main.js`. Actualizar la config de usuario queda a decisión del usuario (fuera del alcance del change).

## Verificación en Command Code

El change añade `scripts/smoke-mcp.mjs` (`npm run smoke`, sin deps) y verifica el cableado real en Command Code con `cmd mcp add --scope project browserlens -- node .../dist/main.js` + `/mcp`.
