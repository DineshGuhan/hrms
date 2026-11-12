declare global {
  namespace Express {
    interface Request {
      /** Unique request ID attached by the requestId middleware. */
      id?: string;
    }
  }
}

export {};
