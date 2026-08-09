import { chmod } from "node:fs/promises";
import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "esm",
  outfile: "dist/main.js",
  minify: true,
  sourcemap: false,
  packages: "external"
});

await chmod("dist/main.js", 0o755);
