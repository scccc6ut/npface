import { useState } from 'react';

export function CodeBlock({ code, copyLabel, copiedLabel }: { code: string; copyLabel: string; copiedLabel: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-xl bg-navy p-4 font-mono text-[12.5px] leading-relaxed text-sand dark:bg-black/40">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 rounded-lg bg-white/10 px-2 py-1 text-xs text-sand hover:bg-white/20"
      >
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
