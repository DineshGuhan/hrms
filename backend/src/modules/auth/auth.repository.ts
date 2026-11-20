import { query } from '../../config/db.js';
import type { Role } from './auth.policy.js';

export interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  is_active: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  roles: Role[];
}

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const { rows } = await query<UserRow>(
    `SELECT u.id, u.email, u.password_hash, u.is_active, u.failed_login_attempts, u.locked_until,
            COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.email = $1
      GROUP BY u.id`,
    [email],
  );
  return rows[0] ?? null;
}

export async function recordFailedLogin(userId: string, lockedUntil: Date | null): Promise<void> {
  await query(
    `UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = $2,
            updated_at = now()
      WHERE id = $1`,
    [userId, lockedUntil],
  );
}

export async function resetLoginFailures(userId: string): Promise<void> {
  await query(
    `UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL, updated_at = now()
      WHERE id = $1`,
    [userId],
  );
}

export async function insertRefreshToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date,
): Promise<string> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt],
  );
  return rows[0].id;
}

export async function findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
  const { rows } = await query<RefreshTokenRow>(
    `SELECT id, user_id, token_hash, expires_at, revoked_at
       FROM refresh_tokens
      WHERE token_hash = $1`,
    [tokenHash],
  );
  return rows[0] ?? null;
}

export async function revokeRefreshToken(id: string): Promise<void> {
  await query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [id]);
}

/** Revoke every active refresh token for a user (used when reuse of a rotated token is detected). */
export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
}

export async function findUserEmailById(userId: string): Promise<string> {
  const { rows } = await query<{ email: string }>(`SELECT email FROM users WHERE id = $1`, [
    userId,
  ]);
  return rows[0]?.email ?? '';
}

export async function findUserRoles(userId: string): Promise<Role[]> {
  const { rows } = await query<{ name: Role }>(
    `SELECT r.name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1`,
    [userId],
  );
  return rows.map((r) => r.name);
}
