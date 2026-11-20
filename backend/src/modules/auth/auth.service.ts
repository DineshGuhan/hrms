import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv } from '../../config/env.js';
import { ApiError } from '../../middleware/errorHandler.js';
import * as repo from './auth.repository.js';
import type { Role } from './auth.policy.js';

export const BCRYPT_COST = 12;
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;
export const REFRESH_TTL_DAYS = 7;
const ACCESS_TTL_SECONDS = 15 * 60;

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: Role[];
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; roles: Role[] };
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

/** Same message for unknown email and wrong password, so emails are not revealed. */
const INVALID_CREDENTIALS = new ApiError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
const ACCOUNT_LOCKED = new ApiError(
  423,
  'Account locked due to too many failed attempts. Try again later.',
  'ACCOUNT_LOCKED',
);

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, getEnv().JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, getEnv().JWT_SECRET, { algorithms: ['HS256'] });
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new ApiError(401, 'Invalid token', 'UNAUTHORIZED');
  }
  return decoded as AccessTokenPayload;
}

async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000);
  await repo.insertRefreshToken(userId, hashToken(token), expiresAt);
  return token;
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const user = await repo.findUserByEmail(email);
  if (!user || !user.is_active || !user.password_hash) {
    throw INVALID_CREDENTIALS;
  }

  if (user.locked_until && user.locked_until.getTime() > Date.now()) {
    throw ACCOUNT_LOCKED;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const attempts = user.failed_login_attempts + 1;
    const lockedUntil =
      attempts >= MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
        : null;
    await repo.recordFailedLogin(user.id, lockedUntil);
    throw lockedUntil ? ACCOUNT_LOCKED : INVALID_CREDENTIALS;
  }

  await repo.resetLoginFailures(user.id);
  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles: user.roles });
  const refreshToken = await issueRefreshToken(user.id);
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, roles: user.roles } };
}

/**
 * Rotate a refresh token. The old token is revoked and a new one is issued.
 * Presenting an already-revoked token means it was stolen or replayed, so every
 * active token for that user is revoked.
 */
export async function refresh(presentedToken: string): Promise<RefreshResult> {
  const stored = await repo.findRefreshTokenByHash(hashToken(presentedToken));
  if (!stored) {
    throw new ApiError(401, 'Invalid refresh token', 'UNAUTHORIZED');
  }

  if (stored.revoked_at) {
    await repo.revokeAllRefreshTokensForUser(stored.user_id);
    throw new ApiError(401, 'Refresh token reuse detected', 'UNAUTHORIZED');
  }

  if (stored.expires_at.getTime() <= Date.now()) {
    throw new ApiError(401, 'Refresh token expired', 'UNAUTHORIZED');
  }

  await repo.revokeRefreshToken(stored.id);
  const roles = await repo.findUserRoles(stored.user_id);
  const user = await repo.findUserByEmail(await repo.findUserEmailById(stored.user_id));
  if (!user || !user.is_active) {
    throw new ApiError(401, 'Invalid refresh token', 'UNAUTHORIZED');
  }

  const accessToken = signAccessToken({ sub: user.id, email: user.email, roles });
  const refreshToken = await issueRefreshToken(user.id);
  return { accessToken, refreshToken };
}

export async function logout(presentedToken: string): Promise<void> {
  const stored = await repo.findRefreshTokenByHash(hashToken(presentedToken));
  if (stored && !stored.revoked_at) {
    await repo.revokeRefreshToken(stored.id);
  }
}
