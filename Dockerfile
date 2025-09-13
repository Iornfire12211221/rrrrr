FROM node:20-alpine

WORKDIR /app

# Install bun and expo CLI
RUN npm install -g bun @expo/cli serve

# Copy package files
COPY package.json bun.lock* ./
RUN bun install

# Copy source code
COPY . .

# Set environment for production
ENV NODE_ENV=production
ENV EXPO_USE_FAST_RESOLVER=1

# Build the web app using Metro bundler
RUN npx expo export --platform web

EXPOSE 8081

# Serve the built files
CMD ["npx", "serve", "dist", "-s", "-p", "8081"]