import type { ReactNode, Ref } from 'react';

export function Section({
  id,
  title,
  body,
  children,
  sectionRef,
  className = '',
}: {
  id: string;
  title: string;
  body?: string;
  children: ReactNode;
  sectionRef?: Ref<HTMLElement>;
  className?: string;
}) {
  return (
    <section id={id} ref={sectionRef} className={`mx-auto w-full max-w-6xl scroll-mt-20 px-5 py-14 ${className}`}>
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {body && <p className="mt-2 max-w-3xl text-sm leading-relaxed text-navy/70 dark:text-sand/70 sm:text-base">{body}</p>}
      <div className="mt-8">{children}</div>
    </section>
  );
}
