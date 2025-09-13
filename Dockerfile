FROM node:20-alpine

# System deps for some node modules (sharp, etc.)
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install bun globally
RUN npm install -g bun

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

# Build static web app (Expo SDK 53 exports to ./dist by default)
RUN npx expo export --platform web

EXPOSE 8081

# Start the backend server (which serves both API and web files)
CMD ["bun", "run", "backend/hono.ts"]