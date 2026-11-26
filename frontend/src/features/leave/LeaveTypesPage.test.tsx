import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach, type Mock } from 'vitest';
import LeaveTypesPage from './LeaveTypesPage';
import { SessionProvider } from '../auth/useSession';
import type * as authApi from '../auth/auth.api';
import * as apiModule from './leave-types.api';
import type * as api from './leave-types.api';

vi.mock('./leave-types.api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./leave-types.api')>()),
  listLeaveTypes: vi.fn(),
  createLeaveType: vi.fn(),
  updateLeaveType: vi.fn(),
  archiveLeaveType: vi.fn(),
}));

const listMock = apiModule.listLeaveTypes as unknown as Mock;
const createMock = apiModule.createLeaveType as unknown as Mock;
const updateMock = apiModule.updateLeaveType as unknown as Mock;
const archiveMock = apiModule.archiveLeaveType as unknown as Mock;

const authApiMock = {
  login: vi.fn(),
  refreshSession: vi.fn(),
  logout: vi.fn(),
} as unknown as typeof authApi;

const hrUser = { id: 'hr-1', email: 'hr@x.co', roles: ['hr' as const] };

const leaveTypes: api.LeaveType[] = [
  { id: 'lt1', name: 'Annual', quota_days: '20.0', is_paid: true, is_active: true, used_days: '3.0' },
  { id: 'lt2', name: 'Sick', quota_days: '10.0', is_paid: true, is_active: true, used_days: '1.0' },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SessionProvider apiModule={authApiMock}>
          <LeaveTypesPage />
        </SessionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  (authApiMock.refreshSession as Mock).mockResolvedValue({ token: 't', user: hrUser });
  listMock.mockResolvedValue(leaveTypes);
});

describe('LeaveTypesPage — table', () => {
  it('renders leave types with quota, usage, and status', async () => {
    renderPage();
    expect(await screen.findByText('Annual')).toBeInTheDocument();
    expect(screen.getByText('20.0')).toBeInTheDocument();
    expect(screen.getByText('3.0')).toBeInTheDocument();
    expect(screen.getByText('Sick')).toBeInTheDocument();
    const badges = screen.getAllByText('Active');
    expect(badges).toHaveLength(2);
  });

  it('shows the archive button only for active types (HR/Admin)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Annual')).toBeInTheDocument());
    expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(2);
  });
});

describe('LeaveTypesPage — create', () => {
  it('validates the required name and quota before submit', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /create leave type/i }));
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('rejects a negative quota', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /create leave type/i }));
    await userEvent.type(screen.getByLabelText('Name'), 'Parental');
    await userEvent.type(screen.getByLabelText(/quota/i), '-5');
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText(/zero or greater/i)).toBeInTheDocument();
  });

  it('submits the payload and shows a success toast', async () => {
    createMock.mockResolvedValue({ id: 'lt9', name: 'Parental', quota_days: '10.0', is_paid: true });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /create leave type/i }));
    await userEvent.type(screen.getByLabelText('Name'), 'Parental');
    await userEvent.type(screen.getByLabelText(/quota/i), '10');
    await userEvent.click(screen.getByRole('button', { name: /^create$/i }));
    expect(await screen.findByText('Leave type created')).toBeInTheDocument();
    expect(createMock).toHaveBeenCalledTimes(1);
    expect((createMock as Mock).mock.calls[0][0]).toMatchObject({ name: 'Parental', quota_days: 10 });
  });
});

describe('LeaveTypesPage — edit and archive', () => {
  it('edit modal pre-fills and submits changes', async () => {
    updateMock.mockResolvedValue({ id: 'lt1', name: 'Annual', quota_days: '25.0', is_paid: true, is_active: true });
    renderPage();
    await waitFor(() => expect(screen.getByText('Annual')).toBeInTheDocument());
    await userEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);
    const quota = screen.getByLabelText(/quota/i);
    await userEvent.clear(quota);
    await userEvent.type(quota, '25');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText('Leave type updated')).toBeInTheDocument();
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect((updateMock as Mock).mock.calls[0][0]).toBe('lt1');
  });

  it('archive shows a confirmation modal and calls the archive endpoint', async () => {
    archiveMock.mockResolvedValue({ id: 'lt1', is_active: false });
    renderPage();
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Archive' })).toHaveLength(2));
    await userEvent.click(screen.getAllByRole('button', { name: 'Archive' })[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^archive$/i }));
    expect(await screen.findByText('Leave type archived')).toBeInTheDocument();
    expect(archiveMock).toHaveBeenCalledWith('lt1');
  });
});
