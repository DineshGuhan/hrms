import { apiClient } from '../../services/apiClient';
import { tokenStore } from '../../services/tokenStore';
import type { Role } from '../../hooks/useAuth';

export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
}

export interface LoginResponse {
  token: string;
  user: SessionUser;
}

export interface ApiErrorShape {
  error: { code: string; message: string };
}

/** Extract the backend's safe error message; fall back to a generic one. */
export function apiErrorMessage(err: unknown): string {
  if (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error
      ?.message === 'string'
  ) {
    return (err as { response: { data: { error: { message: string } } } }).response.data.error.message;
  }
  return 'Something went wrong. Please try again.';
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
  tokenStore.set(data.token);
  return data;
}

/** Restore a session from the refresh cookie; resolves null when there is no session. */
export async function refreshSession(): Promise<LoginResponse | null> {
  try {
    const { data } = await apiClient.post<LoginResponse>('/auth/refresh');
    tokenStore.set(data.token);
    return data;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // The token is cleared regardless; a failed server-side revoke must not
    // block the client from signing out (it can retry once signed back in).
  } finally {
    tokenStore.clear();
  }
}
