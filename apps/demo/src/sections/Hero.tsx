import { useEffect, useRef, useState } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';
import { SHAPE_META, SHOWCASE } from '../lib/meta';
import type { Lang, UIStrings } from '../lib/i18n';
import { CodeBlock } from '../components/CodeBlock';
import { usePageTheme } from '../lib/theme';

export function Hero({ t, lang }: { t: UIStrings; lang: Lang }) {
  const [i, setI] = useState(0);
  const ref = useRef<NpfaceHandle>(null);
  const theme = usePageTheme();
  useEffect(() => {
    const id = setInterval(() => setI((v) => v + 1), 2600);
    return () => clearInterval(id);
  }, []);
  const state = SHOWCASE[i % SHOWCASE.length]!;
  // every third expression the helmet morphs into the next face shape
  const shape = SHAPE_META[Math.floor(i / 3) % SHAPE_META.length]!.name;
  return (
    <section
      id="top"
      className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-5 pt-14 pb-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:pt-20"
    >
      <div>
        <div className="flex flex-wrap gap-2">
          <span className="chip">MIT</span>
          <span className="chip">0 deps</span>
          <span className="chip">~12 KB gz</span>
          <span className="chip">React · Vanilla</span>
          <span className="chip">prefers-reduced-motion</span>
        </div>
        <h1 className="mt-5 text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl">
          {t.heroTitle}
        </h1>
        <p className="mt-3 text-base font-semibold text-navy/70 dark:text-sand/70">
          {lang === 'en'
            ? '表情头盔 · 会表情的 AI 员工头像'
            : 'Expression helmet · the AI-employee avatar that emotes'}
        </p>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-navy/80 dark:text-sand/80">
          {t.heroBody}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a className="btn btn-primary px-4 py-2" href="#playground">
            {t.getStarted}
          </a>
          <a className="btn px-4 py-2" href="#states">
            {t.gallery} →
          </a>
        </div>
        <div className="mt-6 max-w-xl">
          <CodeBlock
            code={
              'npm i npface          # vanilla / any framework\nnpm i npface-react    # React bindings'
            }
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          className="card stage-grid flex aspect-square w-full max-w-[340px] items-center justify-center rounded-3xl"
          onClick={() => ref.current?.pulse('happy')}
          aria-label="npface hero"
        >
          <Npface
            ref={ref}
            state={state}
            shape={shape}
            size={220}
            follow
            label={`npface ${state}`}
            theme={theme}
          />
        </button>
        <div className="flex items-center gap-2 font-mono text-sm text-navy/70 dark:text-sand/70">
          <span className="inline-block h-2 w-2 rounded-full bg-lime" />
          face.set(<span className="text-navy dark:text-lime">'{state}'</span>)
          <span className="opacity-60">· shape</span>
          <span className="text-navy dark:text-lime">'{shape}'</span>
        </div>
      </div>
    </section>
  );
}
