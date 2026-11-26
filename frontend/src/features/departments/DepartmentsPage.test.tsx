import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import DepartmentsPage from './DepartmentsPage';
import { SessionProvider } from '../auth/useSession';
import type * as authApi from '../auth/auth.api';
import * as apiModule from './api';
import * as employeesApi from '../employees/api';

vi.mock('./api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api')>()),
  listDepartments: vi.fn(),
  createDepartment: vi.fn(),
  updateDepartment: vi.fn(),
  assignHead: vi.fn(),
  archiveDepartment: vi.fn(),
  apiErrorMessage: (await importOriginal<typeof import('./api')>()).apiErrorMessage,
}));

vi.mock('../employees/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../employees/api')>()),
  listEmployees: vi.fn(),
}));

const authApiMock = {
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
} as unknown as typeof authApi;

const listEmployeesMock = vi.mocked(employeesApi.listEmployees);

const departments = [
  { id: 'd1', name: 'Engineering', description: 'Builders', head_name: 'Asha Rao', employee_count: 7, status: 'active' },
  { id: 'd2', name: 'Sales', description: null, head_name: null, employee_count: 3, status: 'active' },
];

const hrUser = { id: 'hr-1', email: 'hr@x.co', roles: ['hr' as const] };

beforeEach(() => {
  vi.clearAllMocks();
  (authApiMock.refreshSession as Mock).mockResolvedValue({ token: 't', user: hrUser });
  (apiModule.listDepartments as Mock).mockResolvedValue(departments);
  // The head-assignment select lists active employees.
  listEmployeesMock.mockResolvedValue({
    data: [
      { id: 'e9', first_name: 'Ravi', last_name: 'Kumar', email: 'ravi@example.com', phone: null, job_title: 'Engineer', department_id: null, manager_id: null, join_date: null, status: 'active' },
    ],
    meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
  });
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SessionProvider apiModule={authApiMock}>
          <DepartmentsPage />
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (authApiMock.refreshSession as Mock).mockResolvedValue({ token: 't', user: hrUser });
  (apiModule.listDepartments as Mock).mockResolvedValue(departments);
});

describe('DepartmentsPage', () => {
  it('renders departments with head, employee count, and status', async () => {
    renderPage();
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Sales')).toBeInTheDocument();
  });

  it('create modal validates the required name', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /create department/i }));
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(apiModule.createDepartment).not.toHaveBeenCalled();
  });

  it('create modal submits the payload and shows a success toast', async () => {
    (apiModule.createDepartment as Mock).mockResolvedValue({ id: 'd3', name: 'New Dept' });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /create department/i }));
    await userEvent.type(screen.getByLabelText('Name'), 'Marketing');
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText('Department created')).toBeInTheDocument();
    expect(apiModule.createDepartment).toHaveBeenCalledTimes(1);
    expect((apiModule.createDepartment as Mock).mock.calls[0][0]).toEqual({
      name: 'Marketing',
      description: '',
    });
  });

  it('edit modal pre-fills and submits changes', async () => {
    (apiModule.updateDepartment as Mock).mockResolvedValue({ id: 'd1' });
    renderPage();
    await waitFor(() => expect(screen.getByText('Engineering')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const nameInput = screen.getByLabelText('Name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Product Engineering');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('Department updated')).toBeInTheDocument();
    expect(apiModule.updateDepartment).toHaveBeenCalledTimes(1);
    const [calledId, calledPayload] = (apiModule.updateDepartment as Mock).mock.calls[0];
    expect(calledId).toBe('d1');
    expect(calledPayload).toEqual({
      name: 'Product Engineering',
      description: departments[0].description ?? '',
    });
  });

  it('duplicate name error surfaces as a toast on rename', async () => {
    (apiModule.updateDepartment as Mock).mockRejectedValue({
      response: { data: { error: { code: 'NAME_TAKEN', message: 'A department with this name already exists' } } },
    });
    renderPage();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(2));
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Sales');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('A department with this name already exists')).toBeInTheDocument();
  });

  it('assign head modal lists active employees and submits on assign', async () => {
    (apiModule.assignHead as Mock).mockResolvedValue({ id: 'd1', head_name: 'Ravi Kumar' });
    renderPage();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Assign head' })).toHaveLength(2));
    await userEvent.click(screen.getAllByRole('button', { name: 'Assign head' })[0]);
    const select = await screen.findByLabelText('Employee');
    // Wait for the active-employee options to load before selecting.
    await waitFor(() => expect((select as HTMLSelectElement).options.length).toBeGreaterThan(1));
    await userEvent.selectOptions(select, 'e9');
    await userEvent.click(screen.getByRole('button', { name: /^assign$/i }));
    expect(await screen.findByText('Head assigned')).toBeInTheDocument();
  });

  it('assign head requires a selected employee', async () => {
    renderPage();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Assign head' })).toHaveLength(2));
    await userEvent.click(screen.getAllByRole('button', { name: 'Assign head' })[0]);
    await userEvent.click(screen.getByRole('button', { name: /^assign$/i }));
    expect(await screen.findByText('Select an employee')).toBeInTheDocument();
  });

  it('archive shows a confirmation modal and calls the archive endpoint on confirm', async () => {
    (apiModule.archiveDepartment as Mock).mockResolvedValue({ id: 'd1', status: 'archived' });
    renderPage();
    // Two active rows -> two "Archive" buttons; click the first (Engineering).
    const rowArchive = await screen.findAllByRole('button', { name: 'Archive' });
    await userEvent.click(rowArchive[0]);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // The modal's confirm button is scoped inside the dialog.
    await userEvent.click(within(dialog).getByRole('button', { name: /^archive$/i }));
    expect(await screen.findByText('Department archived')).toBeInTheDocument();
    expect(apiModule.archiveDepartment).toHaveBeenCalledTimes(1);
    expect((apiModule.archiveDepartment as Mock).mock.calls[0][0]).toBe('d1');
  });
});
