import { apiClient } from '../../services/apiClient';

export interface LeaveType {
  id: string;
  name: string;
  quota_days: string;
  is_paid: boolean;
  is_active: boolean;
  used_days?: string;
}

export function listLeaveTypes(): Promise<LeaveType[]> {
  return apiClient.get<{ data: LeaveType[] }>('/leave-types').then((r) => r.data.data);
}

export function createLeaveType(payload: {
  name: string;
  quota_days: number;
  is_paid: boolean;
}): Promise<LeaveType> {
  return apiClient.post<{ data: LeaveType }>('/leave-types', payload).then((r) => r.data.data);
}

export function updateLeaveType(
  id: string,
  payload: { name?: string; quota_days?: number; is_paid?: boolean },
): Promise<LeaveType> {
  return apiClient.patch<{ data: LeaveType }>(`/leave-types/${id}`, payload).then((r) => r.data.data);
}

export function archiveLeaveType(id: string): Promise<LeaveType> {
  return apiClient
    .patch<{ data: LeaveType }>(`/leave-types/${id}/archive`)
    .then((r) => r.data.data);
}

export { apiErrorMessage } from '../auth/auth.api';
