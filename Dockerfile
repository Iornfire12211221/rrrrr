FROM node:20-alpine

# System deps for some node modules (sharp, etc.)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install bun and serve globally
RUN npm install -g bun serve

# Copy package files first for better caching
COPY package.json bun.lock* ./
RUN bun install

# Copy source code
COPY . .

# Environment
ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NON_INTERACTIVE=1
ENV PORT=8081

# Build static web app
RUN npx expo export --platform web

# Debug: List contents of dist directory
RUN ls -la ./dist/ || echo "dist directory not found"
RUN ls -la ./dist/_expo/ || echo "_expo directory not found"
RUN cat ./dist/index.html | head -20 || echo "index.html not found"

# Install curl for health checks
RUN apk add --no-cache curl

EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

# Start the backend server with explicit port binding
CMD ["bun", "run", "backend/hono.ts"]