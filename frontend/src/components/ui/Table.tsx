import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({ columns, rows, rowKey, emptyMessage = 'No records found' }: TableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-gray-50 px-4 py-10 text-center text-sm text-muted">
        {emptyMessage}
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <table className="table w-full">
        <thead>
          <tr className="border-b border-line bg-gray-50">
            {columns.map((c) => (
              <th key={c.key} scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row)} className={i % 2 === 1 ? 'bg-gray-50/50' : undefined}>
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-3 text-sm">
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
