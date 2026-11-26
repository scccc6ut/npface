'use client';
/**
 * npface-react — thin React bindings for npface.
 *
 * ```tsx
 * import { Npface } from 'npface-react';
 * <Npface state={agent.status} size={48} follow />
 * ```
 */
import { createNpface } from 'npface';
import type {
  Npface as NpfaceHandle,
  NpfaceColors,
  NpfaceOptions,
  ShapeDef,
  StateDef,
  Theme,
} from 'npface';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
} from 'react';

export type { NpfaceHandle, NpfaceColors, NpfaceOptions, ShapeDef, StateDef, Theme };

export interface NpfaceProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onChange'> {
  /** State name — `idle`, `thinking`, `working`, `proud` … Unknown names fall back to `idle`. */
  state?: string;
  /** Alias of `state`. */
  emotion?: string;
  /** CSS px (number) or any CSS length (string). Default 48. */
  size?: number | string;
  /**
   * Face shape: `'square'` (default), `'shield'`, `'ghost'`, `'cat'`, `'circle'`, `'drop'`,
   * `'crown'`, a registered name or a `ShapeDef`. Changing it morphs the helmet.
   */
  shape?: string | ShapeDef;
  colors?: Partial<NpfaceColors>;
  /** `'light' | 'dark' | 'auto'` (default auto). */
  theme?: Theme;
  /** Eyes follow the pointer. */
  follow?: boolean;
  /** Alias of `follow`. */
  gaze?: boolean;
  /** Look in a fixed direction (-1..1 per axis); `null`/undefined releases. */
  look?: [number, number] | null;
  /** `true` / `false` / `'auto'` (default) — honour `prefers-reduced-motion`. */
  reducedMotion?: boolean | 'auto';
  /** Pause the animation loop off-screen. Default true. */
  pauseOffscreen?: boolean;
  /** Accessible label. */
  label?: string;
  /** Extra / overriding states for this instance. */
  states?: Record<string, StateDef>;
  /** Class name(s) applied to the <svg> (the outer span takes `className`). */
  svgClassName?: string;
  /** Transition snaps instead of animating when `state` changes. */
  immediate?: boolean;
  /** Called after every state change. */
  onStateChange?: (state: string, prev: string) => void;
}

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const wrapperStyle: CSSProperties = { display: 'inline-block', lineHeight: 0 };

/**
 * `<Npface />` — a helmet avatar bound to a `state` prop.
 * Use a ref to reach the imperative API (`pulse`, `blink`, `look`, …).
 */
export const Npface = forwardRef<NpfaceHandle | null, NpfaceProps>(function Npface(
  {
    state,
    emotion,
    size = 48,
    shape,
    colors,
    theme = 'auto',
    follow,
    gaze,
    look,
    reducedMotion = 'auto',
    pauseOffscreen = true,
    label,
    states,
    svgClassName,
    immediate,
    onStateChange,
    style,
    ...rest
  },
  ref,
) {
  const hostRef = useRef<HTMLSpanElement>(null);
  const [face, setFace] = useState<NpfaceHandle | null>(null);
  const faceRef = useRef<NpfaceHandle | null>(null);
  const changeRef = useRef(onStateChange);
  useEffect(() => {
    changeRef.current = onStateChange;
  });
  const initial = useRef({
    state: state ?? emotion ?? 'idle',
    size,
    shape,
    colors,
    theme,
    label,
    svgClassName,
  });
  const following = follow ?? gaze ?? false;

  // mount / unmount (re-created when construction-only options change)
  useIsoLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const init = initial.current;
    const inst = createNpface(host, {
      state: init.state,
      size: init.size,
      shape: init.shape,
      colors: init.colors,
      theme: init.theme,
      label: init.label,
      className: init.svgClassName,
      reducedMotion,
      pauseOffscreen,
      states,
      onChange: (s, p) => changeRef.current?.(s, p),
    });
    faceRef.current = inst;
    setFace(inst);
    return () => {
      inst.destroy();
      faceRef.current = null;
      setFace(null);
    };
  }, [reducedMotion, pauseOffscreen, states]);

  useImperativeHandle(ref, () => face as NpfaceHandle, [face]);

  const resolvedState = state ?? emotion ?? 'idle';
  useEffect(() => {
    face?.set(resolvedState, immediate ? { immediate: true } : undefined);
  }, [face, resolvedState, immediate]);

  useEffect(() => {
    face?.setSize(size);
  }, [face, size]);

  const shapeKey = shape && typeof shape === 'object' ? JSON.stringify(shape) : (shape ?? 'square');
  useEffect(() => {
    face?.setShape(shape ?? 'square');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, shapeKey]);

  const colorKey = colors ? JSON.stringify(colors) : '';
  useEffect(() => {
    if (!face) return;
    face.setColors({
      body: colors?.body,
      visor: colors?.visor,
      eye: colors?.eye,
      rim: colors?.rim,
      zzz: colors?.zzz,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [face, colorKey]);

  useEffect(() => {
    face?.setTheme(theme);
  }, [face, theme]);

  useEffect(() => {
    face?.follow(following);
  }, [face, following]);

  const lookX = look ? look[0] : null;
  const lookY = look ? look[1] : 0;
  useEffect(() => {
    if (!face) return;
    if (lookX === null) face.look(null);
    else face.look(lookX, lookY);
  }, [face, lookX, lookY]);

  useEffect(() => {
    if (face && label !== undefined) face.setLabel(label);
  }, [face, label]);

  return (
    <span ref={hostRef} style={style ? { ...wrapperStyle, ...style } : wrapperStyle} {...rest} />
  );
});

/**
 * Hook form: mount an npface into your own element.
 *
 * ```tsx
 * const { ref, face } = useNpface({ state: 'idle' });
 * <div ref={ref} />; face.current?.pulse('proud');
 * ```
 */
export function useNpface<T extends HTMLElement = HTMLDivElement>(options: NpfaceOptions = {}) {
  const ref = useRef<T>(null);
  const face = useRef<NpfaceHandle | null>(null);
  const opts = useRef(options);
  useIsoLayoutEffect(() => {
    if (!ref.current) return;
    const inst = createNpface(ref.current, opts.current);
    face.current = inst;
    return () => {
      inst.destroy();
      face.current = null;
    };
  }, []);
  return { ref, face };
}

export { createNpface };
