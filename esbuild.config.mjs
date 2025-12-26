import { build } from "esbuild";
import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname } from "node:path";

const outdir = "dist";
const staticFiles = [
  { src: "manifest.json", dest: "manifest.json" },
  { src: "src/popup/popup.html", dest: "popup.html" },
  { src: "src/popup/styles.css", dest: "styles.css" },
  { src: "src/options/options.html", dest: "options.html" },
  { src: "src/content/lookup-overlay.css", dest: "lookup-overlay.css" },
  { src: "src/assets/dictionary-basic.json", dest: "assets/dictionary-basic.json" }
];

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

try {
  await build({
    entryPoints: {
      background: "src/background/index.ts",
      content: "src/content/index.ts",
      popup: "src/popup/index.ts",
      options: "src/options/index.ts"
    },
    outdir,
    bundle: true,
    format: "iife",
    target: "es2020",
    sourcemap: true,
    loader: {
      ".json": "json"
    },
    logLevel: "info"
  });
  for (const file of staticFiles) {
    const destination = `${outdir}/${file.dest}`;
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(file.src, destination);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
