# Contributing

Thanks for helping improve BrowserLens.

## Local Setup

```bash
npm install
npx playwright install chromium
npm run typecheck
npm run build
```

Run locally:

```bash
npm run dev
```

Run the built server:

```bash
npm start
```

## Development Standards

- Keep the MCP layer thin: validate input, call a service, return structured JSON.
- Put filesystem, browser, network, and process details behind focused modules.
- Use native TypeScript types and keep `strict` mode clean.
- Prefer Zod schemas for external input.
- Do not commit `node_modules`, `dist`, local screenshots, `.env`, or generated debug artifacts.
- Update README or docs when public behavior changes.

## Pull Request Checklist

```bash
npm run typecheck
npm run build
npm pack --dry-run
```

Also describe:

- what changed
- how you tested it
- any compatibility or migration notes

## Improvement Roadmap

- Add unit tests for path resolution, schema validation, and JSON parsing retries.
- Add CI for install, typecheck, build, and package dry-run.
- Add browser launch configuration for headed mode and remote debugging.
- Add optional command policies for stricter execution environments.
- Add provider adapters beyond Ollama without changing MCP tool contracts.
