// README assets for face shapes (run `pnpm build` first):
//   assets/shapes.svg — the six shapes side by side (static)
//   assets/morph.svg  — one helmet morphing through every shape (animated SVG, recorded from the engine)
import { Window } from 'happy-dom';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ---------- deterministic, clock-controlled DOM (the engine runs headless) ---------- */
let clock = 1000;
let timers = [];
const win = new Window({ url: 'http://localhost/' });
globalThis.window = win;
globalThis.document = win.document;
globalThis.requestAnimationFrame = () => 1; // frames are driven by hand below
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = { now: () => clock };
globalThis.setTimeout = (fn, ms) => (timers.push({ at: clock + ms, fn }), timers.length);
globalThis.clearTimeout = (id) => {
  if (timers[id - 1]) timers[id - 1].fn = null;
};
let seed = 7;
Math.random = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;

const { createNpface, SHAPE_NAMES, resolveShape, pointsPath, eyePath, BASE_EYE, LIGHT_COLORS } =
  await import('../packages/core/dist/index.js');

mkdirSync(resolve('assets'), { recursive: true });
const C = LIGHT_COLORS;
const ZH = {
  square: '方形',
  circle: '圆形',
  triangle: '三角',
  hexagon: '六边形',
  shield: '盾形',
  diamond: '菱形',
};

/* ---------- static row ---------- */
function face(name, idp) {
  const s = resolveShape(name);
  const [vx, vy, vw, vh] = s.visor;
  const [lx, ly, rx, ry] = s.eyes;
  const rect = `x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="${vh / 2}"`;
  return `<defs><clipPath id="${idp}"><rect ${rect}/></clipPath></defs>
    <path d="${s.path}" fill="${C.body}"/><rect ${rect} fill="${C.visor}"/>
    <g clip-path="url(#${idp})" fill="${C.eye}">
      <path d="${eyePath(BASE_EYE, false, lx, ly, 0, s.eyeScale)}"/>
      <path d="${eyePath(BASE_EYE, true, rx, ry, 0, s.eyeScale)}"/>
    </g>`;
}
const cell = 112;
const W = SHAPE_NAMES.length * cell + 32;
const H = 172;
let row = '';
SHAPE_NAMES.forEach((n, i) => {
  const x = 16 + i * cell;
  row += `<g transform="translate(${x + 14} 18) scale(0.84)">${face(n, `s-${n}`)}</g>
  <text x="${x + cell / 2}" y="132" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="13" font-weight="600" fill="${C.body}">${n}</text>
  <text x="${x + cell / 2}" y="152" text-anchor="middle" font-family="system-ui, 'PingFang SC', sans-serif" font-size="12" fill="${C.body}" opacity=".65">${ZH[n]}</text>`;
});
writeFileSync(
  resolve('assets/shapes.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="npface face shapes">
  <rect width="${W}" height="${H}" rx="22" fill="#f6f7f2"/>
  ${row}
</svg>
`,
);

/* ---------- animated morph ---------- */
const FPS = 15;
const HOLD = 0.9; // s on each shape
const SEG = 1.5; // s per shape (hold + morph)
const LOOP = SEG * SHAPE_NAMES.length;
const host = document.createElement('div');
document.body.appendChild(host);
const f = createNpface(host, {
  shape: 'square',
  state: 'still',
  states: { still: { blink: false } }, // no blinks / glances: only the morph moves
  pauseOffscreen: false,
  reducedMotion: false,
});
const q = (s) => f.el.querySelector(s);
const [body, visor, eyeL, eyeR] = [
  '.npface-body',
  '.npface-visor',
  '.npface-eye-l',
  '.npface-eye-r',
].map(q);
const r1 = (s) => s.replace(/-?\d+\.\d+/g, (m) => String(Math.round(+m * 10) / 10));
const step = () => {
  clock += 1000 / FPS;
  for (const t of timers)
    if (t.fn && t.at <= clock) {
      const fn = t.fn;
      t.fn = null;
      fn();
    }
  f.tick(clock, 1 / FPS);
};
for (let i = 0; i < FPS; i++) step(); // settle
const frames = { d: [], l: [], r: [], x: [], y: [], w: [], h: [] };
const total = Math.round(LOOP * FPS);
for (let k = 0; k < total; k++) {
  const t = k / FPS;
  const seg = Math.floor(t / SEG);
  if (Math.abs(t - (seg * SEG + HOLD)) < 0.5 / FPS)
    f.setShape(SHAPE_NAMES[(seg + 1) % SHAPE_NAMES.length]);
  step();
  const d = body.getAttribute('d');
  // keep every frame a 120-point polyline so SMIL can interpolate between them
  frames.d.push(r1(d.includes('A') ? pointsPath(resolveShape(f.shape).pts) : d));
  frames.l.push(r1(eyeL.getAttribute('d')));
  frames.r.push(r1(eyeR.getAttribute('d')));
  frames.x.push(visor.getAttribute('x'));
  frames.y.push(visor.getAttribute('y'));
  frames.w.push(visor.getAttribute('width'));
  frames.h.push(visor.getAttribute('height'));
}
f.destroy();

function anim(attr, samples) {
  const n = samples.length;
  const keep = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1 || samples[i] !== samples[i - 1] || samples[i] !== samples[i + 1])
      keep.push(i);
  }
  if (keep.length <= 2 && samples[0] === samples[n - 1]) return '';
  // close the loop on the first frame so the animation is seamless
  const values = keep
    .map((i) => samples[i])
    .concat(samples[0])
    .join(';');
  const times = keep
    .map((i) => (i / n).toFixed(4))
    .concat('1')
    .join(';');
  return `<animate attributeName="${attr}" values="${values}" keyTimes="${times}" dur="${LOOP}s" repeatCount="indefinite"/>`;
}
const rx = frames.h.map((h) => String(+h / 2));
const morph = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 112 112" width="168" height="168" role="img" aria-label="npface morphing through its face shapes">
<rect x="-6" y="-6" width="112" height="112" rx="20" fill="#f6f7f2"/>
<path d="${frames.d[0]}" fill="${C.body}">${anim('d', frames.d)}</path>
<rect x="${frames.x[0]}" y="${frames.y[0]}" width="${frames.w[0]}" height="${frames.h[0]}" rx="${rx[0]}" fill="${C.visor}">${anim('x', frames.x)}${anim('y', frames.y)}${anim('width', frames.w)}${anim('height', frames.h)}${anim('rx', rx)}</rect>
<path d="${frames.l[0]}" fill="${C.eye}">${anim('d', frames.l)}</path>
<path d="${frames.r[0]}" fill="${C.eye}">${anim('d', frames.r)}</path>
</svg>
`;
writeFileSync(resolve('assets/morph.svg'), morph);
console.log(
  `wrote assets/shapes.svg and assets/morph.svg (${(morph.length / 1024).toFixed(0)} KB, ${LOOP}s loop)`,
);
