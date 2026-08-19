import { useEffect, useRef, useState } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';
import { STATE_META } from '../lib/meta';
import type { Lang, UIStrings } from '../lib/i18n';
import { Section } from '../components/Section';

function Card({
  name,
  lang,
  t,
  onPick,
}: {
  name: string;
  lang: Lang;
  t: UIStrings;
  onPick: (s: string) => void;
}) {
  const meta = STATE_META.find((m) => m.name === name)!;
  const ref = useRef<NpfaceHandle>(null);
  // blink and wake need a little choreography to keep demonstrating themselves
  const [state, setState] = useState(name === 'blink' ? 'idle' : name === 'wake' ? 'sleep' : name);
  useEffect(() => {
    if (name === 'blink') {
      const id = setInterval(() => ref.current?.blink(), 1800);
      return () => clearInterval(id);
    }
    if (name === 'wake') {
      let on = false;
      const id = setInterval(() => {
        on = !on;
        setState(on ? 'wake' : 'sleep');
      }, 2600);
      return () => clearInterval(id);
    }
  }, [name]);
  return (
    <button
      type="button"
      onClick={() => onPick(name)}
      aria-label={`${name} — ${lang === 'en' ? meta.descEn : meta.descZh}`}
      className="card group flex flex-col items-center gap-2 px-3 pt-5 pb-4 text-center transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <Npface ref={ref} state={state} size={84} follow label={name} />
      <div className="mt-1 font-mono text-sm font-semibold">{name}</div>
      <div className="text-xs font-medium text-navy/70 dark:text-sand/70">{lang === 'en' ? meta.zh : meta.en}</div>
      <div className="min-h-[2.5em] text-[11px] leading-snug text-navy/60 dark:text-sand/60">{lang === 'en' ? meta.descEn : meta.descZh}</div>
      <div className="flex flex-wrap justify-center gap-1">
        {meta.auto && <span className="chip">{t.auto}</span>}
        {meta.pulse && <span className="chip">{t.oneShot}</span>}
        {meta.aliases?.map((a) => (
          <span key={a} className="chip">
            {t.alias}: {a}
          </span>
        ))}
      </div>
    </button>
  );
}

export function Gallery({ t, lang, onPick }: { t: UIStrings; lang: Lang; onPick: (s: string) => void }) {
  return (
    <Section id="states" title={`${t.gallery} · 12`} body={t.galleryBody}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {STATE_META.map((m) => (
          <Card key={m.name} name={m.name} lang={lang} t={t} onPick={onPick} />
        ))}
      </div>
    </Section>
  );
}
