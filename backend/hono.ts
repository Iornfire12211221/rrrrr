import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/serve-static";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";
import type { Context, Env } from "hono";

// Create main app
const app = new Hono();

// Enable CORS for all routes
app.use("*", cors());

// Minimal API routes to avoid 404s from the frontend
const api = new Hono();
api.get("/", (c) => c.json({ status: "ok", message: "API online" }));
api.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));
api.all("/*", (c) => c.json({ status: "ok" }));
app.route("/api", api);

// Health check endpoints for hosting providers
app.get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));
app.get("/", (c) => c.json({ status: "ok", message: "Kingisepp DPS App" }));

// Always respond 200 to HEAD probes (hosting health checks)
app.on("HEAD", "/", (c) => c.text("", 200));
app.on("HEAD", "/health", (c) => c.text("", 200));
app.on("HEAD", "/*", (c) => c.text("", 200));

// Helper to build serveStatic options for Node
function nodeServeStaticOptions(rootDir: string, filePath?: string) {
  return {
    root: rootDir,
    path: filePath,
    async getContent(relPath: string, _c: Context<Env>) {
      const safeRel = typeof relPath === 'string' ? relPath.trim() : '';
      const resolved = filePath
        ? path.join(process.cwd(), rootDir, filePath)
        : path.join(process.cwd(), rootDir, safeRel);
      try {
        const statOk = fs.existsSync(resolved) && fs.statSync(resolved).isFile();
        if (!statOk) return null;
        const data = await fs.promises.readFile(resolved);
        const ext = path.extname(resolved).toLowerCase();
        const mime = ext === '.html' ? 'text/html; charset=utf-8'
          : ext === '.js' ? 'application/javascript; charset=utf-8'
          : ext === '.css' ? 'text/css; charset=utf-8'
          : ext === '.json' ? 'application/json; charset=utf-8'
          : ext === '.png' ? 'image/png'
          : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg'
          : ext === '.svg' ? 'image/svg+xml'
          : ext === '.ico' ? 'image/x-icon'
          : undefined;
        return new Response(data, { headers: mime ? { 'Content-Type': mime } : undefined });
      } catch (e) {
        console.error('Static getContent error for', resolved, e);
        return null;
      }
    },
    join: (...paths: string[]) => path.join(...paths),
    pathResolve: (p: string) => path.resolve(typeof p === 'string' && p ? p : '.'),
    isDir: (p: string) => {
      try {
        return !!p && fs.existsSync(p) && fs.statSync(p).isDirectory();
      } catch {
        return false;
      }
    },
  } as const satisfies Parameters<typeof serveStatic<Env>>[0];
}

// Serve static files from dist directory (for production)
if (process.env.NODE_ENV === "production") {
  const distPath = path.join(process.cwd(), 'dist');
  let distExists = false;
  try {
    distExists = fs.existsSync(distPath);
  } catch {}
  
  if (distExists) {
    console.log(`✅ Found dist directory at: ${distPath}`);
    app.use("/_expo/*", serveStatic(nodeServeStaticOptions("./dist")));
    app.use("/assets/*", serveStatic(nodeServeStaticOptions("./dist")));
    app.use("/favicon.ico", serveStatic(nodeServeStaticOptions("./dist", "favicon.ico")));
    app.get("/*", serveStatic(nodeServeStaticOptions("./dist", "index.html")));
  } else {
    console.log(`❌ Dist directory not found at: ${distPath}`);
    app.get("/*", (c) => c.text("App is starting...", 200));
  }
}

// Start server
const port = process.env.PORT || 8081;
console.log(`🚀 Starting Kingisepp DPS server...`);
console.log(`📍 Port: ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
console.log(`📁 Working directory: ${process.cwd()}`);

serve({
  fetch: app.fetch,
  port: Number(port),
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`✅ Server running on http://0.0.0.0:${info.port}`);
  console.log(`💚 Health: http://0.0.0.0:${info.port}/health`);
  console.log(`🔗 API: http://0.0.0.0:${info.port}/api`);
});

export default app;