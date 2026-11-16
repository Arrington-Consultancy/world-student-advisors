// Read-only. Answers Tom Arrington's question of 11 September 2026 about the
// production PIPEDRIVE_API_TOKEN without printing, rotating or regenerating
// it: which WSA user the token acts as, whether that user has the
// visibility a complete CRM mirror needs, and which other WSA admins exist.
// Three GETs. Prints names, emails, flags and permission names only. The
// token value never appears in output. Nothing is written.
const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";
const token = process.env.PIPEDRIVE_API_TOKEN;
if (!token) { console.error("PIPEDRIVE_API_TOKEN is not set in this environment."); process.exit(1); }

async function get(path) {
  const r = await fetch(`${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${token}`);
  const text = await r.text();
  if (!r.ok) throw new Error(`Pipedrive API error (${r.status}) on ${path}: ${text.replace(token, "[token]").slice(0, 200)}`);
  return JSON.parse(text);
}
const yn = v => (v === true || v === 1 ? "yes" : v === false || v === 0 ? "no" : String(v));

console.log("\n=== 1. Who the production PIPEDRIVE_API_TOKEN acts as (GET /users/me) ===");
const me = (await get("/users/me")).data;
console.log(`  name:            ${me.name}`);
console.log(`  email:           ${me.email}`);
console.log(`  user id:         ${me.id}`);
console.log(`  company:         ${me.company_name} (company id ${me.company_id}, domain ${me.company_domain})`);
console.log(`  active:          ${yn(me.active_flag)}`);
console.log(`  admin:           ${yn(me.is_admin)}`);
console.log(`  role id:         ${me.role_id ?? "(none)"}`);
console.log(`  last login:      ${me.last_login ?? "(unknown)"}`);
console.log(`  timezone:        ${me.timezone_name ?? "(unknown)"}`);

console.log("\n=== 2. That user's visibility-relevant permissions (GET /users/:id/permissions) ===");
try {
  const perms = (await get(`/users/${me.id}/permissions`)).data ?? {};
  const relevant = Object.entries(perms).filter(([k]) => /see|export|admin|visib|other_users|company/i.test(k));
  for (const [k, v] of relevant.sort()) console.log(`  ${k.padEnd(48)} ${yn(v)}`);
  if (relevant.length === 0) console.log("  (no visibility-shaped permission keys returned)");
} catch (e) { console.log(`  could not read permissions: ${String(e.message).slice(0, 160)}`); }

console.log("\n=== 3. Every user in the WSA company (GET /users), for credential separation ===");
const users = (await get("/users")).data ?? [];
for (const u of users) {
  const marker = u.id === me.id ? "  <- owns the website token" : "";
  console.log(`  ${String(u.id).padEnd(10)} ${String(u.name).padEnd(22)} ${String(u.email).padEnd(40)} active ${yn(u.active_flag).padEnd(4)} admin ${yn(u.is_admin).padEnd(4)} last login ${u.last_login ?? "(never)"}${marker}`);
}
console.log(`\n  ${users.length} users; ${users.filter(u => u.active_flag).length} active; ${users.filter(u => u.is_admin && u.active_flag).length} active admins.`);
console.log("\nNote: Pipedrive admins see every item regardless of visibility groups. A non-admin's reads are limited by the visibility settings of their permission set.");
