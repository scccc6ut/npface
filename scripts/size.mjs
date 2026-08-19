// Size budget check: gzip of the minified core bundle must stay under the limit.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { resolve } from 'node:path';

const LIMIT_KB = 15;
const files = [
  { label: 'npface (core, min)', path: 'packages/core/dist/npface.min.js', limit: LIMIT_KB },
  { label: 'npface (core, esm)', path: 'packages/core/dist/index.js' },
  { label: 'npface-react (esm)', path: 'packages/react/dist/index.js' },
];

let failed = false;
for (const f of files) {
  const p = resolve(f.path);
  if (!existsSync(p)) {
    console.error(`✗ ${f.label}: ${f.path} not found — run "pnpm build" first`);
    failed = true;
    continue;
  }
  const buf = readFileSync(p);
  const gz = gzipSync(buf, { level: 9 }).length / 1024;
  const br = brotliCompressSync(buf).length / 1024;
  const raw = buf.length / 1024;
  const over = f.limit !== undefined && gz > f.limit;
  const mark = over ? '✗' : '✓';
  console.log(
    `${mark} ${f.label.padEnd(22)} raw ${raw.toFixed(2).padStart(7)} KB · gzip ${gz.toFixed(2).padStart(6)} KB · brotli ${br
      .toFixed(2)
      .padStart(6)} KB${f.limit !== undefined ? `   (limit ${f.limit} KB gzip)` : ''}`,
  );
  if (over) failed = true;
}
if (failed) {
  console.error('\nSize budget exceeded.');
  process.exit(1);
}
