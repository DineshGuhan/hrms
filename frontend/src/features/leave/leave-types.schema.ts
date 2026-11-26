import { z } from 'zod';

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  quota_days: z.coerce
    .number({ invalid_type_error: 'Quota is required' })
    .min(0, 'Quota must be zero or greater')
    .max(366, 'Quota cannot exceed 366 days'),
  is_paid: z.boolean(),
});

export type LeaveTypeValues = z.infer<typeof leaveTypeSchema>;
