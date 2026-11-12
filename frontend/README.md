# HRMS Frontend

React 18 + TypeScript + Vite app for the HRMS project.

## Setup

```bash
npm install
npm run dev        # http://localhost:5173 (proxies /api to the backend on :3000)
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Typecheck and build for production |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run test` | Vitest unit and component tests |
| `npm run test:coverage` | Tests with coverage (threshold 80% on shared code) |

## Structure

```
src/
  components/ui/      shared UI (Button, Card, Table, Pagination, Modal, Toast)
  components/layout/  AppShell (sidebar, header, role-based nav)
  components/         ErrorBoundary
  features/           feature-specific UI (added per story)
  hooks/              useAuth
  pages/              routed pages (lazy-loaded)
  routes/             route table + ProtectedRoute guard
  services/           apiClient (Bearer token, refresh on 401), tokenStore
  query/              TanStack Query client
```

## Auth

The access token is kept in memory only. The refresh token is an httpOnly cookie set by the backend and is never read by the frontend.
