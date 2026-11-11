import { build } from "esbuild";
import { polyfillNode } from "esbuild-plugin-polyfill-node";
import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });
const stubs = ["net", "tls", "fs", "dns", "child_process", "socks", "node-localstorage"];
const alias = Object.fromEntries(stubs.map((n) => [n, "./shim.js"]));

await build({
  entryPoints: ["main.js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2020",
  minify: false,
  outfile: "dist/app.js",
  define: { global: "globalThis" },
  alias,
  plugins: [polyfillNode({ polyfills: { crypto: true } })],
});
copyFileSync("index.html", "dist/index.html");
