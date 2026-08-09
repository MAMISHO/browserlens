#!/usr/bin/env node
import "reflect-metadata";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { container } from "./container.js";
import { MCP_TOKENS } from "./mcp/tokens.js";
import { BROWSER_TOKENS } from "./browser/tokens.js";
import { SHARED_TOKENS } from "./shared/tokens.js";

const controller = container.resolve(MCP_TOKENS.McpController);

const server = new Server(
  { name: "browserlens", version: "0.2.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => controller.listTools());
server.setRequestHandler(CallToolRequestSchema, async (request) => controller.callTool(request.params.name, request.params.arguments));

process.on("SIGINT", async () => shutdown());
process.on("SIGTERM", async () => shutdown());

async function shutdown(): Promise<void> {
  try {
    const browser = container.resolve(BROWSER_TOKENS.BrowserService);
    await browser.close();
  } catch { /* not registered or already closed */ }
  try {
    const modelClient = container.resolve(SHARED_TOKENS.ModelClient) as { unload?: () => Promise<void> };
    await modelClient.unload?.();
  } catch { /* ignore */ }
  process.exit(0);
}

const transport = new StdioServerTransport();
await server.connect(transport);
