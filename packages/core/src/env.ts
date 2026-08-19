/** Shared environment helpers — all lazy, so importing npface is safe during SSR. */

export const isBrowser = (): boolean => typeof window !== 'undefined' && typeof document !== 'undefined';

type Listener = (matches: boolean) => void;

function makeQuery(query: string) {
  let mql: MediaQueryList | null = null;
  const listeners = new Set<Listener>();
  const ensure = () => {
    if (!mql && isBrowser() && typeof window.matchMedia === 'function') {
      mql = window.matchMedia(query);
      const onChange = () => listeners.forEach((l) => l(mql!.matches));
      if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
      else if (typeof mql.addListener === 'function') mql.addListener(onChange);
    }
    return mql;
  };
  return {
    matches(): boolean {
      const m = ensure();
      return m ? m.matches : false;
    },
    on(l: Listener): () => void {
      ensure();
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

export const reducedMotionQuery = makeQuery('(prefers-reduced-motion: reduce)');
export const darkSchemeQuery = makeQuery('(prefers-color-scheme: dark)');

/* ---------- shared pointer tracking (for gaze) ---------- */

let px = NaN;
let py = NaN;
let pointerUsers = 0;
let pointerBound = false;

function onMove(e: PointerEvent | MouseEvent): void {
  px = e.clientX;
  py = e.clientY;
}
function onLeave(): void {
  px = NaN;
  py = NaN;
}
function onUp(e: PointerEvent): void {
  if (e.pointerType === 'touch') onLeave();
}

/** Start tracking the pointer; returns a release function. */
export function usePointer(): () => void {
  pointerUsers++;
  if (!pointerBound && isBrowser()) {
    pointerBound = true;
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pointerUsers--;
    if (pointerUsers <= 0 && pointerBound) {
      pointerUsers = 0;
      pointerBound = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('blur', onLeave);
      onLeave();
    }
  };
}

export const pointerX = (): number => px;
export const pointerY = (): number => py;
