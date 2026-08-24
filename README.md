# CareFlow Web

React operations console for CareFlow Service Operations, a field-service work-order and SLA tracking platform.

## Implemented starter scope

- Operational dashboard with open, overdue, unassigned, and critical metrics
- Status-distribution summary and recent-priority queue
- Work-order search, status/priority filters, paging, and responsive table
- Work-order creation with site-dependent asset options and client-side feedback
- Detail view with SLA state, assignment, controlled status transitions, and an audit timeline
- Shared API error handling, reusable status/priority components, loading/empty/error states, and responsive styling
- Vitest and Testing Library starter tests

## Technology baseline

- Node.js 24 LTS (recommended)
- React 19.2
- React Router
- Vite 8.2
- Vitest, Testing Library, ESLint

Exact resolved package versions are recorded in `package-lock.json`.

## Local setup with VS Code

1. Install Node.js 24 LTS. If you use `nvm`, run `nvm use` in this folder.
2. Open this `careflow-web` folder in VS Code.
3. Install the extensions recommended in `.vscode/extensions.json` when prompted.
4. Copy `.env.example` to `.env` only if you need to change the API URL.
5. Ensure a compatible CareFlow API is reachable. For local development it normally runs on `http://localhost:8080`.

## Commands

```powershell
# Install exact dependencies from the lock file
npm ci

# Start Vite at http://localhost:5173
npm run dev

# Run unit/component tests
npm test

# Run ESLint
npm run lint

# Create a production bundle
npm run build

# Preview the production bundle
npm run preview
```

For the first install without a lock file, use `npm install`; this starter already includes a lock file after generation.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080/api/v1` | CareFlow REST API base URL |

Do not place secrets in `VITE_` variables: Vite exposes them to browser code.

## Source layout

- `src/api` — HTTP client and Problem Details mapping
- `src/components` — application shell and reusable UI components
- `src/hooks` — async-loading helper
- `src/pages` — routed dashboard and work-order workflows
- `src/utils` — display and SLA helpers
- `src/test` — shared test setup

## Repository independence

This folder is a complete frontend repository. It can be cloned, tested, built, released, and hosted without files from the backend repository. Only a compatible API URL is required at runtime/build time.

See `Docs/INTEGRATION.md` for the API boundary and `Docs/BACKLOG.md` for the frontend delivery roadmap.
