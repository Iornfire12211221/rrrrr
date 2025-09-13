FROM node:20-alpine

# System deps
RUN apk add --no-cache bash curl libc6-compat

WORKDIR /app

# Install Bun runtime
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun /opt/bun && \
    ln -s /opt/bun/bin/bun /usr/local/bin/bun

# Copy package files
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install

# Copy source code
COPY . .

# Environment
ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1
ENV EXPO_NO_TELEMETRY=1
ENV EXPO_NON_INTERACTIVE=1
ENV PORT=8081

# Build web app
RUN npx expo export --platform web

EXPOSE 8081

# Start server
CMD ["bun", "run", "backend/hono.ts"]