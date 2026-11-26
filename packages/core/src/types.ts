/**
 * npface — public types.
 *
 * Everything that describes a face is plain data: an `EyeShape` per eye, a `HeadPose`,
 * and a `StateDef` that combines them with rhythm (blink / motions / sequences).
 * All lengths are in viewBox units — the helmet lives in a 100×100 box.
 */

/** Shape parameters of one eye. Rendered as a rounded square that can be rotated and clipped by two lids. */
export interface EyeShape {
  /** Horizontal offset from the eye's home position (+ = viewer's right). Not mirrored. */
  x: number;
  /** Vertical offset from the eye's home position (+ = down). Not mirrored. */
  y: number;
  /** Width. */
  w: number;
  /** Height. */
  h: number;
  /** Corner roundness: 0 = square, 1 = pill / circle. */
  r: number;
  /** Rotation in degrees. Mirrored for the right eye. */
  rot: number;
  /** Top lid closure, 0 (open) .. 1 (closed). */
  lidT: number;
  /** Bottom lid closure, 0 (open) .. 1 (closed). */
  lidB: number;
  /** Top lid tilt in degrees, + = outer corner lower. Mirrored for the right eye. */
  tiltT: number;
  /** Bottom lid tilt in degrees, + = outer corner lower. Mirrored for the right eye. */
  tiltB: number;
  /** Top lid curvature -1..1, + bulges into the eye (arch shapes). */
  curveT: number;
  /** Bottom lid curvature -1..1, + bulges into the eye (happy "^^" arches). */
  curveB: number;
  /** "X" overlay strength 0..1 (dizzy eyes). */
  cross: number;
  /** Opacity of the eye body 0..1. */
  fill: number;
}

/** Whole-helmet pose. Rotation / scale pivot is near the bottom centre ("neck"). */
export interface HeadPose {
  x: number;
  y: number;
  /** Rotation in degrees, + = clockwise. */
  rot: number;
  /** Horizontal scale. */
  sx: number;
  /** Vertical scale. */
  sy: number;
}

/** A fully resolved pose: left eye, right eye, head. */
export interface Pose {
  l: EyeShape;
  r: EyeShape;
  head: HeadPose;
}

export type EyeProp = keyof EyeShape;
export type HeadProp = keyof HeadPose;

/** Named spring presets. */
export type SpringPreset = 'default' | 'soft' | 'snappy' | 'bouncy' | 'slow';
export interface SpringConfig {
  /** Spring stiffness (k). */
  stiffness: number;
  /** Damping coefficient (c). Critical damping is 2·√k. */
  damping: number;
}
export type SpringSpec = SpringPreset | SpringConfig;

/**
 * What a motion drives. `eye.*` hits both eyes (mirrored props are flipped for the right eye),
 * `eyeL.*` / `eyeR.*` hit one eye, `head.*` hits the helmet.
 */
export type MotionTarget =
  `eye.${EyeProp}` | `eyeL.${EyeProp}` | `eyeR.${EyeProp}` | `head.${HeadProp}`;

export type EaseName = 'linear' | 'inQuad' | 'outQuad' | 'inOutSine' | 'outCubic' | 'inOutCubic';

/** Continuous oscillation: `amp · sin(2π(t / period + phase))`. */
export interface SineMotion {
  type: 'sine';
  target: MotionTarget;
  amp: number;
  /** ms */
  period: number;
  /** 0..1 turns */
  phase?: number;
}
/** Sweep from→to (eased), then return to→from in `back` fraction of the period. Reading / scanning. */
export interface SweepMotion {
  type: 'sweep';
  target: MotionTarget;
  from: number;
  to: number;
  /** ms for a full cycle */
  period: number;
  /** fraction of the period spent returning, default 0.2 */
  back?: number;
  ease?: EaseName;
}
/** Random-walk: pick a new random value in `range` every `every` ms, spring toward it. */
export interface WanderMotion {
  type: 'wander';
  target: MotionTarget;
  range: [number, number];
  /** [min, max] ms between new targets */
  every: [number, number];
  spring?: SpringSpec;
}
/** Glance: every `every` ms both eyes dart to a random (x, y), hold for `hold` ms, then return. */
export interface GlanceMotion {
  type: 'glance';
  /** [min, max] ms between glances */
  every: [number, number];
  /** [min, max] ms the glance is held */
  hold: [number, number];
  x: [number, number];
  y: [number, number];
  /** head rotation (deg) per unit of glance x, default 0 */
  head?: number;
  spring?: SpringSpec;
}
/** Step through `values`, each held for `period / values.length` ms, springing between them. */
export interface KeysMotion {
  type: 'keys';
  target: MotionTarget;
  values: number[];
  /** ms for the whole cycle */
  period: number;
  spring?: SpringSpec;
}
export type Motion = SineMotion | SweepMotion | WanderMotion | GlanceMotion | KeysMotion;

/** A timed keyframe inside a state's entry choreography. Partial overrides persist until the next step. */
export interface SequenceStep {
  /** ms after entering the state */
  at: number;
  eye?: Partial<EyeShape>;
  eyes?: [Partial<EyeShape>, Partial<EyeShape>];
  head?: Partial<HeadPose>;
  spring?: SpringSpec;
}

export interface BlinkConfig {
  /** [min, max] ms between blinks */
  every: [number, number];
  /** probability 0..1 that a blink is a double blink */
  double?: number;
}

/**
 * A state is pure data: target shapes + rhythm. Mirrored props (`rot`, `tiltT`, `tiltB`) are
 * written in the LEFT eye's frame and flipped for the right eye automatically — for the symmetric
 * `eye` shorthand as well as for the explicit `eyes: [left, right]` pair.
 */
export interface StateDef {
  /** Inherit everything from another state first (resolved at registration). */
  extends?: string;
  /** Symmetric eye shape. */
  eye?: Partial<EyeShape>;
  /** Per-eye overrides `[left, right]` (applied on top of `eye`). */
  eyes?: [Partial<EyeShape>, Partial<EyeShape>];
  head?: Partial<HeadPose>;
  /** Spring used when transitioning INTO this state. */
  spring?: SpringSpec | { eye?: SpringSpec; head?: SpringSpec };
  /** Blink rhythm; `false` disables auto blink. Defaults to a relaxed rhythm. */
  blink?: BlinkConfig | false;
  /** Continuous / random motions layered on top of the pose. */
  motions?: Motion[];
  /** Entry choreography. With `loop`, the sequence restarts every `loop` ms. */
  sequence?: { steps: SequenceStep[]; loop?: number };
  /** Auto-transition to another state after `after` ms. */
  next?: { to: string; after: number };
  /** Default duration (ms) when played via `pulse()`. */
  pulse?: number;
  /** Show floating "z z z". */
  zzz?: boolean;
}

export type Theme = 'light' | 'dark' | 'auto';

/**
 * A face shape (helmet silhouette). Coordinates live in the 100×100 viewBox; the default
 * `square` is `outline: [[6,6,17],[94,6,17],[94,94,17],[6,94,17]]` with
 * `visor: { x: 12, y: 36, w: 76, h: 24 }`.
 */
export interface ShapeDef {
  /**
   * Helmet outline: SVG path data (one closed subpath, drawn in any vector tool),
   * rounded-polygon vertices `[x, y, cornerRadius]` listed clockwise, or an ellipse
   * `{ cx, cy, rx, ry }`.
   */
  outline: string | [number, number, number][] | { cx: number; cy: number; rx: number; ry: number };
  /** Detached circles `[cx, cy, r]` in the helmet colour (e.g. a little moon). They move with the head. */
  dots?: [number, number, number][];
  /** Visor slot (a stadium). The eyes are clipped by it. */
  visor: { x: number; y: number; w: number; h: number };
  /** Eye centres `[left, right]`. Default: placed inside the visor like the square. */
  eyes?: [[number, number], [number, number]];
  /** Eye size multiplier. Default: `visor.h / 24`. */
  eyeScale?: number;
  /** Pivot for head rotation and squash ("neck"). Default: 12 units above the bottom centre. */
  pivot?: [number, number];
  /** Where the sleeping "z z z" start. Default: near the top-right of the outline. */
  zzz?: [number, number];
}

export interface NpfaceColors {
  /** Helmet body. */
  body: string;
  /** Visor slot. */
  visor: string;
  /** Eyes (and the dizzy X). */
  eye: string;
  /** Optional outline around the helmet, e.g. for dark backgrounds. `'none'` hides it. */
  rim: string;
  /** Colour of the sleeping "z z z". */
  zzz: string;
}

export interface NpfaceOptions {
  /** Initial state (alias of `emotion`). Unknown names fall back to `idle`. */
  state?: string;
  /** Initial state (kept for API parity with the original sketch). */
  emotion?: string;
  /** Rendered size — a number of CSS px or any CSS length string. Default 48. */
  size?: number | string;
  /**
   * Face shape: `'square'` (default, the npcrew helmet), `'shield'`, `'ghost'`, `'cat'`,
   * `'circle'` (with a little moon), `'drop'`, `'crown'`, a name passed to `registerShape()`,
   * or a `ShapeDef`.
   * Unknown names fall back to `'square'`.
   */
  shape?: string | ShapeDef;
  colors?: Partial<NpfaceColors>;
  /** `'auto'` follows `prefers-color-scheme`. Default `'auto'`. */
  theme?: Theme;
  /** Eyes follow the pointer (alias of `gaze`). Default false. */
  follow?: boolean;
  /** Eyes follow the pointer. Default false. */
  gaze?: boolean;
  /** `true` / `false`, or `'auto'` (default) to honour `prefers-reduced-motion`. */
  reducedMotion?: boolean | 'auto';
  /** Pause the animation loop while the element is off-screen (IntersectionObserver). Default true. */
  pauseOffscreen?: boolean;
  /** Accessible label. Default: "npface: <state>". */
  label?: string;
  /** Extra or overriding states for this instance only. */
  states?: Record<string, StateDef>;
  /** Class name(s) added to the <svg>. */
  className?: string;
  /** Called after every state change. */
  onChange?: (state: string, prev: string) => void;
}

export interface Npface {
  /** The rendered <svg> element. */
  readonly el: SVGSVGElement;
  /** Current state name. */
  readonly state: string;
  /** Current face-shape name (`'custom'` for an inline `ShapeDef`). */
  readonly shape: string;
  /** Switch state (with transition). `immediate: true` snaps without animation. */
  set(state: string, opts?: { immediate?: boolean }): void;
  /** Play a state once, then return to the previous state. */
  pulse(state: string, duration?: number): void;
  /** Eyes follow the pointer. */
  follow(on: boolean): void;
  /** Look in a direction (-1..1 each axis). `look(null)` releases. */
  look(x: number | null, y?: number): void;
  /** Trigger a single blink now. */
  blink(): void;
  /** Change the face shape — morphs smoothly; `immediate: true` (or reduced motion) snaps. */
  setShape(shape: string | ShapeDef, opts?: { immediate?: boolean }): void;
  setColors(colors: Partial<NpfaceColors>): void;
  setSize(size: number | string): void;
  setTheme(theme: Theme): void;
  setLabel(label: string): void;
  /** Stop animating and remove the element. */
  destroy(): void;
}
