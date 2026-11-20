import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import { EmployeeProfilePage } from './EmployeeProfilePage';
import { SessionProvider } from '../auth/useSession';
import type * as authApi from '../auth/auth.api';
import { getEmployee, updateEmployee, setEmployeeStatus } from './api';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  getEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  setEmployeeStatus: vi.fn(),
}));

const mocked = {
  getEmployee,
  updateEmployee,
  setEmployeeStatus,
};
const authApiMock = {
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
} as unknown as typeof authApi;

function renderProfile(path: string, user: { id: string; email: string; roles: ('admin' | 'hr' | 'manager' | 'employee')[] } | null) {
  (authApiMock.refreshSession as Mock).mockResolvedValue(user ? { token: 't', user } : null);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <SessionProvider apiModule={authApiMock}>
          <Routes>
            <Route path="/employees/:id" element={<EmployeeProfilePage />} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const detail = {
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
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EmployeeProfilePage (field masking)', () => {
  it('renders sensitive fields when the API returns them (HR viewer)', async () => {
    (mocked.getEmployee as Mock).mockResolvedValue({ ...detail, salary: '850000', bank_account: '123', bank_name: 'HDFC' });
    renderProfile('/employees/e1', { id: 'hr-1', email: 'hr@x.co', roles: ['hr'] });
    expect(await screen.findByText('850000')).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('never renders a sensitive section when the API omits those fields (manager viewer)', async () => {
    (mocked.getEmployee as Mock).mockResolvedValue(detail); // no salary key at all
    renderProfile('/employees/e1', { id: 'mg-1', email: 'mg@x.co', roles: ['manager'] });
    await waitFor(() => expect(screen.getByText('Engineer')).toBeInTheDocument());
    expect(screen.queryByText('Compensation & bank details')).not.toBeInTheDocument();
  });

  it('employee sees own sensitive fields and gets an Edit-my-details mode limited to contact fields', async () => {
    (mocked.getEmployee as Mock).mockResolvedValue({ ...detail, salary: '850000' });
    renderProfile('/employees/e1', { id: 'u1', email: 'asha@example.com', roles: ['employee'] });
    await waitFor(() => expect(screen.getByText('850000')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Edit my details' }));
    expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    expect(screen.queryByLabelText('Job title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Monthly salary')).not.toBeInTheDocument();

    (mocked.updateEmployee as Mock).mockResolvedValue({ ...detail, phone: '90000' });
    await userEvent.type(screen.getByLabelText('Phone'), '90000');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('Contact details updated')).toBeInTheDocument();
    expect(mocked.updateEmployee).toHaveBeenCalledWith('e1', expect.objectContaining({ phone: expect.stringContaining('90000') }));
  });

  it('deactivation shows a confirmation modal and calls the status endpoint on confirm', async () => {
    (mocked.getEmployee as Mock).mockResolvedValue(detail);
    (mocked.setEmployeeStatus as Mock).mockResolvedValue({ ...detail, status: 'inactive' });
    renderProfile('/employees/e1', { id: 'hr-1', email: 'hr@x.co', roles: ['hr'] });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Deactivate' })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mocked.setEmployeeStatus).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByText('Status updated')).toBeInTheDocument();
    expect(mocked.setEmployeeStatus).toHaveBeenCalledWith('e1', 'inactive');
  });

  it('shows an error state when the employee cannot be loaded', async () => {
    (mocked.getEmployee as Mock).mockRejectedValue(new Error('boom'));
    renderProfile('/employees/e1', { id: 'hr-1', email: 'hr@x.co', roles: ['hr'] });
    expect(await screen.findByText(/could not load the employee/i)).toBeInTheDocument();
  });

  it('hides management actions from non-HR/Admin viewers', async () => {
    (mocked.getEmployee as Mock).mockResolvedValue(detail);
    renderProfile('/employees/e1', { id: 'mg-1', email: 'mg@x.co', roles: ['manager'] });
    await waitFor(() => expect(screen.getByText('Engineer')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Deactivate' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit employee/i })).not.toBeInTheDocument();
  });
});
