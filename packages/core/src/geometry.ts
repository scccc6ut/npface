/**
 * npface geometry — all original. The helmet silhouette echoes the npcrew logo
 * (a leaning, rounded helmet with a chamfered top-right corner, a stadium-shaped visor slot and
 * two rounded-square eyes). Eyes are generated procedurally from `EyeShape` parameters.
 */
import type { EyeShape } from './types';

/** ViewBox edge length. */
export const VIEW = 100;

/** Helmet silhouette: [x, y, cornerRadius] clockwise from the top-left. */
const HELMET_VERTS: [number, number, number][] = [
  [10, 5, 12], // top-left
  [74, 5, 6], // end of top edge, start of chamfer
  [95, 26, 6], // end of chamfer
  [95, 95, 14], // bottom-right
  [4, 95, 11], // bottom-left
];

/** Visor slot (stadium). */
export const VISOR = { x: 11, y: 36, w: 76, h: 24 };
/** Home position of the eye centres. */
export const EYE_HOME: [[number, number], [number, number]] = [
  [32, 48],
  [68, 48],
];
/** Rotation / scale pivot for head motion ("neck"). */
export const HEAD_PIVOT: [number, number] = [50, 82];

const f = (n: number): number => Math.round(n * 100) / 100;

/** Build an SVG path for a polygon with per-vertex rounded corners (arcs). */
export function roundedPolygon(verts: [number, number, number][]): string {
  const n = verts.length;
  // orientation (screen coords): negative area = clockwise on screen → sweep flag 1
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = verts[i]!;
    const [x2, y2] = verts[(i + 1) % n]!;
    area += x1 * y2 - x2 * y1;
  }
  const sweep = area > 0 ? 1 : 0;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [px, py] = verts[(i + n - 1) % n]!;
    const [vx, vy, r] = verts[i]!;
    const [nx, ny] = verts[(i + 1) % n]!;
    // unit vectors from vertex to prev / next
    let ax = px - vx,
      ay = py - vy,
      bx = nx - vx,
      by = ny - vy;
    const la = Math.hypot(ax, ay) || 1;
    const lb = Math.hypot(bx, by) || 1;
    ax /= la;
    ay /= la;
    bx /= lb;
    by /= lb;
    const cos = ax * bx + ay * by;
    const theta = Math.acos(Math.max(-1, Math.min(1, cos))); // interior angle
    const t = r / Math.tan(theta / 2); // distance from vertex to tangent points
    const p1x = vx + ax * t,
      p1y = vy + ay * t;
    const p2x = vx + bx * t,
      p2y = vy + by * t;
    d += (i === 0 ? 'M' : 'L') + f(p1x) + ' ' + f(p1y);
    d += 'A' + f(r) + ' ' + f(r) + ' 0 0 ' + sweep + ' ' + f(p2x) + ' ' + f(p2y);
  }
  return d + 'Z';
}

export const HELMET_PATH = roundedPolygon(HELMET_VERTS);

/* ---------------- eyes ---------------- */

const N_EDGE = 6; // sample points per straight edge
const N_ARC = 9; // sample points per corner arc
const N_PTS = 4 * (N_EDGE + N_ARC);
const BUF_X = new Float64Array(N_PTS);
const BUF_Y = new Float64Array(N_PTS);

/** Sample the outline of a centred rounded rectangle (clockwise on screen) into the buffers. */
function sampleRoundedRect(a: number, b: number, rad: number): void {
  const ex = a - rad; // half extent of straight edges
  const ey = b - rad;
  let i = 0;
  // top edge: (-ex,-b) → (ex,-b)
  for (let k = 0; k < N_EDGE; k++) {
    const t = k / N_EDGE;
    BUF_X[i] = -ex + 2 * ex * t;
    BUF_Y[i++] = -b;
  }
  // top-right arc: centre (ex,-ey), angle -90° → 0°
  for (let k = 0; k < N_ARC; k++) {
    const ang = -Math.PI / 2 + ((Math.PI / 2) * k) / N_ARC;
    BUF_X[i] = ex + rad * Math.cos(ang);
    BUF_Y[i++] = -ey + rad * Math.sin(ang);
  }
  // right edge: (a,-ey) → (a,ey)
  for (let k = 0; k < N_EDGE; k++) {
    const t = k / N_EDGE;
    BUF_X[i] = a;
    BUF_Y[i++] = -ey + 2 * ey * t;
  }
  // bottom-right arc: centre (ex,ey), 0° → 90°
  for (let k = 0; k < N_ARC; k++) {
    const ang = ((Math.PI / 2) * k) / N_ARC;
    BUF_X[i] = ex + rad * Math.cos(ang);
    BUF_Y[i++] = ey + rad * Math.sin(ang);
  }
  // bottom edge: (ex,b) → (-ex,b)
  for (let k = 0; k < N_EDGE; k++) {
    const t = k / N_EDGE;
    BUF_X[i] = ex - 2 * ex * t;
    BUF_Y[i++] = b;
  }
  // bottom-left arc: centre (-ex,ey), 90° → 180°
  for (let k = 0; k < N_ARC; k++) {
    const ang = Math.PI / 2 + ((Math.PI / 2) * k) / N_ARC;
    BUF_X[i] = -ex + rad * Math.cos(ang);
    BUF_Y[i++] = ey + rad * Math.sin(ang);
  }
  // left edge: (-a,ey) → (-a,-ey)
  for (let k = 0; k < N_EDGE; k++) {
    const t = k / N_EDGE;
    BUF_X[i] = -a;
    BUF_Y[i++] = ey - 2 * ey * t;
  }
  // top-left arc: centre (-ex,-ey), 180° → 270°
  for (let k = 0; k < N_ARC; k++) {
    const ang = Math.PI + ((Math.PI / 2) * k) / N_ARC;
    BUF_X[i] = -ex + rad * Math.cos(ang);
    BUF_Y[i++] = -ey + rad * Math.sin(ang);
  }
}

const DEG = Math.PI / 180;

/**
 * Build the path of one eye.
 * @param e      eye shape, always expressed in the LEFT eye's frame
 * @param right  true for the right eye — mirrored props (`rot`, tilts) are flipped here
 * @param hx,hy  home position of the eye centre
 * @param blink  0..1 extra top-lid closure from an ongoing blink
 */
export function eyePath(e: EyeShape, right: boolean, hx: number, hy: number, blink: number): string {
  const w = e.w,
    h = e.h;
  if (w <= 0.05 || h <= 0.05) return '';
  const a = w / 2,
    b = h / 2;
  const rad = Math.max(0, Math.min(1, e.r)) * Math.min(a, b);
  sampleRoundedRect(a, b, rad);

  // lids (in the eye's local, un-rotated frame)
  const lidT = e.lidT + (1 - e.lidT) * blink * 0.94;
  const curveT = e.curveT * (1 - blink);
  const baseT = -b + lidT * h;
  const baseB = b - e.lidB * h;
  const outer = right ? 1 : -1; // x direction of the outer corner
  const tT = Math.tan(e.tiltT * DEG) * outer;
  const tB = Math.tan(e.tiltB * DEG) * outer;
  const hasLids = lidT > 0 || e.lidB > 0 || tT !== 0 || tB !== 0 || curveT !== 0 || e.curveB !== 0;

  const rot = (right ? -e.rot : e.rot) * DEG;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const cx = hx + e.x;
  const cy = hy + e.y;

  let d = '';
  for (let i = 0; i < N_PTS; i++) {
    const x = BUF_X[i]!;
    let y = BUF_Y[i]!;
    if (hasLids) {
      const u = x / a;
      const bump = (1 - u * u) * b;
      const yT = baseT + x * tT + curveT * bump;
      const yB = baseB + x * tB - e.curveB * bump;
      if (yT >= yB) y = (yT + yB) / 2;
      else if (y < yT) y = yT;
      else if (y > yB) y = yB;
    }
    const rx = x * cos - y * sin + cx;
    const ry = x * sin + y * cos + cy;
    d += (i === 0 ? 'M' : 'L') + f(rx) + ' ' + f(ry);
  }
  return d + 'Z';
}

/** Path for the dizzy "X" overlay of one eye (two strokes). Empty when `cross` ≈ 0. */
export function crossPath(e: EyeShape, right: boolean, hx: number, hy: number): string {
  if (e.cross < 0.01) return '';
  const s = Math.min(e.w, e.h) * 0.42 * e.cross;
  const rot = (right ? -e.rot : e.rot) * DEG;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const cx = hx + e.x;
  const cy = hy + e.y;
  const P = (x: number, y: number) => f(x * cos - y * sin + cx) + ' ' + f(x * sin + y * cos + cy);
  return 'M' + P(-s, -s) + 'L' + P(s, s) + 'M' + P(s, -s) + 'L' + P(-s, s);
}

/** Stroke width of the X, relative to eye size. */
export const crossWidth = (e: EyeShape): number => Math.max(1.2, Math.min(e.w, e.h) * 0.2);
