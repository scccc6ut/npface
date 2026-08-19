/**
 * One shared requestAnimationFrame loop for every npface on the page.
 * The loop stops by itself when nobody is subscribed.
 */
export type TickFn = (now: number, dt: number) => void;

const subs = new Set<TickFn>();
let rafId = 0;
let last = 0;

function frame(now: number): void {
  rafId = 0;
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
  last = now;
  // copy so that subscribers may unsubscribe while iterating
  for (const fn of Array.from(subs)) fn(now, dt);
  if (subs.size) rafId = requestAnimationFrame(frame);
  else last = 0;
}

export function subscribe(fn: TickFn): void {
  subs.add(fn);
  if (!rafId && typeof requestAnimationFrame === 'function') {
    last = 0;
    rafId = requestAnimationFrame(frame);
  }
}

export function unsubscribe(fn: TickFn): void {
  subs.delete(fn);
  if (!subs.size && rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
    last = 0;
  }
}

export const now = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();
