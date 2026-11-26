import { useEffect, useState } from 'react';
import { Npface } from 'npface-react';
import { SHAPE_META } from '../lib/meta';
import type { Lang, UIStrings } from '../lib/i18n';
import { Section } from '../components/Section';
import { usePageTheme } from '../lib/theme';

const MORPH_STATES = ['idle', 'happy', 'thinking', 'working', 'proud', 'waiting'];

export function Shapes({
  t,
  lang,
  current,
  onPick,
}: {
  t: UIStrings;
  lang: Lang;
  current: string;
  onPick: (shape: string) => void;
}) {
  const theme = usePageTheme();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => v + 1), 1800);
    return () => clearInterval(id);
  }, []);
  const morph = SHAPE_META[i % SHAPE_META.length]!;
  const morphState = MORPH_STATES[Math.floor(i / 2) % MORPH_STATES.length]!;

  return (
    <Section id="shapes" title={`${t.shapes} · ${SHAPE_META.length}`} body={t.shapesBody}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card stage-grid flex flex-col items-center justify-center gap-2 rounded-2xl px-3 pt-5 pb-4 text-center">
          <Npface
            shape={morph.name}
            state={morphState}
            size={96}
            follow
            theme={theme}
            label={`npface ${morph.name}`}
          />
          <div className="mt-1 font-mono text-sm">
            shape:{' '}
            <span className="font-semibold text-lime-deep dark:text-lime">'{morph.name}'</span>
          </div>
          <div className="text-[11px] leading-snug opacity-60">{t.morphHint}</div>
        </div>
        {SHAPE_META.map((m) => (
          <button
            key={m.name}
            type="button"
            onClick={() => onPick(m.name)}
            aria-label={`${m.name} — ${lang === 'en' ? m.descEn : m.descZh}`}
            className={`card flex flex-col items-center gap-1.5 px-3 pt-5 pb-4 text-center transition hover:-translate-y-0.5 hover:shadow-md ${current === m.name ? 'ring-2 ring-navy dark:ring-lime' : ''}`}
          >
            <Npface shape={m.name} size={72} follow theme={theme} label={m.name} />
            <div className="mt-1 font-mono text-sm font-semibold">{m.name}</div>
            <div className="text-xs font-medium text-navy/70 dark:text-sand/70">
              {lang === 'en' ? m.zh : m.en}
            </div>
            <div className="text-[11px] leading-snug text-navy/60 dark:text-sand/60">
              {lang === 'en' ? m.descEn : m.descZh}
            </div>
          </button>
        ))}
      </div>
    </Section>
  );
}
