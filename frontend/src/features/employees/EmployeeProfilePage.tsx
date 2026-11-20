import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ToastHost, useToastHost } from '../../components/ui/ToastHost';
import { useSession } from '../auth/useSession';
import { selfEditSchema, type SelfEditValues } from './schemas';
import { useEmployee, useEmployeeStatus, useUpdateEmployee } from './queries';
import { apiErrorMessage } from './api';

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-ink">{value || '—'}</dd>
    </div>
  );
}

/**
 * Employee Profile page. The sensitive section renders only when the API
 * returned those fields — masking is enforced by the backend (HRM-10).
 */
export function EmployeeProfilePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useSession();
  const { toast, show, dismiss } = useToastHost();

  const query = useEmployee(id);
  const employee = query.data;
  const isSelf = Boolean(user && employee && user.id === employee.user_id);
  const canManage = hasRole('admin', 'hr');

  const [editingSelf, setEditingSelf] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState<null | 'inactive' | 'active'>(null);
  const updateSelf = useUpdateEmployee(id, () => {
    show('Contact details updated', 'success');
    setEditingSelf(false);
  });
  const statusMutation = useEmployeeStatus(id, () => show('Status updated', 'success'));

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SelfEditValues>({ resolver: zodResolver(selfEditSchema) });

  const onSelfSave = async (values: SelfEditValues) => {
    try {
      await updateSelf.mutateAsync(values);
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  };

  const onStatusConfirm = async () => {
    if (!confirmStatus) return;
    try {
      await statusMutation.mutateAsync(confirmStatus);
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    } finally {
      setConfirmStatus(null);
    }
  };

  if (query.isLoading) return <p aria-busy="true">Loading…</p>;
  if (query.isError || !employee) {
    return <p role="alert">Could not load the employee. {apiErrorMessage(query.error)}</p>;
  }

  const hasSensitive = employee.salary !== undefined; // API omits it for unauthorized roles

  const statusBadge =
    employee.status === 'active'
      ? 'inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20'
      : 'inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-600/20';

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {employee.first_name} {employee.last_name}
        </h1>
        <span className={statusBadge}>{employee.status === 'active' ? 'Active' : 'Inactive'}</span>
      </div>
      <div className="space-y-6">
        <Card title="Personal details">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Email" value={employee.email} />
            {editingSelf ? (
              <form onSubmit={handleSubmit(onSelfSave)} noValidate className="sm:col-span-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone">Phone</label>
                    <input id="phone" className="w-full" {...register('phone')} />
                    {errors.phone ? <p role="alert" className="alert-field">{errors.phone.message}</p> : null}
                  </div>
                  <div>
                    <label htmlFor="address">Address</label>
                    <input id="address" className="w-full" {...register('address')} />
                    {errors.address ? <p role="alert" className="alert-field">{errors.address.message}</p> : null}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button type="submit" loading={isSubmitting || updateSelf.isPending}>
                    Save
                  </Button>
                  <Button variant="secondary" onClick={() => setEditingSelf(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <Field label="Phone" value={employee.phone} />
                <Field label="Address" value={employee.address} />
                {isSelf ? (
                  <div className="sm:col-span-2">
                    <Button variant="secondary" onClick={() => setEditingSelf(true)}>
                      Edit my details
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </dl>
        </Card>

        <Card title="Job information">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Field label="Job title" value={employee.job_title} />
            <Field label="Join date" value={employee.join_date} />
          </dl>
        </Card>

        {/* Field-level masking (FR-EMP-04): renders only when the API returned the fields. */}
        {hasSensitive ? (
          <Card title="Compensation & bank details">
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <Field label="Monthly salary" value={employee.salary} />
              <Field label="Bank account" value={employee.bank_account} />
              <Field label="Bank name" value={employee.bank_name} />
              <Field label="National ID" value={employee.national_id} />
            </dl>
          </Card>
        ) : null}

        {canManage ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)}>
              Edit employee
            </Button>
            <Button
              variant="danger"
              onClick={() => setConfirmStatus(employee.status === 'active' ? 'inactive' : 'active')}
            >
              {employee.status === 'active' ? 'Deactivate' : 'Reactivate'}
            </Button>
          </div>
        ) : null}

        <Modal
          open={confirmStatus !== null}
          title={confirmStatus === 'inactive' ? 'Deactivate employee' : 'Reactivate employee'}
          onClose={() => setConfirmStatus(null)}
        >
          <p className="text-muted">
            {confirmStatus === 'inactive'
              ? 'The employee will no longer be able to sign in. Their record is retained.'
              : 'The employee will be able to sign in again.'}
          </p>
          <div className="flex gap-2">
            <Button loading={statusMutation.isPending} onClick={onStatusConfirm}>
              Confirm
            </Button>
            <Button variant="secondary" onClick={() => setConfirmStatus(null)}>
              Cancel
            </Button>
          </div>
        </Modal>

        <ToastHost toast={toast} dismiss={dismiss} />
      </div>
    </>
  );
}
