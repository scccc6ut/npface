import type { UIStrings } from '../lib/i18n';

export function Footer({ t }: { t: UIStrings }) {
  return (
    <footer className="mx-auto w-full max-w-6xl px-5 pt-6 pb-14 text-sm text-navy/70 dark:text-sand/70">
      <div className="border-t border-navy/10 pt-6 dark:border-white/10">
        <p>{t.footer}</p>
        <p className="mt-2 text-xs leading-relaxed opacity-80">{t.credits}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-xs">
          <a
            className="hover:underline"
            href="https://github.com/scccc6ut/npface"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
          </a>
          <a
            className="hover:underline"
            href="https://www.npmjs.com/package/npface"
            target="_blank"
            rel="noreferrer"
          >
            npm: npface
          </a>
          <a
            className="hover:underline"
            href="https://www.npmjs.com/package/npface-react"
            target="_blank"
            rel="noreferrer"
          >
            npm: npface-react
          </a>
          <span>MIT © 2026 npface contributors</span>
        </div>
      </div>
    </footer>
  );
}
