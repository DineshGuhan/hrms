import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ToastHost, useToastHost } from '../../components/ui/ToastHost';
import {
  useArchiveLeaveType,
  useCreateLeaveType,
  useLeaveTypes,
  useUpdateLeaveType,
} from './leave-types.queries';
import { leaveTypeSchema, type LeaveTypeValues } from './leave-types.schema';
import { apiErrorMessage } from './leave-types.api';
import { useSession } from '../auth/useSession';
import type * as api from './leave-types.api';

interface Editing {
  mode: 'create' | 'edit';
  leaveType?: api.LeaveType;
}

export default function LeaveTypesPage() {
  const { toast, show, dismiss } = useToastHost();
  const list = useLeaveTypes();
  const archive = useArchiveLeaveType(() => show('Leave type archived', 'success'));
  const [editing, setEditing] = useState<Editing | null>(null);
  const [archiving, setArchiving] = useState<api.LeaveType | null>(null);
  const { hasRole } = useSession();
  const canManage = hasRole('admin', 'hr');

  const rows = list.data ?? [];

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Leave types</h1>
        {canManage ? (
          <Button onClick={() => setEditing({ mode: 'create' })}>+ Create leave type</Button>
        ) : null}
      </div>

      {list.isLoading ? (
        <div className="animate-pulse space-y-2" aria-busy="true">
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="h-10 rounded-lg bg-gray-100" />
          <div className="h-10 rounded-lg bg-gray-100" />
        </div>
      ) : list.isError ? (
        <p role="alert" className="alert-error">Could not load leave types.</p>
      ) : (
        <Card>
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-gray-50">
                  {['Name', 'Paid/Unpaid', 'Yearly quota', 'Used days', 'Status', ''].map((h, i) => (
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
                {rows.map((t, i) => (
                  <tr key={t.id} className={i % 2 === 1 ? 'bg-gray-50/50' : undefined}>
                    <td className="px-4 py-3 text-sm font-medium text-ink">{t.name}</td>
                    <td className="px-4 py-3 text-sm">{t.is_paid ? 'Paid' : 'Unpaid'}</td>
                    <td className="px-4 py-3 text-sm">{t.quota_days}</td>
                    <td className="px-4 py-3 text-sm">{t.used_days ?? '0'}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={
                          t.is_active
                            ? 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20'
                            : 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20'
                        }
                      >
                        {t.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canManage && t.is_active ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => setEditing({ mode: 'edit', leaveType: t })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            className="px-3 py-1.5 text-xs"
                            onClick={() => setArchiving(t)}
                          >
                            Archive
                          </Button>
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
        <LeaveTypeModal editing={editing} onClose={() => setEditing(null)} onToast={show} />
      ) : null}

      <Modal
        open={archiving !== null}
        title="Archive leave type"
        onClose={() => setArchiving(null)}
      >
        <p className="text-muted">
          Archive <strong>{archiving?.name}</strong>? It will no longer be selectable for new
          requests. Existing records are retained.
        </p>
        <div className="flex gap-2">
          <Button
            variant="danger"
            loading={archiving ? archive.isPending : false}
            onClick={() => {
              if (archiving) archive.mutate(archiving.id);
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

function LeaveTypeModal({
  editing,
  onClose,
  onToast,
}: {
  editing: Editing;
  onClose: () => void;
  onToast: (message: string, variant?: 'success' | 'error' | 'info') => void;
}) {
  const isEdit = editing.mode === 'edit';
  const createMutation = useCreateLeaveType(() => {
    onToast('Leave type created', 'success');
    onClose();
  });
  const updateMutation = useUpdateLeaveType(editing.leaveType?.id ?? '', () => {
    onToast('Leave type updated', 'success');
    onClose();
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LeaveTypeValues>({
    resolver: zodResolver(leaveTypeSchema),
    defaultValues: {
      name: editing.leaveType?.name ?? '',
      quota_days: editing.leaveType ? Number(editing.leaveType.quota_days) : undefined,
      is_paid: editing.leaveType?.is_paid ?? true,
    },
  });

  const onSubmit = async (values: LeaveTypeValues) => {
    try {
      if (isEdit) await updateMutation.mutateAsync(values);
      else await createMutation.mutateAsync(values);
    } catch (err) {
      onToast(apiErrorMessage(err), 'error');
    }
  };

  return (
    <Modal open title={isEdit ? 'Edit leave type' : 'Create leave type'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label htmlFor="leave-type-name">Name</label>
          <input id="leave-type-name" className="w-full" {...register('name')} autoFocus />
          {errors.name ? <p role="alert" className="alert-field">{errors.name.message}</p> : null}
        </div>
        <div>
          <label htmlFor="leave-type-quota">Yearly quota (days)</label>
          <input
            id="leave-type-quota"
            type="number"
            min="0"
            max="366"
            className="w-full"
            {...register('quota_days')}
          />
          {errors.quota_days ? (
            <p role="alert" className="alert-field">{errors.quota_days.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="leave-type-paid">
            <input type="checkbox" id="leave-type-paid" className="mr-2" {...register('is_paid')} />
            Paid leave
          </label>
        </div>
        <div className="flex gap-2">
          <Button type="submit" loading={isSubmitting || createMutation.isPending || updateMutation.isPending}>
            {isEdit ? 'Save' : 'Create'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
