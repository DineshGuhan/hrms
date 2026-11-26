import { apiClient } from '../../services/apiClient';
import { apiErrorMessage } from '../auth/auth.api';

export interface Department {
  id: string;
  name: string;
  description: string | null;
  head_employee_id: string | null;
  head_name: string | null;
  employee_count: number;
  status: string;
}

export interface DepartmentSelectItem {
  id: string;
  name: string;
}

export function listDepartments(): Promise<Department[]> {
  return apiClient.get<{ data: Department[] }>('/departments').then((r) => r.data.data);
}

/** Active-only lightweight list for selects (returns id + name). */
export async function listDepartmentOptions(): Promise<DepartmentSelectItem[]> {
  const all = await listDepartments();
  return all
    .filter((d) => d.status === 'active')
    .map((d) => ({ id: d.id, name: d.name }));
}

export function createDepartment(payload: { name: string; description?: string }): Promise<Department> {
  return apiClient.post<{ data: Department }>('/departments', payload).then((r) => r.data.data);
}

export function updateDepartment(
  id: string,
  payload: { name?: string; description?: string },
): Promise<Department> {
  return apiClient.patch<{ data: Department }>(`/departments/${id}`, payload).then((r) => r.data.data);
}

export function assignHead(id: string, employeeId: string): Promise<Department> {
  return apiClient
    .patch<{ data: Department }>(`/departments/${id}/head`, { employee_id: employeeId })
    .then((r) => r.data.data);
}

export function archiveDepartment(id: string): Promise<Department> {
  return apiClient
    .patch<{ data: Department }>(`/departments/${id}/archive`)
    .then((r) => r.data.data);
}

export { apiErrorMessage };
