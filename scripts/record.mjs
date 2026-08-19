// Record every state from the real engine (headless, via happy-dom) into animated SVGs (SMIL).
// Output: assets/states/<state>.svg — used by the README. Run `pnpm build` first.
import { Window } from 'happy-dom';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/* ---------- deterministic, clock-controlled environment ---------- */
let clock = 0;
const seeded = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const win = new Window({ url: 'http://localhost/' });
globalThis.window = win;
globalThis.document = win.document;
globalThis.requestAnimationFrame = () => 1; // never fires — we drive ticks manually
globalThis.cancelAnimationFrame = () => {};
globalThis.performance = { now: () => clock };
globalThis.setTimeout = (fn, ms) => {
  timers.push({ at: clock + ms, fn });
  return timers.length;
};
globalThis.clearTimeout = (id) => {
  if (timers[id - 1]) timers[id - 1].fn = null;
};
let timers = [];
const runTimers = () => {
  for (const t of timers)
    if (t.fn && t.at <= clock) {
      const f = t.fn;
      t.fn = null;
      f();
    }
};

const { createNpface, STATE_NAMES, VISOR, HELMET_PATH, LIGHT_COLORS, HEAD_PIVOT } =
  await import('../packages/core/dist/index.js');

const FPS = 20;
const SECONDS = 4;
const FRAMES = FPS * SECONDS;
const OUT = resolve('assets/states');
mkdirSync(OUT, { recursive: true });

const f1 = (s) => s.replace(/-?\d+\.\d+/g, (m) => String(Math.round(+m * 10) / 10));

/** Keep only keyframes where the value changes (start/end of static runs); returns {values, keyTimes}. */
function compress(samples) {
  const n = samples.length;
  const keep = [];
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? samples[i - 1] : null;
    const next = i < n - 1 ? samples[i + 1] : null;
    if (i === 0 || i === n - 1 || samples[i] !== prev || samples[i] !== next) keep.push(i);
  }
  return {
    values: keep.map((i) => samples[i]).join(';'),
    keyTimes: keep.map((i) => (i / (n - 1)).toFixed(4)).join(';'),
    constant: keep.length <= 2 && samples[0] === samples[n - 1],
  };
}

function anim(attr, samples, extra = '') {
  const c = compress(samples);
  if (c.constant) return '';
  return `<animate attributeName="${attr}" values="${c.values}" keyTimes="${c.keyTimes}" dur="${SECONDS}s" repeatCount="indefinite"${extra}/>`;
}
function animT(type, samples) {
  const c = compress(samples);
  if (c.constant) return '';
  return `<animateTransform attributeName="transform" type="${type}" values="${c.values}" keyTimes="${c.keyTimes}" dur="${SECONDS}s" repeatCount="indefinite"/>`;
}

function record(name) {
  Math.random = seeded(name.length * 7919 + name.charCodeAt(0));
  clock = 1000;
  timers = [];
  const host = document.createElement('div');
  document.body.appendChild(host);
  const face = createNpface(host, {
    state: name === 'blink' ? 'idle' : name === 'wake' ? 'sleep' : name,
    pauseOffscreen: false,
    reducedMotion: false,
  });
  const el = face.el;
  const q = (sel) => el.querySelector(sel);
  const head = q('.npface-head');
  const eyeL = q('.npface-eye-l'),
    eyeR = q('.npface-eye-r');
  const [crossL, crossR] = el.querySelectorAll('.npface-cross');

  // choreography for the overlay-ish states
  if (name === 'wake') {
    // start asleep, wake after 0.6 s
    timers.push({ at: clock + 600, fn: () => face.set('wake') });
  }
  if (name === 'blink') {
    timers.push({ at: clock + 700, fn: () => face.blink() });
    timers.push({ at: clock + 2300, fn: () => face.blink() });
    timers.push({ at: clock + 2600, fn: () => face.blink() });
  }

  const S = {
    dL: [],
    dR: [],
    cL: [],
    cR: [],
    opL: [],
    opR: [],
    coL: [],
    coR: [],
    tr: [],
    rot: [],
    sc: [],
    z: [[], [], []],
  };
  // warm-up so springs/sequences settle into the state (but keep entry choreography for wake/happy/proud)
  const warm = name === 'wake' || name === 'blink' ? 0 : 1200;
  const dt = 1 / FPS;
  const step = () => {
    clock += 1000 / FPS;
    runTimers();
    face.tick(clock, dt);
  };
  for (let i = 0; i < (warm / 1000) * FPS; i++) step();
  // for happy / proud replay the entry bounce by re-setting the state
  if (name === 'happy' || name === 'proud' || name === 'error') face.set(name);
  for (let i = 0; i < FRAMES; i++) {
    step();
    S.dL.push(f1(eyeL.getAttribute('d') || 'M0 0Z'));
    S.dR.push(f1(eyeR.getAttribute('d') || 'M0 0Z'));
    S.cL.push(f1(crossL.getAttribute('d') || ''));
    S.cR.push(f1(crossR.getAttribute('d') || ''));
    S.opL.push(eyeL.getAttribute('opacity') ?? '1');
    S.opR.push(eyeR.getAttribute('opacity') ?? '1');
    S.coL.push(crossL.getAttribute('opacity') ?? '0');
    S.coR.push(crossR.getAttribute('opacity') ?? '0');
    const t = head.getAttribute('transform') || '';
    const m =
      /translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\) scale\(([-\d.]+) ([-\d.]+)\)/.exec(t);
    const [px, py] = HEAD_PIVOT;
    S.tr.push(m ? `${(+m[1] - px).toFixed(1)} ${(+m[2] - py).toFixed(1)}` : '0 0');
    S.rot.push(m ? `${(+m[3]).toFixed(1)} ${px} ${py}` : `0 ${px} ${py}`);
    S.sc.push(m ? `${(+m[4]).toFixed(3)} ${(+m[5]).toFixed(3)}` : '1 1');
    const zs = el.querySelectorAll('.npface-zzz text');
    for (let k = 0; k < 3; k++) {
      const z = zs[k];
      S.z[k].push(
        z
          ? {
              x: z.getAttribute('x'),
              y: z.getAttribute('y'),
              fs: z.getAttribute('font-size'),
              op: z.getAttribute('opacity'),
            }
          : { x: '0', y: '0', fs: '0', op: '0' },
      );
    }
  }
  face.destroy();
  host.remove();

  const c = LIGHT_COLORS;
  const id = `clip-${name}`;
  const rect = `x="${VISOR.x}" y="${VISOR.y}" width="${VISOR.w}" height="${VISOR.h}" rx="${VISOR.h / 2}"`;
  const [px, py] = HEAD_PIVOT;
  // scale must happen around the pivot: translate(pivot) scale translate(-pivot)
  const zzz =
    name === 'sleep'
      ? `<g font-family="ui-rounded, system-ui, sans-serif" font-weight="800" fill="${c.zzz}" text-anchor="middle">${S.z
          .map(
            (zs) =>
              `<text x="${zs[0].x}" y="${zs[0].y}" font-size="${zs[0].fs}" opacity="${zs[0].op}">z${anim(
                'x',
                zs.map((s) => s.x),
              )}${anim(
                'y',
                zs.map((s) => s.y),
              )}${anim(
                'font-size',
                zs.map((s) => s.fs),
              )}${anim(
                'opacity',
                zs.map((s) => s.op),
              )}</text>`,
          )
          .join('')}</g>`
      : '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -14 120 126" width="120" height="120" role="img" aria-label="npface ${name} (animated)">
<rect x="-10" y="-14" width="120" height="126" rx="20" fill="#f6f7f2"/>
<defs><clipPath id="${id}"><rect ${rect}/></clipPath></defs>
<g transform="translate(${S.tr[0]})">${animT('translate', S.tr)}
<g transform="rotate(${S.rot[0]})">${animT('rotate', S.rot)}
<g transform="translate(${px} ${py})"><g transform="scale(${S.sc[0]})">${animT('scale', S.sc)}<g transform="translate(${-px} ${-py})">
<path d="${HELMET_PATH}" fill="${c.body}"/>
<rect ${rect} fill="${c.visor}"/>
<g clip-path="url(#${id})">
<path d="${S.dL[0]}" fill="${c.eye}" opacity="${S.opL[0]}">${anim('d', S.dL)}${anim('opacity', S.opL)}</path>
<path d="${S.dR[0]}" fill="${c.eye}" opacity="${S.opR[0]}">${anim('d', S.dR)}${anim('opacity', S.opR)}</path>
<path d="${S.cL[0]}" stroke="${c.eye}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="${S.coL[0]}">${anim('d', S.cL)}${anim('opacity', S.coL)}</path>
<path d="${S.cR[0]}" stroke="${c.eye}" stroke-width="2.6" stroke-linecap="round" fill="none" opacity="${S.coR[0]}">${anim('d', S.cR)}${anim('opacity', S.coR)}</path>
</g></g></g></g></g></g>${zzz}
</svg>
`;
  writeFileSync(resolve(OUT, `${name}.svg`), svg);
  return svg.length;
}

let total = 0;
for (const name of STATE_NAMES) {
  const bytes = record(name);
  total += bytes;
  console.log(`${name.padEnd(10)} ${(bytes / 1024).toFixed(1).padStart(6)} KB`);
}
console.log(`total ${(total / 1024).toFixed(0)} KB → assets/states/*.svg`);
