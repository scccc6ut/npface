/**
 * Motion layers: evaluate a state's `motions` over time and add the result to a pose.
 * Discrete motions (glance / wander / keys) are smoothed through their own springs.
 */
import type { EyeProp, HeadProp, Motion, MotionTarget, Pose, SpringConfig } from './types';
import { EASE, SPRINGS, Spring, rand, resolveSpring } from './spring';

const TWO_PI = Math.PI * 2;

/** Add `delta` to the prop addressed by `target` on `pose`. */
export function addToPose(pose: Pose, target: MotionTarget, delta: number): void {
  if (delta === 0) return;
  const dot = target.indexOf('.');
  const group = target.slice(0, dot);
  const prop = target.slice(dot + 1);
  if (group === 'head') {
    (pose.head as Record<HeadProp, number>)[prop as HeadProp] += delta;
  } else if (group === 'eyeL') {
    (pose.l as Record<EyeProp, number>)[prop as EyeProp] += delta;
  } else if (group === 'eyeR') {
    (pose.r as Record<EyeProp, number>)[prop as EyeProp] += delta;
  } else {
    (pose.l as Record<EyeProp, number>)[prop as EyeProp] += delta;
    (pose.r as Record<EyeProp, number>)[prop as EyeProp] += delta;
  }
}

interface Runtime {
  /** current value spring (discrete motions) */
  s?: Spring;
  /** secondary spring (glance y) */
  s2?: Spring;
  /** next event time (ms, absolute) */
  next: number;
  /** glance: time at which the glance ends, or 0 */
  until: number;
  /** keys: current index */
  idx: number;
}

export class MotionLayer {
  readonly weight = new Spring(0, SPRINGS.soft);
  /** set to true when the layer should fade out and be removed */
  fading = false;
  private readonly rt: Runtime[];
  /** random time offset (ms) so several faces never move in lockstep; shared by all motions of the layer */
  private readonly ph = Math.random() * 1e4;

  constructor(
    readonly motions: Motion[],
    private readonly t0: number,
  ) {
    this.rt = motions.map((m) => {
      const rt: Runtime = { next: 0, until: 0, idx: 0 };
      if (m.type === 'glance') {
        rt.s = new Spring(0, resolveSpring(m.spring, SPRINGS.snappy));
        rt.s2 = new Spring(0, resolveSpring(m.spring, SPRINGS.snappy));
        rt.next = t0 + rand(m.every[0], m.every[1]) * 0.6;
      } else if (m.type === 'wander') {
        rt.s = new Spring(0, resolveSpring(m.spring, SPRINGS.soft));
        rt.next = t0 + rand(m.every[0], m.every[1]);
      } else if (m.type === 'keys') {
        const n = Math.max(1, m.values.length);
        rt.idx = Math.floor(this.ph / (m.period / n)) % n;
        rt.s = new Spring(m.values[rt.idx] ?? 0, resolveSpring(m.spring, SPRINGS.snappy));
      }
      return rt;
    });
  }

  /** True when the layer is fully faded out and can be dropped. */
  get dead(): boolean {
    return this.fading && !this.weight.moving && this.weight.v < 0.001;
  }

  /**
   * Advance and apply to `pose`. Returns a bitmask: 1 = eyes changed, 2 = head changed.
   */
  apply(pose: Pose, now: number, dt: number): number {
    this.weight.step(dt);
    const w = this.weight.v;
    if (w <= 0.0005) return 0;
    let changed = 0;
    const t = now - this.t0 + this.ph;
    for (let i = 0; i < this.motions.length; i++) {
      const m = this.motions[i]!;
      const rt = this.rt[i]!;
      switch (m.type) {
        case 'sine': {
          const v = m.amp * Math.sin(TWO_PI * (t / m.period + (m.phase ?? 0)));
          addToPose(pose, m.target, v * w);
          changed |= mask(m.target);
          break;
        }
        case 'sweep': {
          const back = m.back ?? 0.2;
          const u = ((t / m.period) % 1 + 1) % 1;
          const ease = EASE[m.ease ?? 'inOutSine'];
          const p = u < 1 - back ? ease(u / (1 - back)) : 1 - ease((u - (1 - back)) / back);
          addToPose(pose, m.target, (m.from + (m.to - m.from) * p) * w);
          changed |= mask(m.target);
          break;
        }
        case 'wander': {
          const s = rt.s!;
          if (now >= rt.next) {
            s.set(rand(m.range[0], m.range[1]));
            rt.next = now + rand(m.every[0], m.every[1]);
          }
          if (s.step(dt) || s.v !== 0) {
            addToPose(pose, m.target, s.v * w);
            changed |= mask(m.target);
          }
          break;
        }
        case 'keys': {
          const s = rt.s!;
          const n = Math.max(1, m.values.length);
          const idx = Math.floor(t / (m.period / n)) % n;
          if (idx !== rt.idx) {
            rt.idx = idx;
            s.set(m.values[idx] ?? 0);
          }
          s.step(dt);
          addToPose(pose, m.target, s.v * w);
          changed |= mask(m.target);
          break;
        }
        case 'glance': {
          const sx = rt.s!;
          const sy = rt.s2!;
          if (rt.until && now >= rt.until) {
            rt.until = 0;
            sx.set(0);
            sy.set(0);
            rt.next = now + rand(m.every[0], m.every[1]);
          } else if (!rt.until && now >= rt.next) {
            sx.set(rand(m.x[0], m.x[1]));
            sy.set(rand(m.y[0], m.y[1]));
            rt.until = now + rand(m.hold[0], m.hold[1]);
          }
          const mx = sx.step(dt);
          const my = sy.step(dt);
          if (mx || my || sx.v !== 0 || sy.v !== 0) {
            pose.l.x += sx.v * w;
            pose.r.x += sx.v * w;
            pose.l.y += sy.v * w;
            pose.r.y += sy.v * w;
            changed |= 1;
            if (m.head) {
              pose.head.rot += sx.v * m.head * w;
              changed |= 2;
            }
          }
          break;
        }
      }
    }
    return changed;
  }
}

function mask(target: MotionTarget): number {
  return target.charCodeAt(0) === 104 /* 'h' */ ? 2 : 1;
}

export type { SpringConfig };
