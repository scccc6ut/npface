import { useEffect, useMemo, useState } from 'react';
import { Npface } from 'npface-react';
import { SHAPE_META, SHOWCASE } from '../lib/meta';
import type { UIStrings } from '../lib/i18n';
import { Section } from '../components/Section';
import { usePageTheme } from '../lib/theme';

function useFps(): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return fps;
}

export function Crew({ t }: { t: UIStrings }) {
  const [count, setCount] = useState(36);
  const fps = useFps();
  const theme = usePageTheme();
  const members = useMemo(() => {
    const out: { id: number; state: string; shape: string }[] = [];
    let s = 7;
    const next = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < count; i++) {
      const state = SHOWCASE[Math.floor(next() * SHOWCASE.length)]!;
      const shape = SHAPE_META[Math.floor(next() * SHAPE_META.length)]!.name;
      out.push({ id: i, state, shape });
    }
    return out;
  }, [count]);
  return (
    <Section id="crew" title={t.crew} body={t.crewBody}>
      <div className="card p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button type="button" className="btn" onClick={() => setCount((c) => c + 24)}>
            + {t.add}
          </button>
          <button type="button" className="btn" onClick={() => setCount(36)}>
            {t.clear}
          </button>
          <span className="ml-auto font-mono text-xs opacity-70">
            {count} {t.faces} · {fps} fps
          </span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-2">
          {members.map((m) => (
            <div key={m.id} className="flex justify-center">
              <Npface
                state={m.state}
                shape={m.shape}
                size={40}
                follow
                label={`${m.shape} ${m.state}`}
                theme={theme}
              />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
