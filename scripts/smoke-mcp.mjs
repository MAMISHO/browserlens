#!/usr/bin/env node
/**
 * BrowserLens MCP smoke test — vanilla Node, no dependencies.
 *
 * Spawns the built stdio server (dist/main.js), speaks JSON-RPC 2.0 over
 * stdin/stdout, and verifies:
 *   1. initialize returns serverInfo.name === "browserlens"
 *   2. every stdout line is valid JSON (no stdout pollution)
 *   3. tools/list returns exactly the 15 BrowserLens tools
 *   4. a deterministic tools/call (browser_navigate with an invalid URL)
 *      returns a structured error and leaves the process alive
 *
 * Requires only Node 20+ and a built dist/main.js (npm run build).
 * Does NOT require Ollama, Playwright, or a browser.
 */

import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import readline from "node:readline/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, "..", "dist", "main.js");

const EXPECTED_TOOLS = [
  "execute_code",
  "browser_navigate",
  "browser_snapshot",
  "browser_click",
  "browser_fill",
  "browser_press_key",
  "browser_wait_for",
  "browser_evaluate",
  "browser_open_interactive",
  "browser_use_headless",
  "capture_screenshot",
  "analyze_image",
  "compare_images",
  "extract_text",
  "extract_markdown"
];

let nextId = 1;
let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL: ${message}`);
}

function ok(message) {
  console.log(`ok: ${message}`);
}

function request(method, params, id) {
  return JSON.stringify({ jsonrpc: "2.0", id, method, params });
}

async function main() {
  const child = spawn(process.execPath, [SERVER], {
    stdio: ["pipe", "pipe", "inherit"]
  });

  const rl = readline.createInterface({ input: child.stdout });
  const pending = new Map();
  let sawNonJsonLine = false;

  rl.on("line", (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      sawNonJsonLine = true;
      fail(`non-JSON line on stdout: ${line.slice(0, 120)}`);
      return;
    }
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    }
  });

  const call = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`timeout waiting for ${method}`));
      }, 15_000);
      pending.set(id, { resolve: (m) => { clearTimeout(timer); resolve(m); } });
      child.stdin.write(request(method, params, id) + "\n");
    });

  // 1. initialize
  const init = await call("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "smoke-mcp", version: "0.0.1" }
  });
  if (init.error) {
    fail(`initialize error: ${JSON.stringify(init.error)}`);
  } else if (init.result?.serverInfo?.name !== "browserlens") {
    fail(`initialize serverInfo.name = ${JSON.stringify(init.result?.serverInfo)}`);
  } else {
    ok(`initialize (${init.result.serverInfo.name} v${init.result.serverInfo.version})`);
  }

  // 2. initialized notification (fire and forget)
  child.stdin.write(
    JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n"
  );

  // 3. tools/list
  const list = await call("tools/list", {});
  const names = (list.result?.tools ?? []).map((t) => t.name).sort();
  const expected = [...EXPECTED_TOOLS].sort();
  if (list.error) {
    fail(`tools/list error: ${JSON.stringify(list.error)}`);
  } else if (names.length !== expected.length) {
    fail(`tools/list has ${names.length} tools, expected ${expected.length}`);
  } else if (expected.some((n, i) => n !== names[i])) {
    fail(`tools/list mismatch:\n  expected: ${expected.join(", ")}\n  got:      ${names.join(", ")}`);
  } else {
    ok(`tools/list: ${names.length} tools`);
  }

  // 4. deterministic tools/call — invalid URL rejected by Playwright
  //    before any network/Ollama dependency (no Ollama/browser needed).
  const callResult = await call("tools/call", {
    name: "browser_navigate",
    arguments: { url: "not-a-valid-url" }
  });
  const text = callResult.result?.content?.[0]?.text ?? "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(text);
  } catch {
    fail(`tools/call content is not JSON: ${text.slice(0, 120)}`);
  }
  const hasError = callResult.isError === true || parsed.error === true;
  if (callResult.error) {
    fail(`tools/call transport error: ${JSON.stringify(callResult.error)}`);
  } else if (!hasError) {
    fail(`tools/call invalid URL did not return a structured error: ${text.slice(0, 200)}`);
  } else {
    ok("tools/call browser_navigate invalid URL -> structured error");
  }

  // 5. process must still be alive and responsive
  const alive = await call("tools/list", {});
  if (alive.error || !alive.result) {
    fail("server did not respond after the error case");
  } else {
    ok("server alive after error case");
  }

  // 6. stdout cleanliness
  if (sawNonJsonLine) {
    fail("stdout contained non-JSON lines (pollution would break stdio transport)");
  } else {
    ok("stdout clean (all lines JSON-RPC)");
  }

  child.kill("SIGTERM");
  await new Promise((resolve) => child.once("exit", resolve));

  if (failures > 0) {
    console.error(`\nsmoke test FAILED with ${failures} failure(s)`);
    process.exit(1);
  }
  console.log("\nsmoke test passed");
}

main().catch((err) => {
  console.error(`smoke test crashed: ${err?.stack ?? err}`);
  process.exit(1);
});
