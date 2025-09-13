import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { serveStatic } from "hono/serve-static";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";
import type { Context, Env } from "hono";

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

// Health check endpoint for Docker
api.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Mount API at /api
app.route("/api", api);

// Helper to build serveStatic options for Node
function nodeServeStaticOptions(rootDir: string, filePath?: string) {
  return {
    root: rootDir,
    path: filePath,
    // Hono Node runtime needs getContent to be defined when using serve-static
    async getContent(relPath: string, _c: Context<Env>) {
      const resolved = filePath ? path.join(process.cwd(), rootDir, filePath) : path.join(process.cwd(), rootDir, relPath);
      try {
        const statOk = fs.existsSync(resolved) && fs.statSync(resolved).isFile();
        if (!statOk) return null;
        const data = await fs.promises.readFile(resolved);
        const ext = path.extname(resolved);
        const mime = ext === '.html' ? 'text/html; charset=utf-8'
          : ext === '.js' ? 'application/javascript; charset=utf-8'
          : ext === '.css' ? 'text/css; charset=utf-8'
          : ext === '.json' ? 'application/json; charset=utf-8'
          : ext === '.png' ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
          : ext === '.svg' ? 'image/svg+xml'
          : undefined;
        return new Response(data, { headers: mime ? { 'Content-Type': mime } : undefined });
      } catch (e) {
        console.error('Static getContent error for', resolved, e);
        return null;
      }
    },
    join: (...paths: string[]) => path.join(...paths),
    pathResolve: (p: string) => path.resolve(p),
    isDir: (p: string) => {
      try {
        return fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    },
  } as const satisfies Parameters<typeof serveStatic<Env>>[0];
}

// Serve static files from dist directory (for production)
if (process.env.NODE_ENV === "production") {
  console.log("Production mode: serving static files from ./dist");
  const distPath = path.join(process.cwd(), 'dist');
  console.log('Checking dist directory:', distPath);
  let distExists = false;
  try {
    distExists = fs.existsSync(distPath);
    console.log('Dist directory exists:', distExists);
    if (distExists) {
      const files = fs.readdirSync(distPath);
      console.log('Files in dist:', files);
      const indexExists = fs.existsSync(path.join(distPath, 'index.html'));
      console.log('index.html exists:', indexExists);
    }
  } catch (error) {
    console.error('Error checking dist directory:', error);
  }
  // Health check endpoint at root level
  app.get("/health", (c) => {
    return c.json({ status: "healthy", timestamp: new Date().toISOString() });
  });
  if (distExists) {
    // Static assets
    app.use("/_expo/*", serveStatic(nodeServeStaticOptions("./dist")));
    app.use("/assets/*", serveStatic(nodeServeStaticOptions("./dist")));
    app.use("/favicon.ico", serveStatic(nodeServeStaticOptions("./dist", "favicon.ico")));
    // SPA fallback
    app.get("/*", serveStatic(nodeServeStaticOptions("./dist", "index.html")));
  } else {
    console.warn('dist directory not found. Serving minimal online page.');
    app.get("/", (c) => c.text("Server is running. Build not found.", 200));
    app.get("/*", (c) => c.text("Server is running. Build not found.", 200));
  }
} else {
  // Development mode - just serve API
  app.get("/", (c) => {
    return c.json({ status: "ok", message: "Development server running" });
  });
  
  // Health check endpoint for development
  app.get("/health", (c) => {
    return c.json({ status: "healthy", timestamp: new Date().toISOString() });
  });
}

// Start server
const port = process.env.PORT || 8081;
console.log(`Starting server on port ${port}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log(`Current working directory: ${process.cwd()}`);

serve({
  fetch: app.fetch,
  port: Number(port),
  hostname: '0.0.0.0', // Bind to all interfaces
}, (info) => {
  console.log(`✅ Server successfully started on http://0.0.0.0:${info.port}`);
  console.log(`🔗 Health check available at: http://0.0.0.0:${info.port}/health`);
  console.log(`🌐 API available at: http://0.0.0.0:${info.port}/api`);
  console.log(`📱 Ready for Telegram Mini App at: https://24dps.ru`);
});

export default app;