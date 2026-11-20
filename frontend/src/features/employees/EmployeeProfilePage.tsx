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
    <div>
      <dt>{label}</dt>
      <dd>{value || '—'}</dd>
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

  return (
    <>
      <h1>
        {employee.first_name} {employee.last_name}
      </h1>
      <Card title="Personal details">
        <dl>
          <Field label="Email" value={employee.email} />
          {editingSelf ? (
            <form onSubmit={handleSubmit(onSelfSave)} noValidate>
              <div>
                <label htmlFor="phone">Phone</label>
                <input id="phone" {...register('phone')} />
                {errors.phone ? <p role="alert">{errors.phone.message}</p> : null}
              </div>
              <div>
                <label htmlFor="address">Address</label>
                <input id="address" {...register('address')} />
                {errors.address ? <p role="alert">{errors.address.message}</p> : null}
              </div>
              <Button type="submit" loading={isSubmitting || updateSelf.isPending}>
                Save
              </Button>
              <Button variant="secondary" onClick={() => setEditingSelf(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <>
              <Field label="Phone" value={employee.phone} />
              <Field label="Address" value={employee.address} />
              {isSelf ? (
                <Button variant="secondary" onClick={() => setEditingSelf(true)}>
                  Edit my details
                </Button>
              ) : null}
            </>
          )}
        </dl>
      </Card>

      <Card title="Job information">
        <dl>
          <Field label="Job title" value={employee.job_title} />
          <Field label="Join date" value={employee.join_date} />
          <Field label="Status" value={employee.status} />
        </dl>
      </Card>

      {/* Field-level masking (FR-EMP-04): renders only when the API returned the fields. */}
      {hasSensitive ? (
        <Card title="Compensation & bank details">
          <dl>
            <Field label="Monthly salary" value={employee.salary} />
            <Field label="Bank account" value={employee.bank_account} />
            <Field label="Bank name" value={employee.bank_name} />
            <Field label="National ID" value={employee.national_id} />
          </dl>
        </Card>
      ) : null}

      {canManage ? (
        <>
          <Button variant="secondary" onClick={() => navigate(`/employees/${id}/edit`)}>
            Edit employee
          </Button>
          <Button
            variant="danger"
            onClick={() => setConfirmStatus(employee.status === 'active' ? 'inactive' : 'active')}
          >
            {employee.status === 'active' ? 'Deactivate' : 'Reactivate'}
          </Button>
        </>
      ) : null}

      <Modal
        open={confirmStatus !== null}
        title={confirmStatus === 'inactive' ? 'Deactivate employee' : 'Reactivate employee'}
        onClose={() => setConfirmStatus(null)}
      >
        <p>
          {confirmStatus === 'inactive'
            ? 'The employee will no longer be able to sign in. Their record is retained.'
            : 'The employee will be able to sign in again.'}
        </p>
        <Button loading={statusMutation.isPending} onClick={onStatusConfirm}>
          Confirm
        </Button>
        <Button variant="secondary" onClick={() => setConfirmStatus(null)}>
          Cancel
        </Button>
      </Modal>

      <ToastHost toast={toast} dismiss={dismiss} />
    </>
  );
}
