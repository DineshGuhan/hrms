import { apiClient } from '../../services/apiClient';
import { apiErrorMessage } from '../auth/auth.api';

export interface EmployeeDetail {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  date_of_birth: string | null;
  join_date: string | null;
  status: string;
  // Sensitive fields — present only when the API permits (HR/Admin/self).
  salary?: string | null;
  bank_account?: string | null;
  bank_name?: string | null;
  national_id?: string | null;
}

export interface EmployeeListItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  department_id: string | null;
  manager_id: string | null;
  join_date: string | null;
  status: string;
}

export interface EmployeeListResponse {
  data: EmployeeListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateEmployeePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  address?: string;
  job_title?: string;
  join_date?: string;
  salary?: string;
  bank_account?: string;
  bank_name?: string;
  national_id?: string;
}

export interface SelfUpdatePayload {
  phone?: string;
  address?: string;
}

export interface AdminUpdatePayload extends CreateEmployeePayload {
  department_id?: string | null;
  manager_id?: string | null;
}

export function getEmployee(id: string): Promise<EmployeeDetail> {
  return apiClient.get<{ data: EmployeeDetail }>(`/employees/${id}`).then((r) => r.data.data);
}

export function listEmployees(params: {
  search?: string;
  department?: string;
  status?: string;
  page: number;
  limit: number;
}): Promise<EmployeeListResponse> {
  return apiClient.get<EmployeeListResponse>('/employees', { params }).then((r) => r.data);
}

export function createEmployee(payload: CreateEmployeePayload): Promise<EmployeeDetail> {
  return apiClient.post<{ data: EmployeeDetail }>('/employees', payload).then((r) => r.data.data);
}

export function updateEmployee(
  id: string,
  payload: AdminUpdatePayload | SelfUpdatePayload,
): Promise<EmployeeDetail> {
  return apiClient.patch<{ data: EmployeeDetail }>(`/employees/${id}`, payload).then((r) => r.data.data);
}

export function setEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<EmployeeDetail> {
  return apiClient
    .patch<{ data: EmployeeDetail }>(`/employees/${id}/status`, { status })
    .then((r) => r.data.data);
}

export { apiErrorMessage };
