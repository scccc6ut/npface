export {
  createNpface,
  NpfaceInstance,
  resolveStateName,
  normalizeStateName,
  resolveDef,
  PALETTE,
  LIGHT_COLORS,
  DARK_COLORS,
} from './npface';
export { STATES, ALIASES, STATE_NAMES, BASE_EYE, BASE_HEAD, DEFAULT_BLINK } from './states';
export type { StateName } from './states';
export {
  SHAPES,
  SHAPE_NAMES,
  SHAPE_ALIASES,
  resolveShape,
  resolveShapeName,
  registerShape,
} from './shapes';
export type { ShapeName, ResolvedShape } from './shapes';
export { SPRINGS, Spring, EASE } from './spring';
export {
  HELMET,
  HELMET_PATH,
  VISOR,
  EYE_HOME,
  HEAD_PIVOT,
  VIEW,
  eyePath,
  crossPath,
  roundedPolygon,
  roundedRectPath,
  OUTLINE_POINTS,
  roundedPolygonPoints,
  ellipsePoints,
  ellipsePath,
  resampleOutline,
  pointsPath,
} from './geometry';
export { MotionLayer } from './motion';
export type {
  Npface,
  NpfaceOptions,
  NpfaceColors,
  EyeShape,
  HeadPose,
  Pose,
  EyeProp,
  HeadProp,
  StateDef,
  ShapeDef,
  SequenceStep,
  BlinkConfig,
  Motion,
  MotionTarget,
  SineMotion,
  SweepMotion,
  WanderMotion,
  GlanceMotion,
  KeysMotion,
  SpringPreset,
  SpringConfig,
  SpringSpec,
  EaseName,
  Theme,
} from './types';

import { STATES } from './states';
import { resolveDef } from './npface';
import type { StateDef } from './types';

/**
 * Register (or override) a state globally. Supports `extends` to inherit from a built-in state.
 *
 * ```ts
 * registerState('wink', { extends: 'happy', eyes: [{ lidT: 0.9 }, {}], pulse: 900 });
 * ```
 */
export function registerState(name: string, def: StateDef): void {
  STATES[name] = resolveDef(def, STATES);
}
