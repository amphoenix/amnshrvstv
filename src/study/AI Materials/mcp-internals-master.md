# MCP Internals — Master Document
## How the protocol works, layer by layer, and WHY every piece exists

That doc is how you *present* the platform. This one is the depth underneath — for when the interviewer says "okay, but how does MCP actually work?"

**How to use this:** every section has three levels — MECHANISM (what happens on the wire), WHY (the design reason), and INTERVIEW LINE (a sentence you can say verbatim). Learn the WHYs hardest. Anyone can read the spec; explaining why the spec is shaped that way is the senior signal.

**Spec version note (say this if asked):** your platform was built against the 2025-era spec (sessions, initialize handshake, HTTP+SSE → Streamable HTTP). The current finalized spec is **2025-11-25**. A **2026-07-28 release candidate** (locked May 2026, final July 28, 2026) is the largest revision ever — stateless core, sessions removed, extensions framework. Section 11 covers it. Knowing this exists = "stays current" signal.

---

# 1. The mental model — what MCP actually is

MCP is **not** an API, a framework, or an agent runtime. It is a **wire protocol**: a fixed set of JSON messages, a lifecycle, and rules for who can send what when. Think "LSP (Language Server Protocol) for AI context" — that's the explicit design inspiration. LSP solved editors×languages = N×M with one protocol; MCP solves AI-apps×tools with the same move.

**Three roles:**

```
┌────────────────────── HOST ──────────────────────┐
│  (Claude Desktop, IDE, your gateway, an agent)   │
│                                                  │
│  ┌────────┐      1:1       ┌─────────────────┐   │
│  │ CLIENT │◀══ stateful ══▶│                 │   │
│  └────────┘   connection   │  SERVER (Jira)  │   │
│  ┌────────┐                └─────────────────┘   │
│  │ CLIENT │◀══════════════▶ SERVER (Figma)       │
│  └────────┘                                      │
│  + the LLM, UI, policy, consent live in the HOST │
└──────────────────────────────────────────────────┘
```

- **Host** — the application. Owns the LLM, the user, the UI, all security policy.
- **Client** — a protocol connector *inside* the host. Exactly **one client per server connection**.
- **Server** — a program exposing capabilities (tools, resources, prompts). Knows nothing about the LLM, other servers, or the full conversation.

**WHY the 1:1 client-per-server rule?** Isolation. Each server sees only its own connection. Servers can't read the conversation, can't see each other, can't see what other tools returned. The host is the only party with the full picture — so the host is where trust decisions live. This is a *security architecture*, not a plumbing detail.

**INTERVIEW LINE:** "MCP deliberately keeps servers dumb and hosts smart. A server is a capability vending machine; all judgment — which tools to expose to the model, what needs human approval, what crosses a trust boundary — belongs to the host. That's why our gateway, which is a host+client on one side and a server on the other, was the natural place to hang governance."

---

# 2. Layer 0 — JSON-RPC 2.0, the wire format

Every MCP message, on every transport, is a JSON-RPC 2.0 message. Three kinds, and only three:

**Request** — expects a response. Has an `id`.
```json
{"jsonrpc": "2.0", "id": 7, "method": "tools/call",
 "params": {"name": "jira_search", "arguments": {"query": "PROJ-123"}}}
```

**Response** — carries the same `id` back. Exactly one of `result` or `error`.
```json
{"jsonrpc": "2.0", "id": 7, "result": {"content": [{"type": "text", "text": "..."}]}}
{"jsonrpc": "2.0", "id": 7, "error": {"code": -32602, "message": "Invalid params"}}
```

**Notification** — fire-and-forget. **No `id`, no response ever.**
```json
{"jsonrpc": "2.0", "method": "notifications/tools/list_changed"}
```

**Error codes:** standard JSON-RPC ones — `-32700` parse error, `-32600` invalid request, `-32601` method not found, `-32602` invalid params, `-32603` internal error — plus implementation-defined ones. Critical nuance below in §4 on tool errors.

**WHY JSON-RPC and not REST/gRPC/GraphQL?**
1. **Transport-agnostic.** JSON-RPC is just JSON text with an envelope — it runs identically over stdin/stdout pipes and over HTTP. REST *is* HTTP; it can't run over a pipe to a local process. This one property enables MCP's whole local+remote story.
2. **Bidirectional.** REST is strictly client→server. In MCP, *servers also send requests to clients* (sampling, elicitation) and both sides send notifications. JSON-RPC has no notion of "which side is the client" — any side can send a request. gRPC could do this but drags in HTTP/2 + protobuf toolchains; MCP wanted "implementable in an afternoon in any language."
3. **`id` correlation gives you async multiplexing for free.** Many requests can be in flight on one connection; responses match by id, order doesn't matter. That's how one connection supports a slow tool call and a fast ping simultaneously.
4. **Notifications give you events for free** — list_changed, progress, cancellation — without inventing a separate event system.
5. **Proven** — it's the exact stack LSP runs on, at massive scale, for a decade.

**INTERVIEW LINE:** "JSON-RPC buys MCP three things REST can't: transport independence, bidirectionality — servers can call back into the client — and request multiplexing via id correlation. The protocol is the messages, not the pipe."

---

# 3. Layer 1 — Lifecycle: initialize, capabilities, shutdown

A connection has three phases. (Note: the 2026 RC deletes this handshake — §11. Know the current-spec version cold first.)

### 3.1 The handshake

**Step 1 — client sends `initialize` request:**
```json
{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
  "protocolVersion": "2025-06-18",
  "capabilities": {"sampling": {}, "elicitation": {}, "roots": {"listChanged": true}},
  "clientInfo": {"name": "amdocs-gateway", "version": "2.4.0"}}}
```

**Step 2 — server responds:**
```json
{"jsonrpc": "2.0", "id": 1, "result": {
  "protocolVersion": "2025-06-18",
  "capabilities": {
    "tools": {"listChanged": true},
    "resources": {"subscribe": true, "listChanged": true},
    "prompts": {}},
  "serverInfo": {"name": "jira-mcp", "version": "1.1.0"},
  "instructions": "Use jira_search before jira_update..."}}
```

**Step 3 — client sends `notifications/initialized`.** Now, and only now, normal traffic flows.

### 3.2 Why each field exists

**`protocolVersion` — version negotiation.** Versions are dates (`2025-06-18`, `2025-11-25`), not semver. WHY dates: each spec revision is a coherent snapshot; there's no pretense that changes are neatly "minor" vs "major." Client proposes a version; server answers with the same one if supported, or its latest supported one; if the client can't live with that, it disconnects. On HTTP, the negotiated version is then pinned on every subsequent request via the `MCP-Protocol-Version` header — WHY: HTTP requests are individually stateless, so without the header a proxy or restarted server can't know which dialect this request speaks.

**`capabilities` — feature negotiation.** Both sides declare what they support; you may only use features both sides declared. WHY: it's how the protocol evolves without breaking anyone. A 2024-era server and a 2026-era client interoperate by intersecting capabilities. It also means primitives are optional — a server can be tools-only. Sub-capabilities (`listChanged`, `subscribe`) exist so a client never waits for a notification the server will never send.

**`instructions`** — server-supplied guidance the host may inject into the system prompt. WHY: the server author knows how their tools compose ("search before update"); the host author doesn't. Also a **threat surface** — instructions are injected text from a semi-trusted party. Your registry should review them like code.

**Why a three-step handshake at all (vs just start sending)?** Both sides need the negotiated (version, capabilities) pair *before* interpreting any other message; and the `initialized` notification exists because the *server* also needs to know the client accepted — a server must not send its own requests (e.g. sampling) to a client that hasn't confirmed.

### 3.3 Shutdown
No shutdown message. Transport-level: close stdin / terminate process (stdio), or close the HTTP connection / `DELETE` the session (Streamable HTTP). WHY no protocol message: the transport already has an unambiguous "connection over" signal; duplicating it in-protocol creates two sources of truth that can disagree.

---

# 4. Server primitives — tools, resources, prompts

Three primitives, and the key design idea is **who controls each one**:

| Primitive | Controlled by | Analogy | Discovery | Use |
|---|---|---|---|---|
| **Tools** | the **model** | POST endpoints / functions | `tools/list` | `tools/call` |
| **Resources** | the **application/host** | GET endpoints / files | `resources/list` | `resources/read` |
| **Prompts** | the **user** | slash-commands / templates | `prompts/list` | `prompts/get` |

**WHY three primitives instead of "everything is a tool"?** Because "who decides to invoke this" is a *security and UX property*, and MCP encodes it in the type system. A tool call is model-initiated → needs guardrails, consent, audit. A resource read is app-initiated → the host decides what context to attach; the model never "decides" to read it. A prompt is user-initiated → explicit human intent, like typing a slash command. Collapsing all three into tools (which many lazy servers do) throws away the ability for the host to apply different trust policies to each. Saying this is a strong senior answer.

## 4.1 Tools — the deep dive

**Discovery — `tools/list`** returns tool definitions:
```json
{"name": "jira_create_issue",
 "title": "Create Jira Issue",
 "description": "Creates a new issue in the given project...",
 "inputSchema": {"type": "object",
   "properties": {"project": {"type": "string"}, "summary": {"type": "string"}},
   "required": ["project", "summary"]},
 "outputSchema": {"type": "object", "properties": {"key": {"type": "string"}}},
 "annotations": {"readOnlyHint": false, "destructiveHint": false,
                  "idempotentHint": false, "openWorldHint": false}}
```

Why each field:
- **`description`** — this is literally **prompt text**. It goes into the model's context and steers tool selection. It's also the #1 injection surface (tool poisoning — a hostile description can instruct the model). Hence: registry review + pinning in your platform.
- **`inputSchema` (JSON Schema)** — three consumers at once: the *model* reads it to construct valid arguments, the *client/host* validates arguments before sending, the *server* validates again before executing. WHY JSON Schema and not custom typing: every LLM provider's function-calling already speaks it, so MCP tools map 1:1 onto any vendor's function-calling API. That mapping is exactly what makes MCP vendor-neutral.
- **`outputSchema` + `structuredContent`** (added 2025-06-18) — tools can return typed JSON, not just prose. WHY: agents chain tools; parsing prose between steps is fragile. Structured output makes tool→tool pipelines reliable.
- **`annotations`** — machine-readable *hints* about behavior:
  - `readOnlyHint` — host can auto-approve reads, gate writes.
  - `destructiveHint` — host should demand human confirmation.
  - `idempotentHint` — host/client may safely retry on timeout. This is the protocol-level answer to "how do you retry tool calls safely" — and it rhymes with the idempotency-keys answer you give in fintech system design.
  - `openWorldHint` — does it touch the outside world (web) vs a closed system.
  - **Critical caveat, say it unprompted: annotations are UNTRUSTED HINTS from the server.** A malicious server can label a destructive tool `readOnlyHint: true`. Your gateway must not build security policy on annotations alone — policy comes from your own reviewed registry metadata. This one caveat is a differentiator answer.

**Invocation — `tools/call`** → result:
```json
{"content": [{"type": "text", "text": "Created PROJ-456"}],
 "structuredContent": {"key": "PROJ-456"},
 "isError": false}
```
- `content` is an array of typed blocks — `text`, `image`, `audio`, `resource_link`, embedded `resource`. WHY blocks: tool output feeds a multimodal model; a screenshot-taking tool must return an image, not a base64 string pretending to be text.

**The two-level error model — a guaranteed senior probe:**
1. **Protocol error** → JSON-RPC `error` object (unknown tool, malformed params). The *client/host* handles it; the model typically never sees it.
2. **Execution error** → a normal `result` with `isError: true` and the failure described in `content` ("Jira returned 403: no permission on project X").

**WHY two levels:** execution failures are *information the model needs* to recover — retry differently, ask the user, try another tool. Protocol failures are plumbing bugs the model can do nothing about. Putting execution errors in-band (in `result`) is what makes agents self-correcting. If you say only this one thing about errors, say this.

**Change notification:** server capability `listChanged` → server sends `notifications/tools/list_changed` → client re-fetches `tools/list`. WHY: tools are dynamic (feature flags, per-user permissions). This is also the "rug pull" surface — a tool's description can change after you approved it. Mitigation: pin approved definitions; diff on every list_changed.

## 4.2 Resources

- Identified by **URI**: `file:///docs/runbook.md`, `jira://PROJ-123`, custom schemes allowed. WHY URIs: uniform naming across wildly different backends, and they make results *linkable* (a tool can return a `resource_link` that the host may later `resources/read`).
- **`resources/list`** (paginated) for enumeration; **`resources/read`** returns contents (text or base64 blob + `mimeType`).
- **Resource templates** — RFC 6570 URI templates like `jira://{projectKey}/{issueId}`: expose an infinite family of resources without listing them. WHY: you cannot enumerate every Jira issue; a template says "anything matching this shape is fetchable."
- **Subscriptions** — `resources/subscribe` → `notifications/resources/updated` → client re-reads. WHY subscriptions AND list_changed as separate capabilities: "this document changed" (content) vs "the set of documents changed" (membership) are different events with different costs; servers opt into each independently.
- **App-controlled means:** the HOST decides which resources enter the model's context (user picks a file, host auto-attaches based on relevance). The model doesn't fetch resources on its own — if you want model-driven fetching, you expose a search/fetch *tool*. That distinction — same data, different control plane — is exactly the tools-vs-resources interview answer.

## 4.3 Prompts

- `prompts/list` → named templates with typed arguments; `prompts/get` with arguments → fully-rendered message list ready to send to the model. Can embed resources.
- WHY a whole primitive for "string templates": the server author knows the *right way to ask* their domain's questions ("summarize this incident channel" with the right structure and attachments). Prompts let servers ship UX, surfaced as slash-commands, under explicit **user** control — guaranteeing a human, not the model, pulled the trigger.

---

# 5. Client primitives — the direction most people don't know exists

Servers can make requests BACK to clients. Knowing these cold instantly separates you from candidates who've only consumed MCP through a config file. (Note: two of the three are deprecated in the 2026 RC — say the current-spec story first, then the RC direction. §11.)

## 5.1 Sampling — server borrows the host's LLM

`sampling/createMessage`: server sends messages + model *preferences* (hints like `costPriority`, `speedPriority`, `intelligencePriority`) → host (with human oversight) runs its own LLM → returns the completion.

**WHY it exists:**
- Servers may need intelligence mid-tool ("summarize these 500 Jira comments before returning") **without owning an API key**. Keys, model choice, spend, rate limits stay with the host — one throat to choke for cost and audit.
- **Human-in-the-loop by design:** the host can show/edit every sampling request and response. A server cannot silently pump prompts into the user's model.
- Abstract preferences instead of hardcoded model names — the server says "cheap and fast beats brilliant," the host maps that to whatever models it actually has. Vendor-neutrality again.
- Nested agents: a tool that itself needs an LLM loop can run one through the host — the "agents all the way down" primitive.

**RC 2026 note:** sampling is deprecated in the 2026-07-28 RC — direction is "servers should call LLM APIs directly"; cleaner separation of concerns, at the cost of the key-custody benefit. Knowing both sides of that argument = senior.

## 5.2 Roots — filesystem scoping

Client declares `roots` (list of `file://` URIs) = "operate within these directories." `roots/list` from server; `notifications/roots/list_changed` on change. WHY: an IDE host wants a filesystem server scoped to the open workspace, not `/`. They're a *convention* servers should honor, not an enforced sandbox — enforcement is the host/OS's job. (Also deprecated in the 2026 RC in favor of explicit tool params/config.)

## 5.3 Elicitation — server asks the human a question mid-flight (added 2025-06-18)

`elicitation/create`: server sends a message + a **flat JSON Schema** of the fields it needs → host renders a form → user fills / declines / cancels (three distinct outcomes).

**WHY:** without it, a tool hitting a missing parameter ("which sprint?") can only fail, forcing the model to guess or re-ask in prose. Elicitation gives a *structured, host-mediated* channel to the user. WHY flat schemas only: hosts must render the form in *any* UI — flat primitives guarantee renderability. WHY three response states: "declined" (user said no) and "cancelled" (user closed the dialog) are different signals to the server — no vs. maybe-later. Spec rule: never elicit secrets/passwords — it's a form channel, not an auth channel.

---

# 6. Utilities — the small machinery that makes it production-grade

- **Progress:** requester attaches a `progressToken` in `_meta`; the other side emits `notifications/progress` (progress/total/message) tied to that token. WHY opt-in tokens: no unsolicited progress spam; only requests that asked for progress get it. This is what lets a host render a progress bar for a 2-minute ingestion tool.
- **Cancellation:** `notifications/cancelled` with the request id. Best-effort by design — it's a notification, so there's no response; the canceller must tolerate a result arriving anyway (race). WHY best-effort: guaranteed cancellation of arbitrary in-flight work is unimplementable; the protocol refuses to promise what servers can't deliver.
- **Ping:** `ping` request → empty result. Liveness/keepalive on long-lived connections; either side may send. Your gateway's health checks map onto this.
- **Pagination:** list operations return `nextCursor`; client passes `cursor` back. Cursors are **opaque** — WHY: the server owns its pagination strategy (offset, keyset, search-after) and can change it without breaking clients. Clients that parse cursors are broken by design. (Same argument you make for opaque continuation tokens in API design generally.)
- **Logging:** server capability; `logging/setLevel` from client, `notifications/message` from server with RFC-5424-style severity levels. WHY in-protocol logging: stdio servers' stdout is *taken* — it's the transport — so a standard side-channel for diagnostics prevents "printf broke the wire" bugs. Practical trap worth telling: a stray `console.log`/`print` in a stdio server corrupts the JSON-RPC stream. Logs must go to stderr or protocol logging. If you debugged this once, it's a great war story.

---

# 7. Transports — mechanics and the evolution story

## 7.1 stdio

- Host **spawns the server as a subprocess**. Client writes JSON-RPC to the server's **stdin**, reads from its **stdout**. **Newline-delimited**: one message per line, no embedded newlines. stderr is free for logs.
- **WHY it's the default for local:** zero network surface (nothing listens on a port — nothing to scan or attack), zero auth needed (process spawning *is* the trust decision — inherits OS user permissions), trivial lifecycle (kill the process = close the connection), sub-millisecond latency, and implementable in any language that can read stdin.
- **Limits:** same machine only; one client per process; secrets arrive via environment variables at spawn.

## 7.2 The deprecated HTTP+SSE transport — know it to explain WHY it died

Original remote transport (pre-2025-03): **two endpoints** — client opens a long-lived GET (SSE stream) for server→client messages, and POSTs client→server messages to a *separate* URL announced over that stream.
**Why it died:** (1) the permanent open SSE connection per client murders scalability — every client holds a socket forever, breaks serverless/lambda deployments entirely; (2) **no resumability** — drop the SSE connection, lose in-flight messages, restart the session; (3) two-endpoint dance is awkward through proxies/load balancers. This failure analysis *is* the interview answer to "why streamable HTTP?"

## 7.3 Streamable HTTP (current finalized spec)

**One endpoint.** Mechanics:
- Client → server: **HTTP POST** with the JSON-RPC message. Server replies either `application/json` (single response — simple case) **or** upgrades that same response to `text/event-stream` (SSE) when it needs to stream multiple messages back — progress notifications, or even server→client requests like elicitation — before the final response.
- Optional client → server **GET** opens a standing SSE stream for unsolicited server messages (list_changed etc.). Optional, not required — that's the fix for the always-open-socket problem.
- **Sessions:** server may return `Mcp-Session-Id` header on initialize; client echoes it on every request; `DELETE` ends the session. WHY: HTTP requests are independent — the header is what stitches them into one logical MCP connection, and it's what lets a load balancer route a session to the replica holding its state (or lets you externalize that state to Redis — the scaling answer you give for your gateway).
- **Resumability:** SSE events carry `id`s; on reconnect the client sends `Last-Event-ID`; server replays missed messages *from that stream*. WHY per-stream replay: it makes delivery effectively at-least-once across network blips without a message broker.
- **Protocol version pinned per-request** via `MCP-Protocol-Version` header (see §3.2).
- **Security note to say unprompted:** servers must validate `Origin` (DNS-rebinding defense) and bind localhost servers to 127.0.0.1 — a browser page can otherwise reach a local MCP server.

**INTERVIEW LINE:** "Streamable HTTP's trick is that a plain request-response and a full streaming session are the *same endpoint* — the server chooses per-request whether to answer with JSON or upgrade to SSE. Simple servers stay stateless and lambda-friendly; rich servers get streaming and server-initiated messages. The old transport forced everyone to pay the streaming cost."

---

# 8. Authorization — OAuth 2.1, and why passthrough is banned

Applies to HTTP transports (stdio trusts the spawn + env vars).

**The model:** the MCP server is an **OAuth 2.1 resource server**. Flow:
1. Client hits server unauthenticated → `401` + `WWW-Authenticate` header pointing to **Protected Resource Metadata** (RFC 9728) → which names the server's **Authorization Server**.
2. Client discovers the AS's endpoints (Authorization Server Metadata, RFC 8414), optionally self-registers (**Dynamic Client Registration**, RFC 7591 — WHY: thousands of long-tail clients can't pre-register manually).
3. Standard **authorization-code + PKCE** flow (OAuth 2.1 makes PKCE mandatory — kills code-interception attacks). 
4. Token request includes a **`resource` indicator** (RFC 8707) naming the *specific MCP server* → token audience is bound to that server.
5. Server validates token audience/scopes on **every request**.

**WHY audience binding + the passthrough ban (the confused-deputy answer):** if a token minted for server A could be replayed at server B — or if your gateway simply forwarded the client's inbound token downstream — then a malicious or compromised downstream service can harvest tokens, and downstream services can't tell who's actually asking. The rule: each hop authenticates itself; your gateway accepts the user's token, then performs **token exchange** to mint narrow, audience-bound credentials for each downstream tool. That's precisely the "never token passthrough" line in your platform doc — now you can defend it with the RFCs.

**WHY separate AS from RS:** tool teams shouldn't build login. The server just validates tokens; identity stays with the org's IdP (your SSO). Enterprises get: one place users consent, one place tokens revoke, per-tool scopes.

---

# 9. How a single tool call actually flows, end to end (rehearse aloud)

User asks the assistant "what's blocking PROJ-123?"

1. Host has, at connect time: initialized each server, negotiated capabilities, fetched `tools/list`, filtered by user role, translated tool schemas into the LLM's function-calling format.
2. LLM emits a call: `jira.search_issues({query: "PROJ-123 blockers"})`.
3. Host policy check: read-only per *registry* metadata (not the server's annotation) → auto-approved. Audit event written.
4. Client sends `tools/call` request (id 42) over Streamable HTTP POST, with session id + protocol-version headers + audience-bound downstream token.
5. Server validates token, validates args against inputSchema, executes; long call → streams `notifications/progress` on the SSE response.
6. Result: `content` blocks + `structuredContent`, `isError: false` → arrives, matched by id 42.
7. Host injects result into model context **as untrusted data** (injection surface!); model composes the answer; citations rendered from `resource_link`s.
8. Failure path at step 5: Jira 403 → `isError: true` result → model sees it, tells the user they lack access, suggests requesting it. Self-correction, because the error was in-band.

If you can narrate that in ~90 seconds with the ids, headers, and trust checks in place, you've demonstrated the whole protocol.

---

# 10. The security model in one table

| Threat | Vector | Protocol answer | Your platform's answer |
|---|---|---|---|
| Prompt injection | tool results / resource contents contain instructions | results are data, host mediates | treat all tool output as untrusted; filters; approval on writes |
| Tool poisoning | malicious `description`/`instructions` | — (descriptions are free text) | registry review + pinned manifests |
| Rug pull | definition changes post-approval via `list_changed` | list_changed is observable | diff on change, re-approval gate |
| Lying annotations | `readOnlyHint` on a destructive tool | spec says hints are untrusted | policy from own registry metadata only |
| Confused deputy | gateway's broad creds used for low-priv user | audience-bound tokens, no passthrough | per-user token exchange |
| Token replay | token for server A used at B | RFC 8707 resource indicators | audience validation every hop |
| DNS rebinding | browser page hits localhost server | Origin validation, bind 127.0.0.1 | n/a (server-side), but know it |
| Data exfil via sampling | server pumps prompts through host LLM | human-in-the-loop on sampling | sampling requests surfaced for approval |

---

# 11. What's changing — 2026-07-28 release candidate (the "I stay current" section)

Locked May 21, 2026; final spec July 28, 2026; formal 12-month deprecation windows. The largest revision since launch. What to know:

- **Stateless core.** Protocol-level sessions and `Mcp-Session-Id` are removed; the `initialize`/`initialized` handshake is gone. Negotiated values (protocol version, capabilities) now travel in `_meta` on *every request*; a new `server/discover` method covers upfront capability fetching. WHY: sessions forced sticky load balancing and broke serverless; stateless requests scale on plain HTTP infrastructure. State that servers still need (a workflow, a browser session) becomes explicit *handles* the client passes back — visible, loggable, scoped — instead of implicit session memory.
- **New mandatory headers** on Streamable HTTP: `Mcp-Method` and `Mcp-Name` — so gateways, load balancers, and rate limiters can route/limit on the operation *without parsing the JSON body*. Directly relevant to your gateway: L7 routing on headers is far cheaper than body inspection. Servers must reject header/body mismatches.
- **Extensions framework.** Capabilities like **Tasks** (long-running async work — create, poll, results outlive the connection) and **MCP Apps** (server-shipped sandboxed HTML UI) become extensions with reverse-DNS IDs, negotiated via an extensions map, versioned independently of the core spec. WHY: the core stays small; big features ship on their own timeline.
- **Deprecations:** Roots, Sampling, and (server→client) Logging are deprecated — annotation-only for now, ≥12 months before removal. Direction: explicit tool params instead of roots; servers call LLM APIs directly instead of sampling.
- **Auth hardening:** clients must validate the `iss` parameter on authorization responses (RFC 9207, mix-up attack defense — matters because MCP's shape is one client × many servers), declare `application_type` at dynamic registration, and bind registered credentials to the issuing AS.
- **Client-side caching standardized:** `ttlMs` and `cacheScope` on list/read responses — clients finally know how long a tool list is fresh and whether it's shareable across users.

**INTERVIEW LINE:** "The protocol is converging on what we had to build by hand — the 2026 RC's stateless core plus Mcp-Method routing headers is essentially the gateway-scaling problem we solved with session affinity, now solved at the protocol layer. Tasks formalizes long-running tool work; MCP Apps I'd treat carefully — server-rendered UI in the host is a new XSS-class surface."

That last sentence (an *opinion* with a security caveat) is worth more than ten memorized facts.

---

# 12. Rapid-fire internals Q&A (drill these AI-off, 60–90s each)

1. **"What actually goes over the wire?"** → JSON-RPC 2.0: requests (id), responses (same id, result XOR error), notifications (no id). Newline-delimited on stdio; POST bodies / SSE events on HTTP.
2. **"Why JSON-RPC over REST?"** → transport-agnostic, bidirectional, id-multiplexed, event notifications built in. §2.
3. **"Tools vs resources vs prompts?"** → same data, different *control planes*: model- vs app- vs user-controlled; the type system encodes who pulls the trigger, which is what the host hangs trust policy on. §4.
4. **"How do errors reach the model?"** → two levels: protocol errors (JSON-RPC error, plumbing) vs execution errors (`isError: true` in result, in-band so the model can self-correct). §4.1.
5. **"How does a server tell the client its tools changed?"** → `listChanged` capability → notification → re-list. And that's the rug-pull surface → pin + diff.
6. **"What is sampling and why would a server want it?"** → borrow the host's LLM: no key custody, human-in-the-loop, abstract model preferences. Deprecated in the 2026 RC in favor of direct API calls — know both arguments.
7. **"How does the remote transport scale?"** → Streamable HTTP: one endpoint, POST→JSON or POST→SSE upgrade, optional GET stream, sessions via header (current spec) — externalize session state or use affinity; the 2026 RC removes sessions entirely. §7.3, §11.
8. **"How does a client resume after a network drop?"** → SSE event ids + `Last-Event-ID` replay per stream.
9. **"Walk me through MCP auth."** → 401 → protected resource metadata → AS discovery → DCR → auth-code+PKCE → resource-indicator-bound token → per-request audience validation. Then the passthrough ban and token exchange at the gateway. §8.
10. **"Why is forwarding the user's token downstream bad?"** → confused deputy + audience violation + audit loss; each hop mints its own audience-bound credential. §8.
11. **"Can two requests be in flight at once?"** → yes; id correlation makes responses order-independent; progress and cancellation reference the request id/token.
12. **"How would you cancel a running tool call?"** → `notifications/cancelled`; best-effort; tolerate the response racing in anyway.
13. **"Version negotiation?"** → date versions proposed at initialize (current spec), pinned per-request via header on HTTP; RC moves it into `_meta` per request.
14. **"Biggest protocol-level security worry?"** → pick one and go deep: tool descriptions as injection surface, or annotations-as-untrusted-hints. Always end with what the *host* must do.
15. **"What's new in the protocol lately?"** → §11, in your own words, ending with your MCP Apps caveat.

---

# 13. Honesty guardrails for this document

- The spec knowledge here is yours to *understand*, not to claim you implemented. Keep a bright line in interviews: "the protocol works like X; in our platform we did Y." Claiming you built resumable SSE replay when you didn't will collapse under one follow-up.
- `[VERIFY against your build]`: which protocol version(s) your platform targeted; which transports you shipped; whether you used sampling/elicitation/subscriptions at all (most 2025 enterprise builds didn't — saying "we didn't need elicitation; our clients were programmatic" is a fine, honest answer).
- If asked something beyond this doc: "I haven't implemented that part of the spec — my read is X, and here's how I'd verify." Reasoning + honesty beats recall.
