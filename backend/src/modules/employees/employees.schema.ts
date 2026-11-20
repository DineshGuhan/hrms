import { z } from 'zod';

const optionalEncrypted = z.string().max(10_000).optional();

export const createEmployeeSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name is required').max(100),
    last_name: z.string().trim().min(1, 'Last name is required').max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address').max(255),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(2000).optional(),
    job_title: z.string().trim().max(100).optional(),
    department_id: z.string().uuid('Invalid department').optional(),
    manager_id: z.string().uuid('Invalid manager').optional(),
    date_of_birth: z.string().date().optional(),
    join_date: z.string().date().optional(),
    // Sensitive fields — encrypted at rest (FR-EMP-05).
    salary: optionalEncrypted,
    bank_account: optionalEncrypted,
    bank_name: optionalEncrypted,
    national_id: optionalEncrypted,
  })
  .strict();

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

/** Fields any employee may update on their own record (FR-EMP-06). */
export const selfUpdateSchema = z
  .object({
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(2000).optional(),
  })
  .strict();

export type SelfUpdateInput = z.infer<typeof selfUpdateSchema>;

/** Full update — HR/Admin only. Sensitive fields re-encrypted when present. */
export const adminUpdateSchema = z
  .object({
    first_name: z.string().trim().min(1).max(100).optional(),
    last_name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    address: z.string().trim().max(2000).optional(),
    job_title: z.string().trim().max(100).optional(),
    department_id: z.string().uuid().nullable().optional(),
    manager_id: z.string().uuid().nullable().optional(),
    salary: optionalEncrypted,
    bank_account: optionalEncrypted,
    bank_name: optionalEncrypted,
    national_id: optionalEncrypted,
  })
  .strict();

export type AdminUpdateInput = z.infer<typeof adminUpdateSchema>;

export const statusChangeSchema = z
  .object({ status: z.enum(['active', 'inactive']) })
  .strict();

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  department: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
