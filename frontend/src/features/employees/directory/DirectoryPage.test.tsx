import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import DirectoryPage from './DirectoryPage';
import { SessionProvider } from '../../auth/useSession';
import type * as authApi from '../../auth/auth.api';
import * as apiModule from '../api';

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  listEmployees: vi.fn(),
  getEmployee: vi.fn(),
  createEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  setEmployeeStatus: vi.fn(),
}));

const listMock = apiModule.listEmployees as unknown as Mock;
const authApiMock = {
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
} as unknown as typeof authApi;

const row = (id: string, first: string, status: 'active' | 'inactive' = 'active'): apiModule.EmployeeListItem => ({
  id,
  first_name: first,
  last_name: 'Kumar',
  email: `${first.toLowerCase()}@example.com`,
  phone: null,
  job_title: 'Engineer',
  department_id: null,
  manager_id: null,
  join_date: '2024-01-15',
  status,
});

function renderDirectory(initialPath = '/employees') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SessionProvider apiModule={authApiMock}>
          <Routes>
            <Route path="/employees" element={<DirectoryPage />} />
            <Route path="/employees/:id" element={<p>profile page</p>} />
            <Route path="/login" element={<p>login page</p>} />
          </Routes>
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const hrUser = { id: 'hr-1', email: 'hr@x.co', roles: ['hr' as const] };

beforeEach(() => {
  vi.clearAllMocks();
  (authApiMock.refreshSession as Mock).mockResolvedValue({ token: 't', user: hrUser });
  (listMock as Mock).mockResolvedValue({
    data: [row('e1', 'Asha'), row('e2', 'Ravi', 'inactive')],
    meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
  });
});

describe('DirectoryPage — filters', () => {
  it('debounces search 300ms and passes it to the API', async () => {
    renderDirectory();
    await userEvent.type(await screen.findByLabelText('Search'), 'asha');
    await waitFor(
      () => expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ search: 'asha' })),
      { timeout: 1500 },
    );
    // Only the final debounced value reaches the API.
    const searchCalls = (listMock as Mock).mock.calls.filter(
      (c) => (c[0] as { search?: string }).search !== undefined,
    );
    expect(searchCalls).toHaveLength(1);
  });

  it('resets to page 1 when the search changes', async () => {
    (listMock as Mock).mockResolvedValue({
      data: [row('e1', 'Asha')],
      meta: { page: 3, limit: 20, total: 60, totalPages: 3 },
    });
    renderDirectory();
    await userEvent.type(await screen.findByLabelText('Search'), 'a');
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 })),
    );
  });

  it('department filter exists with only the "All departments" option until HRM-16', async () => {
    renderDirectory();
    const select = await screen.findByLabelText('Department');
    expect(select).toBeInTheDocument();
    expect((select as HTMLSelectElement).options).toHaveLength(1); // just the placeholder
  });

  it('status filter sets the correct query param', async () => {
    renderDirectory();
    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'inactive');
    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'inactive' })));
  });

  it('combined filters apply together', async () => {
    renderDirectory();
    await userEvent.selectOptions(await screen.findByLabelText('Status'), 'active');
    await userEvent.type(await screen.findByLabelText('Search'), 'ra');
    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'active', search: 'ra' }),
      ),
    );
  });
});

describe('DirectoryPage — pagination and rows', () => {
  it('pagination controls change page and show the total count', async () => {
    (listMock as Mock).mockResolvedValue({
      data: [row('e1', 'Asha')],
      meta: { page: 2, limit: 20, total: 41, totalPages: 3 },
    });
    renderDirectory();
    expect(await screen.findByText('41 total')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith(expect.objectContaining({ page: 3 })));
  });

  it('row click navigates to the employee profile', async () => {
    renderDirectory();
    await userEvent.click(await screen.findByText('Asha Kumar'));
    expect(await screen.findByText('profile page')).toBeInTheDocument();
  });

  it('status badge reflects the row status', async () => {
    renderDirectory();
    expect(await screen.findByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});

describe('DirectoryPage — empty and loading states', () => {
  it('empty state shows a clear-filters action that resets all filters', async () => {
    (listMock as Mock).mockResolvedValue({ data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } });
    renderDirectory();
    await userEvent.type(await screen.findByLabelText('Search'), 'zzz');
    const clear = await screen.findByRole('button', { name: 'Clear filters' });
    await userEvent.click(clear);
    expect(screen.getByLabelText('Search')).toHaveValue('');
    expect(screen.getByLabelText('Status')).toHaveValue('');
  });

  it('loading skeleton renders during fetch', async () => {
    (listMock as Mock).mockImplementation(() => new Promise(() => undefined)); // never settles
    renderDirectory();
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });
});

describe('DirectoryPage — role scoping (enforced by the API; UI just renders)', () => {
  it('manager sees the rows the API returns for them (mocked direct reports)', async () => {
    (authApiMock.refreshSession as Mock).mockResolvedValue({
      token: 't',
      user: { id: 'mg-1', email: 'mg@x.co', roles: ['manager'] },
    });
    (listMock as Mock).mockResolvedValue({
      data: [row('e9', 'Report')],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderDirectory();
    expect(await screen.findByText('Report Kumar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add employee/i })).not.toBeInTheDocument();
  });

  it('employee sees only their own record (mocked self row)', async () => {
    (authApiMock.refreshSession as Mock).mockResolvedValue({
      token: 't',
      user: { id: 'u1', email: 'em@x.co', roles: ['employee'] },
    });
    (listMock as Mock).mockResolvedValue({
      data: [row('e-self', 'Em')],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
    renderDirectory();
    expect(await screen.findByText('Em Kumar')).toBeInTheDocument();
  });
});
