import { useMemo, useRef, useState, type PointerEvent as RPointerEvent, type Ref } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';
import { STATE_META, COLOR_PRESETS, SHAPE_META } from '../lib/meta';
import type { UIStrings } from '../lib/i18n';
import { Section } from '../components/Section';
import { Toggle } from '../components/Toggle';
import { CodeBlock } from '../components/CodeBlock';
import { usePageTheme } from '../lib/theme';

type Theme = 'auto' | 'light' | 'dark';

const PULSES = ['proud', 'happy', 'error', 'blink'];

function snippets(cfg: {
  state: string;
  shape: string;
  size: number;
  colors: { body: string; visor: string; eye: string };
  follow: boolean;
  theme: Theme;
  reduced: boolean;
  isDefaultColors: boolean;
}) {
  const opt: string[] = [`state: '${cfg.state}'`, `size: ${cfg.size}`];
  if (cfg.shape !== 'square') opt.push(`shape: '${cfg.shape}'`);
  if (!cfg.isDefaultColors)
    opt.push(
      `colors: { body: '${cfg.colors.body}', visor: '${cfg.colors.visor}', eye: '${cfg.colors.eye}' }`,
    );
  if (cfg.follow) opt.push('follow: true');
  if (cfg.theme !== 'auto') opt.push(`theme: '${cfg.theme}'`);
  if (cfg.reduced) opt.push('reducedMotion: true');
  const vanilla = `import { createNpface } from 'npface';

const face = createNpface(document.querySelector('#avatar'), {
  ${opt.join(',\n  ')},
});

face.set('thinking');      // switch state (spring transition)
face.setShape('circle');   // morph to another face shape
face.pulse('proud');       // one-shot, then back
face.follow(true);         // eyes follow the pointer
face.destroy();`;

  const props: string[] = [`state={status}`, `size={${cfg.size}}`];
  if (cfg.shape !== 'square') props.push(`shape="${cfg.shape}"`);
  if (!cfg.isDefaultColors)
    props.push(
      `colors={{ body: '${cfg.colors.body}', visor: '${cfg.colors.visor}', eye: '${cfg.colors.eye}' }}`,
    );
  if (cfg.follow) props.push('follow');
  if (cfg.theme !== 'auto') props.push(`theme="${cfg.theme}"`);
  if (cfg.reduced) props.push('reducedMotion');
  const react = `import { useRef } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';

export function Employee({ status }: { status: string }) {
  const face = useRef<NpfaceHandle>(null);
  return (
    <Npface
      ref={face}
      ${props.join('\n      ')}
      onStateChange={(s) => console.log('now', s)}
    />
  );
  // face.current?.pulse('proud')  — imperative one-shots
}`;

  const agent = `// Backend (any language): stream a status per step.
// { "agentId": "nova", "status": "searching" }
// npface maps unknown names to "idle", and understands aliases:
//   complete → proud · tired → sad · dizzy/fail → error · busy → working
//   searching/browsing → search-web · rag/reading → search-docs (searchDocs, search_docs … also work)

const es = new EventSource('/api/agents/nova/events');
es.onmessage = (e) => {
  const { status, event } = JSON.parse(e.data);
  if (event === 'done') face.pulse('proud');   // one-shot celebration
  else face.set(status);                      // thinking / search-docs / search-web / working / waiting …
};`;
  return { vanilla, react, agent };
}

export function Playground({
  t,
  selected,
  setSelected,
  shape,
  setShape,
  sectionRef,
}: {
  t: UIStrings;
  selected: string;
  setSelected: (s: string) => void;
  shape: string;
  setShape: (s: string) => void;
  sectionRef: Ref<HTMLElement>;
}) {
  const ref = useRef<NpfaceHandle>(null);
  const pageTheme = usePageTheme();
  const [size, setSize] = useState(160);
  const [colors, setColors] = useState(COLOR_PRESETS[0]!.colors);
  const [follow, setFollow] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [theme, setTheme] = useState<Theme>('auto');
  const [tab, setTab] = useState<'vanilla' | 'react' | 'agent'>('vanilla');
  const [look, setLook] = useState<[number, number] | null>(null);
  const padRef = useRef<HTMLDivElement>(null);

  const isDefaultColors = JSON.stringify(colors) === JSON.stringify(COLOR_PRESETS[0]!.colors);
  const code = useMemo(
    () =>
      snippets({ state: selected, shape, size, colors, follow, theme, reduced, isDefaultColors }),
    [selected, shape, size, colors, follow, theme, reduced, isDefaultColors],
  );

  const onPad = (e: RPointerEvent<HTMLDivElement>) => {
    if (!padRef.current || !(e.buttons & 1)) return;
    const r = padRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - r.top) / r.height) * 2 - 1;
    setLook([Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))]);
  };

  return (
    <Section id="playground" title={t.playground} body={t.playgroundBody} sectionRef={sectionRef}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* stage */}
        <div className="flex flex-col gap-4">
          <div
            className={`card stage-grid relative flex min-h-[360px] items-center justify-center rounded-3xl ${theme === 'dark' ? 'bg-ink!' : theme === 'light' ? 'bg-white!' : ''}`}
          >
            <Npface
              ref={ref}
              state={selected}
              shape={shape}
              size={size}
              colors={colors}
              follow={follow}
              reducedMotion={reduced ? true : 'auto'}
              theme={theme === 'auto' ? pageTheme : theme}
              look={look}
              label={`npface ${selected}`}
            />
            <div className="absolute right-3 bottom-3 font-mono text-[11px] text-navy/50 dark:text-sand/50">
              {size}px · {shape} · {selected}
            </div>
          </div>
          <div className="card p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
              {t.code}
              <div className="ml-auto flex gap-1">
                {(['vanilla', 'react', 'agent'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`btn px-2.5 py-1 text-xs ${tab === k ? 'btn-active' : ''}`}
                    onClick={() => setTab(k)}
                  >
                    {k === 'vanilla' ? t.vanilla : k === 'react' ? t.react : t.agentCode}
                  </button>
                ))}
              </div>
            </div>
            <CodeBlock code={code[tab]} copyLabel={t.copy} copiedLabel={t.copied} />
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <div className="mb-2 text-sm font-semibold">{t.shape}</div>
            <div className="flex flex-wrap gap-1.5">
              {SHAPE_META.map((m) => (
                <button
                  key={m.name}
                  type="button"
                  aria-pressed={shape === m.name}
                  className={`btn gap-1.5 px-2 py-1 font-mono text-xs ${shape === m.name ? 'btn-active' : ''}`}
                  onClick={() => setShape(m.name)}
                >
                  <Npface
                    shape={m.name}
                    size={20}
                    reducedMotion
                    theme={shape === m.name ? 'dark' : pageTheme}
                    aria-hidden
                  />
                  {m.name}
                </button>
              ))}
            </div>
            <div className="mt-4 mb-2 text-sm font-semibold">{t.state}</div>
            <div className="flex flex-wrap gap-1.5">
              {STATE_META.filter((m) => !m.auto).map((m) => (
                <button
                  key={m.name}
                  type="button"
                  className={`btn px-2.5 py-1 font-mono text-xs ${selected === m.name ? 'btn-active' : ''}`}
                  onClick={() => setSelected(m.name)}
                >
                  {m.name}
                </button>
              ))}
            </div>
            <div className="mt-4 mb-2 text-sm font-semibold">{t.pulse}</div>
            <div className="flex flex-wrap gap-1.5">
              {PULSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="btn btn-lime px-2.5 py-1 font-mono text-xs"
                  onClick={() => ref.current?.pulse(p)}
                >
                  pulse('{p}')
                </button>
              ))}
            </div>
          </div>

          <div className="card grid gap-4 p-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                <span>{t.size}</span>
                <span className="font-mono text-xs font-normal">{size}px</span>
              </div>
              <input
                className="range"
                type="range"
                min={24}
                max={280}
                value={size}
                onChange={(e) => setSize(+e.target.value)}
              />
              <div className="mt-2 flex gap-1.5">
                {[32, 48, 64, 96, 160].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`btn px-2 py-0.5 text-xs ${size === s ? 'btn-active' : ''}`}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Toggle checked={follow} onChange={setFollow} label={t.follow} />
              <Toggle checked={reduced} onChange={setReduced} label={t.reducedMotion} />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{t.theme}</span>
                <div className="flex gap-1">
                  {(['auto', 'light', 'dark'] as const).map((th) => (
                    <button
                      key={th}
                      type="button"
                      className={`btn px-2 py-0.5 text-xs ${theme === th ? 'btn-active' : ''}`}
                      onClick={() => setTheme(th)}
                    >
                      {th === 'auto' ? t.themeAuto : th === 'light' ? t.themeLight : t.themeDark}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card grid gap-4 p-4 sm:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-2 text-sm font-semibold">{t.colors}</div>
              <div className="flex flex-wrap gap-3">
                {(['body', 'visor', 'eye'] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-xs">
                    <input
                      type="color"
                      value={colors[k]}
                      onChange={(e) => setColors({ ...colors, [k]: e.target.value })}
                      className="h-7 w-9 cursor-pointer rounded border border-navy/15 bg-transparent p-0 dark:border-white/15"
                    />
                    <span>{k === 'body' ? t.body : k === 'visor' ? t.visor : t.eye}</span>
                    <code className="font-mono text-[11px] opacity-60">{colors[k]}</code>
                  </label>
                ))}
              </div>
              <div className="mt-3 mb-1.5 text-xs font-semibold opacity-70">{t.presets}</div>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    className={`btn gap-1.5 px-2 py-1 text-xs ${JSON.stringify(p.colors) === JSON.stringify(colors) ? 'btn-active' : ''}`}
                    onClick={() => setColors(p.colors)}
                  >
                    <span className="flex h-3 w-6 overflow-hidden rounded-sm border border-black/10">
                      <i style={{ background: p.colors.body }} className="flex-1" />
                      <i style={{ background: p.colors.visor }} className="flex-1" />
                      <i style={{ background: p.colors.eye }} className="flex-1" />
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="text-sm font-semibold">{t.look}</div>
              <div
                ref={padRef}
                onPointerDown={(e) => {
                  (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                  onPad(e);
                }}
                onPointerMove={onPad}
                onPointerUp={() => setLook(null)}
                onPointerCancel={() => setLook(null)}
                className="stage-grid relative h-28 w-28 touch-none rounded-xl border border-navy/15 bg-white/60 dark:border-white/15 dark:bg-white/5"
              >
                <div
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime ring-2 ring-navy dark:ring-lime-pale"
                  style={{
                    left: `${((look?.[0] ?? 0) + 1) * 50}%`,
                    top: `${((look?.[1] ?? 0) + 1) * 50}%`,
                  }}
                />
              </div>
              <div className="text-[11px] opacity-60">{t.lookHint}</div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
