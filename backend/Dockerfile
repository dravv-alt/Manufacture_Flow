FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY backend ./backend
RUN npm --prefix backend run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3001
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/.next/standalone ./
COPY --from=build /app/backend/.next/static ./backend/.next/static
COPY --from=build /app/backend/drizzle ./backend/drizzle
COPY --from=build /app/backend/drizzle.config.ts ./backend/drizzle.config.ts
# Drizzle Kit loads these source modules when the release migration command
# runs inside the runtime image.
COPY --from=build /app/backend/src/lib/runtime ./backend/src/lib/runtime
COPY --from=build /app/backend/src/lib/db/schema.ts ./backend/src/lib/db/schema.ts
# Keep the one-time live seed available in the Railway console. The seed
# imports only backend library modules and is never executed by the server.
COPY --from=build /app/backend/scripts/seed-db.ts ./backend/scripts/seed-db.ts
COPY --from=build /app/backend/src/lib ./backend/src/lib
COPY --from=build /app/backend/tsconfig.json ./backend/tsconfig.json
USER node
EXPOSE 3001
CMD ["node", "backend/server.js"]
