# HRMS Backend

Express + TypeScript API for the HRMS learning project.

## Stack

- Node 20+, Express 4, TypeScript
- PostgreSQL 16 via `pg` (parameterized queries)
- `node-pg-migrate` for migrations
- Zod-validated env config
- Pino request logging with request IDs
- Jest + Supertest, ≥80% coverage on config & middleware

## Setup

```bash
npm install
cp .env.example .env       # fill in your local Postgres credentials
```

### Database

Use your local PostgreSQL 16, or the provided docker-compose:

```bash
docker compose up -d
```

Create the databases:

```sql
CREATE DATABASE hrms_dev;
CREATE DATABASE hrms_test;
```

Run migrations:

```bash
npm run migrate
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile to `dist/` |
| `npm run test` | Run Jest tests |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run migrate` | Run pending migrations |
| `npm run seed` | Seed roles + leave types |

## Health check

`GET /api/health` → `{ "status": "ok", "database": "up" }`
