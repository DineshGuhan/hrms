import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient } from '../../services/apiClient';
import * as api from './api';

vi.mock('../../services/apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const get = apiClient.get as unknown as ReturnType<typeof vi.fn>;
const post = apiClient.post as unknown as ReturnType<typeof vi.fn>;
const patch = apiClient.patch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  patch.mockReset();
});

describe('employees api', () => {
  it('getEmployee unwraps the data envelope', async () => {
    get.mockResolvedValue({ data: { data: { id: 'e1', first_name: 'Asha' } } });
    const result = await api.getEmployee('e1');
    expect(get).toHaveBeenCalledWith('/employees/e1');
    expect(result.first_name).toBe('Asha');
  });

  it('listEmployees passes query params', async () => {
    get.mockResolvedValue({ data: { data: [], meta: { page: 2, limit: 20, total: 0, totalPages: 0 } } });
    await api.listEmployees({ page: 2, limit: 20, search: 'ash' });
    expect(get).toHaveBeenCalledWith('/employees', { params: { page: 2, limit: 20, search: 'ash' } });
  });

  it('createEmployee posts the payload', async () => {
    post.mockResolvedValue({ data: { data: { id: 'e2' } } });
    const payload = { first_name: 'Ravi', last_name: 'Kumar', email: 'r@e.co' };
    const result = await api.createEmployee(payload);
    expect(post).toHaveBeenCalledWith('/employees', payload);
    expect(result.id).toBe('e2');
  });

  it('updateEmployee patches and setEmployeeStatus hits the status endpoint', async () => {
    patch.mockResolvedValue({ data: { data: { id: 'e1', status: 'inactive' } } });
    await api.updateEmployee('e1', { phone: '9' });
    expect(patch).toHaveBeenCalledWith('/employees/e1', { phone: '9' });

    await api.setEmployeeStatus('e1', 'inactive');
    expect(patch).toHaveBeenLastCalledWith('/employees/e1/status', { status: 'inactive' });
  });
});
