/**
 * npface face shapes — pure data plus a resolver.
 *
 * Each shape gives the helmet outline, the visor slot, where the eyes sit and how big they are,
 * the head-motion pivot and the anchor of the sleeping "z z z". Outlines are resampled to the
 * same number of points so any two shapes can morph into each other. The six character shapes
 * follow the npcrew brand sketches (shield, ghost, cat, circle with moon, drop, crown).
 */
import type { ShapeDef } from './types';
import {
  OUTLINE_POINTS,
  ellipsePath,
  ellipsePoints,
  pathPoints,
  resampleOutline,
  roundedPolygon,
  roundedPolygonPoints,
} from './geometry';

export const SHAPES: Record<string, ShapeDef> = {
  /** The npcrew helmet — rounded square (default). */
  square: {
    outline: [
      [6, 6, 17],
      [94, 6, 17],
      [94, 94, 17],
      [6, 94, 17],
    ],
    visor: { x: 12, y: 36, w: 76, h: 24 },
  },
  /** Heater shield with a soft peak — guardian. */
  shield: {
    outline:
      'M48.8 4.35Q50 3.8 51.2 4.35C64 9.59 76.55 12.78 89 15Q90.55 15.3 90.55 17.2L90.55 53.7' +
      'C90.55 69.7 68.24 87.9 51.6 95.45Q50 96.2 48.4 95.45C31.76 87.9 9.45 69.7 9.45 53.7' +
      'L9.45 17.2Q9.45 15.3 11 15C23.45 12.78 36 9.59 48.8 4.35Z',
    visor: { x: 15.5, y: 28.6, w: 69, h: 24.4 },
    eyes: [
      [33.6, 41.1],
      [66.4, 41.1],
    ],
    eyeScale: 0.93,
    pivot: [50, 82],
    zzz: [86, 8],
  },
  /** Round-topped ghost with a scalloped hem. */
  ghost: {
    outline:
      'M7.06 46.84A42.94 42.94 0 0 1 92.94 46.84L92.94 79C92.94 86 85.5 94.9 76.9 94.9' +
      'A14 14 0 0 1 64.25 87.2A16 16 0 0 1 35.75 87.2A14 14 0 0 1 23.1 94.9' +
      'C14.5 94.9 7.06 86 7.06 79Z',
    visor: { x: 13.4, y: 34.3, w: 73.2, h: 25.8 },
    eyes: [
      [33, 47.3],
      [67, 47.3],
    ],
    eyeScale: 1,
    pivot: [50, 82],
    zzz: [80, 13],
  },
  /** Cat head: rounded ears, full cheeks. */
  cat: {
    outline:
      'M35.6 23.3L64.4 23.3L74.83 11.99A6.7 6.7 0 0 1 86.3 15.04L90.89 35.6' +
      'C94.72 43.75 96.75 50 96.75 61C96.75 75 86.8 89.9 70.8 89.9L29.2 89.9' +
      'C13.2 89.9 3.25 75 3.25 61C3.25 50 5.28 43.75 9.11 35.6L13.7 15.04' +
      'A6.7 6.7 0 0 1 25.17 11.99Z',
    visor: { x: 13.5, y: 37.7, w: 73, h: 25.4 },
    eyes: [
      [32.8, 50.4],
      [67.2, 50.4],
    ],
    eyeScale: 1,
    pivot: [50, 78],
    zzz: [88, 18],
  },
  /** Round face with a little moon. */
  circle: {
    outline: { cx: 50, cy: 52, rx: 43.2, ry: 43.2 },
    dots: [[92.2, 18.9, 7]],
    visor: { x: 12.5, y: 37.7, w: 75, h: 28 },
    eyes: [
      [32.4, 51.6],
      [67.6, 51.6],
    ],
    eyeScale: 1.07,
    pivot: [50, 84],
    zzz: [68, 8],
  },
  /** Water drop: pointed top, round bottom. */
  drop: {
    outline:
      'M49.4 3.25Q50 2.6 50.6 3.25C53.53 16.4 61.74 27.75 70.49 38.68' +
      'C76.74 46.49 82.45 54 82.45 66A32.45 31.15 0 0 1 17.55 66' +
      'C17.55 54 23.26 46.49 29.51 38.68C38.26 27.75 46.47 16.4 49.4 3.25Z',
    visor: { x: 22.4, y: 51.7, w: 55.2, h: 19.8 },
    eyes: [
      [37, 61.6],
      [63, 61.6],
    ],
    eyeScale: 0.73,
    pivot: [50, 86],
    zzz: [66, 16],
  },
  /** Three-pointed crown. */
  crown: {
    outline:
      'M47.62 22.44A2.7 2.7 0 0 1 52.38 22.44L67.38 50.8L72.66 45.05Q73.67 43.94 75.02 43.28' +
      'L94.43 33.71A2.78 2.78 0 0 1 98.29 37.13L84.08 77.63A2.2 2.2 0 0 1 82 79.1L18 79.1' +
      'A2.2 2.2 0 0 1 15.92 77.63L1.71 37.13A2.78 2.78 0 0 1 5.57 33.71L24.98 43.28' +
      'Q26.33 43.94 27.34 45.05L32.62 50.8Z',
    visor: { x: 20.6, y: 55.2, w: 58.8, h: 17.3 },
    eyes: [
      [36.75, 63.85],
      [63.25, 63.85],
    ],
    eyeScale: 0.73,
    pivot: [50, 70],
    zzz: [86, 24],
  },
};

/** Built-in face shapes, default first. */
export const SHAPE_NAMES = ['square', 'shield', 'ghost', 'cat', 'circle', 'drop', 'crown'] as const;
export type ShapeName = (typeof SHAPE_NAMES)[number];

/** Friendly aliases (English and Chinese) → canonical shape names. */
export const SHAPE_ALIASES: Record<string, string> = {
  default: 'square',
  helmet: 'square',
  box: 'square',
  rounded: 'square',
  badge: 'shield',
  guard: 'shield',
  boo: 'ghost',
  spirit: 'ghost',
  kitty: 'cat',
  neko: 'cat',
  round: 'circle',
  ball: 'circle',
  planet: 'circle',
  moon: 'circle',
  orbit: 'circle',
  water: 'drop',
  droplet: 'drop',
  tear: 'drop',
  king: 'crown',
  queen: 'crown',
  royal: 'crown',
  方形: 'square',
  盾牌: 'shield',
  盾形: 'shield',
  幽灵: 'ghost',
  小幽灵: 'ghost',
  猫: 'cat',
  猫咪: 'cat',
  圆形: 'circle',
  星球: 'circle',
  水滴: 'drop',
  皇冠: 'crown',
  王冠: 'crown',
};

/** A shape with every default filled in, ready to render. */
export interface ResolvedShape {
  name: string;
  /** Outline resampled to `OUTLINE_POINTS` points (flat x, y pairs) for morphing. */
  pts: Float64Array;
  /** Exact outline path for static display. */
  path: string;
  /** Detached dots, flat `cx, cy, r` triples. */
  dots: number[];
  /** Visor slot: x, y, w, h. */
  visor: [number, number, number, number];
  /** Eye centres: lx, ly, rx, ry. */
  eyes: [number, number, number, number];
  eyeScale: number;
  pivot: [number, number];
  zzz: [number, number];
}

const byName = new Map<string, ResolvedShape>();
const byDef = new WeakMap<ShapeDef, ResolvedShape>();

function build(name: string, def: ShapeDef): ResolvedShape {
  const o = def.outline;
  let raw: number[];
  let path: string;
  if (typeof o === 'string') {
    raw = pathPoints(o);
    path = o;
  } else if (Array.isArray(o)) {
    raw = roundedPolygonPoints(o);
    path = roundedPolygon(o);
  } else {
    raw = ellipsePoints(o.cx, o.cy, o.rx, o.ry);
    path = ellipsePath(o.cx, o.cy, o.rx, o.ry);
  }
  const pts = resampleOutline(raw, OUTLINE_POINTS);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    minX = Math.min(minX, pts[i]!);
    maxX = Math.max(maxX, pts[i]!);
    minY = Math.min(minY, pts[i + 1]!);
    maxY = Math.max(maxY, pts[i + 1]!);
  }
  const v = def.visor;
  const eyeY = v.y + v.h / 2;
  const [[lx, ly], [rx, ry]] = def.eyes ?? [
    [v.x + v.w * 0.263, eyeY],
    [v.x + v.w * 0.737, eyeY],
  ];
  return {
    name,
    pts,
    path,
    dots: (def.dots ?? []).flat(),
    visor: [v.x, v.y, v.w, v.h],
    eyes: [lx, ly, rx, ry],
    eyeScale: def.eyeScale ?? v.h / 24,
    pivot: def.pivot ?? [(minX + maxX) / 2, maxY - 12],
    zzz: def.zzz ?? [maxX - 11, minY + 9],
  };
}

/** Canonical shape name for `name` (aliases, case-insensitive); unknown names → `'square'`. */
export function resolveShapeName(name: string): string {
  const raw = (name || '').trim();
  if (SHAPES[raw]) return raw;
  const lower = raw.toLowerCase();
  if (SHAPES[lower]) return lower;
  const a = SHAPE_ALIASES[lower] ?? SHAPE_ALIASES[raw];
  return a && SHAPES[a] ? a : 'square';
}

/** Resolve a shape name or inline `ShapeDef` (results are cached). */
export function resolveShape(shape?: string | ShapeDef): ResolvedShape {
  if (shape && typeof shape === 'object') {
    let r = byDef.get(shape);
    if (!r) byDef.set(shape, (r = build('custom', shape)));
    return r;
  }
  const name = resolveShapeName(shape ?? 'square');
  let r = byName.get(name);
  if (!r) byName.set(name, (r = build(name, SHAPES[name]!)));
  return r;
}

/**
 * Register (or override) a face shape globally. `outline` can be SVG path data drawn in a
 * 100×100 box, rounded-polygon vertices or an ellipse.
 *
 * ```ts
 * registerShape('pill', {
 *   outline: 'M50 3a36 47 0 1 1 0 94a36 47 0 1 1 0-94Z',
 *   visor: { x: 18, y: 37, w: 64, h: 22 },
 * });
 * createNpface(el, { shape: 'pill' });
 * ```
 */
export function registerShape(name: string, def: ShapeDef): void {
  SHAPES[name] = def;
  byName.delete(name);
}
