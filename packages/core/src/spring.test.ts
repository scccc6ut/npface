import { describe, expect, it } from 'vitest';
import { SPRINGS, Spring, resolveSpring } from './spring';

describe('spring', () => {
  it('converges to its target and reports rest', () => {
    const s = new Spring(0, SPRINGS.default);
    s.set(10);
    let steps = 0;
    while (s.moving && steps < 1000) {
      s.step(1 / 60);
      steps++;
    }
    expect(steps).toBeLessThan(1000);
    expect(s.v).toBeCloseTo(10, 3);
    expect(s.moving).toBe(false);
  });

  it('overshoots when under-damped and not when critically damped', () => {
    const b = new Spring(0, SPRINGS.bouncy);
    b.set(1);
    let max = 0;
    for (let i = 0; i < 240; i++) {
      b.step(1 / 120);
      max = Math.max(max, b.v);
    }
    expect(max).toBeGreaterThan(1.05);

    const c = new Spring(0, { stiffness: 500, damping: 45 });
    c.set(1);
    let maxC = 0;
    for (let i = 0; i < 240; i++) {
      c.step(1 / 120);
      maxC = Math.max(maxC, c.v);
    }
    expect(maxC).toBeLessThanOrEqual(1.01);
  });

  it('snap jumps without velocity', () => {
    const s = new Spring(0);
    s.set(5);
    s.step(0.05);
    s.snap(2);
    expect(s.v).toBe(2);
    expect(s.vel).toBe(0);
    expect(s.moving).toBe(false);
  });

  it('resolves presets and raw configs', () => {
    expect(resolveSpring('bouncy', SPRINGS.default)).toBe(SPRINGS.bouncy);
    expect(resolveSpring(undefined, SPRINGS.slow)).toBe(SPRINGS.slow);
    expect(resolveSpring({ stiffness: 1, damping: 2 }, SPRINGS.default)).toEqual({ stiffness: 1, damping: 2 });
  });

  it('survives large time steps (tab was hidden)', () => {
    const s = new Spring(0, SPRINGS.snappy);
    s.set(1);
    s.step(0.1);
    expect(Number.isFinite(s.v)).toBe(true);
    for (let i = 0; i < 60; i++) s.step(0.1);
    expect(s.v).toBeCloseTo(1, 2);
  });
});
