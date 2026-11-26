import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SHAPES, SHAPE_NAMES, registerShape, resolveShape, resolveShapeName } from './shapes';
import { OUTLINE_POINTS, pathPoints } from './geometry';
import { createNpface } from './npface';
import type { Npface } from './types';

/* ---------- geometry helpers ---------- */

type P = [number, number];
const pointsOf = (a: ArrayLike<number>): P[] => {
  const out: P[] = [];
  for (let i = 0; i < a.length; i += 2) out.push([a[i]!, a[i + 1]!]);
  return out;
};
const inside = (poly: P[], x: number, y: number): boolean => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!;
    const [xj, yj] = poly[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const cross = (o: P, a: P, b: P) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
const segmentsCross = (a: P, b: P, c: P, d: P): boolean =>
  cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
const selfIntersects = (poly: P[]): boolean => {
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // adjacent through the closing edge
      if (segmentsCross(poly[i]!, poly[(i + 1) % n]!, poly[j]!, poly[(j + 1) % n]!)) return true;
    }
  }
  return false;
};
/** Points on the boundary of a stadium (the visor). */
const stadium = ([x, y, w, h]: number[]): P[] => {
  const r = h! / 2;
  const out: P[] = [];
  for (let k = 0; k < 64; k++) {
    const a = (2 * Math.PI * k) / 64;
    const cx = Math.cos(a) >= 0 ? x! + w! - r : x! + r;
    out.push([cx + r * Math.cos(a), y! + r + r * Math.sin(a)]);
  }
  return out;
};

describe('face shapes: data', () => {
  it('ships seven built-in shapes, square first', () => {
    expect(SHAPE_NAMES).toEqual(['square', 'shield', 'ghost', 'cat', 'circle', 'drop', 'crown']);
    for (const n of SHAPE_NAMES) expect(SHAPES[n], n).toBeDefined();
  });

  it.each(SHAPE_NAMES)(
    '%s: resampled outline is symmetric, starts top-centre, fits the box',
    (name) => {
      const s = resolveShape(name);
      expect(s.pts.length).toBe(OUTLINE_POINTS * 2);
      const pts = pointsOf(s.pts);
      // starts on the vertical centre line at its topmost crossing (between the ears for the cat)
      expect(pts[0]![0]).toBeCloseTo(50, 5);
      for (const [x, y] of pts)
        if (Math.abs(x - 50) < 0.5) expect(y).toBeGreaterThan(pts[0]![1] - 0.01);
      // clockwise: the second point is to the right of the first
      expect(pts[1]![0]).toBeGreaterThan(pts[0]![0]);
      // mirror symmetric about x = 50: point k ↔ point n - k
      const n = pts.length;
      for (let k = 1; k < n; k++) {
        expect(pts[k]![0] - 50).toBeCloseTo(-(pts[n - k]![0] - 50), 2);
        expect(pts[k]![1]).toBeCloseTo(pts[n - k]![1], 2);
      }
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(100);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(100);
      }
      expect(selfIntersects(pts)).toBe(false);
    },
  );

  it.each(SHAPE_NAMES)(
    '%s: visor inside the helmet, eyes inside the visor, dots outside',
    (name) => {
      const s = resolveShape(name);
      const poly = pointsOf(s.pts);
      for (const [x, y] of stadium(s.visor)) expect(inside(poly, x, y), `${x},${y}`).toBe(true);
      const [vx, vy, vw, vh] = s.visor;
      const [lx, ly, rx, ry] = s.eyes;
      for (const [x, y] of [
        [lx, ly],
        [rx, ry],
      ] as P[]) {
        expect(x).toBeGreaterThan(vx);
        expect(x).toBeLessThan(vx + vw);
        expect(y).toBeGreaterThan(vy);
        expect(y).toBeLessThan(vy + vh);
      }
      expect(s.eyeScale).toBeGreaterThan(0.7);
      expect(s.eyeScale).toBeLessThanOrEqual(1.1);
      for (let k = 0; k < s.dots.length; k += 3) {
        const [cx, cy, r] = [s.dots[k]!, s.dots[k + 1]!, s.dots[k + 2]!];
        expect(cx + r).toBeLessThanOrEqual(100);
        expect(cy - r).toBeGreaterThanOrEqual(0);
        expect(inside(poly, cx, cy)).toBe(false);
      }
    },
  );

  it('every pair of shapes morphs without the outline crossing itself', () => {
    for (const a of SHAPE_NAMES) {
      for (const b of SHAPE_NAMES) {
        if (a === b) continue;
        const A = resolveShape(a).pts;
        const B = resolveShape(b).pts;
        for (const t of [0.15, 0.35, 0.5, 0.65, 0.85, 1.04]) {
          const mid: number[] = [];
          for (let i = 0; i < A.length; i++) mid.push(A[i]! + (B[i]! - A[i]!) * t);
          expect(selfIntersects(pointsOf(mid)), `${a}→${b} @${t}`).toBe(false);
        }
      }
    }
  });

  it('resolves names, aliases (incl. Chinese) and unknowns', () => {
    expect(resolveShapeName('circle')).toBe('circle');
    expect(resolveShapeName('Circle')).toBe('circle');
    expect(resolveShapeName('planet')).toBe('circle');
    expect(resolveShapeName('圆形')).toBe('circle');
    expect(resolveShapeName('猫咪')).toBe('cat');
    expect(resolveShapeName('kitty')).toBe('cat');
    expect(resolveShapeName('盾牌')).toBe('shield');
    expect(resolveShapeName('幽灵')).toBe('ghost');
    expect(resolveShapeName('水滴')).toBe('drop');
    expect(resolveShapeName('皇冠')).toBe('crown');
    expect(resolveShapeName('triangle')).toBe('square'); // not built in
    expect(resolveShapeName('')).toBe('square');
    expect(resolveShape(undefined).name).toBe('square');
    expect(resolveShape('circle')).toBe(resolveShape('round')); // cached
  });

  it('parses SVG path data: relative commands, H/V, S/T reflection, compact arc flags', () => {
    const at = (d: string) => pointsOf(pathPoints(d));
    expect(at('M10 10h20v20H10z')).toEqual([
      [10, 10],
      [30, 10],
      [30, 30],
      [10, 30],
    ]);
    // implicit lineto after moveto, relative
    expect(at('m5 5 10 0 0 10z')).toEqual([
      [5, 5],
      [15, 5],
      [15, 15],
    ]);
    // compact arc flags ("01"): a relative half circle that ends where it should and bulges up
    const arc = at('M0 0a10 10 0 01 20 0');
    expect(arc[arc.length - 1]![0]).toBeCloseTo(20, 5);
    expect(arc[arc.length - 1]![1]).toBeCloseTo(0, 5);
    expect(Math.min(...arc.map((p) => p[1]))).toBeCloseTo(-10, 1);
    // smooth curves reflect the previous control point
    const sc = at('M0 0C0 10 10 10 10 0S20 -10 20 0');
    expect(sc[sc.length - 1]).toEqual([20, 0]);
    expect(Math.min(...sc.map((p) => p[1]))).toBeLessThan(-5);
    expect(Math.min(...at('M0 0Q5 10 10 0T20 0').map((p) => p[1]))).toBeLessThan(-4);
    // only the first subpath is the outline
    expect(at('M0 0L10 0L10 10ZM50 50L60 50Z').length).toBe(3);
    expect(() => pathPoints('M0 0 L x')).toThrow(/invalid path data/);
  });

  it('accepts SVG path outlines for custom shapes', () => {
    registerShape('blob', {
      outline: 'M50 6C80 6 94 30 94 55S76 94 50 94 6 80 6 55 20 6 50 6Z',
      visor: { x: 14, y: 40, w: 72, h: 24 },
    });
    const s = resolveShape('blob');
    expect(s.name).toBe('blob');
    expect(s.path.startsWith('M50 6')).toBe(true);
    expect(s.pts.length).toBe(OUTLINE_POINTS * 2);
    expect(selfIntersects(pointsOf(s.pts))).toBe(false);
  });

  it('registers custom shapes and fills in defaults', () => {
    registerShape('pill', {
      outline: { cx: 50, cy: 50, rx: 36, ry: 47 },
      visor: { x: 18, y: 37, w: 64, h: 22 },
    });
    const s = resolveShape('pill');
    expect(s.name).toBe('pill');
    expect(s.eyeScale).toBeCloseTo(22 / 24, 5);
    expect(s.eyes[1]).toBeCloseTo(48, 5);
    expect(s.pivot[1]).toBeCloseTo(97 - 12, 1);
    expect(s.dots).toEqual([]);
    // re-registering replaces the cached geometry
    registerShape('pill', {
      outline: { cx: 50, cy: 50, rx: 30, ry: 47 },
      visor: { x: 22, y: 37, w: 56, h: 22 },
    });
    expect(resolveShape('pill').visor[2]).toBe(56);
  });
});

/* ---------- instance behaviour ---------- */

let container: HTMLDivElement;
const made: Npface[] = [];
const make = (opts?: Parameters<typeof createNpface>[1]) => {
  const f = createNpface(container, opts);
  made.push(f);
  return f;
};
const body = (f: Npface) => f.el.querySelector('.npface-body')!.getAttribute('d');
const visorAttr = (f: Npface, a: string) => +f.el.querySelector('.npface-visor')!.getAttribute(a)!;
const shownDots = (f: Npface) =>
  [...f.el.querySelectorAll('.npface-dot')].filter((d) => d.getAttribute('display') !== 'none');

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number,
  );
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  for (const f of made.splice(0)) f.destroy();
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('face shapes: instance', () => {
  it('defaults to the square and honours the shape option', () => {
    const a = make();
    expect(a.shape).toBe('square');
    expect(a.el.getAttribute('data-shape')).toBe('square');
    expect(body(a)).toBe(resolveShape('square').path);
    const b = make({ shape: 'ghost' });
    expect(b.shape).toBe('ghost');
    expect(body(b)).toBe(resolveShape('ghost').path);
    expect(visorAttr(b, 'width')).toBeCloseTo(73.2, 2);
  });

  it('setShape morphs through intermediate outlines and lands on the exact target', () => {
    const f = make({ shape: 'square' });
    vi.advanceTimersByTime(100);
    f.setShape('drop');
    expect(f.shape).toBe('drop');
    expect(f.el.getAttribute('data-shape')).toBe('drop');
    vi.advanceTimersByTime(120);
    const mid = body(f)!;
    expect(mid).not.toBe(resolveShape('square').path);
    expect(mid).not.toBe(resolveShape('drop').path);
    expect(mid.match(/L/g)!.length).toBe(OUTLINE_POINTS - 1); // morphing polyline
    expect(visorAttr(f, 'y')).toBeGreaterThan(36);
    expect(visorAttr(f, 'y')).toBeLessThan(52.5);
    vi.advanceTimersByTime(1500);
    expect(body(f)).toBe(resolveShape('drop').path);
    expect(visorAttr(f, 'y')).toBeCloseTo(51.7, 2);
  });

  it('immediate and reduced motion snap; same shape is a no-op', () => {
    const f = make({ shape: 'circle' });
    f.setShape('crown', { immediate: true });
    vi.advanceTimersByTime(20);
    expect(body(f)).toBe(resolveShape('crown').path);
    const before = body(f);
    f.setShape('皇冠'); // alias of the current shape
    vi.advanceTimersByTime(20);
    expect(body(f)).toBe(before);

    const r = make({ shape: 'square', reducedMotion: true });
    r.setShape('shield');
    vi.advanceTimersByTime(20);
    expect(body(r)).toBe(resolveShape('shield').path);
  });

  it('accepts inline ShapeDef objects; equal objects do not re-morph', () => {
    const def = {
      outline: [
        [10, 10, 8],
        [90, 10, 8],
        [90, 90, 30],
        [10, 90, 30],
      ] as [number, number, number][],
      visor: { x: 16, y: 34, w: 68, h: 24 },
    };
    const f = make({ shape: def });
    expect(f.shape).toBe('custom');
    expect(body(f)).toBe(resolveShape(def).path);
    f.setShape({ ...def, visor: { ...def.visor } }); // equal content, new object
    vi.advanceTimersByTime(20);
    expect(body(f)).toBe(resolveShape(def).path);
  });

  it('the moon dot grows in and shrinks out with the circle shape', () => {
    const f = make({ shape: 'square' });
    expect(shownDots(f).length).toBe(0);
    f.setShape('circle');
    vi.advanceTimersByTime(100);
    const r = +shownDots(f)[0]!.getAttribute('r')!;
    expect(r).toBeGreaterThan(0);
    expect(r).toBeLessThan(7);
    vi.advanceTimersByTime(1500);
    expect(+shownDots(f)[0]!.getAttribute('r')!).toBe(7);
    expect(shownDots(f)[0]!.getAttribute('fill')).toBe('#0f1d3a');
    f.setColors({ body: '#123456' });
    expect(shownDots(f)[0]!.getAttribute('fill')).toBe('#123456');
    f.setShape('ghost');
    vi.advanceTimersByTime(1500);
    expect(shownDots(f).length).toBe(0);
  });

  it('eyes follow the shape layout (drop eyes sit low and smaller)', () => {
    const f = make({ shape: 'drop', state: 'idle', reducedMotion: true });
    vi.advanceTimersByTime(50);
    const d = f.el.querySelector('.npface-eye-l')!.getAttribute('d')!;
    const ys = d
      .replace('Z', '')
      .split(/[ML]/)
      .filter(Boolean)
      .map((p) => +p.split(' ')[1]!);
    const s = resolveShape('drop');
    expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(s.eyes[1], 0);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(14.5 * s.eyeScale, 0);
  });
});
