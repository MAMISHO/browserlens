import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function json(value: unknown, isError = false): CallToolResult {
  return {
    isError,
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }]
  };
}
