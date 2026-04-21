# MCP Apps & Connections

Model Context Protocol (MCP) apps connect external services to your AI assistant, enabling tools like GitHub, Notion, Stripe, and more.

---

## Architecture Overview

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Browser    │───▶│  Next.js     │───▶│  MCP Client  │───▶│ External     │
│   (React)    │    │  API Routes  │    │  (@ai-sdk)   │    │ MCP Servers  │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                         │                                        │
                         ▼                                        ▼
                   ┌──────────────┐                      ┌──────────────┐
                   │  PostgreSQL   │                      │   OAuth      │
                   │  (Prisma)     │                      │   Providers  │
                   └──────────────┘                      └──────────────┘
```

### Component Roles

| Component | Role |
|-----------|------|
| **React UI** | Browse catalog, add/remove servers, manage OAuth connections |
| **API Routes** | CRUD for servers, OAuth initiation/callback, tool execution |
| **MCP Client** (`@ai-sdk/mcp`) | Connects to MCP servers via HTTP or SSE transport |
| **PostgreSQL** | Stores server configs, encrypted credentials, OAuth tokens |
| **OAuth Providers** | GitHub, Slack, Notion, etc. — handle auth for each service |

---

## Data Model

### McpUserServer

Stores one row per user per connected MCP app:

```prisma
model McpUserServer {
  id                          String    @id @default(cuid())
  userId                      String    # Owned by this user
  name                        String    # Display name
  transportType               String    # "http" | "sse"
  url                         String    # MCP server URL

  # Auth type determines how tools are called
  authType                    String    # "none" | "bearer" | "header" | "oauth"

  # For bearer/header auth — AES-256-GCM encrypted
  encryptedCredentials        String?

  # OAuth config (set at server creation or edited later)
  oauthIssuerUrl              String?   # e.g. https://oauth Provider.com
  oauthAuthorizationUrl      String?
  oauthTokenUrl              String?
  oauthScopes                 String?
  oauthClientId               String?   # Optional — can be auto-resolved
  oauthClientSecretEncrypted  String?   # Encrypted client secret

  # Live OAuth tokens — AES-256-GCM encrypted
  oauthAccessTokenEncrypted   String?
  oauthRefreshTokenEncrypted  String?
  oauthAccessTokenExpiresAt   DateTime?

  oauthConnectedAt            DateTime? # When OAuth was completed
  oauthError                 String?    # Last OAuth error

  isEnabled                   Boolean   @default(true)
  disabledTools              String[]   @default([])  # User-disabled tool names
  lastTestedAt               DateTime?
  lastError                   String?
}
```

### McpCatalogItem

Pre-configured apps available to all users (seeded from `prisma/seed.ts`):

```prisma
model McpCatalogItem {
  id           String   @id @default(cuid())
  name         String
  category     String   # "dev" | "productivity" | "crm" | etc.
  url          String   @unique
  authType     String   @default("open")  # "oauth" | "apikey" | "open"
  maintainer   String
  maintainerUrl String
  customIcon   String?
  isFeatured   Boolean  @default(false)
  isActive     Boolean  @default(true)
  sortOrder    Int      @default(0)
}
```

---

## Authentication Types

### `none` — No Authentication

Used for open MCP servers that require no credentials.

```typescript
// No headers sent
{ }
```

### `bearer` — Bearer Token

Static API key passed as `Authorization: Bearer <token>`.

```typescript
// Credentials encrypted with AES-256-GCM
{ Authorization: `Bearer ${decryptedToken}` }
```

### `header` — Custom Header

Custom header name + value (e.g., `X-API-Key: <key>`).

```typescript
// headerName and headerValue stored encrypted
{ [headerName]: headerValue }
```

### `oauth` — OAuth 2.0

Full OAuth 2.0 with PKCE flow. Access token resolved from DB (auto-refreshed if expired).

```typescript
// Access token decrypted and attached
{ Authorization: `Bearer ${accessToken}` }
```

---

## OAuth 2.0 Flow (Detailed)

This is the most complex auth type. Here's every step:

### Step 1: User Adds an OAuth App

```
User clicks "Add" on GitHub (OAuth) app
    ↓
POST /api/mcp/servers
{
  name: "GitHub",
  url: "https://api.githubcopilot.com/mcp",
  transportType: "http",
  authType: "oauth"
}
    ↓
Server record created in DB (no tokens yet)
```

### Step 2: Initiate OAuth (`POST /api/mcp/servers/:id/oauth/start`)

The full flow inside `buildMcpOAuthAuthorizationUrl`:

```
1. Discover OAuth endpoints
   ┌──────────────────────────────────────────────────────┐
   │ a. Fetch MCP server URL                              │
   │    GET https://api.githubcopilot.com/mcp             │
   │    Check headers for:                                │
   │    WWW-Authenticate: Bearer resource="...",          │
   │    scope="..."                                       │
   │                                                      │
   │ b. Try .well-known/oauth-protected-resource on      │
   │    the MCP server origin                             │
   │                                                      │
   │ c. Try .well-known/oauth-authorization-server        │
   │    or .well-known/openid-configuration              │
   │    on the discovered issuer URL                      │
   └──────────────────────────────────────────────────────┘
       ↓
2. Resolve client ID
   ┌──────────────────────────────────────────────────────┐
   │ a. If oauthClientId is configured → use it           │
   │                                                      │
   │ b. If NOT configured AND dynamic reg supported:      │
   │    POST to registration_endpoint                      │
   │    {                                                 │
   │      client_name: "Nothing AI",                      │
   │      redirect_uris: ["https://myapp/api/mcp/oauth/callback"]│
   │      grant_types: ["authorization_code", "refresh_token"]│
   │      token_endpoint_auth_method: "none"              │
   │    }                                                 │
   │    → Returns client_id (and optionally client_secret)│
   │                                                      │
   │ c. If NOT configured AND auto metadata supported:    │
   │    → Use https://myapp/api/mcp/oauth/client-metadata/:id │
   │    as the client_id (OAuth Dynamic Client Registration)│
   │                                                      │
   │ d. For known providers (GitHub, Slack, Vercel):     │
   │    → Requires explicit client ID — throw helpful error│
   └──────────────────────────────────────────────────────┘
       ↓
3. Build authorization URL with PKCE
   - code_verifier = random 48-byte base64url string
   - code_challenge = base64url(SHA256(code_verifier))
   - state = base64url(JSON payload) + "." + HMAC_SHA256(payload)
       payload = { userId, serverId, verifier, nonce, exp }
   - scopes from server config OR discovered from metadata
       ↓
4. Return { authorizationUrl }
   → Browser redirects to GitHub OAuth
```

### Step 3: OAuth Callback (`GET /api/mcp/oauth/callback`)

```
Provider redirects to:
  https://myapp/api/mcp/oauth/callback?code=XYZ&state=abc.def

    ↓
1. Extract code + state from URL
    ↓
2. Verify HMAC signature
   - Split state at "."
   - Recompute HMAC of payload using MCP_CREDENTIALS_ENCRYPTION_KEY
   - Compare against provided signature
   - If mismatch → reject (CSRF attack)
    ↓
3. Exchange code for tokens
   POST https://github.com/login/oauth/access_token
   {
     grant_type: "authorization_code",
     code: "XYZ",
     redirect_uri: "https://myapp/api/mcp/oauth/callback",
     client_id: "...",
     code_verifier: "..."   # Original PKCE verifier
   }
    ↓
4. Encrypt + store tokens
   - access_token  → encrypt → oauthAccessTokenEncrypted
   - refresh_token → encrypt → oauthRefreshTokenEncrypted
   - expires_in    → oauthAccessTokenExpiresAt
    ↓
5. Redirect back to /apps?tab=my-servers&mcpOauth=success
```

### Step 4: Tool Call (Token Resolution)

Every time an MCP tool is called, `getMcpAuthHeaders` handles OAuth:

```typescript
async function getMcpAuthHeaders(server, userId) {
  if (authType !== 'oauth') { /* handle bearer/header */ }

  // Check if token is still valid (with 60s buffer)
  if (tokenExpiresAt && tokenExpiresAt > Date.now() + 60_000) {
    return { Authorization: `Bearer ${decryptedAccessToken}` };
  }

  // Token missing or expiring soon → refresh
  const newTokens = await refreshAccessToken({
    tokenUrl:    server.oauthTokenUrl,
    clientId:    server.oauthClientId,
    clientSecret: decrypt(server.oauthClientSecretEncrypted),
    refreshToken: decrypt(server.oauthRefreshTokenEncrypted),
  });

  // Re-encrypt and store new tokens
  await prisma.mcpUserServer.update({
    where: { id: server.id, userId },  // userId verified!
    data: {
      oauthAccessTokenEncrypted: encrypt(newTokens.accessToken),
      oauthRefreshTokenEncrypted: encrypt(newTokens.refreshToken),
      oauthAccessTokenExpiresAt: newTokens.expiresAt,
    }
  });

  return { Authorization: `Bearer ${newTokens.accessToken}` };
}
```

---

## Encryption

All credentials at rest use **AES-256-GCM**:

```typescript
// lib/mcp/server-config.ts / lib/mcp/auth-headers.ts

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.MCP_CREDENTIALS_ENCRYPTION_KEY, 'utf8').subarray(0, 32);

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]).toString('base64');
}

function decrypt(ciphertext: string): string {
  const combined = Buffer.from(ciphertext, 'base64');
  const iv = combined.subarray(0, 16);
  const authTag = combined.subarray(16, 32);
  const encrypted = combined.subarray(32);
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
}
```

OAuth state is signed with **HMAC-SHA256** (not encrypted — state is base64url encoded):

```typescript
// lib/mcp/oauth.ts

function signStatePayload(payloadBase64: string): string {
  return toBase64Url(
    createHmac('sha256', process.env.MCP_CREDENTIALS_ENCRYPTION_KEY!)
      .update(payloadBase64)
      .digest()
  );
}
```

---

## API Routes

### `POST /api/mcp/servers` — Add a server

**Request:**
```json
{
  "name": "GitHub",
  "url": "https://api.githubcopilot.com/mcp",
  "transportType": "http",
  "authType": "oauth",
  "oauthClientId": "optional-id",
  "oauthScopes": "read:user repo workflow"
}
```

**Behavior:**
1. `getOrCreateUser(request)` — auth check
2. `isProUser(planTier)` — subscription check (returns true for dev)
3. `createMcpServerSchema.parse()` — Zod validation
4. `validateMcpServerUrl(url)` — HTTPS enforced in prod
5. `validateMcpOAuthConfig(input)` — OAuth fields validated
6. `getEncryptedMcpCredentials(input)` — encrypts bearer/header credentials
7. `prisma.mcpUserServer.create()` — stores record

**Response:** `{ server: serializeMcpServer(created) }`

---

### `GET /api/mcp/servers` — List user's servers

Returns all servers for the authenticated user with computed fields:

```json
{
  "servers": [{
    "id": "...",
    "name": "GitHub",
    "url": "https://api.githubcopilot.com/mcp",
    "authType": "oauth",
    "isEnabled": true,
    "hasCredentials": true,
    "isOAuthConnected": true,
    "oauthConnectedAt": "2026-04-19T12:00:00Z",
    "lastTestedAt": null,
    "lastError": null
  }]
}
```

---

### `PATCH /api/mcp/servers/:id` — Update server

Updatable fields: `name`, `url`, `transportType`, `authType`, `oauthClientId`, `isEnabled`, `disabledTools`

Note: Credentials cannot be updated via PATCH — delete and re-add the server to change credentials.

---

### `DELETE /api/mcp/servers/:id` — Remove server

Deletes the server record. Cascades to remove all associated data.

---

### `POST /api/mcp/servers/:id/oauth/start` — Initiate OAuth

**Response:**
```json
{ "authorizationUrl": "https://github.com/login/oauth/authorize?..." }
```

Calls `buildMcpOAuthAuthorizationUrl` which:
1. Calls `resolveOAuthEndpoints(server)` — discovers all OAuth URLs
2. Resolves client ID (explicit config → dynamic registration → auto-metadata)
3. Creates PKCE verifier + challenge
4. Signs state with HMAC-SHA256
5. Returns signed authorization URL

---

### `GET /api/mcp/oauth/callback` — OAuth callback

Handles the redirect from the OAuth provider. Does HMAC verification, code exchange, token encryption, and redirect back to `/apps`.

---

### `POST /api/mcp/servers/:id/oauth/disconnect` — Disconnect OAuth

Clears all OAuth tokens from the server record:

```typescript
await prisma.mcpUserServer.update({
  where: { id, userId },  // userId verified
  data: {
    oauthAccessTokenEncrypted: null,
    oauthRefreshTokenEncrypted: null,
    oauthAccessTokenExpiresAt: null,
    oauthConnectedAt: null,
    oauthError: null,
  },
});
```

---

### `GET /api/mcp/servers/:id/tools` — Fetch server tools

Connects to the MCP server, loads all available tools, and returns them:

```json
{
  "ok": true,
  "tools": [
    { "name": "pullRequests", "title": "Pull Requests", "description": "..." },
    { "name": "issues", "title": "Issues", "description": "..." }
  ]
}
```

---

### `PATCH /api/mcp/servers/:id/tools` — Update disabled tools

```json
// Request
{ "disabledTools": ["admin", "deleteRepo"] }

// Response
{ "ok": true, "disabledTools": ["admin", "deleteRepo"] }
```

Disabling tools prevents specific tools from being shown to the AI or executed.

---

### `POST /api/mcp/servers/test` — Test connection

Tests connectivity to an MCP server without saving it. Used to verify credentials before adding.

```json
// Request (test stored server)
{ "serverId": "..." }

// Request (test with inline credentials)
{ "url": "https://mcp.example.com/mcp", "transportType": "http", "authType": "bearer", "bearerToken": "..." }

// Response
{ "ok": true, "toolCount": 12, "toolNames": ["tool1", "tool2", ...] }
```

---

## MCP Tool Execution (Full Flow)

### 1. User sends a message

The AI determines it needs to use an MCP tool, e.g. `mcp_github_pullRequests`.

### 2. Tool discovery (at chat start)

```typescript
// services/mcp-tools.service.ts

async function getMCPToolsForChat(userId: string) {
  const servers = await prisma.mcpUserServer.findMany({
    where: { userId, isEnabled: true },
  });

  for (const server of servers) {
    const authHeaders = await getMcpAuthHeaders(server, userId);
    const client = createMCPClient({ transport: { type: server.transportType, url: server.url, headers: authHeaders } });
    const tools = await client.tools();

    for (const [toolName, toolDef] of Object.entries(tools)) {
      if (server.disabledTools.includes(toolName)) continue;
      const prefixedName = `mcp_${slug(server.name)}_${toolName}`;
      // Store tool def keyed by prefixedName for later execution
    }

    await client.close();
  }
}
```

Tools are formatted in OpenAI-compatible schema and sent to the model:

```typescript
formatMCPToolsForOpenAI(tools) → [
  {
    type: "function",
    function: {
      name: "mcp_github_pullRequests",
      description: "List pull requests...",
      parameters: { type: "object", properties: {...} }
    }
  }
]
```

### 3. Tool call execution

```typescript
// services/mcp-tool-executor.service.ts

async function executeMCPToolCall(toolCall, userId) {
  // Parse name: mcp_{slug}_{originalName}
  const { serverId, originalName } = parsePrefixedToolName(toolCall.name);

  // Fetch server (userId verified in WHERE clause)
  const server = await prisma.mcpUserServer.findFirst({
    where: { id: serverId, userId }
  });

  // Get auth headers (auto-refreshes OAuth if needed)
  const authHeaders = await getMcpAuthHeaders(server, userId);

  // Create MCP client
  const client = createMCPClient({
    transport: { type: server.transportType, url: server.url, headers: authHeaders }
  });

  try {
    const tools = await client.tools();
    const toolDef = tools[originalName];
    const result = await toolDef.execute(toolCall.arguments, {});
    return { id: toolCall.id, result };
  } finally {
    await client.close();
  }
}
```

---

## Tool Naming

Tools are prefixed with a slug of the server name to avoid collisions:

```
Server: "GitHub Copilot"  → slug: "github_copilot"
Tool:   "pullRequests"   → full name: "mcp_github_copilot_pullRequests"
```

If the same tool name appears twice, a counter suffix is added:

```
mcp_github_pullRequests
mcp_github_copilot_pullRequests_2
```

---

## Provider-Specific OAuth

### GitHub

```typescript
// Endpoints discovered from MCP server metadata
// Falls back to standard github.com OAuth
GET https://github.com/login/oauth/authorize
  ?client_id=...
  &redirect_uri=https://myapp/api/mcp/oauth/callback
  &scope=read:user%20repo%20workflow
  &code_challenge=...
  &code_challenge_method=S256
  &state=...
```

### Slack

Slack MCP uses user OAuth v2 (`/oauth/v2_user/authorize`) and requires **both bot and user scopes**:

```typescript
// Bot scopes (always sent)
scope = "search:read.files search:read.public users:read users:read.email"

// User scopes (sent as user_scope when needed)
user_scope = "channels:history chat:write ..."

// Slack also requires
granular_bot_scope = 1
user_default = 0
```

### Vercel

Requires `offline_access` scope to receive a refresh token. Does NOT support auto client metadata — you must configure `VERCEL_MCP_CLIENT_ID` in env.

### Generic / Auto-Discovery

For providers that support OAuth protected resource metadata, the flow auto-discovers:

1. `GET {mcp-server-url}` — checks for `WWW-Authenticate: Bearer` header
2. Extracts `resource_metadata_url` if present
3. Fetches `.well-known/oauth-protected-resource`
4. Gets `authorization_servers[]` from metadata
5. Fetches `.well-known/openid-configuration` from issuer
6. Extracts `authorization_endpoint` + `token_endpoint`
7. Confirms `S256` PKCE support

---

## Security Model

### Defense in Depth

| Threat | Mitigation |
|--------|------------|
| **Credential theft** | AES-256-GCM encryption at rest |
| **OAuth CSRF** | HMAC-SHA256 signed state parameter |
| **Token theft** | Tokens never logged, only in encrypted DB |
| **User data leakage** | All queries include `userId` in WHERE |
| **OAuth injection** | State signed with server-side secret |
| **PKCE bypass** | S256 challenge required; verifier kept server-side |
| **HTTP in production** | URL validator enforces HTTPS except localhost |
| **Expired tokens used** | 60s buffer before expiry triggers auto-refresh |

### `userId` Enforcement

Every database write that touches `mcpUserServer` includes `userId` in the `where` clause to prevent IDOR attacks:

```typescript
// WRONG — security hole
await prisma.mcpUserServer.update({ where: { id }, data: ... })

// RIGHT — userId verified
await prisma.mcpUserServer.update({ where: { id, userId }, data: ... })
```

This applies to: PATCH, DELETE, disconnect, tool updates, and token refresh.

---

## Frontend Components

### Apps Page (`app/(main)/apps/page.tsx`)

The main MCP apps interface with two tabs:

**Browse Tab:**
- Search and category filtering
- Featured section showing popular apps (Notion, GitHub, Exa Search, Vercel, Slack, Linear, Context7, Stripe, Supabase)
- All servers grid with add buttons
- "Add custom server" card (dashed border, opens custom server dialog)

**My Apps Tab:**
- List of connected servers, sorted by readiness:
  1. Enabled + OAuth connected (ready)
  2. Enabled + OAuth not connected
  3. Disabled + OAuth connected
  4. Disabled + OAuth not connected
- Inline tools expansion with enable/disable per tool
- OAuth status indicator (amber dot for not connected)
- Disabled tools count badge

### Dialogs

**Custom Server Dialog:**
- Add any MCP-compatible endpoint
- Auth type selector: No auth, Bearer token, Custom header, OAuth
- Dynamic fields based on auth type
- OAuth auto-discovery explanation text

**API Key Dialog:**
- For apps that require API key credentials
- Step-by-step instructions for getting tokens
- Hint URLs to provider documentation
- Fields mapped to `Authorization: Bearer` header

**OAuth Setup Dialog:**
- For OAuth apps requiring custom client ID/secret
- Redirect URI display with copy button
- Fields: OAuth Client ID, OAuth Client Secret
- Stored securely (encrypted)

**Edit Server Dialog:**
- Edit name and URL of custom servers
- Update bearer token / header value / OAuth client ID
- Option to clear existing credentials

### Server Card UI

Each server shows:
- Service icon (from catalog or favicon)
- Name and URL
- Enabled/Disabled badge
- Credentials badge (if configured)
- Error badge (if last test failed)
- OAuth amber dot (when not connected)
- Disabled tools count (e.g., "2 hidden")
- OAuth error message (truncated)
- Connect button (for OAuth servers not connected)
- Actions dropdown: Test connection, Reconnect OAuth, Disconnect OAuth, Delete
- Tools expand chevron (when ready)

### Tools Management UI

When tools are expanded:
- Tool count: "8/10 enabled" 
- Enable all button (when tools are disabled)
- Per-tool toggle switches with green dot (enabled) or muted dot (disabled)
- Strikethrough text for disabled tools
- Loading spinner while fetching tools

### OAuth Client Metadata (`GET /api/mcp/oauth/client-metadata/[serverId]`)

Returns RFC 7591 compliant client metadata for dynamic OAuth registration:

```json
{
  "client_id": "http://localhost:3000/api/mcp/oauth/client-metadata/{serverId}",
  "redirect_uris": ["http://localhost:3000/api/mcp/oauth/callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"],
  "token_endpoint_auth_method": "none"
}
```

---

## Managed OAuth Apps

Some OAuth apps have pre-configured app credentials via environment variables. The `injectManagedOAuthCredentials` function (in `lib/mcp/managed-credentials.ts`) checks if a server URL matches a known managed app and overrides `oauthClientId` and `oauthClientSecretEncrypted` from env vars.

**Supported managed apps:**

| Server URL | Env Vars |
|-----------|----------|
| `https://api.githubcopilot.com/mcp` | `GITHUB_MCP_CLIENT_ID`, `GITHUB_MCP_CLIENT_SECRET` |
| `https://mcp.box.com` | `BOX_MCP_CLIENT_ID`, `BOX_MCP_CLIENT_SECRET` |
| `https://mcp.dropbox.com/mcp` | `DROPBOX_MCP_CLIENT_ID`, `DROPBOX_MCP_CLIENT_SECRET` |
| `https://mcp.slack.com/mcp` | `SLACK_MCP_CLIENT_ID`, `SLACK_MCP_CLIENT_SECRET` |
| `https://mcp.hubspot.com` | `HUBSPOT_MCP_CLIENT_ID`, `HUBSPOT_MCP_CLIENT_SECRET` |

This is applied automatically in the OAuth start and callback routes — no code changes needed when you add credentials to env.

## Environment Variables

```env
# Required
MCP_CREDENTIALS_ENCRYPTION_KEY=     # 32+ char secret for HMAC + AES-GCM
NEXT_PUBLIC_APP_URL=http://localhost:3000  # Used to build OAuth callback URL

# Optional — for custom OAuth callback origin
# (useful when app runs behind a proxy with different public URL)
MCP_OAUTH_CALLBACK_ORIGIN=https://my-production-domain.com

# Optional — pre-configured OAuth app credentials
# Use these instead of dynamic client registration
GITHUB_MCP_CLIENT_ID=
GITHUB_MCP_CLIENT_SECRET=
BOX_MCP_CLIENT_ID=
BOX_MCP_CLIENT_SECRET=
DROPBOX_MCP_CLIENT_ID=
DROPBOX_MCP_CLIENT_SECRET=
SLACK_MCP_CLIENT_ID=
SLACK_MCP_CLIENT_SECRET=
HUBSPOT_MCP_CLIENT_ID=
HUBSPOT_MCP_CLIENT_SECRET=
```

---

## Seeding the Catalog

```bash
bunx prisma db seed
```

The seed (`prisma/seed.ts`) populates the `McpCatalogItem` table with 60+ apps across all categories. Each entry is an **upsert** — running the seed multiple times is safe.

To add a new catalog app, add to the `catalogItems` array in `prisma/seed.ts` and re-run.

---

## Key Files

| File | Purpose |
|------|---------|
| `lib/mcp/oauth.ts` | Full OAuth engine: discovery, PKCE, HMAC state, exchange, refresh |
| `lib/mcp/managed-credentials.ts` | Env-var credential injection for managed OAuth apps |
| `lib/mcp/server-config.ts` | URL validation, credential encryption/decryption |
| `lib/mcp/auth-headers.ts` | Resolves auth headers for any auth type, handles OAuth token refresh |
| `services/mcp-tools.service.ts` | Loads tools from all enabled MCP servers |
| `services/mcp-tool-executor.service.ts` | Executes a single MCP tool call |
| `app/api/mcp/servers/route.ts` | GET (list) + POST (create) |
| `app/api/mcp/servers/[id]/route.ts` | PATCH (update) + DELETE |
| `app/api/mcp/servers/[id]/oauth/start/route.ts` | Initiate OAuth |
| `app/api/mcp/oauth/callback/route.ts` | OAuth callback handler |
| `app/api/mcp/oauth/client-metadata/[serverId]/route.ts` | Dynamic client metadata |
| `app/api/mcp/servers/[id]/oauth/disconnect/route.ts` | Revoke OAuth |
| `app/api/mcp/servers/[id]/tools/route.ts` | List tools + update disabled tools |
| `app/api/mcp/servers/test/route.ts` | Test server connection |
| `prisma/seed.ts` | Seeds catalog with 60+ apps |
