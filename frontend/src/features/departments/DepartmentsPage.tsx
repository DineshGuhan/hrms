import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ToastHost, useToastHost } from '../../components/ui/ToastHost';
import { useSession } from '../auth/useSession';
import { apiErrorMessage } from './api';
import {
  useArchiveDepartment,
  useAssignHead,
  useCreateDepartment,
  useDepartments,
  useUpdateDepartment,
  useActiveEmployees,
} from './queries';
import { departmentSchema, type DepartmentValues } from './schemas';

interface Editing {
  mode: 'create' | 'edit';
  id?: string;
  name?: string;
  description?: string;
}

export default function DepartmentsPage() {
  const { hasRole } = useSession();
  const canManage = hasRole('admin', 'hr');
  const { toast, show, dismiss } = useToastHost();

  const departments = useDepartments();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [headFor, setHeadFor] = useState<{ id: string; name: string } | null>(null);
  const [archiving, setArchiving] = useState<{ id: string; name: string } | null>(null);

  const archiveMutation = useArchiveDepartment(() => show('Department archived', 'success'));

  const rows = departments.data ?? [];

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Departments</h1>
        {canManage ? (
          <Button onClick={() => setEditing({ mode: 'create' })}>+ Create department</Button>
        ) : null}
      </div>

      {departments.isLoading ? (
        <div className="animate-pulse space-y-2" aria-busy="true">
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="h-10 rounded-lg bg-gray-100" />
        </div>
      ) : departments.isError ? (
        <p role="alert" className="alert-error">Could not load departments.</p>
      ) : (
        <Card>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-gray-50">
                  {['Name', 'Description', 'Head', 'Employees', 'Status', ''].map((h, i) => (
                    <th
                      key={h || `col-${i}`}
                      scope="col"
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((d, i) => (
                  <tr key={d.id} className={i % 2 === 1 ? 'bg-gray-50/50' : undefined}>
                    <td className="px-4 py-3 text-sm font-medium text-ink">{d.name}</td>
                    <td className="px-4 py-3 text-sm">{d.description ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{d.head_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">{d.employee_count}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          d.status === 'active'
                            ? 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20'
                            : 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20'
                        }
                      >
                        {d.status === 'active' ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setEditing({ mode: 'edit', id: d.id, name: d.name, description: d.description ?? '' })}>
                            Edit
                          </Button>
                          <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => setHeadFor({ id: d.id, name: d.name })}>
                            Assign head
                          </Button>
                          {d.status === 'active' ? (
                            <Button variant="danger" className="px-3 py-1.5 text-xs" onClick={() => setArchiving({ id: d.id, name: d.name })}>
                              Archive
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editing ? (
        <DepartmentModal
          editing={editing}
          onClose={() => setEditing(null)}
          onToast={show}
        />
      ) : null}

      {headFor ? (
        <AssignHeadModal
          department={headFor}
          onClose={() => setHeadFor(null)}
          onToast={show}
        />
      ) : null}

      <Modal
        open={archiving !== null}
        title="Archive department"
        onClose={() => setArchiving(null)}
      >
        <p className="text-muted">
          Archive <strong>{archiving?.name}</strong>? It will no longer be assignable to new
          employees. Existing records are retained.
        </p>
        <div className="flex gap-2">
          <Button
            variant="danger"
            loading={archiving ? archiveMutation.isPending : false}
            onClick={() => {
              if (archiving) archiveMutation.mutate(archiving.id);
              setArchiving(null);
            }}
          >
            Archive
          </Button>
          <Button variant="secondary" onClick={() => setArchiving(null)}>
            Cancel
          </Button>
        </div>
      </Modal>

      <ToastHost toast={toast} dismiss={dismiss} />
    </>
  );
}

function DepartmentModal({
  editing,
  onClose,
  onToast,
}: {
  editing: Editing;
  onClose: () => void;
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}) {
  const isEdit = editing.mode === 'edit';
  const createMutation = useCreateDepartment(() => {
    onToast('Department created', 'success');
    onClose();
  });
  const updateMutation = useUpdateDepartment(editing.id ?? '', () => {
    onToast('Department updated', 'success');
    onClose();
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: { name: editing.name ?? '', description: editing.description ?? '' },
  });

  const onSubmit = async (values: DepartmentValues) => {
    try {
      if (isEdit) await updateMutation.mutateAsync(values);
      else await createMutation.mutateAsync(values);
    } catch (err) {
      onToast(apiErrorMessage(err), 'error');
    }
  };

  return (
    <Modal open title={isEdit ? 'Edit department' : 'Create department'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="dept-name">Name</label>
          <input id="dept-name" className="w-full" {...register('name')} autoFocus />
          {errors.name ? <p role="alert" className="alert-field">{errors.name.message}</p> : null}
        </div>
        <div>
          <label htmlFor="dept-description">Description</label>
          <input id="dept-description" className="w-full" {...register('description')} />
        </div>
        <Button type="submit" loading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
          {isEdit ? 'Save' : 'Create'}
        </Button>
      </form>
    </Modal>
  );
}

function AssignHeadModal({
  department,
  onClose,
  onToast,
}: {
  department: { id: string; name: string };
  onClose: () => void;
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}) {
  const [filter, setFilter] = useState('');
  const candidates = useActiveEmployees(filter);
  const assign = useAssignHead(department.id, () => {
    onToast('Head assigned', 'success');
    onClose();
  });
  const [selected, setSelected] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onAssign = async () => {
    if (!selected) {
      setError('Select an employee');
      return;
    }
    try {
      await assign.mutateAsync(selected);
    } catch (err) {
      onToast(apiErrorMessage(err), 'error');
    }
  };

  return (
    <Modal open title={`Assign head — ${department.name}`} onClose={onClose}>
      <div>
        <label htmlFor="head-filter">Filter employees</label>
        <input id="head-filter" className="w-full" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>
      <div>
        <label htmlFor="head-employee">Employee</label>
        <select
          id="head-employee"
          className="w-full"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Select an active employee…</option>
          {(candidates.data?.data ?? []).map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name}
            </option>
          ))}
        </select>
        {error ? <p role="alert" className="alert-field">{error}</p> : null}
      </div>
      <div className="flex gap-2">
        <Button loading={assign.isPending} onClick={onAssign}>
          Assign
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
