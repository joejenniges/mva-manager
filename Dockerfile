# Stage 1: Build client
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# WHY: Vite inlines VITE_* env vars at build time via import.meta.env.
# Must be available as an env var during `npm run build`, not at runtime.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ARG VITE_COMMIT_HASH
ENV VITE_COMMIT_HASH=$VITE_COMMIT_HASH
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
COPY drizzle/ drizzle/
RUN npx tsc

# Stage 3: Production
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=server-build /app/dist ./dist
COPY --from=server-build /app/drizzle ./drizzle
COPY --from=client-build /app/client/dist ./client/dist

# Uploads directory
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 3100

CMD ["node", "dist/index.js"]
