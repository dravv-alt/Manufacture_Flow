# Deployment

The supported Vercel + Railway layout has one Vercel frontend and two Railway API services built from the same backend source:

- `live-api`: `APP_RUNTIME=live`, connected to the live database.
- `demo-api`: `APP_RUNTIME=demo`, connected to an isolated demo database.

The demo API is required when the deployed UI must support the saved interactive simulation. It is the production replacement for the local `http://localhost:3002` demo server. Never put a localhost URL in a Vercel environment variable.

## Vercel frontend variables

Set these as Vercel environment variables for Preview and Production as appropriate:

```text
NEXT_PUBLIC_OPERATIONS_MODE=backend
NEXT_PUBLIC_API_BASE_URL=https://<live-api-domain>
NEXT_PUBLIC_LIVE_API_BASE_URL=https://<live-api-domain>
NEXT_PUBLIC_DEMO_API_BASE_URL=https://<demo-api-domain>
```

`NEXT_PUBLIC_API_BASE_URL` is retained as the compatibility fallback. The explicit live and demo variables are recommended because the UI switches API targets when the user enters or exits Demo Mode. Do not put `DATABASE_URL`, database credentials, or backend-only secrets in Vercel.

The repository root is the Vercel project root. The checked-in `vercel.json` builds only `frontend/` and points Vercel at `frontend/.next`; do not override the Output Directory back to `.next`. The backend is built and deployed separately through Railway. Set `FRONTEND_ORIGIN` to the exact Vercel origin, without a path or trailing slash. Multiple production/preview origins may be comma-separated.

## Railway API services

Create two Railway services from this repository. Use the repository root as the build context and `backend/Dockerfile` as the Dockerfile so both services use the same tested runtime image. Give each service its own public HTTPS domain.

Both services need `LIVE_DATABASE_URL`, `DEMO_DATABASE_URL`, and `FRONTEND_ORIGIN`. The two database URLs must not resolve to the same database; the backend rejects that configuration to prevent demo resets from touching live data.

Live service:

```text
APP_RUNTIME=live
DATABASE_URL=<live-database-url>
LIVE_DATABASE_URL=<live-database-url>
DEMO_DATABASE_URL=<isolated-demo-database-url>
FRONTEND_ORIGIN=https://<vercel-frontend-domain>
TELEMETRY_INGEST_API_KEY=<long-random-secret>
```

Demo service:

```text
APP_RUNTIME=demo
DATABASE_URL=<isolated-demo-database-url>
LIVE_DATABASE_URL=<live-database-url>
DEMO_DATABASE_URL=<isolated-demo-database-url>
FRONTEND_ORIGIN=https://<vercel-frontend-domain>
TELEMETRY_INGEST_API_KEY=<long-random-secret>
```

Run migrations independently for each database before opening traffic. Railway runs Linux commands, so use the POSIX form rather than the Windows-oriented npm wrapper scripts:

```text
APP_RUNTIME=live sh -c 'cd backend && npx drizzle-kit migrate'
APP_RUNTIME=demo sh -c 'cd backend && npx drizzle-kit migrate'
```

After the demo service is healthy, open Demo Mode once and use its reset control to seed the isolated demo scenario. Confirm that the demo service health endpoint reports `mode: demo` and that its database is not the live database.

## Local Docker Compose

The production Compose file runs one backend runtime at a time and defaults to live mode. Build first and migrate before sending traffic:

```text
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d db
docker compose -f docker-compose.production.yml run --rm backend sh -c "cd backend && npx drizzle-kit migrate"
docker compose -f docker-compose.production.yml up -d backend frontend
```

Set `APP_RUNTIME=demo` and the demo database variables when using the same Compose stack as a local demo backend. Do not expose that local service as the public production demo API unless it has a separately managed database and secret set.

## Verification checklist

Verify `GET /api/health` on both Railway domains. The live service must report live mode and the demo service must report demo mode. Then verify Vercel can sign in, enter Demo Mode, reset the demo scenario, trigger demo telemetry, exit Demo Mode, and perform one permitted live workflow action. Check audit history and notification delivery history after each workflow.

If Docker BuildKit reports `invalid file request Dockerfile` from a Windows OneDrive checkout, use a normal local or WSL filesystem clone for the build. This is a host reparse-point limitation observed during local validation, not an application configuration error.

Before an external deployment, replace local demo accounts/passwords with the approved identity provider and managed database credentials. The demo backend remains a simulated workflow: it does not represent verified live machinery telemetry or send real carrier/customer communications.
