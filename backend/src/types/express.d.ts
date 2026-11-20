import type { AuthUser } from '../modules/auth/auth.js';

declare global {
  namespace Express {
    interface Request {
      /** Unique request ID attached by the requestId middleware. */
      id?: string;
      /** Authenticated user, attached by the requireAuth middleware. */
      user?: AuthUser;
    }
  }
}

export {};
