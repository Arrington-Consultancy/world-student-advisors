import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";
import { isValidClientRoute } from "../../shared/routes";
import { getCanonicalUrl, getSeoForPath, shouldNoindex } from "../../shared/seo";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function injectSeoMeta(html: string, path: string): string {
  const { title, description } = getSeoForPath(path);
  const canonical = getCanonicalUrl(path);
  const robots = shouldNoindex(path) ? "noindex, nofollow" : "index, follow";
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description);
  const escapedCanonical = escapeHtml(canonical);

  return html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapedTitle}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapedDescription}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${robots}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapedCanonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapedTitle}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapedDescription}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapedTitle}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapedDescription}" />`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  // app.get, not app.use — app.use("*", ...) mounts a sub-router at the
  // matched path, which resets req.path to "/" inside the handler (a real
  // Express 4 gotcha). app.get("*", ...) is a route match, not a mount, so
  // req.path stays the actual requested path — required for the 200/404
  // check below to see the real path instead of always seeing "/".
  app.get("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = injectSeoMeta(await vite.transformIndexHtml(url, template), req.path);
      // Real 404s for unknown paths, even though the SPA shell (and its own
      // NotFound UI) still renders either way — see shared/routes.ts.
      const status = isValidClientRoute(req.path) ? 200 : 404;
      res.status(status).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

/** distPathOverride is test-only — production always uses the auto-detected path. */
export function serveStatic(app: Express, distPathOverride?: string) {
  const distPath =
    distPathOverride ??
    (process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public"));
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // Fall through to the SPA shell for any request express.static didn't
  // serve a real file for. Known client routes (shared/routes.ts) get a
  // real 200; anything else — a typo'd path, a dead link, a legacy URL
  // with no redirect — gets a real 404. The response body is identical
  // either way (the SPA still boots and renders its own NotFound UI for
  // the 404 case), but the HTTP status now tells crawlers the truth
  // instead of always reporting 200 (the exact "Soft 404" pattern Google
  // Search Console flags).
  //
  // app.get, not app.use — app.use("*", ...) mounts a sub-router at the
  // matched path, which resets req.path to "/" inside the handler (a real
  // Express 4 gotcha) — every request would then see req.path === "/" and
  // always match the homepage, defeating this check entirely. app.get
  // is a route match, not a mount, so req.path stays the real path.
  app.get("*", (req, res) => {
    const status = isValidClientRoute(req.path) ? 200 : 404;
    fs.promises
      .readFile(path.resolve(distPath, "index.html"), "utf-8")
      .then(template => {
        res
          .status(status)
          .set({ "Content-Type": "text/html" })
          .end(injectSeoMeta(template, req.path));
      })
      .catch(() => {
        res.status(status).sendFile(path.resolve(distPath, "index.html"));
      });
  });
}
