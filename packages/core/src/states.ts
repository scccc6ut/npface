/**
 * npface states — pure data, no rendering logic.
 *
 * Every state = eye shapes + head pose + rhythm (blink / motions / entry sequence).
 * Mirrored eye props (`rot`, `tiltT`, `tiltB`) are written in the LEFT eye's frame;
 * the renderer flips them for the right eye.
 *
 * Design notes (all original): the eyes are rounded squares (npcrew brand). Expressions come from
 * size, roundness, lids (closure / tilt / curve), offsets, a dizzy "X" overlay and head motion.
 */
import type { BlinkConfig, EyeShape, HeadPose, StateDef } from './types';

/** Resting eye. */
export const BASE_EYE: EyeShape = {
  x: 0,
  y: 0,
  w: 14.5,
  h: 14.5,
  r: 0.5,
  rot: 0,
  lidT: 0,
  lidB: 0,
  tiltT: 0,
  tiltB: 0,
  curveT: 0,
  curveB: 0,
  cross: 0,
  fill: 1,
};

/** Resting head. */
export const BASE_HEAD: HeadPose = { x: 0, y: 0, rot: 0, sx: 1, sy: 1 };

/** Default blink rhythm, used when a state does not specify `blink`. */
export const DEFAULT_BLINK: BlinkConfig = { every: [2600, 6200], double: 0.12 };

/** Resting breath shared by calm states. */
const BREATH = { type: 'sine', target: 'head.y', amp: 0.7, period: 3600 } as const;

export const STATES: Record<string, StateDef> = {
  /* ---------- calm ---------- */
  idle: {
    blink: DEFAULT_BLINK,
    motions: [
      BREATH,
      {
        type: 'glance',
        every: [3500, 8000],
        hold: [500, 1200],
        x: [-3, 3],
        y: [-1.5, 1.5],
        head: 0.6,
      },
    ],
  },

  sleep: {
    eye: { r: 1, lidT: 0.76, w: 15, h: 14, y: 2.5 },
    head: { y: 3, rot: 2.5 },
    spring: 'slow',
    blink: false,
    zzz: true,
    motions: [
      { type: 'sine', target: 'head.y', amp: 1.3, period: 4600 },
      { type: 'sine', target: 'head.sy', amp: 0.012, period: 4600 },
    ],
  },

  wake: {
    eye: { w: 15, h: 15, r: 0.55 },
    spring: 'snappy',
    blink: { every: [900, 1600], double: 0.5 },
    sequence: {
      steps: [
        { at: 0, eye: { r: 1, lidT: 0.76, w: 15, h: 14, y: 2.5 }, head: { y: 3, rot: 2.5 } },
        {
          at: 240,
          eye: { lidT: 0, w: 17, h: 18, r: 0.8, y: -1 },
          head: { y: -2.5, rot: 0, sx: 0.98, sy: 1.05 },
          spring: 'bouncy',
        },
        { at: 1000, eye: { w: 15, h: 15, r: 0.55, y: 0 }, head: { y: 0, sx: 1, sy: 1 } },
      ],
    },
    next: { to: 'idle', after: 1600 },
  },

  /* ---------- positive ---------- */
  happy: {
    eye: { r: 1, w: 15.5, h: 15, lidB: 0.5, curveB: 0.45, y: -0.5 },
    head: { y: -1 },
    spring: 'bouncy',
    blink: { every: [4000, 8000] },
    sequence: {
      steps: [
        { at: 0, head: { y: 1, sx: 1.04, sy: 0.96 } },
        { at: 130, head: { y: -4, sx: 0.98, sy: 1.04 }, spring: 'bouncy' },
        { at: 330, head: { y: -1, sx: 1, sy: 1 } },
      ],
    },
    motions: [
      { type: 'sine', target: 'head.y', amp: 0.8, period: 1400 },
      { type: 'sine', target: 'head.rot', amp: 1.5, period: 2800 },
    ],
    pulse: 1800,
  },

  proud: {
    eye: { r: 0.9, w: 15.5, h: 14, lidB: 0.45, curveB: 0.4, lidT: 0.08, y: -0.5 },
    head: { y: -2, sx: 1.02, sy: 1.02 },
    spring: 'bouncy',
    blink: { every: [3500, 7000] },
    sequence: {
      steps: [
        { at: 0, head: { y: -5, rot: -3 } },
        { at: 180, head: { y: -2, rot: 2 } },
        { at: 420, head: { y: -2, rot: 0 } },
      ],
    },
    motions: [{ type: 'sine', target: 'head.y', amp: 0.5, period: 2200 }],
    pulse: 2000,
  },

  /* ---------- working ---------- */
  thinking: {
    eye: { x: 3.5, y: -3, w: 14, h: 12.5, lidT: 0.18, curveT: 0.15 },
    eyes: [{}, { h: 11.5, lidT: 0.25 }],
    head: { rot: -4, x: -0.5 },
    spring: 'soft',
    blink: { every: [2500, 5000] },
    motions: [
      { type: 'glance', every: [1800, 3600], hold: [700, 1600], x: [-7, 1], y: [-1, 1], head: 0.5 },
      { type: 'sine', target: 'head.y', amp: 0.6, period: 3400 },
    ],
  },

  searching: {
    eye: { r: 0.85, w: 12.5, h: 12.5 },
    blink: { every: [3000, 6000] },
    motions: [
      { type: 'sine', target: 'eye.x', amp: 5.5, period: 1500, phase: 0.25 },
      { type: 'sine', target: 'eye.y', amp: 3.5, period: 1500 },
      { type: 'sine', target: 'head.rot', amp: 2.5, period: 1500, phase: 0.25 },
      { type: 'sine', target: 'head.x', amp: 0.8, period: 1500, phase: 0.25 },
    ],
  },

  working: {
    eye: { w: 14.5, h: 11.5, lidT: 0.2, tiltT: -6, y: 1.5 },
    head: { y: 1 },
    spring: 'snappy',
    blink: { every: [3500, 7500], double: 0.2 },
    motions: [
      {
        type: 'sweep',
        target: 'eye.x',
        from: -4.5,
        to: 4.5,
        period: 1300,
        back: 0.18,
        ease: 'inOutSine',
      },
      { type: 'keys', target: 'eye.y', values: [0, 1, 2], period: 3900, spring: 'snappy' },
      { type: 'sine', target: 'head.y', amp: 0.4, period: 2600 },
    ],
  },

  waiting: {
    eye: { x: 0.5, y: -1.5 },
    eyes: [
      { w: 16, h: 16.5, r: 0.6 },
      { w: 14, h: 13.5, r: 0.55, y: -1, lidT: 0.15 },
    ],
    head: { rot: 9, y: 0.5, x: 1 },
    spring: 'soft',
    blink: { every: [2500, 5000], double: 0.3 },
    motions: [
      { type: 'sine', target: 'head.rot', amp: 1.5, period: 3000 },
      { type: 'sine', target: 'head.y', amp: 0.6, period: 3000, phase: 0.25 },
      { type: 'glance', every: [2500, 5000], hold: [400, 900], x: [-2, 2], y: [-1, 0.5] },
    ],
  },

  /* ---------- negative ---------- */
  error: {
    eye: { cross: 1, fill: 0, w: 13, h: 13, r: 1 },
    head: { y: 1 },
    spring: 'snappy',
    blink: false,
    sequence: {
      steps: [
        { at: 0, head: { x: -3 } },
        { at: 90, head: { x: 3 } },
        { at: 180, head: { x: -2 } },
        { at: 270, head: { x: 2 } },
        { at: 360, head: { x: 0 } },
      ],
    },
    motions: [
      { type: 'sine', target: 'head.rot', amp: 5, period: 1800 },
      { type: 'sine', target: 'head.y', amp: 1, period: 900 },
      { type: 'sine', target: 'eye.rot', amp: 8, period: 1800, phase: 0.25 },
      { type: 'sine', target: 'eye.y', amp: 0.8, period: 900 },
    ],
    pulse: 2200,
  },

  sad: {
    eye: { lidT: 0.45, tiltT: 14, curveT: 0.1, y: 1.5, w: 14.5, h: 14 },
    head: { y: 2.5, rot: 2.5 },
    spring: 'slow',
    blink: { every: [3000, 6000] },
    motions: [
      { type: 'sine', target: 'head.y', amp: 0.9, period: 4400 },
      { type: 'wander', target: 'eye.lidT', range: [0, 0.15], every: [2000, 4500], spring: 'slow' },
    ],
  },
};

/** Friendly aliases → canonical state names. */
export const ALIASES: Record<string, string> = {
  complete: 'proud',
  done: 'proud',
  success: 'proud',
  celebrate: 'happy',
  joy: 'happy',
  tired: 'sad',
  sleepy: 'sad',
  dizzy: 'error',
  fail: 'error',
  failed: 'error',
  confused: 'error',
  think: 'thinking',
  search: 'searching',
  work: 'working',
  busy: 'working',
  wait: 'waiting',
  ask: 'waiting',
  question: 'waiting',
  sleeping: 'sleep',
  zzz: 'sleep',
  awake: 'wake',
  neutral: 'idle',
  default: 'idle',
};

/** The built-in state names (blink is an auto overlay but addressable via set/pulse). */
export const STATE_NAMES = [
  'sleep',
  'wake',
  'idle',
  'blink',
  'happy',
  'proud',
  'thinking',
  'searching',
  'working',
  'waiting',
  'error',
  'sad',
] as const;

export type StateName = (typeof STATE_NAMES)[number];
