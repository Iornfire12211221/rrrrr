#!/bin/bash
set -e

echo "Building web app..."
npx expo export --platform web

echo "Build completed successfully!"
echo "Starting server..."
bun run backend/hono.ts