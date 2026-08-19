import type { EaseName, SpringConfig, SpringPreset, SpringSpec } from './types';

export const SPRINGS: Record<SpringPreset, SpringConfig> = {
  default: { stiffness: 170, damping: 20 },
  soft: { stiffness: 90, damping: 16 },
  snappy: { stiffness: 330, damping: 27 },
  bouncy: { stiffness: 260, damping: 12 },
  slow: { stiffness: 45, damping: 12 },
};

/** Critically damped and quick — used when reduced motion is requested. */
export const SPRING_REDUCED: SpringConfig = { stiffness: 500, damping: 45 };

export function resolveSpring(spec: SpringSpec | undefined, fallback: SpringConfig): SpringConfig {
  if (!spec) return fallback;
  if (typeof spec === 'string') return SPRINGS[spec] ?? fallback;
  return spec;
}

const REST_POS = 0.004;
const REST_VEL = 0.02;
const MAX_STEP = 1 / 120;

/** A 1-D damped spring integrated with semi-implicit Euler in fixed sub-steps. */
export class Spring {
  v: number;
  vel = 0;
  target: number;
  k: number;
  c: number;

  constructor(value = 0, cfg: SpringConfig = SPRINGS.default) {
    this.v = value;
    this.target = value;
    this.k = cfg.stiffness;
    this.c = cfg.damping;
  }

  /** Set a new target, optionally changing the spring response. */
  set(target: number, cfg?: SpringConfig): void {
    this.target = target;
    if (cfg) {
      this.k = cfg.stiffness;
      this.c = cfg.damping;
    }
  }

  /** Jump to a value without animation. */
  snap(value: number): void {
    this.v = value;
    this.target = value;
    this.vel = 0;
  }

  /** True while the spring is not at rest. */
  get moving(): boolean {
    return Math.abs(this.v - this.target) > REST_POS || Math.abs(this.vel) > REST_VEL;
  }

  /** Advance by `dt` seconds. Returns true if the value changed. */
  step(dt: number): boolean {
    if (!this.moving) {
      if (this.v !== this.target) {
        this.v = this.target;
        this.vel = 0;
        return true;
      }
      return false;
    }
    let t = dt;
    while (t > 0) {
      const h = t > MAX_STEP ? MAX_STEP : t;
      t -= h;
      const a = -this.k * (this.v - this.target) - this.c * this.vel;
      this.vel += a * h;
      this.v += this.vel * h;
    }
    if (!this.moving) {
      this.v = this.target;
      this.vel = 0;
    }
    return true;
  }
}

export const EASE: Record<EaseName, (t: number) => number> = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);
