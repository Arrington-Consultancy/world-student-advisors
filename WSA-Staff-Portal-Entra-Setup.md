# WSA Staff Portal — Microsoft Entra Setup (Azure Administrator Pack)

Purpose: the exact steps a Microsoft Entra (Azure AD) administrator performs
so WSA staff can sign in to the Staff Portal with their own Microsoft 365
accounts. The application code (PR #63, `server/staffIdentityAuth.ts`) is
already built and tested against this exact configuration; nothing works
until these steps are done, and the portal honestly shows "Microsoft
sign-in is not yet configured" until then.

This is a **new, dedicated app registration**. Do not extend the existing
mail-sending application ("Mail.Send" app used by `server/_core/graphMail.ts`)
— sign-in and mail-sending are different trust purposes, and keeping them
separate means independent credential rotation, independent revocation, and
no cross-contamination if either is ever compromised.

## 1. App registration

In [entra.microsoft.com](https://entra.microsoft.com) → Identity →
Applications → App registrations → **New registration**:

| Setting | Value |
|---|---|
| Name | `WSA Staff Portal Authentication` |
| Supported account types | **Accounts in this organizational directory only** (single tenant) |
| Redirect URI | Platform **Web**, value: `https://www.worldstudentadvisors.com/staff-portal` |

The redirect URI must match `STAFF_SSO_REDIRECT_URI` exactly (scheme, host,
path, no trailing slash). If a development redirect is genuinely needed
later, add `http://localhost:3000/staff-portal` as a second Web redirect —
do not add wildcard or non-WSA URIs.

Single-tenant is a real control here: the code verifies the token's issuer
against this tenant, so accounts from any other Microsoft tenant are
rejected at the cryptographic level, before the email-domain check even
runs.

## 2. Permissions — request nothing beyond sign-in

The app needs only the default OIDC scopes, which the code requests as
`openid profile email`. Under **API permissions** this appears as Microsoft
Graph → Delegated → `openid`, `profile`, `email` (and `User.Read` if Azure
adds it by default, which is acceptable — it is the signed-in user reading
their own basic profile, nothing more).

Do **not** add: `Files.Read`, `Files.ReadWrite`, `Sites.Read.All`,
`Sites.ReadWrite.All`, `Mail.Send`, `Directory.Read.All`, or any
application (app-only) permission. Authentication and connector access are
separate concerns; SharePoint access will be a separate app with
`Sites.Selected` per `WSA-Workforce-Connector-Configuration-Plan.md`, when
that is separately approved.

Admin consent: the three OIDC scopes normally need no admin consent, but
granting tenant-wide admin consent for them is harmless and avoids each
staff member seeing a consent prompt on first sign-in.

## 3. Client secret

Certificates are not yet supported by the code — create a **client
secret** (Certificates & secrets → New client secret):

- Description: `Staff Portal production` 
- Expiry: **6 months** (set a calendar reminder to rotate before expiry)

Copy the secret **Value** (not the Secret ID) immediately — it is shown
once.

## 4. Where the values go

All four go into **Railway → the production service → Variables** (the
authorised production secret store). Never into source control, chat, a
document, or a worker prompt.

| Environment variable | Where to find the value | Secret? |
|---|---|---|
| `STAFF_SSO_TENANT_ID` | App registration → Overview → "Directory (tenant) ID" | No, but keep private |
| `STAFF_SSO_CLIENT_ID` | App registration → Overview → "Application (client) ID" | No, but keep private |
| `STAFF_SSO_CLIENT_SECRET` | The secret Value from step 3 | **YES — never paste anywhere except Railway** |
| `STAFF_SSO_REDIRECT_URI` | `https://www.worldstudentadvisors.com/staff-portal` (must match step 1 exactly) | No |

After setting all four and redeploying, the Staff Portal login page's
"Sign in with Microsoft" button enables itself automatically — the server
reports configuration state live.

## 5. Who can sign in

Two independent controls, both already enforced in code:

1. **Tenant/issuer/signature verification** — the primary control. Only
   tokens signed by Microsoft for this exact tenant and this exact app are
   accepted. This is the authority.
2. **Email domain restriction** — an additional check: the verified
   account's address must end `@worldstudentadvisors.com`. This is
   defence-in-depth, not the primary trust boundary.

Optionally, tighten further in Entra itself: Enterprise applications →
WSA Staff Portal Authentication → Properties → "Assignment required?" =
Yes, then assign only the staff who should have portal access. Recommended
once sign-in is verified working.

Note on authority: a successful first sign-in only **creates the staff
identity record** with minimum default access (portal entry + read-only
workforce status). It grants no worker access, student-data access,
connector access or approval authority — those remain deny-by-default in
the application's RBAC until controlled WSA role mappings exist.

## 6. Revocation and rotation

- **Disable one person**: disable or remove their Microsoft 365 account as
  normal (or unassign them if using assignment-required). Additionally,
  their `staff_users` row can be set inactive in the portal database —
  the code re-checks active state on every request, so this takes effect
  immediately, not at token expiry.
- **Disable the whole application**: Enterprise applications → WSA Staff
  Portal Authentication → Properties → "Enabled for users to sign in?" =
  No. Or delete the client secret — new sign-ins fail immediately.
- **Rotate the secret**: create a new client secret, update
  `STAFF_SSO_CLIENT_SECRET` in Railway, redeploy, then delete the old
  secret. Zero-downtime if done in that order.
