import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../../components/ui/Card';
import { Pagination } from '../../../components/ui/Pagination';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import { useSession } from '../../auth/useSession';
import { useEmployeeList } from '../queries';
import type { EmployeeListItem } from '../api';

const LIMIT = 20;

const statusBadge = (status: string) =>
  status === 'active' ? (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20">
      Inactive
    </span>
  );

/** Employee Directory (page 9, BRD §5). Role scoping is enforced by the API. */
export default function DirectoryPage() {
  const navigate = useNavigate();
  const { hasRole } = useSession();
  const canManage = hasRole('admin', 'hr');
  const [searchInput, setSearchInput] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const search = useDebouncedValue(searchInput, 300);
  const hasFilters = search !== '' || department !== '' || status !== '';
  const list = useEmployeeList({
    search: search || undefined,
    department: department || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  });

  const clearFilters = () => {
    setSearchInput('');
    setDepartment('');
    setStatus('');
    setPage(1);
  };

  const rows = list.data?.data ?? [];
  const meta = list.data?.meta;

  const headers = ['Name', 'Email', 'Job title', 'Status'] as const;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Employees</h1>
          {meta ? <p className="text-sm text-muted">{meta.total} total</p> : null}
        </div>
        {canManage ? (
          <button
            type="button"
            onClick={() => navigate('/employees/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            + Add employee
          </button>
        ) : null}
      </div>

      <Card>
        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="directory-search">Search</label>
            <input
              id="directory-search"
              type="search"
              placeholder="Name or email…"
              className="w-64"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label htmlFor="directory-department">Department</label>
            <select
              id="directory-department"
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All departments</option>
              {/* Options arrive with the departments API (HRM-16). */}
            </select>
          </div>
          <div>
            <label htmlFor="directory-status">Status</label>
            <select
              id="directory-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {list.isLoading ? (
          <div className="animate-pulse space-y-2" aria-busy="true">
            <div className="h-10 rounded-lg bg-gray-100" />
            <div className="h-10 rounded-lg bg-gray-100" />
            <div className="h-10 rounded-lg bg-gray-100" />
          </div>
        ) : list.isError ? (
          <p role="alert" className="alert-error">
            Could not load employees.
          </p>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-gray-50 px-4 py-10 text-center text-sm text-muted">
            No employees match the current filters.{' '}
            {hasFilters ? (
              <button type="button" className="font-medium text-brand-600 underline" onClick={clearFilters}>
                Clear filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-line bg-gray-50">
                    {headers.map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row: EmployeeListItem, i: number) => (
                    <tr
                      key={row.id}
                      className={`${i % 2 === 1 ? 'bg-gray-50/50' : ''} cursor-pointer transition hover:bg-brand-50/60`}
                      onClick={() => navigate(`/employees/${row.id}`)}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-ink">
                        {row.first_name} {row.last_name}
                      </td>
                      <td className="px-4 py-3 text-sm">{row.email ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{row.job_title ?? '—'}</td>
                      <td className="px-4 py-3 text-sm">{statusBadge(row.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {meta ? (
              <>
                <p className="mt-3 text-xs text-muted">
                  Page {meta.page} of {meta.totalPages} · {meta.total} employees
                </p>
                <Pagination page={meta.page} totalPages={meta.totalPages} onPageChange={setPage} />
              </>
            ) : null}
          </>
        )}
      </Card>
    </>
  );
}
