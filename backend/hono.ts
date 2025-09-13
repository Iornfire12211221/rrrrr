import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { serve } from "@hono/node-server";

// Create main app
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// API routes
const api = new Hono();

// Mount tRPC router at /trpc
api.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Simple health check endpoint
api.get("/", (c) => {
  return c.json({ status: "ok", message: "API is running" });
});

// Mount API at /api
app.route("/api", api);

// Serve static files from dist directory (for production)
if (process.env.NODE_ENV === "production") {
  // Serve static assets
  app.use("/_expo/*", serveStatic({ root: "./dist" }));
  app.use("/favicon.ico", serveStatic({ path: "./dist/favicon.ico" }));
  
  // Serve index.html for all other routes (SPA fallback)
  app.get("*", serveStatic({ path: "./dist/index.html" }));
} else {
  // Development mode - just serve API
  app.get("/", (c) => {
    return c.json({ status: "ok", message: "Development server running" });
  });
}

// Start server
const port = process.env.PORT || 8081;
console.log(`Server running on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});

export default app;