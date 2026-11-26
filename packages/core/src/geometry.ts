/**
 * npface geometry — all original. The default helmet is a rounded square with a stadium-shaped
 * visor slot and two rounded-square eyes (the npcrew mark); other face shapes live in shapes.ts.
 * Eyes are generated procedurally from `EyeShape` parameters. Flat, 2D — like the brand mark.
 */
import type { EyeShape } from './types';

/** ViewBox edge length. */
export const VIEW = 100;

/** Default helmet body (`square` shape): a symmetric rounded square. */
export const HELMET = { x: 6, y: 6, w: 88, h: 88, r: 17 };
/** Visor slot (stadium), centred. */
export const VISOR = { x: 12, y: 36, w: 76, h: 24 };
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

/** Rounded-rect path helper. */
export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return roundedPolygon([
    [x, y, r],
    [x + w, y, r],
    [x + w, y + h, r],
    [x, y + h, r],
  ]);
}

export const HELMET_PATH = roundedRectPath(HELMET.x, HELMET.y, HELMET.w, HELMET.h, HELMET.r);

/* ---------------- face-shape outlines ---------------- */

/**
 * Every outline is resampled to this many points, starting at the top centre and running
 * clockwise — equal counts + a shared start make any two shapes morphable point-by-point.
 */
export const OUTLINE_POINTS = 120;

/** Exact SVG path of an ellipse (used for static display of round shapes). */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return (
    `M${f(cx)} ${f(cy - ry)}A${f(rx)} ${f(ry)} 0 1 1 ${f(cx)} ${f(cy + ry)}` +
    `A${f(rx)} ${f(ry)} 0 1 1 ${f(cx)} ${f(cy - ry)}Z`
  );
}

/** Dense points along a rounded polygon: one arc per corner, straight edges in between. */
export function roundedPolygonPoints(verts: [number, number, number][]): number[] {
  const out: number[] = [];
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = verts[(i + n - 1) % n]!;
    const [vx, vy, r] = verts[i]!;
    const [nx, ny] = verts[(i + 1) % n]!;
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
    const theta = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by)));
    if (r <= 0 || theta < 1e-6) {
      out.push(vx, vy);
      continue;
    }
    const t = r / Math.tan(theta / 2);
    let mx = ax + bx,
      my = ay + by;
    const lm = Math.hypot(mx, my) || 1;
    mx /= lm;
    my /= lm;
    const dc = r / Math.sin(theta / 2);
    const cx = vx + mx * dc,
      cy = vy + my * dc;
    const a1 = Math.atan2(vy + ay * t - cy, vx + ax * t - cx);
    let da = Math.atan2(vy + by * t - cy, vx + bx * t - cx) - a1;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const steps = Math.max(2, Math.ceil((Math.abs(da) * r) / 0.6));
    for (let k = 0; k <= steps; k++) {
      const a = a1 + (da * k) / steps;
      out.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
  }
  return out;
}

/* ---------------- SVG path outlines ---------------- */

const NUM_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;

/** Append points of an SVG elliptical arc (endpoint parametrisation, SVG spec F.6.5). */
function arcPoints(
  out: number[],
  x1: number,
  y1: number,
  rx: number,
  ry: number,
  rotDeg: number,
  large: boolean,
  sweep: boolean,
  x2: number,
  y2: number,
): void {
  if (!rx || !ry || (x1 === x2 && y1 === y2)) {
    out.push(x2, y2);
    return;
  }
  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const phi = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(phi),
    sin = Math.sin(phi);
  const dx = (x1 - x2) / 2,
    dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy,
    yp = -sin * dx + cos * dy;
  const lam = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lam > 1) {
    rx *= Math.sqrt(lam);
    ry *= Math.sqrt(lam);
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  let co = Math.sqrt(Math.max(0, num / den));
  if (large === sweep) co = -co;
  const cxp = (co * rx * yp) / ry,
    cyp = (-co * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2,
    cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const ux = (xp - cxp) / rx,
    uy = (yp - cyp) / ry,
    vx = (-xp - cxp) / rx,
    vy = (-yp - cyp) / ry;
  const t1 = Math.atan2(uy, ux);
  let dt = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  else if (sweep && dt < 0) dt += 2 * Math.PI;
  const steps = Math.max(2, Math.ceil((Math.abs(dt) * Math.max(rx, ry)) / 0.6));
  for (let k = 1; k <= steps; k++) {
    const t = t1 + (dt * k) / steps;
    const ex = rx * Math.cos(t),
      ey = ry * Math.sin(t);
    out.push(cos * ex - sin * ey + cx, sin * ex + cos * ey + cy);
  }
}

/**
 * Dense points along the first subpath of SVG path data (M L H V C S Q T A Z, absolute and
 * relative), so outlines can be drawn in any vector tool. No DOM needed.
 */
export function pathPoints(d: string): number[] {
  const out: number[] = [];
  const n = d.length;
  let i = 0;
  const skip = () => {
    while (i < n && ' ,\n\r\t'.includes(d[i]!)) i++;
  };
  const num = (): number => {
    skip();
    NUM_RE.lastIndex = i;
    const m = NUM_RE.exec(d);
    if (!m) throw new Error(`npface: invalid path data at ${i}`);
    i = NUM_RE.lastIndex;
    return +m[0];
  };
  const flag = (): boolean => {
    skip();
    const c = d[i++];
    if (c !== '0' && c !== '1') throw new Error(`npface: invalid arc flag at ${i - 1}`);
    return c === '1';
  };
  let x = 0,
    y = 0,
    qx = 0,
    qy = 0; // current point, last control point (for S / T)
  let cmd = '';
  let last = '';
  const cubic = (x1: number, y1: number, x2: number, y2: number, px: number, py: number) => {
    const len =
      Math.hypot(x1 - x, y1 - y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(px - x2, py - y2);
    const steps = Math.max(4, Math.ceil(len / 0.6));
    for (let k = 1; k <= steps; k++) {
      const t = k / steps,
        u = 1 - t;
      out.push(
        u * u * u * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * px,
        u * u * u * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * py,
      );
    }
    x = px;
    y = py;
  };
  const quad = (x1: number, y1: number, px: number, py: number) =>
    cubic(
      x + (2 / 3) * (x1 - x),
      y + (2 / 3) * (y1 - y),
      px + (2 / 3) * (x1 - px),
      py + (2 / 3) * (y1 - py),
      px,
      py,
    );
  for (;;) {
    skip();
    if (i >= n) break;
    if (/[MLHVCSQTAZ]/i.test(d[i]!)) cmd = d[i++]!;
    else if (!cmd || /z/i.test(cmd)) throw new Error(`npface: invalid path data at ${i}`);
    // otherwise: implicit repetition of the previous command
    const rel = cmd >= 'a';
    const ox = rel ? x : 0,
      oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        if (out.length) return out; // the first subpath is the outline
        x = num() + ox;
        y = num() + oy;
        out.push(x, y);
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L':
        x = num() + ox;
        y = num() + oy;
        out.push(x, y);
        break;
      case 'H':
        x = num() + ox;
        out.push(x, y);
        break;
      case 'V':
        y = num() + oy;
        out.push(x, y);
        break;
      case 'C': {
        const x1 = num() + ox,
          y1 = num() + oy,
          x2 = num() + ox,
          y2 = num() + oy;
        const px = num() + ox,
          py = num() + oy;
        qx = x2;
        qy = y2;
        cubic(x1, y1, x2, y2, px, py);
        break;
      }
      case 'S': {
        const refl = /[CS]/i.test(last);
        const x1 = refl ? 2 * x - qx : x,
          y1 = refl ? 2 * y - qy : y;
        const x2 = num() + ox,
          y2 = num() + oy,
          px = num() + ox,
          py = num() + oy;
        qx = x2;
        qy = y2;
        cubic(x1, y1, x2, y2, px, py);
        break;
      }
      case 'Q': {
        const x1 = num() + ox,
          y1 = num() + oy,
          px = num() + ox,
          py = num() + oy;
        qx = x1;
        qy = y1;
        quad(x1, y1, px, py);
        break;
      }
      case 'T': {
        const refl = /[QT]/i.test(last);
        const x1 = refl ? 2 * x - qx : x,
          y1 = refl ? 2 * y - qy : y;
        const px = num() + ox,
          py = num() + oy;
        qx = x1;
        qy = y1;
        quad(x1, y1, px, py);
        break;
      }
      case 'A': {
        const rx = num(),
          ry = num(),
          rot = num(),
          large = flag(),
          sweep = flag();
        const px = num() + ox,
          py = num() + oy;
        arcPoints(out, x, y, rx, ry, rot, large, sweep, px, py);
        x = px;
        y = py;
        break;
      }
      default: // Z — the outline is closed implicitly
        return out;
    }
    last = cmd;
  }
  return out;
}

/** Dense points along an ellipse, clockwise on screen from the top. */
export function ellipsePoints(cx: number, cy: number, rx: number, ry: number): number[] {
  const out: number[] = [];
  const steps = 360;
  for (let k = 0; k < steps; k++) {
    const a = -Math.PI / 2 + (2 * Math.PI * k) / steps;
    out.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a));
  }
  return out;
}

/**
 * Resample a closed outline (flat `[x0, y0, x1, y1, …]`) into `n` points evenly spaced by arc
 * length, clockwise on screen, starting at the topmost crossing of the vertical centre line.
 */
export function resampleOutline(raw: number[], n = OUTLINE_POINTS): Float64Array {
  const m = raw.length / 2;
  const X = (i: number) => raw[2 * (((i % m) + m) % m)]!;
  const Y = (i: number) => raw[2 * (((i % m) + m) % m) + 1]!;
  let area = 0;
  let minX = Infinity,
    maxX = -Infinity;
  for (let i = 0; i < m; i++) {
    area += X(i) * Y(i + 1) - X(i + 1) * Y(i);
    if (X(i) < minX) minX = X(i);
    if (X(i) > maxX) maxX = X(i);
  }
  // y points down, so a positive shoelace sum means clockwise on screen
  const dir = area >= 0 ? 1 : -1;
  const at = (k: number) => (dir > 0 ? k : -k);
  const cx = (minX + maxX) / 2;
  let start = 0,
    sx = X(0),
    sy = Infinity;
  for (let k = 0; k < m; k++) {
    const x1 = X(at(k)),
      y1 = Y(at(k)),
      x2 = X(at(k + 1)),
      y2 = Y(at(k + 1));
    if ((x1 - cx) * (x2 - cx) > 0 || x1 === x2) continue;
    const y = y1 + ((cx - x1) / (x2 - x1)) * (y2 - y1);
    if (y < sy) {
      sy = y;
      sx = cx;
      start = k;
    }
  }
  // walk once around from the start crossing, back to it
  const seq: number[] = [sx, sy];
  for (let k = 1; k <= m; k++) seq.push(X(at(start + k)), Y(at(start + k)));
  seq.push(sx, sy);
  const cum = [0];
  for (let i = 1; i < seq.length / 2; i++) {
    cum.push(
      cum[i - 1]! + Math.hypot(seq[2 * i]! - seq[2 * i - 2]!, seq[2 * i + 1]! - seq[2 * i - 1]!),
    );
  }
  const total = cum[cum.length - 1]!;
  const out = new Float64Array(2 * n);
  let seg = 1;
  for (let k = 0; k < n; k++) {
    const s = (total * k) / n;
    while (seg < cum.length - 1 && cum[seg]! < s) seg++;
    const s0 = cum[seg - 1]!,
      s1 = cum[seg]!;
    const u = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
    out[2 * k] = seq[2 * seg - 2]! + (seq[2 * seg]! - seq[2 * seg - 2]!) * u;
    out[2 * k + 1] = seq[2 * seg - 1]! + (seq[2 * seg + 1]! - seq[2 * seg - 1]!) * u;
  }
  return out;
}

/** Polyline path through flat outline points (used while morphing between shapes). */
export function pointsPath(pts: ArrayLike<number>): string {
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += (i ? 'L' : 'M') + f(pts[i]!) + ' ' + f(pts[i + 1]!);
  return d + 'Z';
}

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
 * @param scale  size multiplier for the face shape (scales size and offsets, not lids or angles)
 */
export function eyePath(
  e: EyeShape,
  right: boolean,
  hx: number,
  hy: number,
  blink: number,
  scale = 1,
): string {
  const w = e.w * scale,
    h = e.h * scale;
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
  const cx = hx + e.x * scale;
  const cy = hy + e.y * scale;

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
export function crossPath(e: EyeShape, right: boolean, hx: number, hy: number, scale = 1): string {
  if (e.cross < 0.01) return '';
  const s = Math.min(e.w, e.h) * scale * 0.42 * e.cross;
  const rot = (right ? -e.rot : e.rot) * DEG;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const cx = hx + e.x * scale;
  const cy = hy + e.y * scale;
  const P = (x: number, y: number) => f(x * cos - y * sin + cx) + ' ' + f(x * sin + y * cos + cy);
  return 'M' + P(-s, -s) + 'L' + P(s, s) + 'M' + P(s, -s) + 'L' + P(-s, s);
}

/** Stroke width of the X, relative to eye size. */
export const crossWidth = (e: EyeShape, scale = 1): number =>
  Math.max(1.2, Math.min(e.w, e.h) * scale * 0.2);
