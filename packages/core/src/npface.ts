/**
 * npface instance — renders one helmet avatar into an SVG element and animates it.
 * Framework-agnostic, zero dependencies, driven by one shared requestAnimationFrame loop.
 */
import type {
  BlinkConfig,
  EyeProp,
  EyeShape,
  HeadPose,
  HeadProp,
  Npface,
  NpfaceColors,
  NpfaceOptions,
  Pose,
  SequenceStep,
  SpringConfig,
  SpringSpec,
  StateDef,
  Theme,
} from './types';
import { ALIASES, BASE_EYE, BASE_HEAD, DEFAULT_BLINK, STATES } from './states';
import {
  EYE_HOME,
  HEAD_PIVOT,
  HELMET_PATH,
  VIEW,
  VISOR,
  crossPath,
  crossWidth,
  eyePath,
} from './geometry';
import { EASE, SPRINGS, SPRING_REDUCED, Spring, clamp, rand, resolveSpring } from './spring';
import { MotionLayer } from './motion';
import { now as nowMs, subscribe, unsubscribe } from './ticker';
import {
  darkSchemeQuery,
  isBrowser,
  pointerX,
  pointerY,
  reducedMotionQuery,
  usePointer,
} from './env';

const SVG_NS = 'http://www.w3.org/2000/svg';
let uid = 0;

/** Brand palette (npcrew). */
export const PALETTE = {
  navy: '#0f1d3a',
  lime: '#c7f636',
  limeDeep: '#4c6606',
  limePale: '#eff8cf',
  sand: '#e9ebe4',
  warmWhite: '#f6f7f2',
} as const;

export const LIGHT_COLORS: NpfaceColors = {
  body: PALETTE.navy,
  visor: '#ffffff',
  eye: PALETTE.lime,
  rim: 'none',
  zzz: PALETTE.navy,
};

export const DARK_COLORS: NpfaceColors = {
  body: '#1b2d56',
  visor: PALETTE.warmWhite,
  eye: PALETTE.lime,
  rim: 'none',
  zzz: PALETTE.sand,
};

const EYE_PROPS: EyeProp[] = [
  'x',
  'y',
  'w',
  'h',
  'r',
  'rot',
  'lidT',
  'lidB',
  'tiltT',
  'tiltB',
  'curveT',
  'curveB',
  'cross',
  'fill',
];
const HEAD_PROPS: HeadProp[] = ['x', 'y', 'rot', 'sx', 'sy'];

/* blink timing (ms) */
const BLINK_CLOSE = 70;
const BLINK_OPEN = 130;
const BLINK_GAP = 70;

/* gaze response */
const GAZE_EYE_X = 4.5;
const GAZE_EYE_Y = 3.2;
const GAZE_HEAD_ROT = 3.5;
const GAZE_HEAD_X = 0.8;
const GAZE_HEAD_Y = 0.6;

type EyeSprings = Record<EyeProp, Spring>;
type HeadSprings = Record<HeadProp, Spring>;

function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
}

function eyeSprings(): EyeSprings {
  const o = {} as EyeSprings;
  for (const p of EYE_PROPS) o[p] = new Spring(BASE_EYE[p]);
  return o;
}
function headSprings(): HeadSprings {
  const o = {} as HeadSprings;
  for (const p of HEAD_PROPS) o[p] = new Spring(BASE_HEAD[p]);
  return o;
}

/** Merge `extends` chains; returns a flat StateDef. */
export function resolveDef(def: StateDef, registry: Record<string, StateDef>, depth = 0): StateDef {
  if (!def.extends || depth > 8) return def;
  const base = registry[def.extends];
  if (!base) return def;
  const b = resolveDef(base, registry, depth + 1);
  const out: StateDef = { ...b, ...def };
  out.eye = { ...b.eye, ...def.eye };
  out.head = { ...b.head, ...def.head };
  if (b.eyes || def.eyes) {
    out.eyes = [
      { ...b.eyes?.[0], ...def.eyes?.[0] },
      { ...b.eyes?.[1], ...def.eyes?.[1] },
    ];
  }
  delete out.extends;
  return out;
}

/** Canonical state name for `name` (alias-aware); unknown names fall back to `idle`. */
export function resolveStateName(name: string, registry: Record<string, StateDef> = STATES): string {
  const n = (name || '').trim();
  if (registry[n]) return n;
  const a = ALIASES[n] ?? ALIASES[n.toLowerCase()];
  if (a && registry[a]) return a;
  const lower = n.toLowerCase();
  if (registry[lower]) return lower;
  return 'idle';
}

function stateSpring(def: StateDef, group: 'eye' | 'head', rm: boolean): SpringConfig {
  if (rm) return SPRING_REDUCED;
  const s = def.spring;
  if (!s) return SPRINGS.default;
  if (typeof s === 'string' || 'stiffness' in s) return resolveSpring(s as SpringSpec, SPRINGS.default);
  return resolveSpring(s[group], SPRINGS.default);
}

export class NpfaceInstance implements Npface {
  readonly el: SVGSVGElement;

  private readonly root: SVGGElement;
  private readonly body: SVGPathElement;
  private readonly visor: SVGRectElement;
  private readonly eyeL: SVGPathElement;
  private readonly eyeR: SVGPathElement;
  private readonly crossL: SVGPathElement;
  private readonly crossR: SVGPathElement;
  private zzz: { g: SVGGElement; t: SVGTextElement[]; w: Spring } | null = null;

  private readonly registry: Record<string, StateDef>;
  private _state = 'idle';
  private def: StateDef = STATES.idle!;

  private readonly sl = eyeSprings();
  private readonly sr = eyeSprings();
  private readonly sh = headSprings();
  private readonly pose: Pose = {
    l: { ...BASE_EYE },
    r: { ...BASE_EYE },
    head: { ...BASE_HEAD },
  };

  private layers: MotionLayer[] = [];
  private seq: { steps: SequenceStep[]; loop?: number; start: number; idx: number } | null = null;

  private blinkCfg: BlinkConfig | false = DEFAULT_BLINK;
  private blinkAt = 0;
  private blinkStart = -1;
  private blinkDouble = false;
  private lastBlink = 0;

  private gazeOn = false;
  private manual: [number, number] | null = null;
  private readonly gazeW = new Spring(0, SPRINGS.soft);
  private readonly gx = new Spring(0, { stiffness: 140, damping: 19 });
  private readonly gy = new Spring(0, { stiffness: 140, damping: 19 });
  private rect: { cx: number; cy: number; size: number; t: number } | null = null;
  private releasePointer: (() => void) | null = null;

  private rmOpt: boolean | 'auto';
  private rm = false;
  private unRm: (() => void) | null = null;

  private theme: Theme;
  private unDark: (() => void) | null = null;
  private overrides: Partial<NpfaceColors>;
  private label: string | undefined;

  private visible = true;
  private io: IntersectionObserver | null = null;
  private ticking = false;
  private wakeTimer: ReturnType<typeof setTimeout> | null = null;
  private pulseTimer: ReturnType<typeof setTimeout> | null = null;
  private pulseBase: string | null = null;
  private nextTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  private lastD = ['', '', '', ''];
  private lastHead = '';
  /** force a full render on the next frame (initial paint, snaps) */
  private dirty = true;
  private readonly onChange: NpfaceOptions['onChange'];

  constructor(container: Element, opts: NpfaceOptions = {}) {
    this.registry = opts.states ? { ...STATES, ...opts.states } : STATES;
    if (opts.states) {
      for (const k in opts.states) this.registry[k] = resolveDef(opts.states[k]!, this.registry);
    }
    this.rmOpt = opts.reducedMotion ?? 'auto';
    this.theme = opts.theme ?? 'auto';
    this.overrides = { ...opts.colors };
    this.label = opts.label;
    this.onChange = opts.onChange;

    /* ----- DOM ----- */
    const el = svg('svg', {
      viewBox: `0 0 ${VIEW} ${VIEW}`,
      role: 'img',
      class: 'npface',
      'aria-label': opts.label ?? 'idle',
    });
    el.style.display = 'inline-block';
    el.style.verticalAlign = 'middle';
    el.style.overflow = 'visible';
    if (opts.className) for (const c of opts.className.split(/\s+/)) if (c) el.classList.add(c);
    this.el = el;

    const root = svg('g', { class: 'npface-head' });
    this.root = root;
    this.body = svg('path', { class: 'npface-body', d: HELMET_PATH });
    this.visor = svg('rect', {
      class: 'npface-visor',
      x: VISOR.x,
      y: VISOR.y,
      width: VISOR.w,
      height: VISOR.h,
      rx: VISOR.h / 2,
      ry: VISOR.h / 2,
    });
    // eyes are clipped by the visor slot
    const clipId = 'npface-clip-' + (++uid).toString(36);
    const clip = svg('clipPath', { id: clipId });
    clip.appendChild(
      svg('rect', {
        x: VISOR.x,
        y: VISOR.y,
        width: VISOR.w,
        height: VISOR.h,
        rx: VISOR.h / 2,
        ry: VISOR.h / 2,
      }),
    );
    const defs = svg('defs');
    defs.appendChild(clip);
    const eyes = svg('g', { class: 'npface-eyes', 'clip-path': `url(#${clipId})` });
    this.eyeL = svg('path', { class: 'npface-eye npface-eye-l' });
    this.eyeR = svg('path', { class: 'npface-eye npface-eye-r' });
    const crossAttrs = {
      class: 'npface-cross',
      fill: 'none',
      'stroke-linecap': 'round',
      'stroke-width': 3,
    };
    this.crossL = svg('path', crossAttrs);
    this.crossR = svg('path', crossAttrs);
    eyes.append(this.eyeL, this.eyeR, this.crossL, this.crossR);
    root.append(this.body, this.visor, eyes);
    el.append(defs, root);
    container.appendChild(el);

    this.setSize(opts.size ?? 48);
    this.applyColors();

    /* ----- environment ----- */
    if (this.rmOpt === 'auto') {
      this.rm = reducedMotionQuery.matches();
      this.unRm = reducedMotionQuery.on((m) => {
        this.rm = m;
        this.applyState(this._state, true);
      });
    } else this.rm = this.rmOpt;
    if (this.theme === 'auto') this.unDark = darkSchemeQuery.on(() => this.applyColors());

    if (opts.pauseOffscreen !== false && isBrowser() && 'IntersectionObserver' in window) {
      this.io = new IntersectionObserver((entries) => {
        const e = entries[entries.length - 1];
        if (!e) return;
        this.visible = e.isIntersecting;
        if (this.visible) this.wake();
        else this.sleep();
      });
      this.io.observe(el);
    }

    /* ----- initial state ----- */
    this.applyState(opts.state ?? opts.emotion ?? 'idle', true);
    if (opts.follow ?? opts.gaze) this.follow(true);
  }

  /* ------------------------------------------------------------------ */
  /* public API                                                          */
  /* ------------------------------------------------------------------ */

  get state(): string {
    return this._state;
  }

  set(state: string, opts?: { immediate?: boolean }): void {
    if (this.destroyed) return;
    if (state === 'blink') {
      this.blink();
      return;
    }
    this.cancelPulse();
    this.applyState(state, !!opts?.immediate);
  }

  pulse(state: string, duration?: number): void {
    if (this.destroyed) return;
    if (state === 'blink') {
      this.blink();
      return;
    }
    const base = this.pulseBase ?? this._state;
    const name = resolveStateName(state, this.registry);
    this.cancelPulse();
    this.pulseBase = base;
    this.applyState(name, false);
    const ms = duration ?? this.def.pulse ?? 1500;
    this.pulseTimer = setTimeout(() => {
      this.pulseTimer = null;
      const back = this.pulseBase;
      this.pulseBase = null;
      if (back !== null && !this.destroyed) this.applyState(back, false);
    }, ms);
  }

  follow(on: boolean): void {
    if (this.destroyed) return;
    this.gazeOn = on;
    if (on && !this.releasePointer) this.releasePointer = usePointer();
    if (!on && this.releasePointer) {
      this.releasePointer();
      this.releasePointer = null;
    }
    this.wake();
  }

  look(x: number | null, y = 0): void {
    if (this.destroyed) return;
    this.manual = x === null ? null : [clamp(x, -1, 1), clamp(y, -1, 1)];
    this.wake();
  }

  blink(): void {
    if (this.destroyed || this.rm) return;
    if (this.blinkStart < 0) {
      this.blinkStart = nowMs();
      this.blinkDouble = false;
      this.wake();
    }
  }

  setColors(colors: Partial<NpfaceColors>): void {
    for (const k in colors) {
      const key = k as keyof NpfaceColors;
      if (colors[key] === undefined) delete this.overrides[key];
      else this.overrides[key] = colors[key];
    }
    this.applyColors();
  }

  setSize(size: number | string): void {
    const el = this.el;
    if (typeof size === 'number') {
      el.setAttribute('width', String(size));
      el.setAttribute('height', String(size));
      el.style.width = '';
      el.style.height = '';
    } else {
      el.removeAttribute('width');
      el.removeAttribute('height');
      el.style.width = size;
      el.style.height = size;
    }
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    if (theme === 'auto' && !this.unDark) this.unDark = darkSchemeQuery.on(() => this.applyColors());
    this.applyColors();
  }

  setLabel(label: string): void {
    this.label = label;
    this.el.setAttribute('aria-label', label);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sleep();
    this.cancelPulse();
    if (this.nextTimer) clearTimeout(this.nextTimer);
    if (this.wakeTimer) clearTimeout(this.wakeTimer);
    this.io?.disconnect();
    this.releasePointer?.();
    this.unRm?.();
    this.unDark?.();
    this.el.remove();
  }

  /* ------------------------------------------------------------------ */
  /* state machine                                                       */
  /* ------------------------------------------------------------------ */

  private cancelPulse(): void {
    if (this.pulseTimer) clearTimeout(this.pulseTimer);
    this.pulseTimer = null;
    this.pulseBase = null;
  }

  private applyState(name: string, immediate: boolean): void {
    const canonical = resolveStateName(name, this.registry);
    const def = this.registry[canonical] ?? STATES.idle!;
    const prev = this._state;
    this._state = canonical;
    this.def = def;
    const now = nowMs();
    const rm = this.rm;
    const snap = immediate || rm;

    if (this.nextTimer) clearTimeout(this.nextTimer);
    this.nextTimer = null;

    // targets
    const cfgEye = stateSpring(def, 'eye', rm);
    const cfgHead = stateSpring(def, 'head', rm);
    this.applyTargets({ ...BASE_EYE, ...def.eye, ...def.eyes?.[0] }, { ...BASE_EYE, ...def.eye, ...def.eyes?.[1] }, { ...BASE_HEAD, ...def.head }, cfgEye, cfgHead, immediate);

    // entry sequence
    this.seq = null;
    if (def.sequence && def.sequence.steps.length) {
      if (snap) {
        // resolve to the final choreography frame
        for (const st of def.sequence.steps) this.applyStep(st, immediate, cfgEye, cfgHead);
      } else {
        this.seq = { steps: def.sequence.steps, loop: def.sequence.loop, start: now, idx: -1 };
      }
    }

    // motion layers
    for (const l of this.layers) {
      l.fading = true;
      l.weight.set(0);
      if (immediate) l.weight.snap(0);
    }
    this.layers = this.layers.filter((l) => !l.dead);
    if (!rm && def.motions && def.motions.length) {
      const layer = new MotionLayer(def.motions, now);
      layer.weight.set(1);
      if (immediate) layer.weight.snap(1);
      this.layers.push(layer);
    }

    // blink rhythm
    this.blinkCfg = rm ? false : def.blink === undefined ? DEFAULT_BLINK : def.blink;
    if (this.blinkCfg) this.blinkAt = now + rand(this.blinkCfg.every[0], this.blinkCfg.every[1]);
    if (!this.blinkCfg) this.blinkStart = -1;

    // zzz
    if (def.zzz) {
      this.ensureZzz();
      this.zzz!.w.set(1);
      if (immediate) this.zzz!.w.snap(1);
    } else if (this.zzz) {
      this.zzz.w.set(0);
      if (immediate) this.zzz.w.snap(0);
    }

    // auto-transition
    if (def.next) {
      const to = def.next.to;
      this.nextTimer = setTimeout(() => {
        this.nextTimer = null;
        if (!this.destroyed && this._state === canonical) this.applyState(to, false);
      }, def.next.after);
    }

    this.el.setAttribute('data-state', canonical);
    if (!this.label) this.el.setAttribute('aria-label', canonical);
    this.dirty = true;
    this.wake();
    if (prev !== canonical) this.onChange?.(canonical, prev);
  }

  private applyTargets(
    l: EyeShape,
    r: EyeShape,
    head: HeadPose,
    cfgEye: SpringConfig,
    cfgHead: SpringConfig,
    snap: boolean,
  ): void {
    for (const p of EYE_PROPS) {
      if (snap) {
        this.sl[p].snap(l[p]);
        this.sr[p].snap(r[p]);
      } else {
        this.sl[p].set(l[p], cfgEye);
        this.sr[p].set(r[p], cfgEye);
      }
    }
    for (const p of HEAD_PROPS) {
      if (snap) this.sh[p].snap(head[p]);
      else this.sh[p].set(head[p], cfgHead);
    }
  }

  private applyStep(st: SequenceStep, snap: boolean, cfgEye: SpringConfig, cfgHead: SpringConfig): void {
    const ce = st.spring ? resolveSpring(st.spring, cfgEye) : cfgEye;
    const ch = st.spring ? resolveSpring(st.spring, cfgHead) : cfgHead;
    const setEye = (s: EyeSprings, part: Partial<EyeShape> | undefined) => {
      if (!part) return;
      for (const k in part) {
        const p = k as EyeProp;
        const v = part[p];
        if (v === undefined) continue;
        if (snap) s[p].snap(v);
        else s[p].set(v, ce);
      }
    };
    setEye(this.sl, st.eye);
    setEye(this.sr, st.eye);
    setEye(this.sl, st.eyes?.[0]);
    setEye(this.sr, st.eyes?.[1]);
    if (st.head) {
      for (const k in st.head) {
        const p = k as HeadProp;
        const v = st.head[p];
        if (v === undefined) continue;
        if (snap) this.sh[p].snap(v);
        else this.sh[p].set(v, ch);
      }
    }
  }

  private advanceSequence(now: number): void {
    const seq = this.seq;
    if (!seq) return;
    const t = now - seq.start;
    const cfgEye = stateSpring(this.def, 'eye', this.rm);
    const cfgHead = stateSpring(this.def, 'head', this.rm);
    while (seq.idx + 1 < seq.steps.length && seq.steps[seq.idx + 1]!.at <= t) {
      seq.idx++;
      this.applyStep(seq.steps[seq.idx]!, false, cfgEye, cfgHead);
    }
    if (seq.idx >= seq.steps.length - 1) {
      if (seq.loop) {
        if (t >= seq.loop) {
          seq.start += seq.loop;
          seq.idx = -1;
        }
      } else this.seq = null;
    }
  }

  /* ------------------------------------------------------------------ */
  /* colours / theme                                                     */
  /* ------------------------------------------------------------------ */

  private palette(): NpfaceColors {
    const dark = this.theme === 'dark' || (this.theme === 'auto' && darkSchemeQuery.matches());
    return { ...(dark ? DARK_COLORS : LIGHT_COLORS), ...this.overrides };
  }

  private applyColors(): void {
    const c = this.palette();
    this.body.setAttribute('fill', c.body);
    if (c.rim && c.rim !== 'none') {
      this.body.setAttribute('stroke', c.rim);
      this.body.setAttribute('stroke-width', '1.5');
    } else {
      this.body.removeAttribute('stroke');
      this.body.removeAttribute('stroke-width');
    }
    this.visor.setAttribute('fill', c.visor);
    this.eyeL.setAttribute('fill', c.eye);
    this.eyeR.setAttribute('fill', c.eye);
    this.crossL.setAttribute('stroke', c.eye);
    this.crossR.setAttribute('stroke', c.eye);
    if (this.zzz) for (const t of this.zzz.t) t.setAttribute('fill', c.zzz);
  }

  /* ------------------------------------------------------------------ */
  /* zzz                                                                 */
  /* ------------------------------------------------------------------ */

  private ensureZzz(): void {
    if (this.zzz) return;
    const g = svg('g', { class: 'npface-zzz', 'aria-hidden': 'true' });
    const t: SVGTextElement[] = [];
    const c = this.palette();
    for (let i = 0; i < 3; i++) {
      const tx = svg('text', {
        'font-family': "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif",
        'font-weight': 800,
        'text-anchor': 'middle',
        fill: c.zzz,
        opacity: 0,
      });
      tx.textContent = 'z';
      t.push(tx);
      g.appendChild(tx);
    }
    this.el.appendChild(g);
    this.zzz = { g, t, w: new Spring(0, SPRINGS.soft) };
  }

  private updateZzz(now: number, dt: number): boolean {
    const z = this.zzz;
    if (!z) return false;
    z.w.step(dt);
    const w = z.w.v;
    if (w <= 0.001 && !z.w.moving && !this.def.zzz) {
      z.g.remove();
      this.zzz = null;
      return false;
    }
    const animating = !this.rm || z.w.moving;
    for (let i = 0; i < 3; i++) {
      const u = this.rm ? 0.25 + i * 0.25 : (((now / 2600 + i / 3) % 1) + 1) % 1;
      const x = 83 + 13 * u;
      const y = 15 - 24 * u;
      const op = Math.sin(Math.PI * u) * w;
      const tx = z.t[i]!;
      tx.setAttribute('x', x.toFixed(1));
      tx.setAttribute('y', y.toFixed(1));
      tx.setAttribute('font-size', (5 + 6 * u).toFixed(1));
      tx.setAttribute('opacity', op.toFixed(2));
    }
    return animating;
  }

  /* ------------------------------------------------------------------ */
  /* blink                                                               */
  /* ------------------------------------------------------------------ */

  /** 0..1 closure of the current blink, advancing the blink schedule. */
  private blinkValue(now: number): number {
    if (this.blinkStart < 0) {
      if (!this.blinkCfg || now < this.blinkAt) return 0;
      if (now - this.blinkAt > 800) {
        // we were paused (hidden tab / off-screen): don't blink in unison on resume, reschedule
        this.blinkAt = now + rand(200, this.blinkCfg.every[1] * 0.5);
        return 0;
      }
      this.blinkStart = now;
      this.blinkDouble = Math.random() < (this.blinkCfg.double ?? 0);
    }
    const one = BLINK_CLOSE + BLINK_OPEN;
    const curve = (t: number): number =>
      t < BLINK_CLOSE
        ? EASE.inQuad(t / BLINK_CLOSE)
        : t < one
          ? 1 - EASE.outQuad((t - BLINK_CLOSE) / BLINK_OPEN)
          : -1;
    const t = now - this.blinkStart;
    let v = curve(t);
    if (v < 0 && this.blinkDouble) {
      const t2 = t - one - BLINK_GAP;
      v = t2 < 0 ? 0 : curve(t2);
    }
    if (v < 0) {
      this.blinkStart = -1;
      if (this.blinkCfg) this.blinkAt = now + rand(this.blinkCfg.every[0], this.blinkCfg.every[1]);
      return 0;
    }
    return v;
  }

  /* ------------------------------------------------------------------ */
  /* gaze                                                                */
  /* ------------------------------------------------------------------ */

  /** Normalised look direction or null. */
  private gazeTarget(now: number): [number, number] | null {
    if (this.manual) return this.manual;
    if (!this.gazeOn) return null;
    const px = pointerX();
    const py = pointerY();
    if (px !== px || py !== py) return null; // NaN → pointer left
    if (!this.rect || now - this.rect.t > 300) {
      const r = this.el.getBoundingClientRect();
      this.rect = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, size: r.width || 48, t: now };
    }
    const dx = px - this.rect.cx;
    const dy = py - this.rect.cy;
    const d = Math.hypot(dx, dy);
    if (d < 0.5) return [0, 0];
    const reach = Math.max(160, this.rect.size * 4);
    const k = Math.pow(Math.min(1, d / reach), 0.7);
    return [(dx / d) * k, (dy / d) * k];
  }

  /** Returns a bitmask: 1 = eyes changed, 2 = head changed. */
  private applyGaze(now: number, dt: number): number {
    const tgt = this.rm ? null : this.gazeTarget(now);
    if (tgt) {
      this.gx.set(tgt[0]);
      this.gy.set(tgt[1]);
      this.gazeW.set(1);
    } else {
      this.gx.set(0);
      this.gy.set(0);
      this.gazeW.set(0);
    }
    const m1 = this.gx.step(dt);
    const m2 = this.gy.step(dt);
    const m3 = this.gazeW.step(dt);
    const w = this.gazeW.v;
    if (w <= 0.0005) return 0;
    const x = this.gx.v * w;
    const y = this.gy.v * w;
    const p = this.pose;
    p.l.x += x * GAZE_EYE_X;
    p.r.x += x * GAZE_EYE_X;
    p.l.y += y * GAZE_EYE_Y;
    p.r.y += y * GAZE_EYE_Y;
    p.head.rot += x * GAZE_HEAD_ROT;
    p.head.x += x * GAZE_HEAD_X;
    p.head.y += y * GAZE_HEAD_Y;
    return m1 || m2 || m3 ? 3 : 0;
  }

  /* ------------------------------------------------------------------ */
  /* frame loop                                                          */
  /* ------------------------------------------------------------------ */

  private readonly tick = (now: number, dt: number): void => {
    if (this.destroyed) return;
    this.advanceSequence(now);

    // 1. springs → base pose
    let eyesDirty = this.dirty;
    let headDirty = this.dirty;
    this.dirty = false;
    const p = this.pose;
    for (const k of EYE_PROPS) {
      const a = this.sl[k];
      const b = this.sr[k];
      if (a.step(dt)) eyesDirty = true;
      if (b.step(dt)) eyesDirty = true;
      p.l[k] = a.v;
      p.r[k] = b.v;
    }
    for (const k of HEAD_PROPS) {
      const s = this.sh[k];
      if (s.step(dt)) headDirty = true;
      p.head[k] = s.v;
    }

    // 2. motion layers
    let anyLayer = false;
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i]!;
      const m = layer.apply(p, now, dt);
      if (m & 1) eyesDirty = true;
      if (m & 2) headDirty = true;
      if (layer.dead) this.layers.splice(i, 1);
      else anyLayer = true;
    }

    // 3. gaze
    const g = this.applyGaze(now, dt);
    if (g & 1) eyesDirty = true;
    if (g & 2) headDirty = true;

    // 4. blink
    const bl = this.blinkValue(now);
    if (bl !== this.lastBlink) eyesDirty = true;
    this.lastBlink = bl;

    // 5. zzz
    const zzzActive = this.updateZzz(now, dt);

    // 6. render
    if (eyesDirty) this.renderEyes(bl);
    if (headDirty) this.renderHead();

    // 7. dormancy — only blink timing may still be pending
    const active =
      eyesDirty ||
      headDirty ||
      anyLayer ||
      zzzActive ||
      !!this.seq ||
      this.blinkStart >= 0 ||
      g !== 0 ||
      (!this.rm && (this.gazeOn || !!this.manual));
    if (!active) {
      this.sleep();
      if (this.blinkCfg && this.visible) {
        const wait = Math.max(16, this.blinkAt - now);
        this.wakeTimer = setTimeout(() => {
          this.wakeTimer = null;
          this.wake();
        }, wait);
      }
    }
  };

  private renderEyes(blink: number): void {
    const p = this.pose;
    const [lx, ly] = EYE_HOME[0];
    const [rx, ry] = EYE_HOME[1];
    const d0 = eyePath(p.l, false, lx, ly, blink);
    const d1 = eyePath(p.r, true, rx, ry, blink);
    const d2 = crossPath(p.l, false, lx, ly);
    const d3 = crossPath(p.r, true, rx, ry);
    const L = this.lastD;
    if (d0 !== L[0]) this.eyeL.setAttribute('d', (L[0] = d0));
    if (d1 !== L[1]) this.eyeR.setAttribute('d', (L[1] = d1));
    if (d2 !== L[2]) {
      this.crossL.setAttribute('d', (L[2] = d2));
      this.crossL.setAttribute('stroke-width', crossWidth(p.l).toFixed(2));
      this.crossL.setAttribute('opacity', clamp(p.l.cross, 0, 1).toFixed(2));
    }
    if (d3 !== L[3]) {
      this.crossR.setAttribute('d', (L[3] = d3));
      this.crossR.setAttribute('stroke-width', crossWidth(p.r).toFixed(2));
      this.crossR.setAttribute('opacity', clamp(p.r.cross, 0, 1).toFixed(2));
    }
    const fl = clamp(p.l.fill, 0, 1).toFixed(2);
    const fr = clamp(p.r.fill, 0, 1).toFixed(2);
    if (this.eyeL.getAttribute('opacity') !== fl) this.eyeL.setAttribute('opacity', fl);
    if (this.eyeR.getAttribute('opacity') !== fr) this.eyeR.setAttribute('opacity', fr);
  }

  private renderHead(): void {
    const h = this.pose.head;
    const [px, py] = HEAD_PIVOT;
    const t =
      `translate(${(px + h.x).toFixed(2)} ${(py + h.y).toFixed(2)}) rotate(${h.rot.toFixed(2)}) ` +
      `scale(${h.sx.toFixed(3)} ${h.sy.toFixed(3)}) translate(${-px} ${-py})`;
    if (t !== this.lastHead) this.root.setAttribute('transform', (this.lastHead = t));
  }

  private wake(): void {
    if (this.destroyed || !this.visible || this.ticking) return;
    if (this.wakeTimer) {
      clearTimeout(this.wakeTimer);
      this.wakeTimer = null;
    }
    this.ticking = true;
    subscribe(this.tick);
  }

  private sleep(): void {
    if (!this.ticking) return;
    this.ticking = false;
    unsubscribe(this.tick);
  }
}

/**
 * Create a face inside `target` (an element or a CSS selector).
 *
 * ```ts
 * const face = createNpface(document.querySelector('#avatar')!, { state: 'idle', size: 48 });
 * face.set('thinking');
 * face.pulse('proud');
 * ```
 */
export function createNpface(target: Element | string, options: NpfaceOptions = {}): Npface {
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  if (!container) throw new Error('npface: target element not found');
  return new NpfaceInstance(container, options);
}
