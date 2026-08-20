import { defineConfig } from "tsdown";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/cli.ts",
    "src/migrate.ts",
    "src/seed.ts",
    "src/config.ts",
    "src/fileName.ts",
  ],
  format: "esm",
  dts: true,
  clean: true,
  outExtensions: () => ({
    js: ".js",
    dts: ".d.ts",
  }),
});
