import { z } from 'zod';

export const createEmployeeSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required').max(100),
  last_name: z.string().trim().min(1, 'Last name is required').max(100),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(2000).optional(),
  job_title: z.string().trim().max(100).optional(),
  join_date: z.string().optional(),
  salary: z.string().trim().max(20).optional(),
  bank_account: z.string().trim().max(34).optional(),
  bank_name: z.string().trim().max(100).optional(),
  national_id: z.string().trim().max(20).optional(),
});

export type CreateEmployeeValues = z.infer<typeof createEmployeeSchema>;

export const selfEditSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(2000).optional(),
});

export type SelfEditValues = z.infer<typeof selfEditSchema>;
