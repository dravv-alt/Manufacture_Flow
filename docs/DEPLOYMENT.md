# Deployment

Production requires a public frontend URL and a public API URL (or a reverse proxy that exposes `/api` on the frontend domain). Never use the Docker hostname `backend` as `NEXT_PUBLIC_API_BASE_URL`: browsers cannot resolve it.

1. Copy `backend/.env.example` values into a secret store; replace all local credentials.
2. Set `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `FRONTEND_ORIGIN`, and `NEXT_PUBLIC_API_BASE_URL` in a production `.env` file that is not committed.
3. Apply migrations once: `npm run db:migrate` with the production `DATABASE_URL`.
4. Build and start: `docker compose -f docker-compose.production.yml up -d --build`.
5. Verify `GET /api/health`, sign-in, one permitted workflow action, the audit panel, and notification delivery history.

Before an external deployment, replace the local demo accounts/password with the approved identity provider and managed database credentials.
