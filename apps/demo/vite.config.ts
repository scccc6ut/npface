import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves from /npface/ — override with VITE_BASE (e.g. "/" on Vercel).
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    // Always build the demo from package sources (HMR while developing the core).
    alias: {
      'npface-react': r('../../packages/react/src/index.tsx'),
      npface: r('../../packages/core/src/index.ts'),
    },
  },
  build: { target: 'es2020' },
});
