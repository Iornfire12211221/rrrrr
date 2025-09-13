#!/bin/bash

echo "Starting local development server..."

# Build the web app first
echo "Building web app..."
npx expo export --platform web

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "Build successful! Starting server..."
    NODE_ENV=production bun run backend/hono.ts
else
    echo "Build failed!"
    exit 1
fi