import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { SessionProvider, useSession } from './useSession';
import type * as api from './auth.api';

const apiMock = {
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
} as unknown as typeof api;

function Probe() {
  const { user, ready, signIn, signOut, hasRole } = useSession();
  return (
    <div>
      <p>ready:{String(ready)}</p>
      <p>user:{user ? user.email : 'none'}</p>
      <p>hr:{String(hasRole('hr'))}</p>
      <button
        type="button"
        onClick={() =>
          signIn('asha@example.com', 'long-enough-password').catch((e) => e)
        }
      >
        sign-in
      </button>
      <button type="button" onClick={() => void signOut()}>
        sign-out
      </button>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SessionProvider', () => {
  it('restores the session from the refresh endpoint on mount', async () => {
    (apiMock.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 't',
      user: { id: 'u1', email: 'asha@example.com', roles: ['hr'] },
    });
    render(
      <SessionProvider apiModule={apiMock}>
        <Probe />
      </SessionProvider>,
    );
    expect(screen.getByText('ready:false')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('ready:true')).toBeInTheDocument());
    expect(screen.getByText('user:asha@example.com')).toBeInTheDocument();
    expect(screen.getByText('hr:true')).toBeInTheDocument();
  });

  it('ends up signed out when restore fails', async () => {
    (apiMock.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    render(
      <SessionProvider apiModule={apiMock}>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByText('ready:true')).toBeInTheDocument());
    expect(screen.getByText('user:none')).toBeInTheDocument();
  });

  it('signIn stores the token, sets the user, and exposes roles', async () => {
    (apiMock.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (apiMock.login as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 'tok',
      user: { id: 'u1', email: 'asha@example.com', roles: ['employee'] },
    });
    render(
      <SessionProvider apiModule={apiMock}>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByText('ready:true')).toBeInTheDocument());
    await act(async () => {
      await userEvent.click(screen.getByText('sign-in'));
    });
    expect(screen.getByText('user:asha@example.com')).toBeInTheDocument();
    expect(screen.getByText('hr:false')).toBeInTheDocument();
  });

  it('signIn failures leave the session signed out and rethrow', async () => {
    (apiMock.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (apiMock.login as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Invalid email or password'),
    );
    render(
      <SessionProvider apiModule={apiMock}>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByText('ready:true')).toBeInTheDocument());
    await act(async () => {
      await userEvent.click(screen.getByText('sign-in')).catch(() => undefined);
    });
    expect(screen.getByText('user:none')).toBeInTheDocument();
    expect(screen.getByText('hr:false')).toBeInTheDocument();
  });

  it('signOut clears the user', async () => {
    (apiMock.refreshSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 't',
      user: { id: 'u1', email: 'asha@example.com', roles: ['hr'] },
    });
    (apiMock.logout as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    render(
      <SessionProvider apiModule={apiMock}>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByText('user:asha@example.com')).toBeInTheDocument());
    await act(async () => {
      await userEvent.click(screen.getByText('sign-out'));
    });
    expect(apiMock.logout).toHaveBeenCalled();
    expect(screen.getByText('user:none')).toBeInTheDocument();
  });
});
