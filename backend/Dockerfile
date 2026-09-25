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
USER node
EXPOSE 3001
CMD ["node", "backend/server.js"]
