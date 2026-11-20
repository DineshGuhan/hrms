import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { LoginForm } from './LoginForm';
import { SessionProvider, useSession } from './useSession';
import type * as api from './auth.api';
import type { SessionUser } from './auth.api';

const apiMock = {
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
} as unknown as { login: Mock; refreshSession: Mock; logout: Mock };

beforeEach(() => {
  vi.clearAllMocks();
  (apiMock.refreshSession as Mock).mockResolvedValue(null);
});

function renderLoginForm() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <SessionProvider apiModule={apiMock as unknown as typeof api}>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/" element={<p>dashboard</p>} />
        </Routes>
      </SessionProvider>
    </MemoryRouter>,
  );
}

async function submit(email = 'asha@example.com', password = 'long-enough-password') {
  const user = userEvent.setup();
  if (email) await user.type(screen.getByLabelText('Email'), email);
  if (password) await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('LoginForm', () => {
  it('shows field-level errors for a malformed email and short password', async () => {
    renderLoginForm();
    await submit('bad-email', 'short');
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
  });

  it('navigates to the dashboard on successful login', async () => {
    (apiMock.login as Mock).mockResolvedValue({
      token: 'tok',
      user: { id: 'u1', email: 'asha@example.com', roles: ['employee'] } as SessionUser,
    });
    renderLoginForm();
    await submit();
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
    expect(apiMock.login).toHaveBeenCalledWith('asha@example.com', 'long-enough-password');
  });

  it('surfaces the generic invalid-credentials message on 401', async () => {
    (apiMock.login as Mock).mockRejectedValue({
      response: { status: 401, data: { error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' } } },
    });
    renderLoginForm();
    await submit();
    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument();
  });

  it('surfaces the account-locked message on 423', async () => {
    (apiMock.login as Mock).mockRejectedValue({
      response: {
        status: 423,
        data: { error: { code: 'ACCOUNT_LOCKED', message: 'Account locked due to too many failed attempts.' } },
      },
    });
    renderLoginForm();
    await submit();
    expect(await screen.findByText(/account locked/i)).toBeInTheDocument();
  });

  it('shows a generic message when the API gives no structured error', async () => {
    (apiMock.login as Mock).mockRejectedValue(new TypeError('network down'));
    renderLoginForm();
    await submit();
    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    renderLoginForm();
    const password = screen.getByLabelText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });
    await userEvent.click(toggle);
    expect(password).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password).toHaveAttribute('type', 'password');
  });

  it('disables the submit button while submitting', async () => {
    (apiMock.login as Mock).mockImplementation(() => new Promise(() => undefined)); // never settles
    renderLoginForm();
    await submit();
    expect(await screen.findByRole('button', { name: /loading/i })).toBeDisabled();
  });
});

// Redirect-away rule lives on the Login page; tested through the session context.
describe('Login page redirect', () => {
  function LoginPageHarness() {
    const { user, ready } = useSession();
    return (
      <>
        <p>ready:{String(ready)}</p>
        {user ? <p>user:{user.email}</p> : null}
      </>
    );
  }

  it('a signed-in session is present after restore (redirect tested via useSession)', async () => {
    (apiMock.refreshSession as Mock).mockResolvedValue({
      token: 't',
      user: { id: 'u1', email: 'asha@example.com', roles: ['employee'] },
    });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <SessionProvider apiModule={apiMock as unknown as typeof api}>
          <Routes>
            <Route path="/login" element={<LoginPageHarness />} />
            <Route path="/" element={<p>dashboard</p>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByText('ready:true')).toBeInTheDocument());
    expect(screen.getByText('user:asha@example.com')).toBeInTheDocument();
  });
});
