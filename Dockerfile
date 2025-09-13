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

# Debug: Check if dist was created
RUN ls -la ./dist/ || echo "dist directory not found"
RUN ls -la ./dist/_expo/ || echo "_expo directory not found"
RUN sh -c "[ -f ./dist/index.html ] && head -20 ./dist/index.html || echo 'index.html not found'"

EXPOSE 8081

# Create startup script
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'echo "🚀 Starting Kingisepp DPS App..."' >> /app/start.sh && \
    echo 'echo "📁 Working directory: $(pwd)"' >> /app/start.sh && \
    echo 'echo "🔍 Checking dist directory..."' >> /app/start.sh && \
    echo 'ls -la ./dist/ 2>/dev/null || echo "❌ No dist directory"' >> /app/start.sh && \
    echo 'echo "🌐 Starting simple server on port 8081..."' >> /app/start.sh && \
    echo 'node --version' >> /app/start.sh && \
    echo 'bun --version || true' >> /app/start.sh && \
    echo 'echo "🔎 Health check: curl -s http://127.0.0.1:8081/health || true"' >> /app/start.sh && \
    echo 'exec node backend/server.mjs' >> /app/start.sh && \
    chmod +x /app/start.sh

# Start server
CMD ["/app/start.sh"]