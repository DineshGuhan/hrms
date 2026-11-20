import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient } from '../../services/apiClient';
import { tokenStore } from '../../services/tokenStore';
import { login, refreshSession, logout, apiErrorMessage } from './auth.api';

vi.mock('../../services/apiClient', () => ({
  apiClient: { post: vi.fn() },
}));

const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  post.mockReset();
  tokenStore.clear();
});

describe('auth.api', () => {
  it('login posts credentials and stores the token', async () => {
    post.mockResolvedValue({
      data: { token: 'tok', user: { id: 'u1', email: 'a@b.co', roles: ['hr'] } },
    });
    const result = await login('a@b.co', 'long-enough-password');
    expect(post).toHaveBeenCalledWith('/auth/login', { email: 'a@b.co', password: 'long-enough-password' });
    expect(tokenStore.get()).toBe('tok');
    expect(result.user.roles).toEqual(['hr']);
  });

  it('refreshSession stores the token and returns the user', async () => {
    post.mockResolvedValue({
      data: { token: 'fresh', user: { id: 'u1', email: 'a@b.co', roles: ['employee'] } },
    });
    const result = await refreshSession();
    expect(post).toHaveBeenCalledWith('/auth/refresh');
    expect(tokenStore.get()).toBe('fresh');
    expect(result?.user.email).toBe('a@b.co');
  });

  it('refreshSession resolves null on failure and clears any stale token', async () => {
    post.mockRejectedValue(new Error('401'));
    await expect(refreshSession()).resolves.toBeNull();
  });

  it('logout posts and always clears the token, even when the call fails', async () => {
    post.mockResolvedValue({ data: { ok: true } });
    tokenStore.set('tok');
    await logout();
    expect(post).toHaveBeenCalledWith('/auth/logout');
    expect(tokenStore.get()).toBeNull();

    post.mockRejectedValue(new Error('network'));
    tokenStore.set('tok2');
    await expect(logout()).resolves.toBeUndefined();
    expect(tokenStore.get()).toBeNull();
  });

  it('apiErrorMessage extracts the backend message from an axios error', () => {
    const err = { response: { data: { error: { message: 'Invalid email or password' } } } };
    expect(apiErrorMessage(err)).toBe('Invalid email or password');
  });

  it('apiErrorMessage falls back to a generic message', () => {
    expect(apiErrorMessage(new Error('boom'))).toBe('Something went wrong. Please try again.');
    expect(apiErrorMessage(undefined)).toBe('Something went wrong. Please try again.');
  });
});
