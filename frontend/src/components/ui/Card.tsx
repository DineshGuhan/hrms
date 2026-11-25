import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      {title ? <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2> : null}
      <div className="card-body">{children}</div>
    </section>
  );
}
