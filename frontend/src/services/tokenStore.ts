/**
 * In-memory access token store.
 * The access token is kept only in memory (never localStorage), so it is lost on reload.
 * The refresh token is an httpOnly cookie set by the backend and is never read here.
 */
let accessToken: string | null = null;

export const tokenStore = {
  get(): string | null {
    return accessToken;
  },
  set(token: string | null): void {
    accessToken = token;
  },
  clear(): void {
    accessToken = null;
  },
};
