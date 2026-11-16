# WSA Infrastructure Automation: Bootstrap Pack

**Status:** approved design, awaiting the one-time bootstrap below.
**Scope:** infrastructure plumbing only. This identity is not a WSA AI worker, cannot activate workers, cannot read student records, and cannot widen its own permissions.

## 1. What this removes

After the one-time bootstrap, no human ever again needs to copy client IDs, client secrets or Railway variables between Microsoft Entra and Railway for the Staff Portal. The provisioning workflow does the whole chain itself: verify or create the owned Entra application, rotate its credential, write the four `STAFF_SSO_*` variables to the production service, wait for the deployment, run the identity acceptance checks and record a durable audit trail. It is safe to rerun at any time.

## 2. Identity model

| Item | Value |
|---|---|
| Automation identity | Entra app registration **WSA Infrastructure Automation** (new, dedicated) |
| Managed resource | Only the Entra app **WSA Staff Portal Authentication**, which the automation creates and therefore owns |
| Graph permission | **Application.ReadWrite.OwnedBy** (application permission) and nothing else |
| Authentication | Workload identity federation from GitHub Actions. **No Microsoft secret is stored anywhere** |
| Railway credential | The existing project token (GitHub secret `githubactionsprod`), already scoped to project vibrant-learning, environment production only |
| Audit store | `infrastructure_audit_events` table in the production database (migration 0006) |

Why `Application.ReadWrite.OwnedBy` is sufficient: Microsoft Graph lets an app holding it create applications (becoming their owner automatically) and fully manage owned applications, including redirect URIs and `addPassword`/`removePassword` for credential rotation. It cannot read or touch any application it does not own, cannot grant consent, cannot assign roles and cannot manage users, mail, files or sites. That covers the entire required lifecycle, so `Application.ReadWrite.All` is not requested.

Self-escalation is blocked in three independent layers: Microsoft (the permission cannot grant permissions or consent), the code (`server/infrastructure/automation.ts` pins the exact Railway project, environment and service IDs, the four variable names and the single managed application name, and refuses everything else), and the trigger (the workflow only runs from `main` by manual dispatch, and the federated credential only matches `main`).

## 3. The one-time bootstrap (single Azure admin session, about ten minutes)

Do all of this in one sitting. No secret is created, seen or copied at any point.

1. Microsoft Entra admin centre, App registrations, **New registration**:
   - Name: `WSA Infrastructure Automation`
   - Supported account types: **Accounts in this organizational directory only**
   - No redirect URI. Register.
2. On the new app, **Certificates & secrets**, tab **Federated credentials**, **Add credential**:
   - Scenario: **GitHub Actions deploying Azure resources**
   - Organisation: `Arrington-Consultancy`  Repository: `world-student-advisors`
   - Entity type: **Branch**  Branch: `main`
   - Name: `github-main`
   - (This yields issuer `https://token.actions.githubusercontent.com`, subject `repo:Arrington-Consultancy/world-student-advisors:ref:refs/heads/main`, audience `api://AzureADTokenExchange`.)
3. **API permissions**, **Add a permission**, Microsoft Graph, **Application permissions**, tick **Application.ReadWrite.OwnedBy**. Remove any default `User.Read` delegated entry. Then click **Grant admin consent** for the tenant. This is the recurring-involvement kill switch: it is the only consent this capability will ever ask of you.
4. Copy two non-secret identifiers from the app's Overview page into GitHub repository **variables** (not secrets): repo Settings, Secrets and variables, Actions, **Variables** tab:
   - `WSA_INFRA_TENANT_ID` = Directory (tenant) ID
   - `WSA_INFRA_CLIENT_ID` = Application (client) ID
5. Only if an app named **WSA Staff Portal Authentication** already exists in the tenant (created manually earlier): open it, **Owners**, add **WSA Infrastructure Automation** as owner. If it does not exist, skip this; the automation will create and own it.

That is the entire recurring-free bootstrap. The Railway token (`githubactionsprod`) and the GitHub repository already exist from earlier stages.

One further gated step sits with WSA governance rather than Azure: applying migration `0006_infrastructure_audit` to production (adds the empty `infrastructure_audit_events` table; purely additive). It follows the established pattern: read-only pre-check, explicit approval, apply, post-verify. The provisioning workflow refuses to run until this table exists, because durable audit is mandatory.

## 4. Where every credential lives

| Credential | Storage | Notes |
|---|---|---|
| Microsoft authentication for the automation | Nowhere. Federated trust only | Nothing to leak, rotate or expire |
| Railway project token | GitHub Actions secret `githubactionsprod` | Pre-existing; scoped to vibrant-learning production |
| Staff Portal SSO client secret | Railway variable `STAFF_SSO_CLIENT_SECRET` on the production service only | Created by the automation, passed in memory over TLS, masked in logs, never shown to a human |
| Tenant ID and automation client ID | GitHub repository variables | Identifiers, not secrets |

## 5. Revocation, rotation and emergency disable

- **Revoke Microsoft access:** delete the federated credential on WSA Infrastructure Automation, or delete the app registration, or remove the admin consent. Any one of the three stops all Graph access immediately.
- **Revoke Railway access:** delete the project token in Railway project settings and the `githubactionsprod` secret in GitHub.
- **Rotate the SSO secret:** rerun the provisioning workflow. Rotation is its normal behaviour: it adds a fresh credential and prunes only credentials it created itself (recognised by the `wsa-infra-rotated-` name prefix); a credential an administrator created by hand is never touched.
- **Emergency disable:** disable the workflow in the GitHub Actions UI (Actions, the workflow, Disable workflow). Combined with the federated credential being pinned to `main` and manual dispatch only, this fully halts the capability without touching Azure.

## 6. Durable audit behaviour

Every run writes two-phase rows (intent, then result) to `infrastructure_audit_events`: automation identity, GitHub run URL, action, target system and resource (names and identifier prefixes only), permission decision and reason, tri-state success, error category, deployment ID and the human approval reference. The writer refuses any row containing secret-shaped content; this is a hard gate, not redaction. A run that cannot write its intent record stops before touching Microsoft or Railway, so a material infrastructure write cannot occur with no durable record. If a failure record itself cannot be written after retries, the job fails with an explicit critical message saying exactly that.

## 7. What stays out of scope

Unchanged and separately controlled: worker activation (`staffPortalExecutionAuthorised` remains false for every worker), SharePoint and Google Drive connector activation, the WSA Worker Register, RBAC widening, and any Microsoft 365 data beyond the single owned application object. Any privilege expansion for this automation returns to the human and Governance and Assurance approval route; the automation cannot grant it to itself.
