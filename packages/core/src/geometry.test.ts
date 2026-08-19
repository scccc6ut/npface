import { describe, expect, it } from 'vitest';
import { BASE_EYE } from './states';
import { HELMET_PATH, crossPath, eyePath, roundedPolygon } from './geometry';

const pts = (d: string) =>
  d
    .replace('Z', '')
    .split(/[ML]/)
    .filter(Boolean)
    .map((s) => s.split(' ').map(Number) as [number, number]);

describe('geometry', () => {
  it('builds a closed helmet path with arcs', () => {
    expect(HELMET_PATH.startsWith('M')).toBe(true);
    expect(HELMET_PATH.endsWith('Z')).toBe(true);
    expect((HELMET_PATH.match(/A/g) ?? []).length).toBe(5);
  });

  it('roundedPolygon handles a square', () => {
    const d = roundedPolygon([
      [0, 0, 2],
      [10, 0, 2],
      [10, 10, 2],
      [0, 10, 2],
    ]);
    expect(d).toContain('A2 2 0 0 1');
  });

  it('eye path is a closed polygon around the home position', () => {
    const d = eyePath(BASE_EYE, false, 32, 48, 0);
    const p = pts(d);
    expect(p.length).toBe(60);
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    expect(Math.min(...xs)).toBeCloseTo(32 - BASE_EYE.w / 2, 1);
    expect(Math.max(...xs)).toBeCloseTo(32 + BASE_EYE.w / 2, 1);
    expect(Math.min(...ys)).toBeCloseTo(48 - BASE_EYE.h / 2, 1);
    expect(Math.max(...ys)).toBeCloseTo(48 + BASE_EYE.h / 2, 1);
  });

  it('top lid clamps the upper part of the eye', () => {
    const d = eyePath({ ...BASE_EYE, lidT: 0.5 }, false, 32, 48, 0);
    const ys = pts(d).map((q) => q[1]);
    expect(Math.min(...ys)).toBeCloseTo(48, 1);
    expect(Math.max(...ys)).toBeCloseTo(48 + BASE_EYE.h / 2, 1);
  });

  it('blink closes the eye to a thin line', () => {
    const d = eyePath(BASE_EYE, false, 32, 48, 1);
    const ys = pts(d).map((q) => q[1]);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1.2);
  });

  it('mirrors rotation and lid tilt for the right eye', () => {
    const shape = { ...BASE_EYE, rot: 20, tiltT: 15, lidT: 0.3 };
    const l = pts(eyePath(shape, false, 0, 0, 0));
    const r = pts(eyePath(shape, true, 0, 0, 0));
    // mirrored set of points: for every left point (x,y) there is a right point (-x,y)
    for (const [x, y] of l) {
      const hit = r.some(([rx, ry]) => Math.abs(rx + x) < 0.05 && Math.abs(ry - y) < 0.05);
      expect(hit).toBe(true);
    }
  });

  it('returns an empty path for collapsed eyes and X strokes for cross', () => {
    expect(eyePath({ ...BASE_EYE, w: 0 }, false, 0, 0, 0)).toBe('');
    expect(crossPath(BASE_EYE, false, 0, 0)).toBe('');
    const x = crossPath({ ...BASE_EYE, cross: 1 }, false, 10, 10);
    expect((x.match(/M/g) ?? []).length).toBe(2);
  });
});
