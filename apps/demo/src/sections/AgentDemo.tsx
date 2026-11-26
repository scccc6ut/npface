import { useEffect, useRef, useState } from 'react';
import { Npface, type NpfaceHandle } from 'npface-react';
import type { Lang, UIStrings } from '../lib/i18n';
import { Section } from '../components/Section';
import { usePageTheme } from '../lib/theme';

type Step = { status: string; ms: number; en: string; zh: string; event?: string };

const OK_RUN: Step[] = [
  {
    status: 'thinking',
    ms: 1600,
    en: 'Planning: break the request into steps',
    zh: '规划：把需求拆成步骤',
  },
  {
    status: 'search-docs',
    ms: 2000,
    en: 'Retrieving from the knowledge base',
    zh: '检索知识库文档',
  },
  { status: 'search-web', ms: 2000, en: 'Checking the web for fresh data', zh: '联网检索最新资料' },
  {
    status: 'working',
    ms: 2800,
    en: 'Drafting the reply & running tools',
    zh: '起草回复、调用工具',
  },
  { status: 'waiting', ms: 2600, en: 'Needs your approval to send', zh: '需要你确认后再发送' },
  { status: 'working', ms: 1600, en: 'Approved — sending', zh: '已确认——发送中' },
  { status: 'proud', ms: 2200, en: 'Done ✓', zh: '完成 ✓', event: 'done' },
  { status: 'idle', ms: 0, en: 'Back to idle', zh: '回到待机' },
];

const FAIL_RUN: Step[] = [
  { status: 'thinking', ms: 1400, en: 'Planning', zh: '规划' },
  { status: 'working', ms: 2000, en: 'Calling the CRM API…', zh: '调用 CRM 接口…' },
  {
    status: 'error',
    ms: 2400,
    en: 'HTTP 500 from CRM — retrying',
    zh: 'CRM 返回 500——准备重试',
    event: 'error',
  },
  { status: 'search-web', ms: 1800, en: 'Looking for a fallback endpoint', zh: '联网寻找备用接口' },
  { status: 'working', ms: 1600, en: 'Retry succeeded', zh: '重试成功' },
  { status: 'happy', ms: 1800, en: 'Recovered ✓', zh: '已恢复 ✓', event: 'done' },
  { status: 'idle', ms: 0, en: 'Back to idle', zh: '回到待机' },
];

export function AgentDemo({ t, lang }: { t: UIStrings; lang: Lang }) {
  const ref = useRef<NpfaceHandle>(null);
  const theme = usePageTheme();
  const [state, setState] = useState('idle');
  const [log, setLog] = useState<{ ts: string; status: string; msg: string; event?: string }[]>([]);
  const [running, setRunning] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const run = (steps: Step[]) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLog([]);
    setRunning(true);
    let at = 0;
    const t0 = Date.now();
    steps.forEach((s, i) => {
      timers.current.push(
        setTimeout(() => {
          const ts = ((Date.now() - t0) / 1000).toFixed(1) + 's';
          setLog((l) => [
            ...l,
            { ts, status: s.status, msg: lang === 'en' ? s.en : s.zh, event: s.event },
          ]);
          setState(s.status);
          if (i === steps.length - 1) setRunning(false);
        }, at),
      );
      at += s.ms;
    });
  };

  return (
    <Section id="agent" title={t.agent} body={t.agentBody}>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card flex flex-col p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={running}
              onClick={() => run(OK_RUN)}
            >
              ▶ {t.run}
            </button>
            <button type="button" className="btn" disabled={running} onClick={() => run(FAIL_RUN)}>
              ⚠ {t.runFail}
            </button>
            <span className="ml-auto font-mono text-xs opacity-60">{t.statusLog}</span>
          </div>
          <div className="min-h-[240px] flex-1 overflow-auto rounded-xl bg-navy p-3 font-mono text-[12px] leading-relaxed text-sand dark:bg-black/40">
            {log.length === 0 && <div className="opacity-50">{t.idleHint}</div>}
            {log.map((l, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-10 shrink-0 opacity-40">{l.ts}</span>
                <span className="shrink-0 text-lime">{`{ "status": "${l.status}"${l.event ? `, "event": "${l.event}"` : ''} }`}</span>
                <span className="truncate opacity-70">// {l.msg}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card stage-grid flex flex-col items-center justify-center gap-3 rounded-3xl p-6">
          <div className="flex items-center gap-5">
            <Npface
              ref={ref}
              state={state}
              size={150}
              follow
              label={`agent ${state}`}
              theme={theme}
            />
            <div>
              <div className="text-lg font-bold">Nova</div>
              <div className="text-sm opacity-70">
                {lang === 'en' ? 'Customer-success agent' : '客服 AI 员工'}
              </div>
              <div className="mt-2 font-mono text-xs">
                status:{' '}
                <span className="rounded bg-lime-pale px-1.5 py-0.5 text-lime-deep dark:bg-lime/15 dark:text-lime">
                  {state}
                </span>
              </div>
            </div>
          </div>
          <div className="max-w-sm text-center text-xs opacity-60">
            {lang === 'en'
              ? 'face.set(status) on every message; face.pulse("proud") on done. That is the whole integration.'
              : '每条消息 face.set(status)；完成时 face.pulse("proud")。对接就这么多。'}
          </div>
        </div>
      </div>
    </Section>
  );
}
