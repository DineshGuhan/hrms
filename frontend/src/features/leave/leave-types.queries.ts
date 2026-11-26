import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './leave-types.api';

const LEAVE_TYPES_KEY = 'leave-types';

export function useLeaveTypes() {
  return useQuery({ queryKey: [LEAVE_TYPES_KEY], queryFn: api.listLeaveTypes });
}

export function useCreateLeaveType(onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createLeaveType,
    onSuccess: (created) => {
      client.setQueryData<api.LeaveType[]>([LEAVE_TYPES_KEY], (old) =>
        old ? [...old, created].sort((a, b) => a.name.localeCompare(b.name)) : [created],
      );
      client.invalidateQueries({ queryKey: [LEAVE_TYPES_KEY] });
      onDone();
    },
  });
}

export function useUpdateLeaveType(id: string, onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name?: string; quota_days?: number; is_paid?: boolean }) =>
      api.updateLeaveType(id, payload),
    onSuccess: (updated) => {
      client.setQueryData<api.LeaveType[]>([LEAVE_TYPES_KEY], (old) =>
        old ? old.map((t) => (t.id === id ? updated : t)) : old,
      );
      client.invalidateQueries({ queryKey: [LEAVE_TYPES_KEY] });
      onDone();
    },
  });
}

export function useArchiveLeaveType(onDone: () => void) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveLeaveType(id),
    onSuccess: (archived) => {
      client.setQueryData<api.LeaveType[]>([LEAVE_TYPES_KEY], (old) =>
        old ? old.map((t) => (t.id === archived.id ? archived : t)) : old,
      );
      onDone();
    },
  });
}
