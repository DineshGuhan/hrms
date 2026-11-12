import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { createApiClient } from './apiClient';
import { tokenStore } from './tokenStore';

describe('apiClient', () => {
  let onLogout: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    tokenStore.clear();
    onLogout = vi.fn();
  });

  afterEach(() => {
    tokenStore.clear();
  });

  it('attaches Authorization: Bearer <token> when a token is set', async () => {
    const client = createApiClient({ onLogout }, 'http://test');
    const mock = new MockAdapter(client);
    tokenStore.set('abc');
    mock.onGet('/me').reply((config) => [200, { auth: config.headers?.Authorization }]);

    const { data } = await client.get('/me');
    expect(data.auth).toBe('Bearer abc');
  });

  it('sends no Authorization header when no token is set', async () => {
    const client = createApiClient({ onLogout }, 'http://test');
    const mock = new MockAdapter(client);
    mock.onGet('/me').reply((config) => [200, { auth: config.headers?.Authorization ?? null }]);

    const { data } = await client.get('/me');
    expect(data.auth).toBeNull();
  });

  it('refreshes the token on 401 and retries the original request', async () => {
    const client = createApiClient({ onLogout }, 'http://test');
    const mock = new MockAdapter(client);
    tokenStore.set('expired');

    mock
      .onGet('/me')
      .replyOnce(401)
      .onGet('/me')
      .reply((config) => [200, { auth: config.headers?.Authorization }]);
    mock.onPost('/auth/refresh').reply(200, { token: 'fresh' });

    const { data } = await client.get('/me');
    expect(data.auth).toBe('Bearer fresh');
    expect(tokenStore.get()).toBe('fresh');
    expect(onLogout).not.toHaveBeenCalled();
  });

  it('logs out when the refresh call fails', async () => {
    const client = createApiClient({ onLogout }, 'http://test');
    const mock = new MockAdapter(client);
    tokenStore.set('expired');

    mock.onGet('/me').reply(401);
    mock.onPost('/auth/refresh').reply(401);

    await expect(client.get('/me')).rejects.toBeTruthy();
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(tokenStore.get()).toBeNull();
  });

  it('does not retry more than once', async () => {
    const client = createApiClient({ onLogout }, 'http://test');
    const mock = new MockAdapter(client);
    mock.onGet('/me').reply(401);
    mock.onPost('/auth/refresh').reply(200, { token: 'fresh' });

    await expect(client.get('/me')).rejects.toBeTruthy();
    expect(mock.history.get.filter((r) => r.url === '/me')).toHaveLength(2);
  });

  it('passes non-401 errors straight through', async () => {
    const client = createApiClient({ onLogout }, 'http://test');
    const mock = new MockAdapter(client);
    mock.onGet('/me').reply(500);

    await expect(client.get('/me')).rejects.toMatchObject({ response: { status: 500 } });
    expect(mock.history.post).toHaveLength(0);
    expect(onLogout).not.toHaveBeenCalled();
  });
});
