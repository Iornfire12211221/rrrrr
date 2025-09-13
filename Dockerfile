FROM node:20-alpine

RUN apk add --no-cache bash curl libc6-compat
WORKDIR /app

# Install deps with npm (simpler, no Bun)
COPY package.json ./
RUN npm i --no-audit --no-fund --legacy-peer-deps

# Copy source
COPY . .

ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NON_INTERACTIVE=1
ENV PORT=8081

# Build static web once at build time
RUN npx expo export --platform web

# Optional debug
RUN ls -la ./dist/ || true

EXPOSE 8081

# Start minimal server
CMD ["node", "backend/server.mjs"]