import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    target: 'es2020',
    treeshake: true,
  },
  {
    // Minified browser build for <script> / CDN usage — also what the size budget is measured on.
    entry: { 'npface.min': 'src/index.ts' },
    format: ['iife'],
    globalName: 'npface',
    minify: true,
    sourcemap: false,
    target: 'es2020',
    outExtension: () => ({ js: '.js' }),
  },
]);
