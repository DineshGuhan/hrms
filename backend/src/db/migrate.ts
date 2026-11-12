// node-pg-migrate config file (used by `npm run migrate` / `npm run migrate:down`).
export default {
  ignorePing: true,
  dbUrl: process.env.NODE_ENV === 'test' ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL,
};
