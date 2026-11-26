import { z } from 'zod';

export const createLeaveRequestSchema = z
  .object({
    leave_type_id: z.string().uuid('Invalid leave type'),
    start_date: z.string().date('Start date is required'),
    end_date: z.string().date('End date is required'),
    reason: z.string().trim().min(1, 'Reason is required').max(2000),
  })
  .refine((v) => new Date(v.end_date) >= new Date(v.start_date), {
    message: 'End date must be on or after the start date',
    path: ['end_date'],
  });

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
