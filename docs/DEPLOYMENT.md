# Deployment

Production requires a public frontend URL and a public API URL (or a reverse proxy that exposes `/api` on the frontend domain). Never use the Docker hostname `backend` as `NEXT_PUBLIC_API_BASE_URL`: browsers cannot resolve it.

1. Copy `backend/.env.example` values into a secret store; replace all local credentials.
2. Set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `LIVE_DATABASE_URL`, `DEMO_DATABASE_URL`, `FRONTEND_ORIGIN`, `NEXT_PUBLIC_API_BASE_URL`, and `NEXT_PUBLIC_OPERATIONS_MODE=backend` in a production secret store. `NEXT_PUBLIC_API_BASE_URL` must be the public Railway URL when the frontend is hosted on Vercel.
3. Apply the complete migration lineage to the target database: `npm run db:migrate:live` (and `npm run db:migrate:demo` only for a separately deployed demo database), then run `npm run db:parity`.
4. Build and start: `docker compose -f docker-compose.production.yml up -d --build`. The frontend waits for the backend health check before starting.
5. Verify `GET /api/health`, sign-in, one permitted workflow action, the audit panel, and notification delivery history.

For Vercel + Railway, deploy only `frontend` to Vercel and `backend` to Railway. On Vercel set `NEXT_PUBLIC_API_BASE_URL` to the Railway HTTPS URL and `NEXT_PUBLIC_OPERATIONS_MODE=backend`; do not set it to `localhost` or `backend`. On Railway set the backend runtime/database variables and run migrations as a release or one-time deployment command before sending traffic.

Before an external deployment, replace the local demo accounts/password with the approved identity provider and managed database credentials.
