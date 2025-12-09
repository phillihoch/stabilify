import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";

const external = [
  "@playwright/test",
  "@playwright/test/reporter",
  "openai",
  "dotenv",
  "node:fs",
  "node:path",
];

const plugins = [
  resolve(),
  commonjs(),
  typescript({
    tsconfig: "./tsconfig.json",
    declaration: false,
  }),
];

export default [
  // Main library ESM and CJS builds
  {
    input: "src/index.ts",
    output: [
      {
        file: "dist/index.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
      {
        file: "dist/index.mjs",
        format: "esm",
        sourcemap: true,
      },
    ],
    external,
    plugins,
  },
  // Reporter separate build (für Playwright reporter Array)
  {
    input: "src/self-healing-reporter.ts",
    output: [
      {
        file: "dist/reporter.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
      {
        file: "dist/reporter.mjs",
        format: "esm",
        sourcemap: true,
      },
    ],
    external,
    plugins,
  },
  // TypeScript declarations - main
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    external,
    plugins: [dts()],
  },
  // TypeScript declarations - reporter
  {
    input: "src/self-healing-reporter.ts",
    output: {
      file: "dist/reporter.d.ts",
      format: "esm",
    },
    external,
    plugins: [dts()],
  },
];
