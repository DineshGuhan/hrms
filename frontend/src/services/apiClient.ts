import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from './tokenStore';

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/** Hooks the app can plug into (logout on refresh failure). Kept injectable for tests. */
export interface AuthHooks {
  onLogout: () => void;
}

const defaultHooks: AuthHooks = {
  onLogout: () => {
    tokenStore.clear();
    if (typeof window !== 'undefined') window.location.assign('/login');
  },
};

/**
 * Create the API client:
 * - attaches `Authorization: Bearer <token>` from the in-memory store
 * - on 401, calls POST /api/auth/refresh once, then retries the original request
 * - if refresh fails, clears the token and logs the user out
 */
export function createApiClient(
  hooks: AuthHooks = defaultHooks,
  baseURL = import.meta.env.VITE_API_BASE_URL || '/api',
): AxiosInstance {
  const client = axios.create({ baseURL, withCredentials: true });

  client.interceptors.request.use((config) => {
    const token = tokenStore.get();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as RetriableConfig | undefined;
      const isRefreshCall = original?.url?.includes('/auth/refresh');
      if (error.response?.status !== 401 || !original || original._retried || isRefreshCall) {
        return Promise.reject(error);
      }
      original._retried = true;
      try {
        const { data } = await client.post<{ token: string }>('/auth/refresh');
        tokenStore.set(data.token);
        original.headers.set('Authorization', `Bearer ${data.token}`);
        return client(original);
      } catch (refreshError) {
        tokenStore.clear();
        hooks.onLogout();
        return Promise.reject(refreshError);
      }
    },
  );

  return client;
}

export const apiClient = createApiClient();
