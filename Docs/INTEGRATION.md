# CareFlow Web Integration Guide

## API configuration

Set `VITE_API_BASE_URL` before starting or building the application:

```powershell
Copy-Item .env.example .env
```

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

The variable is compiled into browser code. It must contain only a public API URL, never credentials or secrets.

## Required API capabilities

- `GET /dashboard/summary`
- Work-order list, detail, create, assignment, status, and history endpoints
- Site, site-asset, and technician reference endpoints
- ISO-8601 offset timestamps
- JSON Problem Details for validation and business failures
- CORS permission for the hosted frontend origin

The full starter contract is documented in the backend repository at `Docs/API_CONTRACT.md`.

## Independent release model

The web application and API should use separate release tags and deployment pipelines. A frontend release can point to local, test, staging, or production API environments through environment-specific builds. Breaking API changes require a coordinated compatibility plan rather than identical repository versions.

## Before the first remote push

1. Run `npm ci`, `npm run lint`, `npm test`, and `npm run build`.
2. Check that `.env`, `node_modules`, `dist`, coverage, and editor-local files are ignored.
3. Keep `package-lock.json` committed for repeatable installations.
4. Verify the app against a running API and test CORS from `http://localhost:5173`.

