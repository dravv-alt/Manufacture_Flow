# Machine Overwatch

Machine Overwatch is a local manufacturing-operations application. It combines
the Next.js interface, route-handler API, PostgreSQL persistence, Drizzle
migrations, and controlled demo data in one project.

## Start locally

1. Start Docker Desktop.
2. From this directory, run `./run-project.bat` in PowerShell, or double-click
   `run-project.bat`.
3. Open [http://localhost:3000](http://localhost:3000).

The launcher starts PostgreSQL on port 5434, applies migrations, seeds the
controlled scenario, and starts the app. The demo mode data source remains the
default unless it is deliberately changed in `.env.local`.

## Project map

| Location | Purpose |
| --- | --- |
| `src/app/` | Pages and route-handler APIs |
| `src/components/` | Reusable UI and workspace components |
| `src/contexts/` | Client application state providers |
| `src/domain/` | Domain types and rules |
| `src/lib/` | Database, authentication, and operations services |
| `src/demo-data/` | Explicit controlled-demo fixtures and provider |
| `drizzle/` | Generated database migrations |
| `scripts/` | Database seed and project checks |
| `e2e/` | Playwright flows |
| `public/` | Models, images, and static reference scenes |
| `docs/` | Setup and implementation/audit documentation |
| `archive/legacy-ui/` | Historical UI snapshots; not application source |

## Useful commands

```powershell
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev
npm run typecheck
npm run test
```

See [docs/BACKEND_SETUP.md](docs/BACKEND_SETUP.md) for the backend contract and
local demo accounts, and [docs/README.md](docs/README.md) for the documentation
index.
