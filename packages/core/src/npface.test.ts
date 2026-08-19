import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNpface } from './npface';
import { registerState } from './index';
import type { Npface } from './types';

let container: HTMLDivElement;
const made: Npface[] = [];
const make = (opts?: Parameters<typeof createNpface>[1]) => {
  const f = createNpface(container, opts);
  made.push(f);
  return f;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(
    (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number,
  );
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
  container = document.createElement('div');
  document.body.appendChild(container);
});
afterEach(() => {
  for (const f of made.splice(0)) f.destroy();
  container.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('createNpface', () => {
  it('renders an svg with helmet, visor and two eyes', () => {
    const face = make({ state: 'idle', size: 64 });
    const svg = container.querySelector('svg')!;
    expect(svg).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('64');
    expect(svg.getAttribute('data-state')).toBe('idle');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.querySelectorAll('.npface-eye').length).toBe(2);
    expect(svg.querySelector('.npface-body')?.getAttribute('fill')).toBe('#0f1d3a');
    vi.advanceTimersByTime(50);
    expect(svg.querySelector('.npface-eye-l')?.getAttribute('d')?.startsWith('M')).toBe(true);
    face.destroy();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('switches states, resolves aliases and falls back to idle', () => {
    const seen: string[] = [];
    const face = make({ onChange: (s) => seen.push(s) });
    face.set('thinking');
    expect(face.state).toBe('thinking');
    face.set('complete');
    expect(face.state).toBe('proud');
    face.set('???');
    expect(face.state).toBe('idle');
    expect(seen).toEqual(['thinking', 'proud', 'idle']);
    expect(face.el.getAttribute('aria-label')).toBe('idle');
    face.destroy();
  });

  it('pulse plays a state and returns to the previous one', () => {
    const face = make({ state: 'working' });
    face.pulse('proud', 500);
    expect(face.state).toBe('proud');
    vi.advanceTimersByTime(600);
    expect(face.state).toBe('working');
    face.destroy();
  });

  it('set() during a pulse cancels the return', () => {
    const face = make({ state: 'idle' });
    face.pulse('error', 500);
    face.set('searching'); // alias of search-web
    vi.advanceTimersByTime(700);
    expect(face.state).toBe('search-web');
    face.destroy();
  });

  it('auto-transitions wake → idle', () => {
    const face = make({ state: 'wake' });
    expect(face.state).toBe('wake');
    vi.advanceTimersByTime(1800);
    expect(face.state).toBe('idle');
    face.destroy();
  });

  it('applies colours, themes and sizes', () => {
    const face = make({
      theme: 'dark',
      colors: { eye: '#ff0000' },
      size: '3rem',
    });
    const svg = face.el;
    expect(svg.style.width).toBe('3rem');
    expect(svg.querySelector('.npface-eye-l')?.getAttribute('fill')).toBe('#ff0000');
    expect(svg.querySelector('.npface-body')?.getAttribute('fill')).toBe('#1b2d56');
    face.setTheme('light');
    expect(svg.querySelector('.npface-body')?.getAttribute('fill')).toBe('#0f1d3a');
    face.setColors({ rim: '#123456' });
    expect(svg.querySelector('.npface-body')?.getAttribute('stroke')).toBe('#123456');
    face.setSize(24);
    expect(svg.getAttribute('height')).toBe('24');
    face.destroy();
  });

  it('supports custom states and extends', () => {
    registerState('wink', { extends: 'happy', eyes: [{ lidT: 0.9 }, {}], pulse: 300 });
    const face = make({ states: { zen: { extends: 'sleep', zzz: false } } });
    face.set('wink');
    expect(face.state).toBe('wink');
    face.set('zen');
    expect(face.state).toBe('zen');
    face.destroy();
  });

  it('reduced motion snaps quickly and never blinks', () => {
    const face = make({ reducedMotion: true, state: 'idle' });
    face.set('happy');
    vi.advanceTimersByTime(1000);
    const d1 = face.el.querySelector('.npface-eye-l')?.getAttribute('d');
    vi.advanceTimersByTime(8000);
    const d2 = face.el.querySelector('.npface-eye-l')?.getAttribute('d');
    expect(d1).toBe(d2); // static: no breathing / blink / glance
    face.destroy();
  });

  it('sleep shows zzz and the dizzy state draws crosses', () => {
    const face = make({ state: 'sleep' });
    expect(face.el.querySelector('.npface-zzz')).toBeTruthy();
    face.set('error', { immediate: true });
    vi.advanceTimersByTime(50);
    expect(face.el.querySelector('.npface-cross')?.getAttribute('d')?.length).toBeGreaterThan(5);
    face.destroy();
  });
});
