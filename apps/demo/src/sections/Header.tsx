import { Npface } from 'npface-react';
import type { Lang, UIStrings } from '../lib/i18n';

const REPO = 'https://github.com/scccc6ut/npface';

export function Header({
  t,
  lang,
  setLang,
  dark,
  setDark,
}: {
  t: UIStrings;
  lang: Lang;
  setLang: (l: Lang) => void;
  dark: boolean;
  setDark: (d: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-navy/10 bg-warm/80 backdrop-blur dark:border-white/10 dark:bg-ink/80">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-5">
        <a href="#top" className="flex items-center gap-2 font-bold tracking-tight">
          <Npface size={28} follow label="npface" />
          <span>npface</span>
        </a>
        <span className="hidden text-xs text-navy/60 sm:inline dark:text-sand/60">{t.tagline}</span>
        <nav className="ml-auto hidden items-center gap-4 text-sm md:flex">
          <a className="hover:underline" href="#states">
            {t.gallery}
          </a>
          <a className="hover:underline" href="#playground">
            {t.playground}
          </a>
          <a className="hover:underline" href="#agent">
            {t.agent}
          </a>
          <a className="hover:underline" href="#crew">
            {t.crew}
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button type="button" className="btn px-2.5" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}>
            {t.langToggle}
          </button>
          <button type="button" className="btn px-2.5" aria-label="toggle theme" onClick={() => setDark(!dark)}>
            {dark ? '☀︎' : '☾'}
          </button>
          <a className="btn px-2.5" href={REPO} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </div>
      </div>
    </header>
  );
}
