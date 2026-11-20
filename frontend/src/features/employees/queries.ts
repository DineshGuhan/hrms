import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';

const EMPLOYEE_KEY = 'employee';
const EMPLOYEES_KEY = 'employees';

export function useEmployee(id: string) {
  return useQuery({
    queryKey: [EMPLOYEE_KEY, id],
    queryFn: () => api.getEmployee(id),
    enabled: id.length > 0,
  });
}

export function useEmployeeList(params: {
  search?: string;
  page: number;
  limit: number;
}) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, params],
    queryFn: () => api.listEmployees(params),
  });
}

export function useCreateEmployee(onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createEmployee,
    onSuccess: (created) => {
      client.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      client.setQueryData([EMPLOYEE_KEY, created.id], created);
      onDone();
    },
  });
}

export function useUpdateEmployee(id: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: api.AdminUpdatePayload | api.SelfUpdatePayload) => api.updateEmployee(id, payload),
    onSuccess: (updated) => {
      client.setQueryData([EMPLOYEE_KEY, id], updated);
      client.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      onDone();
    },
  });
}

export function useEmployeeStatus(id: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (status: 'active' | 'inactive') => api.setEmployeeStatus(id, status),
    onSuccess: (updated) => {
      client.setQueryData([EMPLOYEE_KEY, id], updated);
      client.invalidateQueries({ queryKey: [EMPLOYEES_KEY] });
      onDone();
    },
  });
}
