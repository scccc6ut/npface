import { useEffect, useRef, useState } from 'react';
import { UI, type Lang } from './lib/i18n';
import { ThemeCtx } from './lib/theme';
import { Header } from './sections/Header';
import { Hero } from './sections/Hero';
import { Gallery } from './sections/Gallery';
import { Playground } from './sections/Playground';
import { AgentDemo } from './sections/AgentDemo';
import { Crew } from './sections/Crew';
import { Footer } from './sections/Footer';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('npface-lang');
    if (saved === 'en' || saved === 'zh') return saved;
  } catch {
    /* ignore */
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function initialDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [dark, setDarkState] = useState(initialDark);
  const [selected, setSelected] = useState('idle');
  const playgroundRef = useRef<HTMLElement>(null);
  const t = UI[lang];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [dark, lang]);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('npface-lang', l);
    } catch {
      /* ignore */
    }
  };
  const setDark = (d: boolean) => {
    setDarkState(d);
    try {
      localStorage.setItem('npface-theme', d ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  };

  return (
    <ThemeCtx.Provider value={dark ? 'dark' : 'light'}>
      <div className="min-h-screen">
        <Header t={t} lang={lang} setLang={setLang} dark={dark} setDark={setDark} />
        <main>
          <Hero t={t} lang={lang} />
          <Gallery
            t={t}
            lang={lang}
            onPick={(s) => {
              setSelected(s === 'blink' ? 'idle' : s);
              playgroundRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
          />
          <Playground
            t={t}
            selected={selected}
            setSelected={setSelected}
            sectionRef={playgroundRef}
          />
          <AgentDemo t={t} lang={lang} />
          <Crew t={t} />
        </main>
        <Footer t={t} />
      </div>
    </ThemeCtx.Provider>
  );
}
