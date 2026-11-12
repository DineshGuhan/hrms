import type { ReactNode } from 'react';

export interface CardProps {
  title?: string;
  children: ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section className="card">
      {title ? <h2 className="card-title">{title}</h2> : null}
      <div className="card-body">{children}</div>
    </section>
  );
}
