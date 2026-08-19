import { describe, expect, it } from 'vitest';
import { ALIASES, BASE_EYE, BASE_HEAD, STATES, STATE_NAMES } from './states';
import { resolveStateName } from './npface';

const EYE_KEYS = Object.keys(BASE_EYE);
const HEAD_KEYS = Object.keys(BASE_HEAD);

describe('state data', () => {
  it('defines every built-in state except the blink overlay', () => {
    for (const n of STATE_NAMES) {
      if (n === 'blink') continue;
      expect(STATES[n], n).toBeDefined();
    }
  });

  it('only uses known eye / head props and motion targets', () => {
    for (const [name, def] of Object.entries(STATES)) {
      for (const k of Object.keys(def.eye ?? {})) expect(EYE_KEYS, `${name}.eye.${k}`).toContain(k);
      for (const part of def.eyes ?? [])
        for (const k of Object.keys(part)) expect(EYE_KEYS, `${name}.eyes.${k}`).toContain(k);
      for (const k of Object.keys(def.head ?? {}))
        expect(HEAD_KEYS, `${name}.head.${k}`).toContain(k);
      for (const m of def.motions ?? []) {
        if (m.type === 'glance') continue;
        const [group, prop] = m.target.split('.');
        if (group === 'head') expect(HEAD_KEYS, `${name}:${m.target}`).toContain(prop);
        else expect(EYE_KEYS, `${name}:${m.target}`).toContain(prop);
        if ('period' in m) expect(m.period).toBeGreaterThan(0);
      }
      for (const st of def.sequence?.steps ?? []) expect(st.at).toBeGreaterThanOrEqual(0);
      if (def.next) expect(STATES[def.next.to], `${name}.next`).toBeDefined();
    }
  });

  it('aliases point at real states', () => {
    for (const [a, target] of Object.entries(ALIASES)) expect(STATES[target], a).toBeDefined();
  });

  it('resolves names, aliases, case and unknowns', () => {
    expect(resolveStateName('thinking')).toBe('thinking');
    expect(resolveStateName('complete')).toBe('proud');
    expect(resolveStateName('searching')).toBe('search-web');
    expect(resolveStateName('search-docs')).toBe('search-docs');
    expect(resolveStateName('searchDocs')).toBe('search-docs');
    expect(resolveStateName('search_web')).toBe('search-web');
    expect(resolveStateName('Search Web')).toBe('search-web');
    expect(resolveStateName('rag')).toBe('search-docs');
    expect(resolveStateName('browsing')).toBe('search-web');
    expect(resolveStateName('Tired')).toBe('sad');
    expect(resolveStateName('WORKING')).toBe('working');
    expect(resolveStateName('nope')).toBe('idle');
    expect(resolveStateName('')).toBe('idle');
  });
});
