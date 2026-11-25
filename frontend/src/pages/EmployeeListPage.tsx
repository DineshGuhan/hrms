import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Table, type Column } from '../components/ui/Table';
import { Pagination } from '../components/ui/Pagination';
import { useEmployeeList } from '../features/employees/queries';
import type { EmployeeListItem } from '../features/employees/api';

const columns: Column<EmployeeListItem>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (r) => `${r.first_name} ${r.last_name}`,
  },
  { key: 'email', header: 'Email', render: (r) => r.email ?? '—' },
  { key: 'job_title', header: 'Job title', render: (r) => r.job_title ?? '—' },
  {
    key: 'status',
    header: 'Status',
    render: (r) => (r.status === 'active' ? 'Active' : 'Inactive'),
  },
];

/**
 * Employee list (HR/Admin see everyone; Manager direct reports; Employee self —
 * scoping is enforced by the API, HRM-10). HRM-12/13/14 add richer filters.
 */
export default function EmployeeListPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const list = useEmployeeList({ page, limit });
  const navigate = useNavigate();

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Employees</h1>
        <button
          type="button"
          onClick={() => navigate('/employees/new')}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
        >
          + Add employee
        </button>
      </div>
      <Card>
        {list.data ? (
          <>
            <Table
              columns={columns}
              rows={list.data.data}
              rowKey={(r) => r.id}
              emptyMessage="No employees found"
            />
            <Pagination page={page} totalPages={list.data.meta.totalPages} onPageChange={setPage} />
          </>
        ) : (
          <p aria-busy="true">Loading…</p>
        )}
        {list.isError ? <p role="alert" className="alert-error mt-4">Could not load employees.</p> : null}
      </Card>
    </>
  );
}
