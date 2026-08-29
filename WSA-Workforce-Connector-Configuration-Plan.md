# WSA AI Workforce — Connector Configuration Plan

Status: technical requirements only. No credentials created, no permissions
requested from Microsoft or Google, no secrets exist yet. This exists so
the actual provisioning (an Azure AD/Entra admin action and a Google Cloud
Console action) can be requested and reviewed as a controlled step, not
guessed at or done silently.

The application code already reads the environment variables named below
and reports the connector as `unconfigured` until they exist, and
`permission_missing` even once they exist, until this document's testing
step has actually been carried out and the code updated to trust it. See
`server/workforce/connectors/sharepoint.ts` and `googleDrive.ts`.

## 1. SharePoint

SharePoint is WSA's permanent source of truth (Access Matrix section 1).
This deliberately does **not** reuse the existing Graph credentials in
`server/_core/graphMail.ts` — those were granted only the `Mail.Send`
application permission and prove nothing about file access.

### 1.1 Application setup

A distinct Azure AD (Entra) app registration, separate from the mail-send
app, so its permission footprint stays legible and independently
revocable. Application (not delegated) permissions, since workers act
without a signed-in human user.

### 1.2 Exact Graph permission

**`Sites.Selected`** — not `Sites.Read.All` or `Sites.ReadWrite.All`. This
is the least-privilege option: the app is granted no site access at all by
default, and a tenant admin then explicitly grants it read or write access
to exactly the WSASharePoint site (and no other SharePoint site in the
tenant) via a separate Graph API call. `Sites.Read.All`/`.ReadWrite.All`
would grant access to every SharePoint site in the WSA tenant, which is
far more than any worker's Access Matrix entry calls for.

### 1.3 Admin consent

Required twice: once for the app registration's `Sites.Selected`
permission itself (standard admin consent), and once more per Graph
site-permission grant (a tenant admin — or someone with Sites.FullControl
— calls `POST /sites/{siteId}/permissions` to actually grant the app read
or write access to the WSASharePoint site specifically).

### 1.4 Read/write separation

Graph's `Sites.Selected` model supports granting an app either a `read` or
a `write` role per site. Recommend granting **read only** initially, and
only adding the `write` grant once Maya's (SharePoint & Records Control)
brief is itself approved and Mandatory Material Write-Back's failure
handling has been tested end-to-end against a real (non-production) site
or folder. Folder-level scoping is not native to Graph application
permissions — that is enforced in this codebase's permission engine
(`worker.connectorIntent`/`connectorUseAuthorised`/`writesAuthorised`),
which must remain the actual enforcement point regardless of what the
Graph grant allows.

### 1.5 Environment variables required

- `SHAREPOINT_GRAPH_TENANT_ID`
- `SHAREPOINT_GRAPH_CLIENT_ID`
- `SHAREPOINT_GRAPH_CLIENT_SECRET`
- `SHAREPOINT_GRAPH_SITE_ID` — the WSASharePoint site's Graph site ID, not its URL

The code checks for the presence of all four before reporting anything
other than `unconfigured`; even then it reports `permission_missing` until
a real, verified call has been made (see 1.7).

### 1.6 Credential rotation

Azure AD client secrets expire; set a 6–12 month expiry, track it, and
rotate through Railway's environment variable settings — never commit a
secret to the repository or paste one into a worker prompt, log, or Staff
Portal field.

### 1.7 Health/connection testing

Before any worker's `connectorUseAuthorised` flag is changed from `false`,
a documented smoke test must actually succeed against the real site: a
read-only `GET /sites/{siteId}/drive/root` (or equivalent) call, run
manually or via a small script, with the result recorded. "Environment
variables are set" must never be treated as equivalent to "the connector
works" — see `getSharePointConnectorState()`'s `permission_missing`
fallback, which exists specifically to keep those two claims separate
until this test has actually been performed.

## 2. Google Drive

Explicitly secondary to SharePoint (Access Matrix section 1: "Google
Drive is not a second WSA source of truth"). Used only where a controlled
task genuinely depends on legacy website/marketing/migration evidence that
lives there (currently: Ethan's SEO evidence, per the Access Matrix).

### 2.1 Architecture: service account, not domain-wide delegation

Recommend a dedicated Google Cloud service account added as a **viewer**
member on one specific Shared Drive (or specific folders within My Drive,
shared explicitly to the service account's email address) — not
domain-wide delegation. Domain-wide delegation would let the service
account impersonate any user in the WSA Google Workspace and reach their
entire Drive, which is exactly the "whole-Drive access by default" this
platform must not have. A scoped Shared Drive membership means the service
account can only ever see what it was explicitly added to, which is a
real access boundary — not just a code-level filter.

### 2.2 Exact scopes

`https://www.googleapis.com/auth/drive.readonly` only. No write scope
until/unless a worker's approved brief specifically requires a Drive
write, which none currently do (every worker's Access Matrix entry is
either "None by default" or read-only for Drive).

### 2.3 Folder/file scoping — two independent layers

1. **Google-side**: the service account is only shared into the specific
   WSA-relevant Shared Drive/folders (e.g. legacy website/SEO evidence) —
   never the whole Workspace.
2. **Code-side**: `WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS` — a comma-separated
   allowlist checked by `isDriveFolderAuthorised()` in
   `server/workforce/connectors/googleDrive.ts`, which fails closed (empty
   allowlist = nothing authorised) if unset.

Both layers exist so a Google-side sharing mistake and a code-side
configuration mistake would each independently have to happen for
Arrington Consultancy, Scott-project or personal Drive content to ever
reach a WSA worker.

### 2.4 Environment variables required

- `WORKFORCE_DRIVE_SERVICE_ACCOUNT_JSON` — the service account key, as a
  JSON string (or a path the deployment platform injects as a file — do
  not put this in a database field ever displayed to staff).
- `WORKFORCE_DRIVE_ALLOWED_FOLDER_IDS` — the folder-ID allowlist.

### 2.5 Credential rotation

Google Cloud service account keys should be rotated periodically via the
Cloud Console (create new key, update the deployment secret, then revoke
the old key) — there is no automatic expiry the way Azure secrets have, so
this needs a calendar reminder rather than a forced rotation.

### 2.6 Test procedure

Same principle as SharePoint: a documented read-only `files.list` call
scoped to one allowlisted folder, run and recorded before any worker's
`connectorUseAuthorised` is changed for Drive.

## 3. What this document does not do

It does not create any credential, request any permission grant, or
change any worker's authorisation. `server/workforce/registry.ts` remains
the single source of truth for `connectorUseAuthorised`/`writesAuthorised`
(both `false` for every worker today), and flipping either requires: the
relevant worker's specification being approved, the deployment-channel
question being resolved where relevant (Sophie), the credentials above
being provisioned, and the health test in 1.7/2.6 actually passing —
in that order, not as a shortcut.
