import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import fs from "fs";
import path from "path";

const app = new Hono();

// Enable CORS
app.use("*", cors());

// Health check endpoints
app.get("/health", (c) => {
  console.log('✅ Health check requested');
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/ping", (c) => {
  console.log('🏓 Ping requested');
  return c.text("pong", 200);
});

app.get("/status", (c) => {
  console.log('📊 Status requested');
  return c.text("OK", 200);
});

// HEAD requests for health checks
app.on("HEAD", "/", (c) => {
  console.log('👤 HEAD / requested');
  return c.text("", 200);
});

app.on("HEAD", "/health", (c) => {
  console.log('👤 HEAD /health requested');
  return c.text("", 200);
});

// API routes
const api = new Hono();
api.get("/", (c) => c.json({ status: "ok", message: "API online" }));
api.get("/health", (c) => c.json({ status: "healthy" }));
api.all("/*", (c) => c.json({ status: "ok" }));
app.route("/api", api);

// Static file serving
const distPath = path.join(process.cwd(), 'dist');
const indexPath = path.join(distPath, 'index.html');

console.log(`🔍 Checking for dist at: ${distPath}`);
console.log(`📄 Index file at: ${indexPath}`);

let indexContent = "";
try {
  if (fs.existsSync(indexPath)) {
    indexContent = fs.readFileSync(indexPath, 'utf-8');
    console.log(`✅ Found index.html (${indexContent.length} bytes)`);
  } else {
    console.log(`❌ index.html not found`);
    indexContent = `<!DOCTYPE html>
<html>
<head>
  <title>Kingisepp DPS App</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
    <h1>🚀 Kingisepp DPS App</h1>
    <p>Server is running but web app is not built yet.</p>
    <p>Status: OK</p>
  </div>
</body>
</html>`;
  }
} catch (e) {
  console.error(`❌ Error reading index.html:`, e);
  indexContent = "<html><body><h1>Error loading app</h1></body></html>";
}

// Root route
app.get("/", (c) => {
  console.log('🏠 Root requested');
  return c.html(indexContent);
});

// Catch all other routes
app.get("/*", (c) => {
  console.log(`📝 Route requested: ${c.req.path}`);
  return c.html(indexContent);
});

// Start server
const port = process.env.PORT || 8081;
console.log(`🚀 Starting simple Kingisepp DPS server...`);
console.log(`📍 Port: ${port}`);
console.log(`🌍 Environment: ${process.env.NODE_ENV}`);

serve({
  fetch: app.fetch,
  port: Number(port),
  hostname: '0.0.0.0',
}, (info) => {
  console.log(`✅ Server running on http://0.0.0.0:${info.port}`);
  console.log(`💚 Health: http://0.0.0.0:${info.port}/health`);
  console.log(`🏓 Ping: http://0.0.0.0:${info.port}/ping`);
});

export default app;