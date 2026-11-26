import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  description: z.string().trim().max(2000).optional(),
});

export type DepartmentValues = z.infer<typeof departmentSchema>;

export const assignHeadSchema = z.object({
  employee_id: z.string().min(1, 'Select an employee'),
});

export type AssignHeadValues = z.infer<typeof assignHeadSchema>;
