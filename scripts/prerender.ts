/**
 * Build-time prerender pass. Runs after `vite build` (see package.json's
 * "build" script) and before the server bundle is built. For every route in
 * ALL_PRERENDER_ROUTES, it renders that page's real initial HTML via
 * client/src/entry-server.tsx and writes it under
 * dist/public/__prerendered__, mirroring the route as a folder path
 * (shared/prerenderRoutes.ts's routeToPrerenderFile). server/_core/vite.ts
 * serves that file instead of the empty SPA shell for those routes; every
 * other route is completely unaffected.
 *
 * Uses Vite's own documented prerender pattern — a middleware-mode dev
 * server whose only job is `ssrLoadModule`, so route components resolve
 * through the exact same aliases and plugins (@/, @shared/, Tailwind, React)
 * the real app build already uses. No new dependency: this only needs
 * `vite` and `react-dom/server`, both already in the project.
 */
import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import viteConfig from "../vite.config";
import { ALL_PRERENDER_ROUTES, routeToPrerenderFile } from "../shared/prerenderRoutes";

const projectRoot = path.resolve(import.meta.dirname, "..");
const outDir = path.resolve(projectRoot, "dist/public");
const prerenderedDir = path.resolve(outDir, "__prerendered__");
// The *built* index.html (post "vite build"), not client/index.html — the
// source file's <script src="/src/main.tsx"> only resolves under Vite's dev
// server. The built file has the real hashed asset tags
// (server/_core/vite.ts's serveStatic reads this exact same file for every
// non-prerendered route, so this keeps both paths using identical asset
// references).
const templatePath = path.resolve(outDir, "index.html");

async function main() {
  if (!fs.existsSync(outDir)) {
    throw new Error(`Expected ${outDir} to exist — run "vite build" before this script.`);
  }
  const template = fs.readFileSync(templatePath, "utf-8");
  if (!template.includes('<div id="root"></div>')) {
    throw new Error(`client/index.html no longer contains the expected <div id="root"></div> shell — update this script's replacement to match.`);
  }

  const vite = await createServer({
    ...viteConfig,
    configFile: false,
    server: { middlewareMode: true },
    appType: "custom",
  });

  const failures: { route: string; error: unknown }[] = [];

  try {
    const { renderRoute } = await vite.ssrLoadModule("/src/entry-server.tsx");

    for (const route of ALL_PRERENDER_ROUTES) {
      try {
        const appHtml: string = renderRoute(route);
        const page = template.replace(
          '<div id="root"></div>',
          `<div id="root" data-prerendered="true">${appHtml}</div>`
        );

        const filePath = path.resolve(prerenderedDir, routeToPrerenderFile(route));
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, page, "utf-8");
        console.log(`[prerender] ${route} -> ${path.relative(outDir, filePath)}`);
      } catch (error) {
        failures.push({ route, error });
      }
    }
  } finally {
    await vite.close();
  }

  if (failures.length > 0) {
    console.error(`\n[prerender] ${failures.length} route(s) failed to prerender:`);
    for (const { route, error } of failures) {
      console.error(`\n--- ${route} ---`);
      console.error(error);
    }
    throw new Error("Prerender build step failed — see errors above.");
  }

  console.log(`\n[prerender] ${ALL_PRERENDER_ROUTES.length} routes prerendered successfully.`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
