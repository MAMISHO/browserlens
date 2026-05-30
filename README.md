# BrowserLens

BrowserLens is a production-oriented Model Context Protocol server that gives AI agents browser control and local visual understanding.

It solves a practical gap in agentic browser work: many browser-control MCPs need screenshots for verification, but text-only agents cannot consume those screenshots directly, and multimodal agents can burn many tokens when every visual check is sent to the main model. BrowserLens lets agents navigate pages, inspect DOM, take timestamped screenshots, compare rendered images, extract OCR text, and convert images to Markdown through local Ollama models. The main agent receives compact JSON or Markdown, not raw image payloads.

This project has been tested successfully in workflows where a fast text-only model, such as **DeepSeek V4 Flash** or the local Gemma setup used during development, acts as the main agent and BrowserLens delegates visual interpretation to local Ollama models.

It provides:

- local command execution with bounded timeouts
- Playwright-based browser navigation, DOM snapshots, clicks, input, key presses, waits, and page evaluation
- runtime switching between headless automation and an interactive visible browser for login/manual intervention
- timestamped browser screenshots stored in user-writable per-project directories
- visual analysis and image comparison through Ollama multimodal models
- OCR and image-to-Markdown extraction through Ollama

BrowserLens is a capability layer only. It does not include autonomous loops or agent reasoning.

## Problem It Solves

Browser automation alone can tell an agent what the DOM says, but not whether the page actually looks right. A rendered UI can be broken while the DOM appears reasonable: wrong crop, missing image, bad spacing, invisible text, overlapped controls, blank canvas, iframe timing issues, or layout drift.

BrowserLens sits under the agent as a browser and visual verification layer. It uses Playwright internally, and it is useful alongside browser-control MCP workflows where screenshots are part of the verification path.

BrowserLens does not require a separate browser MCP server, but it is designed to coexist with one. In some tasks the best flow is BrowserLens alone; in others the agent may use a dedicated browser MCP for a real/authenticated browser session and use BrowserLens for local screenshot analysis, comparison, OCR, and Markdown extraction.

For text-only models:

- it prevents the browser verification flow from breaking when a task requires screenshots
- the model can control the browser and request visual checks without receiving images
- local vision/OCR models translate screenshots into actionable text, JSON, or Markdown

For multimodal models:

- it can reduce token usage by keeping repeated screenshot inspection local
- the main model can ask for targeted JSON summaries instead of full image context
- visual comparison can be delegated to a local model before escalating anything expensive

In both cases, screenshots stay on disk and are passed by file path. The main model spends tokens on decisions, not image bytes.

## How It Works

```mermaid
flowchart LR
  A["Agent<br/>text-only or multimodal"] -->|"MCP tool call"| B["BrowserLens MCP"]
  B --> C["Playwright browser control<br/>browser MCP-style workflow"]
  C --> D["Rendered page"]
  B --> E["Timestamped screenshot<br/>user data directory"]
  E --> F["Local Ollama vision model<br/>qwen3-vl:8b"]
  E --> G["Local Ollama OCR model<br/>deepseek-ocr"]
  F --> H["Strict JSON visual report"]
  G --> I["Structured OCR text<br/>or Markdown"]
  H --> A
  I --> A
  B -->|"DOM/text metadata"| A
```

The important design choice is that screenshots are never returned as MCP image bytes. BrowserLens returns local paths, structured JSON, OCR text, or Markdown so text-only models can reason about visual state and multimodal models can avoid unnecessary image-token spend.

## Using BrowserLens With Browser MCPs

BrowserLens and a browser-control MCP can be configured together in the same agent. They solve overlapping but different parts of the problem:

| Situation | Prefer |
| --- | --- |
| Public page, localhost app, deterministic UI verification | BrowserLens |
| Need visual comparison between two browser screenshots | BrowserLens |
| Need OCR or image-to-Markdown from a screenshot/document | BrowserLens |
| Need an already authenticated browser session | Browser MCP / browser-use MCP |
| User must manually log in, pass 2FA, solve SSO, or intervene | BrowserLens interactive mode or browser MCP / browser-use MCP |
| Need local visual analysis after a browser MCP capture | Browser MCP plus BrowserLens |

When both are available, agents should choose the smallest tool for the current step:

```mermaid
flowchart TD
  Task["Browser task"] --> Auth{"Needs existing login<br/>or human intervention?"}
  Auth -->|"Yes"| BrowserMCP["Use BrowserLens interactive mode<br/>or browser MCP"]
  Auth -->|"No"| BrowserLens["Use BrowserLens<br/>for Playwright browser control"]
  BrowserMCP --> Visual{"Need local visual analysis,<br/>comparison, OCR, or Markdown?"}
  BrowserLens --> Visual
  Visual -->|"Yes"| LensVisual["Use BrowserLens visual tools<br/>analyze_image / compare_images / extract_text / extract_markdown"]
  Visual -->|"No"| Done["Return browser/DOM result"]
```

BrowserLens currently implements its own Playwright browser service. It does not call another browser MCP internally, and that is intentional: keeping the tools independent lets agents select the right browser path for each task. For many login and manual-intervention flows, BrowserLens can now open its own visible Playwright browser with `browser_open_interactive`.

## Recommended Model Setup

There are two model roles:

- Main agent: **DeepSeek V4 Flash**, Gemma, or another strong text-only coding model
- Browser control: BrowserLens through MCP
- Visual analysis: a local Qwen vision model through Ollama
- OCR/Markdown extraction: a local OCR model through Ollama

The package defaults are:

| Role | Environment variable | Default |
| --- | --- | --- |
| Ollama endpoint | `OLLAMA_BASE_URL` | `http://localhost:11434` |
| Visual analysis/comparison | `VISION_MODEL` | `qwen3-vl:8b` |
| OCR / Markdown extraction | `OCR_MODEL` | `deepseek-ocr` |

The development setup that has worked well is:

| Role | Recommended model |
| --- | --- |
| Main text-only agent | DeepSeek V4 Flash or your local Gemma setup |
| Vision/comparison | Qwen vision variant configured in `VISION_MODEL` |
| OCR / Markdown extraction | `deepseek-ocr` |

Default environment:

```bash
OLLAMA_BASE_URL=http://localhost:11434
VISION_MODEL=qwen3-vl:8b
OCR_MODEL=deepseek-ocr
```

Pull the local models before using the visual tools:

```bash
ollama pull qwen3-vl:8b
ollama pull deepseek-ocr
```

If your tested Qwen or Gemma tags differ from the defaults, set them in the MCP client environment instead of changing code. For example:

```bash
VISION_MODEL=<your-qwen-vision-tag>
OCR_MODEL=deepseek-ocr
```

## Requirements

- Node.js 20+
- npm
- Ollama running on `http://localhost:11434`
- Ollama models:
  - `qwen3-vl:8b`
  - `deepseek-ocr`
- Playwright Chromium browser installed

## Installation

```bash
npm install
npx playwright install chromium
npm run build
```

Run the MCP server:

```bash
npm start
```

For local development:

```bash
npm run dev
```

## MCP Configuration

Point your MCP client at the built stdio server. Configure the local Ollama endpoint and models in the MCP entry so each user can choose their own local setup without changing BrowserLens code:

```json
{
  "mcp": {
    "browserlens": {
      "command": "node",
      "args": ["/absolute/path/to/browserlens/dist/mcpServer.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "VISION_MODEL": "qwen3-vl:8b",
        "OCR_MODEL": "deepseek-ocr",
        "BROWSERLENS_SCREENSHOT_DIR": "/custom/writable/path"
      }
    }
  }
}
```

### OpenCode Example

For OpenCode, put the local model configuration in the MCP server entry. The exact file location depends on your OpenCode setup, but the important part is the `env` block:

```json
{
  "mcp": {
    "browserlens": {
      "command": "node",
      "args": ["/absolute/path/to/browserlens/dist/mcpServer.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "VISION_MODEL": "qwen3-vl:8b",
        "OCR_MODEL": "deepseek-ocr"
      }
    }
  }
}
```

If you are using another tested local model, change only the values:

```json
{
  "mcp": {
    "browserlens": {
      "command": "node",
      "args": ["/absolute/path/to/browserlens/dist/mcpServer.js"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "VISION_MODEL": "your-local-qwen-vision-model",
        "OCR_MODEL": "your-local-ocr-model"
      }
    }
  }
}
```

After publishing to npm, clients can also run the package binary:

```json
{
  "mcp": {
    "browserlens": {
      "command": "npx",
      "args": ["browserlens"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "VISION_MODEL": "qwen3-vl:8b",
        "OCR_MODEL": "deepseek-ocr"
      }
    }
  }
}
```

The main agent model is configured in your MCP client or agent runtime, not in BrowserLens. BrowserLens only needs the local models it calls directly: one visual model for `analyze_image` and `compare_images`, and one OCR model for `extract_text`.

This pattern also applies to other MCP clients that support environment variables for MCP servers:

```json
{
  "mcp": {
    "browserlens": {
      "command": "npx",
      "args": ["browserlens"],
      "env": {
        "OLLAMA_BASE_URL": "http://localhost:11434",
        "VISION_MODEL": "your-qwen-vision-tag",
        "OCR_MODEL": "your-ocr-model-tag"
      }
    }
  }
}
```

## Configuration

```bash
OLLAMA_BASE_URL=http://localhost:11434
VISION_MODEL=qwen3-vl:8b
OCR_MODEL=deepseek-ocr
BROWSERLENS_SCREENSHOT_DIR=/custom/writable/path
BROWSERLENS_HEADLESS=true
BROWSERLENS_USER_DATA_DIR=/custom/browser-profile
BROWSERLENS_CHANNEL=chrome
```

By default, screenshots are written to an operating-system user data directory and grouped by project name:

- macOS: `~/Library/Application Support/browserlens/screenshots/<project>/`
- Windows: `%LOCALAPPDATA%/browserlens/screenshots/<project>/`
- Linux: `${XDG_DATA_HOME:-~/.local/share}/browserlens/screenshots/<project>/`

Screenshot filenames include the capture timestamp, for example `screenshot-2026-05-30T14-18-09-123Z.jpg`, so repeated captures do not overwrite each other. If `output_path` is supplied, BrowserLens respects it; relative paths are resolved from the MCP process working directory.

## Recommended Workflow

Use BrowserLens as a loop: inspect the page cheaply as text, capture what is actually rendered, ask local vision/OCR only when needed, then make the main agent decide the next code or browser action.

```mermaid
sequenceDiagram
  autonumber
  participant Agent as Text-only agent
  participant MCP as BrowserLens MCP
  participant Browser as Playwright/Chromium
  participant Disk as Local screenshot storage
  participant Vision as Ollama vision/OCR

  Agent->>MCP: browser_navigate(url)
  MCP->>Browser: Open page and wait
  Browser-->>MCP: URL, title, status
  MCP-->>Agent: JSON metadata

  Agent->>MCP: browser_snapshot(selector)
  MCP->>Browser: Read visible DOM/text
  MCP-->>Agent: selectors, text, controls

  Agent->>MCP: capture_screenshot()
  MCP->>Browser: Capture rendered page or selector
  MCP->>Disk: Save timestamped image
  MCP-->>Agent: image_path, dimensions, blank_like

  Agent->>MCP: analyze_image / compare_images / extract_text / extract_markdown
  MCP->>Vision: Send optimized local image
  Vision-->>MCP: Structured JSON, OCR text, or Markdown
  MCP-->>Agent: visual issues, OCR text, or Markdown

  Agent->>Agent: Decide next browser or code action
```

For visual parity tasks:

```text
1. browser_navigate to the reference page.
2. capture_screenshot to get reference_image_path.
3. browser_navigate to the candidate page.
4. capture_screenshot to get candidate_image_path.
5. compare_images with concrete expectations and tolerance rules.
6. Use the returned JSON issues to decide what to change.
```

For UI debugging tasks:

```text
1. browser_navigate to the page under test.
2. browser_snapshot to inspect controls, text, selectors, and state.
3. browser_click/browser_fill/browser_press_key/browser_wait_for as needed.
4. capture_screenshot to verify the rendered result.
5. analyze_image, extract_text, or extract_markdown if the main model needs visual confirmation.
```

For login, 2FA, SSO, or manual-intervention tasks:

```text
1. browser_open_interactive with the target URL.
2. Ask the user to log in or complete the required manual action in the visible browser.
3. browser_wait_for or browser_snapshot to confirm the page state.
4. capture_screenshot and analyze_image/compare_images/extract_text/extract_markdown as needed.
5. Continue in the interactive browser, or call browser_use_headless for a fresh automated session.
```

## Tools

### `execute_code`

Runs a local executable with arguments and returns stdout/stderr.

```json
{
  "command": "node",
  "args": ["./scripts/check-ui.mjs"],
  "cwd": "/path/to/project",
  "timeout_ms": 60000
}
```

Shell-style command strings are supported when `args` is omitted:

```json
{
  "command": "node -e \"console.log('ok')\"",
  "timeout_ms": 10000
}
```

### Browser Tools

These wrap Playwright and return text/JSON only:

- `browser_navigate`
- `browser_snapshot`
- `browser_click`
- `browser_fill`
- `browser_press_key`
- `browser_wait_for`
- `browser_evaluate`
- `browser_open_interactive`
- `browser_use_headless`

Example:

```json
{
  "url": "http://localhost:3000",
  "wait_until": "networkidle",
  "viewport": {
    "width": 1440,
    "height": 1000
  }
}
```

Use `browser_snapshot` for DOM, text, selectors, forms, and page state. Do not use it as the final source of truth for visual parity because similar DOM can render with different spacing, typography, colors, composition, or imagery.

### `browser_open_interactive`

Closes the current browser session and opens a visible Playwright browser. Use this when the user must log in, pass 2FA/SSO, solve a manual step, or inspect the browser directly.

```json
{
  "url": "https://example.com/login",
  "user_data_dir": "/Users/example/.browserlens-profile",
  "channel": "chrome",
  "viewport": {
    "width": 1440,
    "height": 1000
  }
}
```

`user_data_dir` enables a persistent browser profile so cookies/session data can survive between runs. It can also be configured with `BROWSERLENS_USER_DATA_DIR`. `channel` can be configured with `BROWSERLENS_CHANNEL`.

### `browser_use_headless`

Closes the current browser session and starts a fresh headless Playwright session.

```json
{
  "viewport": {
    "width": 1440,
    "height": 1000
  }
}
```

### `capture_screenshot`

Captures a full page or selector screenshot. It returns only local file metadata, never image bytes.

```json
{
  "url": "http://localhost:3000",
  "full_page": true,
  "viewport": {
    "width": 1440,
    "height": 1000
  }
}
```

Selector capture:

```json
{
  "url": "http://localhost:3000",
  "selector": "#app",
  "delay_ms": 3000
}
```

Output:

```json
{
  "image_path": "/Users/example/Library/Application Support/browserlens/screenshots/my-project/screenshot-2026-05-30T14-18-09-123Z.jpg",
  "width": 1440,
  "height": 1000,
  "blank_like": false
}
```

If `blank_like` is `true`, recapture the correct rendered canvas/content selector, often with `delay_ms`.

### `analyze_image`

Optimizes an image to max 1024px JPEG, sends it to the configured multimodal model, and returns strict JSON.

```json
{
  "goal": "Validate that the dashboard is visually usable after the latest UI change.",
  "expectations": [
    "The page is not blank",
    "The navigation is visible",
    "Text does not overlap controls"
  ],
  "image_path": "/path/to/screenshot.jpg"
}
```

### `compare_images`

Compares a candidate screenshot against a reference screenshot. The first image is always the reference and the second is always the candidate.

```json
{
  "goal": "Verify visual parity with the reference page.",
  "expectations": [
    "Spacing, alignment, typography, colors, imagery and visible text should be equivalent",
    "Report missing, extra, clipped or overlapping elements"
  ],
  "reference_image_path": "/path/to/reference.jpg",
  "candidate_image_path": "/path/to/candidate.jpg"
}
```

`matches_expectations: false` is a successful comparison result that found differences. Only `error: true` means the tool failed.

### `extract_text`

Uses the configured OCR model and returns visible text plus structured blocks.

```json
{
  "image_path": "/path/to/screenshot.jpg"
}
```

### `extract_markdown`

Uses the configured OCR model and returns readable content as Markdown. This is useful when the screenshot is a document, table, form, article, code block, or dense UI that an agent should consume as structured text.

```json
{
  "image_path": "/path/to/screenshot-or-document.jpg",
  "instructions": "Preserve tables and headings."
}
```

Output:

```json
{
  "markdown": "# Invoice\n\n| Item | Amount |\n| --- | --- |\n| Hosting | 20 EUR |"
}
```

## Architecture

BrowserLens keeps the MCP transport thin and delegates behavior to services:

```mermaid
flowchart TB
  Client["MCP client / agent"] --> Server["mcpServer.ts<br/>schemas, registry, stdio"]
  Server --> Execute["executeService.ts"]
  Server --> Browser["playwrightService.ts"]
  Server --> Vision["visionService.ts"]
  Server --> OCR["ocrService.ts"]
  Browser --> Storage["screenshotStorage.ts"]
  Vision --> Images["imageUtils.ts"]
  OCR --> Images
  Vision --> Ollama["ollamaClient.ts"]
  OCR --> Ollama
  Execute --> Process["local child process"]
  Browser --> Chromium["Playwright Chromium"]
  Storage --> Filesystem["user-writable filesystem"]
  Ollama --> LocalModels["local Ollama models"]
```

```text
src/
  mcpServer.ts           MCP schemas, tool registry, stdio transport
  executeService.ts      local process execution boundary
  playwrightService.ts   browser automation boundary
  screenshotStorage.ts   screenshot path and OS storage policy
  visionService.ts       visual analysis and comparison use cases
  ocrService.ts          OCR and image-to-Markdown use cases
  ollamaClient.ts        Ollama HTTP adapter and model lifecycle
  imageUtils.ts          image optimization helpers
  types.ts               shared result types
```

The code follows a small clean-architecture shape: MCP adapters validate input, services own use-case behavior, and infrastructure details such as Playwright, Ollama, filesystem paths, and process execution stay behind narrow modules.

## Development

```bash
npm install
npx playwright install chromium
npm run typecheck
npm run build
```

`npm run build` performs a TypeScript compile and then bundles the MCP entrypoint with esbuild into a minified `dist/mcpServer.js`. Dependencies remain external so native packages such as `sharp` and Playwright stay installable and portable.

Useful checks before opening a pull request:

```bash
npm run typecheck
npm run build
npm pack --dry-run
```

## Contributing

Contributions are welcome. Please:

- keep changes focused and compatible with Node.js 20+
- prefer native TypeScript types and explicit schemas at MCP boundaries
- add or update documentation when behavior changes
- avoid committing generated output, local screenshots, `node_modules`, or secrets
- run `npm run typecheck` and `npm run build` before submitting

Good areas to improve:

- add automated tests for screenshot storage, tool schemas, and Ollama response parsing
- add CI for typecheck, build, and package dry-run
- add configurable browser launch options for remote/headed debugging
- add stronger command allow-listing for locked-down environments
- expand provider adapters beyond Ollama while keeping the service boundary stable

## License

MIT
