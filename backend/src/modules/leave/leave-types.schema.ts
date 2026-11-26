import { z } from 'zod';

export const createLeaveTypeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    quota_days: z.coerce.number().min(0, 'Quota must be zero or greater').max(366),
    is_paid: z.boolean().default(true),
  })
  .strict();

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    quota_days: z.coerce.number().min(0).max(366).optional(),
    is_paid: z.boolean().optional(),
  })
  .strict();

export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
