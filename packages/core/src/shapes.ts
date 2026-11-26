/**
 * npface face shapes — pure data plus a resolver. All original geometry.
 *
 * Each shape gives the helmet outline, the visor slot, where the eyes sit and how big they are,
 * the head-motion pivot and the anchor of the sleeping "z z z". Outlines are resampled to the
 * same number of points so any two shapes can morph into each other.
 */
import type { ShapeDef } from './types';
import {
  OUTLINE_POINTS,
  ellipsePath,
  ellipsePoints,
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
  /** Round and friendly. */
  circle: {
    outline: { cx: 50, cy: 50, rx: 46.5, ry: 46.5 },
    visor: { x: 12, y: 37, w: 76, h: 24 },
    zzz: [80, 17],
  },
  /** Rounded triangle, apex up ("onigiri") — the visor sits low where the face is widest. */
  triangle: {
    outline: [
      [50, -12, 14],
      [107, 94, 16],
      [-7, 94, 16],
    ],
    visor: { x: 19, y: 58, w: 62, h: 22 },
    pivot: [50, 86],
    zzz: [64, 20],
  },
  /** Flat-top hexagon — engineered, robot-like. */
  hexagon: {
    outline: [
      [27, 7, 10],
      [73, 7, 10],
      [97, 50, 9],
      [73, 93, 10],
      [27, 93, 10],
      [3, 50, 9],
    ],
    visor: { x: 13, y: 36, w: 74, h: 24 },
    zzz: [78, 15],
  },
  /** Guardian badge: flat top, rounded shoulders, pointed chin. */
  shield: {
    outline: [
      [7, 6, 16],
      [93, 6, 16],
      [93, 50, 34],
      [50, 100, 9],
      [7, 50, 34],
    ],
    visor: { x: 13, y: 30, w: 74, h: 24 },
    pivot: [50, 84],
    zzz: [84, 14],
  },
  /** Rhombus — sharp and premium; slightly smaller eyes in a narrower visor. */
  diamond: {
    outline: [
      [50, -1, 13],
      [101, 50, 13],
      [50, 101, 13],
      [-1, 50, 13],
    ],
    visor: { x: 16, y: 37, w: 68, h: 22 },
    pivot: [50, 84],
    zzz: [72, 18],
  },
};

/** Built-in face shapes, default first. */
export const SHAPE_NAMES = [
  'square',
  'circle',
  'triangle',
  'hexagon',
  'shield',
  'diamond',
] as const;
export type ShapeName = (typeof SHAPE_NAMES)[number];

/** Friendly aliases (English and Chinese) → canonical shape names. */
export const SHAPE_ALIASES: Record<string, string> = {
  default: 'square',
  helmet: 'square',
  box: 'square',
  rounded: 'square',
  round: 'circle',
  ball: 'circle',
  tri: 'triangle',
  onigiri: 'triangle',
  hex: 'hexagon',
  badge: 'shield',
  rhombus: 'diamond',
  gem: 'diamond',
  方形: 'square',
  圆形: 'circle',
  三角: 'triangle',
  三角形: 'triangle',
  六边形: 'hexagon',
  盾形: 'shield',
  盾牌: 'shield',
  菱形: 'diamond',
};

/** A shape with every default filled in, ready to render. */
export interface ResolvedShape {
  name: string;
  /** Outline resampled to `OUTLINE_POINTS` points (flat x, y pairs) for morphing. */
  pts: Float64Array;
  /** Exact outline path for static display. */
  path: string;
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
  const ell = !Array.isArray(o);
  const raw = ell ? ellipsePoints(o.cx, o.cy, o.rx, o.ry) : roundedPolygonPoints(o);
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
    path: ell ? ellipsePath(o.cx, o.cy, o.rx, o.ry) : roundedPolygon(o),
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
 * Register (or override) a face shape globally.
 *
 * ```ts
 * registerShape('pill', {
 *   outline: { cx: 50, cy: 50, rx: 36, ry: 47 },
 *   visor: { x: 18, y: 37, w: 64, h: 22 },
 * });
 * createNpface(el, { shape: 'pill' });
 * ```
 */
export function registerShape(name: string, def: ShapeDef): void {
  SHAPES[name] = def;
  byName.delete(name);
}
