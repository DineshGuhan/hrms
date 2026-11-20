import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import * as repo from './auth.repository.js';
import * as service from './auth.service.js';
import { ApiError } from '../../middleware/errorHandler.js';

jest.mock('./auth.repository.js');
const mockRepo = repo as jest.Mocked<typeof repo>;

const PASSWORD = 'correct-horse-battery';
let passwordHash: string;

beforeAll(async () => {
  passwordHash = await bcrypt.hash(PASSWORD, 4); // low cost keeps the test fast
});

const baseUser = (overrides: Partial<repo.UserRow> = {}): repo.UserRow => ({
  id: 'u1',
  email: 'asha@example.com',
  password_hash: null,
  is_active: true,
  failed_login_attempts: 0,
  locked_until: null,
  roles: ['employee'],
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockRepo.insertRefreshToken.mockResolvedValue('rt1');
  mockRepo.resetLoginFailures.mockResolvedValue(undefined);
  mockRepo.recordFailedLogin.mockResolvedValue(undefined);
});

describe('password hashing', () => {
  it('uses bcrypt cost 12 in production code', () => {
    expect(service.BCRYPT_COST).toBe(12);
  });

  it('verifies a correct password against its hash', async () => {
    expect(await bcrypt.compare(PASSWORD, passwordHash)).toBe(true);
    expect(await bcrypt.compare('wrong', passwordHash)).toBe(false);
  });
});

describe('JWT access tokens', () => {
  it('signs and verifies a token round-trip', () => {
    const token = service.signAccessToken({ sub: 'u1', email: 'a@b.c', roles: ['hr'] });
    const payload = service.verifyAccessToken(token);
    expect(payload.sub).toBe('u1');
    expect(payload.roles).toEqual(['hr']);
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: 'u1', email: 'a@b.c', roles: ['admin'] }, 'x'.repeat(40));
    expect(() => service.verifyAccessToken(forged)).toThrow();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(
      { sub: 'u1', email: 'a@b.c', roles: [], exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_SECRET,
    );
    expect(() => service.verifyAccessToken(expired)).toThrow();
  });
});

describe('login', () => {
  it('returns tokens for valid credentials and resets failures', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(baseUser({ password_hash: passwordHash }));
    const result = await service.login('asha@example.com', PASSWORD);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(result.user.roles).toEqual(['employee']);
    expect(mockRepo.resetLoginFailures).toHaveBeenCalledWith('u1');
  });

  it('returns 401 for a wrong password and records the failure', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(baseUser({ password_hash: passwordHash }));
    await expect(service.login('asha@example.com', 'nope')).rejects.toMatchObject({ status: 401 });
    expect(mockRepo.recordFailedLogin).toHaveBeenCalledWith('u1', null);
  });

  it('returns the same 401 for an unknown email (no account enumeration)', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(null);
    await expect(service.login('ghost@example.com', PASSWORD)).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
  });

  it('returns 401 for an inactive account', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(
      baseUser({ password_hash: passwordHash, is_active: false }),
    );
    await expect(service.login('asha@example.com', PASSWORD)).rejects.toMatchObject({ status: 401 });
  });

  it('locks the account on the fifth failed attempt (423)', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(
      baseUser({ password_hash: passwordHash, failed_login_attempts: 4 }),
    );
    const err = await service.login('asha@example.com', 'nope').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(423);
    expect(mockRepo.recordFailedLogin).toHaveBeenCalledWith('u1', expect.any(Date));
  });

  it('rejects login while the lockout is active, even with the right password', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(
      baseUser({
        password_hash: passwordHash,
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() + 60_000),
      }),
    );
    await expect(service.login('asha@example.com', PASSWORD)).rejects.toMatchObject({ status: 423 });
  });

  it('allows login again after the lockout expires', async () => {
    mockRepo.findUserByEmail.mockResolvedValue(
      baseUser({
        password_hash: passwordHash,
        failed_login_attempts: 5,
        locked_until: new Date(Date.now() - 1000),
      }),
    );
    const result = await service.login('asha@example.com', PASSWORD);
    expect(result.accessToken).toBeTruthy();
  });
});

describe('refresh rotation', () => {
  const stored = (overrides: Partial<repo.RefreshTokenRow> = {}): repo.RefreshTokenRow => ({
    id: 'rt-old',
    user_id: 'u1',
    token_hash: 'h',
    expires_at: new Date(Date.now() + 60_000),
    revoked_at: null,
    ...overrides,
  });

  it('revokes the presented token and issues a new pair', async () => {
    mockRepo.findRefreshTokenByHash.mockResolvedValue(stored());
    mockRepo.findUserRoles.mockResolvedValue(['hr']);
    mockRepo.findUserEmailById.mockResolvedValue('asha@example.com');
    mockRepo.findUserByEmail.mockResolvedValue(baseUser({ roles: ['hr'] }));

    const result = await service.refresh('old-token');
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith('rt-old');
    expect(result.refreshToken).toBeTruthy();
    expect(result.accessToken).toBeTruthy();
  });

  it('detects reuse of a revoked token and revokes all of the user’s tokens', async () => {
    mockRepo.findRefreshTokenByHash.mockResolvedValue(stored({ revoked_at: new Date() }));
    await expect(service.refresh('stolen')).rejects.toMatchObject({ status: 401 });
    expect(mockRepo.revokeAllRefreshTokensForUser).toHaveBeenCalledWith('u1');
  });

  it('rejects an unknown token', async () => {
    mockRepo.findRefreshTokenByHash.mockResolvedValue(null);
    await expect(service.refresh('nope')).rejects.toMatchObject({ status: 401 });
  });

  it('rejects an expired token', async () => {
    mockRepo.findRefreshTokenByHash.mockResolvedValue(
      stored({ expires_at: new Date(Date.now() - 1000) }),
    );
    await expect(service.refresh('expired')).rejects.toMatchObject({ status: 401 });
  });
});

describe('logout', () => {
  it('revokes an active refresh token', async () => {
    mockRepo.findRefreshTokenByHash.mockResolvedValue({
      id: 'rt1',
      user_id: 'u1',
      token_hash: 'h',
      expires_at: new Date(Date.now() + 60_000),
      revoked_at: null,
    });
    await service.logout('tok');
    expect(mockRepo.revokeRefreshToken).toHaveBeenCalledWith('rt1');
  });

  it('does nothing for an unknown token', async () => {
    mockRepo.findRefreshTokenByHash.mockResolvedValue(null);
    await service.logout('unknown');
    expect(mockRepo.revokeRefreshToken).not.toHaveBeenCalled();
  });
});
