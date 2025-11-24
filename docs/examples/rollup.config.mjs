/**
 * Rollup Configuration for Stabilify
 * 
 * This configuration builds a dual-package (ESM + CJS) TypeScript library
 * with proper type declarations and source maps.
 * 
 * Output:
 * - dist/index.js (CommonJS)
 * - dist/index.mjs (ES Module)
 * - dist/index.d.ts (TypeScript declarations)
 */

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import dts from 'rollup-plugin-dts';

/**
 * External dependencies that should not be bundled
 * These are peer dependencies that users will install separately
 */
const external = [
  '@playwright/test',
  // Add other peer dependencies here
];

/**
 * Common plugins for JavaScript builds
 */
const plugins = [
  // Resolve node_modules
  resolve({
    preferBuiltins: true,
  }),
  
  // Convert CommonJS modules to ES6
  commonjs(),
  
  // Compile TypeScript
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: false, // We use rollup-plugin-dts for declarations
    sourceMap: true,
  }),
];

export default [
  // JavaScript builds (ESM + CJS)
  {
    input: 'src/index.ts',
    output: [
      // CommonJS build for Node.js
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      // ES Module build for modern bundlers
      {
        file: 'dist/index.mjs',
        format: 'esm',
        sourcemap: true,
      },
    ],
    external,
    plugins,
  },
  
  // TypeScript declarations bundle
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
    external,
    plugins: [dts()],
  },
];

