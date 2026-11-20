import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useSession } from '../auth/useSession';
import { createEmployeeSchema, type CreateEmployeeValues } from './schemas';
import { useCreateEmployee, useEmployee, useUpdateEmployee } from './queries';
import { ToastHost, useToastHost } from '../../components/ui/ToastHost';
import { apiErrorMessage } from './api';

/**
 * Create/Edit Employee page (HR/Admin only).
 * Edit mode loads the employee and shows a "Compensation & bank" section —
 * that section renders only when the API returned the sensitive fields.
 */
export function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { hasRole } = useSession();
  const { toast, show, dismiss } = useToastHost();

  const existing = useEmployee(id ?? '');
  const createMutation = useCreateEmployee(() => {
    show('Employee created', 'success');
    setTimeout(() => navigate('/employees'), 600);
  });
  const updateMutation = useUpdateEmployee(id ?? '', () => show('Employee updated', 'success'));

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateEmployeeValues>({ resolver: zodResolver(createEmployeeSchema) });

  // Pre-fill the form in edit mode.
  useEffect(() => {
    if (isEdit && existing.data) {
      reset({
        first_name: existing.data.first_name,
        last_name: existing.data.last_name,
        email: existing.data.email ?? '',
        phone: existing.data.phone ?? '',
        address: existing.data.address ?? '',
        job_title: existing.data.job_title ?? '',
        join_date: existing.data.join_date ?? '',
        salary: existing.data.salary ?? undefined,
        bank_account: existing.data.bank_account ?? undefined,
        bank_name: existing.data.bank_name ?? undefined,
        national_id: existing.data.national_id ?? undefined,
      });
    }
  }, [isEdit, existing.data, reset]);

  const canSeeSensitive = hasRole('admin', 'hr');

  const onSubmit = async (values: CreateEmployeeValues) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync(values);
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch (err) {
      show(apiErrorMessage(err), 'error');
    }
  };

  if (isEdit && existing.isLoading) return <p aria-busy="true">Loading…</p>;
  if (isEdit && existing.isError) {
    return <p role="alert">Could not load the employee. {apiErrorMessage(existing.error)}</p>;
  }

  const submitting = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <h1>{isEdit ? 'Edit employee' : 'Create employee'}</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="first_name">First name</label>
            <input id="first_name" {...register('first_name')} />
            {errors.first_name ? <p role="alert">{errors.first_name.message}</p> : null}
          </div>
          <div>
            <label htmlFor="last_name">Last name</label>
            <input id="last_name" {...register('last_name')} />
            {errors.last_name ? <p role="alert">{errors.last_name.message}</p> : null}
          </div>
          <div>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" {...register('email')} disabled={isEdit} />
            {errors.email ? <p role="alert">{errors.email.message}</p> : null}
          </div>
          <div>
            <label htmlFor="phone">Phone</label>
            <input id="phone" {...register('phone')} />
          </div>
          <div>
            <label htmlFor="address">Address</label>
            <input id="address" {...register('address')} />
          </div>
          <div>
            <label htmlFor="job_title">Job title</label>
            <input id="job_title" {...register('job_title')} />
            {errors.job_title ? <p role="alert">{errors.job_title.message}</p> : null}
          </div>
          <div>
            <label htmlFor="join_date">Join date</label>
            <input id="join_date" type="date" {...register('join_date')} />
          </div>

          {canSeeSensitive ? (
            <Card title="Compensation & bank details">
              <div>
                <label htmlFor="salary">Monthly salary</label>
                <input id="salary" {...register('salary')} />
              </div>
              <div>
                <label htmlFor="bank_account">Bank account number</label>
                <input id="bank_account" {...register('bank_account')} />
              </div>
              <div>
                <label htmlFor="bank_name">Bank name</label>
                <input id="bank_name" {...register('bank_name')} />
              </div>
              <div>
                <label htmlFor="national_id">National ID</label>
                <input id="national_id" {...register('national_id')} />
              </div>
            </Card>
          ) : null}

          <Button type="submit" loading={submitting}>
            {isEdit ? 'Save changes' : 'Create employee'}
          </Button>
        </form>
      </Card>
      <ToastHost toast={toast} dismiss={dismiss} />
    </>
  );
}
