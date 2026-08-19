// Render the static README banner (all states in a row) from the built core — run `pnpm build` first.
// Per-state *animated* previews are produced by scripts/record.mjs.
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  BASE_EYE,
  BASE_HEAD,
  EYE_HOME,
  HEAD_PIVOT,
  HELMET_PATH,
  LIGHT_COLORS,
  STATES,
  STATE_NAMES,
  VISOR,
  crossPath,
  eyePath,
} from '../packages/core/dist/index.js';

mkdirSync(resolve('assets'), { recursive: true });

/** Resolve a representative pose for a state (base + sequence steps). */
function poseFor(name) {
  const def = STATES[name] ?? STATES.idle;
  let l = { ...BASE_EYE, ...def.eye, ...def.eyes?.[0] };
  let r = { ...BASE_EYE, ...def.eye, ...def.eyes?.[1] };
  let head = { ...BASE_HEAD, ...def.head };
  const steps = def.sequence?.steps ?? [];
  const upto = name === 'wake' ? 2 : steps.length; // wake: show the "pop" frame
  for (const st of steps.slice(0, upto)) {
    l = { ...l, ...st.eye, ...st.eyes?.[0] };
    r = { ...r, ...st.eye, ...st.eyes?.[1] };
    head = { ...head, ...st.head };
  }
  // a touch of the state's motion so the snapshot is not dead-centred
  if (name === 'search-web') {
    l.x += 4;
    r.x += 4;
    l.y += 2;
    r.y += 2;
    head.rot += 1.5;
  }
  if (name === 'search-docs') {
    l.x += -3;
    r.x += -3;
    l.y += 1;
    r.y += 1;
  }
  if (name === 'working') {
    l.x += -2.5;
    r.x += -2.5;
    l.y += 1;
    r.y += 1;
  }
  if (name === 'thinking') head.rot -= 1;
  return { l, r, head };
}

function faceSvg(name, { size = 120, bg = true, blink = 0 } = {}) {
  const { l, r, head } = poseFor(name);
  const c = LIGHT_COLORS;
  const [px, py] = HEAD_PIVOT;
  const t = `translate(${(px + head.x).toFixed(2)} ${(py + head.y).toFixed(2)}) rotate(${head.rot.toFixed(2)}) scale(${head.sx} ${head.sy}) translate(${-px} ${-py})`;
  const cw = (e) => Math.max(1.2, Math.min(e.w, e.h) * 0.2).toFixed(2);
  const id = `clip-${name}`;
  const eyes = `
    <g clip-path="url(#${id})">
      <path d="${eyePath(l, false, EYE_HOME[0][0], EYE_HOME[0][1], blink)}" fill="${c.eye}" opacity="${l.fill}"/>
      <path d="${eyePath(r, true, EYE_HOME[1][0], EYE_HOME[1][1], blink)}" fill="${c.eye}" opacity="${r.fill}"/>
      <path d="${crossPath(l, false, EYE_HOME[0][0], EYE_HOME[0][1])}" stroke="${c.eye}" stroke-width="${cw(l)}" stroke-linecap="round" fill="none" opacity="${l.cross}"/>
      <path d="${crossPath(r, true, EYE_HOME[1][0], EYE_HOME[1][1])}" stroke="${c.eye}" stroke-width="${cw(r)}" stroke-linecap="round" fill="none" opacity="${r.cross}"/>
    </g>`;
  const zzz =
    name === 'sleep'
      ? `<g font-family="ui-rounded, system-ui, sans-serif" font-weight="800" fill="${c.zzz}" text-anchor="middle">
      <text x="86" y="9" font-size="6.5" opacity=".7">z</text><text x="90" y="3" font-size="8" opacity=".9">z</text><text x="95" y="-4" font-size="9.5">z</text></g>`
      : '';
  const rect = `x="${VISOR.x}" y="${VISOR.y}" width="${VISOR.w}" height="${VISOR.h}" rx="${VISOR.h / 2}"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -14 120 126" width="${size}" height="${size}" role="img" aria-label="npface ${name}">
  ${bg ? `<rect x="-10" y="-14" width="120" height="126" rx="20" fill="#f6f7f2"/>` : ''}
  <defs><clipPath id="${id}"><rect ${rect}/></clipPath></defs>
  <g transform="${t}">
    <path d="${HELMET_PATH}" fill="${c.body}"/>
    <rect ${rect} fill="${c.visor}"/>${eyes}
  </g>${zzz}
</svg>
`;
}

// banner: all states in a row (no individual backgrounds)
const names = STATE_NAMES;
const cell = 96;
const W = names.length * cell + 40;
const H = 170;
let inner = '';
names.forEach((n, i) => {
  const face = faceSvg(n, { bg: false, blink: n === 'blink' ? 0.72 : 0 })
    .replace(/<svg[^>]*>/, '')
    .replace('</svg>', '')
    .replace(`id="clip-${n}"`, `id="b-${n}"`)
    .replace(`url(#clip-${n})`, `url(#b-${n})`);
  inner += `<g transform="translate(${20 + i * cell + 10} 24) scale(0.7)">${face}</g>
  <text x="${20 + i * cell + cell / 2}" y="${H - 22}" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="12" fill="#0f1d3a">${n}</text>`;
});
const banner = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="npface states">
  <rect width="${W}" height="${H}" rx="24" fill="#f6f7f2"/>
  ${inner}
</svg>
`;
writeFileSync(resolve('assets/banner.svg'), banner);
console.log(`wrote assets/banner.svg (${names.length} states)`);
