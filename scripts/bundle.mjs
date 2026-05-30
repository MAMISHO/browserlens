import { chmod } from "node:fs/promises";
import { build } from "esbuild";

await build({
  entryPoints: ["src/mcpServer.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/mcpServer.js",
  minify: true,
  sourcemap: false,
  packages: "external"
});

await chmod("dist/mcpServer.js", 0o755);
