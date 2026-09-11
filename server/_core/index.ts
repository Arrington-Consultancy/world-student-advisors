import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { legacyRedirects } from "./legacyRedirects";
import { serveStatic, setupVite } from "./vite";
import { registerGoogleAuthRoutes } from "../portal-google-auth";
import { registerPipedriveOAuthRoutes } from "../crm/pipedriveOAuthRoutes";
import { warmPipedriveOAuth } from "../crm/pipedriveOAuth";
import { registerDriveMirrorRoutes } from "../mirror/driveMirrorRoutes";
import { startMirrorScheduler } from "../mirror/scheduler";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // Google OAuth routes for Student Portal sign-in
  registerGoogleAuthRoutes(app);
  // WSA Pipedrive OAuth application: the consent redirect for the workforce's read-only CRM credential.
  registerPipedriveOAuthRoutes(app);
  // WSA AI Reporting Mirror: the Google Drive consent redirect (drive.file only).
  registerDriveMirrorRoutes(app);
  // Legacy Squarespace-slug 301s must run before the SPA/static handling
  // below, so a redirect always wins outright instead of ever falling
  // through to a 404 or chaining through another handler first.
  legacyRedirects(app);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
  // Establish the WSA Pipedrive OAuth grant state so the connector gate,
  // which checks state synchronously, does not refuse the first request.
  void warmPipedriveOAuth().then(status => console.log(`[Pipedrive OAuth] Grant state at start: ${status}`));
  // Reporting mirror: hourly, skips itself while unconfigured.
  startMirrorScheduler();
}

startServer().catch(console.error);
