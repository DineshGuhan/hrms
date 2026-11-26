import { z } from 'zod';

export const createDepartmentSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;

export const updateDepartmentSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(2000).optional(),
  })
  .strict();

export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;

export const assignHeadSchema = z
  .object({ employee_id: z.string().uuid('Invalid employee') })
  .strict();

export type AssignHeadInput = z.infer<typeof assignHeadSchema>;
