import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import { listEmployees } from '../employees/api';

const DEPARTMENTS_KEY = 'departments';
const EMPLOYEES_KEY = 'employees';

/** Full list (HR/Admin view). */
export function useDepartments() {
  return useQuery({ queryKey: [DEPARTMENTS_KEY], queryFn: api.listDepartments });
}

/** Active-only id/name pairs for select fields. */
export function useDepartmentOptions() {
  return useQuery({ queryKey: [DEPARTMENTS_KEY, 'options'], queryFn: api.listDepartmentOptions });
}

export function useCreateDepartment(onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createDepartment,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
      onDone();
    },
  });
}

export function useUpdateDepartment(id: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; description?: string }) => api.updateDepartment(id, payload),
    onSuccess: (updated) => {
      client.setQueryData([DEPARTMENTS_KEY], (old: api.Department[] | undefined) =>
        old ? old.map((d) => (d.id === id ? updated : d)) : old,
      );
      client.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
      onDone();
    },
  });
}

export function useAssignHead(id: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => api.assignHead(id, employeeId),
    onSuccess: (updated) => {
      client.setQueryData([DEPARTMENTS_KEY], (old: api.Department[] | undefined) =>
        old ? old.map((d) => (d.id === id ? updated : d)) : old,
      );
      onDone();
    },
  });
}

export function useArchiveDepartment(onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveDepartment(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: [DEPARTMENTS_KEY] });
      onDone();
    },
  });
}

/** Active employees for the head-assignment select. */
export function useActiveEmployees(search: string) {
  return useQuery({
    queryKey: [EMPLOYEES_KEY, { search, status: 'active' }],
    queryFn: () => listEmployees({ search: search || undefined, status: 'active', page: 1, limit: 50 }),
  });
}
