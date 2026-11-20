import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { EmployeeFormPage } from './EmployeeFormPage';
import { SessionProvider } from '../auth/useSession';
import type * as authApi from '../auth/auth.api';
import { createEmployee, getEmployee, updateEmployee, setEmployeeStatus } from './api';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  setEmployeeStatus: vi.fn(),
}));

const mocked = {
  getEmployee,
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
};
const authApiMock = {
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
} as unknown as typeof authApi;

function renderPage(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider apiModule={authApiMock}>
          <Routes>
            <Route path="/employees/new" element={<EmployeeFormPage />} />
            <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
            <Route path="/employees" element={<p>employees list</p>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const hrUser = { id: 'hr-1', email: 'hr@x.co', roles: ['hr' as const] };

beforeEach(() => {
  vi.clearAllMocks();
  (authApiMock.refreshSession as Mock).mockResolvedValue({
    token: 't',
    user: hrUser,
  });
});

describe('EmployeeFormPage (create)', () => {
  it('validates required fields and email format', async () => {
    renderPage('/employees/new');
    await waitFor(() => expect(screen.getByRole('button', { name: /create employee/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /create employee/i }));
    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(screen.getByText('Last name is required')).toBeInTheDocument();
    expect(screen.getByText('Email is required')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('First name'), 'Ravi');
    await userEvent.type(screen.getByLabelText('Last name'), 'Kumar');
    await userEvent.type(screen.getByLabelText('Email'), 'bad-email');
    await userEvent.click(screen.getByRole('button', { name: /create employee/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('submits a valid payload and shows a success toast', async () => {
    (mocked.createEmployee as Mock).mockResolvedValue({ id: 'e9', user_id: 'u9', status: 'active' });
    renderPage('/employees/new');
    // Wait for the session (and therefore the compensation section) to be ready.
    await waitFor(() => expect(screen.getByLabelText('Monthly salary')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('First name'), 'Ravi');
    await userEvent.type(screen.getByLabelText('Last name'), 'Kumar');
    await userEvent.type(screen.getByLabelText('Email'), 'ravi@example.com');
    await userEvent.type(screen.getByLabelText('Monthly salary'), '850000');
    await userEvent.click(screen.getByRole('button', { name: /create employee/i }));
    expect(await screen.findByText('Employee created')).toBeInTheDocument();
    // TanStack mutationFn receives (variables, context) — assert both args.
    expect(mocked.createEmployee).toHaveBeenCalledWith(
      expect.objectContaining({ first_name: 'Ravi', last_name: 'Kumar', email: 'ravi@example.com', salary: '850000' }),
      expect.anything(),
    );
  });

  it('shows the compensation section for HR/Admin', async () => {
    renderPage('/employees/new');
    // The section renders only after the session restore completes.
    expect(await screen.findByLabelText('Monthly salary')).toBeInTheDocument();
    expect(screen.getByLabelText('Bank account number')).toBeInTheDocument();
  });

  it('surfaces an API error toast on failure', async () => {
    (mocked.createEmployee as Mock).mockRejectedValue({
      response: { data: { error: { code: 'EMAIL_TAKEN', message: 'An employee with this email already exists' } } },
    });
    renderPage('/employees/new');
    await waitFor(() => expect(screen.getByLabelText('First name')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('First name'), 'Ravi');
    await userEvent.type(screen.getByLabelText('Last name'), 'Kumar');
    await userEvent.type(screen.getByLabelText('Email'), 'taken@example.com');
    await userEvent.click(screen.getByRole('button', { name: /create employee/i }));
    expect(await screen.findByText('An employee with this email already exists')).toBeInTheDocument();
  });
});

describe('EmployeeFormPage (edit)', () => {
  const existing = {
    id: 'e1',
    user_id: 'u1',
    first_name: 'Asha',
    last_name: 'Rao',
    email: 'asha@example.com',
    phone: '98765',
    address: null,
    job_title: 'Engineer',
    department_id: null,
    manager_id: null,
    join_date: '2024-01-15',
    status: 'active',
    salary: '850000',
    bank_account: '123',
    bank_name: 'HDFC',
    national_id: null,
  };

  function renderEdit() {
    (mocked.getEmployee as Mock).mockResolvedValue(existing);
    return renderPage('/employees/e1/edit');
  }

  it('pre-fills the form with the employee data', async () => {
    renderEdit();
    expect(await screen.findByLabelText('First name')).toHaveValue('Asha');
    expect(screen.getByLabelText('Email')).toHaveValue('asha@example.com');
    expect(screen.getByLabelText('Monthly salary')).toHaveValue('850000');
  });

  it('submits changes through the update endpoint', async () => {
    (mocked.updateEmployee as Mock).mockResolvedValue({ ...existing, first_name: 'Asha2' });
    renderEdit();
    await waitFor(() => expect(screen.getByLabelText('First name')).toHaveValue('Asha'));
    await userEvent.clear(screen.getByLabelText('First name'));
    await userEvent.type(screen.getByLabelText('First name'), 'Asha2');
    await userEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(await screen.findByText('Employee updated')).toBeInTheDocument();
    expect(mocked.updateEmployee).toHaveBeenCalledWith('e1', expect.objectContaining({ first_name: 'Asha2' }));
  });
});
