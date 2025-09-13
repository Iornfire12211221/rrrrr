FROM node:20-alpine

WORKDIR /app

# Install bun and static file server (use npx for Expo CLI to avoid PATH issues)
RUN npm install -g bun serve

# Copy package files first for better caching
COPY package.json bun.lock* ./
RUN bun install

# Copy source code
COPY . .

# Set environment for production
ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1

# Build static web app (Expo SDK 53 exports to ./dist by default)
RUN npx expo export --platform web

EXPOSE 8081

# Serve the built files
CMD ["serve", "-s", "dist", "-l", "tcp://0.0.0.0:8081"]