"The best way to learn AI architecture is to reverse-engineer the systems you use every day."

This chapter follows the traditional system design learning path — design a movie booking system, design Uber — but applied to AI. Each exercise is based on a real product. Build these (even partially) and you'll understand AI architecture from the inside out.

---

# Part 1 — Agent Architecture Patterns (The Foundation)

Before designing systems, internalize these patterns. Every real product in Part 2-4 uses one or more of them. These are your whiteboard building blocks.

---

# Pattern 1: ReAct Loop (Reason + Act)

The simplest agentic pattern. Think → Act → Observe → Repeat.

```
┌─────────────────────────────────────┐
│           ReAct Agent               │
│                                     │
│   ┌─────────┐                       │
│   │  Think  │ ← "I need to search  │
│   └────┬────┘    for the error"     │
│        ▼                            │
│   ┌─────────┐                       │
│   │   Act   │ ← tool_call:         │
│   └────┬────┘    grep("error")      │
│        ▼                            │
│   ┌─────────┐                       │
│   │ Observe │ ← "Found in auth.py  │
│   └────┬────┘    line 42"           │
│        ▼                            │
│   ┌─────────┐                       │
│   │  Think  │ ← "Now I need to     │
│   └────┬────┘    read that file"    │
│        ▼                            │
│      ... (loop continues)           │
│        ▼                            │
│   ┌─────────┐                       │
│   │  Done   │ ← "Here's the fix"   │
│   └─────────┘                       │
└─────────────────────────────────────┘
```

**Who uses it:** Claude Code, ChatGPT with tools, any single-agent system.

**Implementation:** `while (needs_more_work) { think → tool_call → observe }`

**When to use:** Most tasks. Start here. Upgrade only when this isn't enough.

---

# Pattern 2: Orchestrator-Worker

A central orchestrator decomposes tasks and delegates to stateless workers. ~70% of production multi-agent systems use this.

```
                    ┌──────────────┐
                    │ Orchestrator │
                    │  (Planner)   │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Worker 1 │ │ Worker 2 │ │ Worker 3 │
        │ (Search) │ │ (Code)   │ │ (Test)   │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          ▼
                    ┌──────────────┐
                    │ Orchestrator │
                    │  (Merge)     │
                    └──────────────┘
```

**Who uses it:** Devin (planner + specialized executors), most enterprise agent systems.

**Key insight:** Orchestrator maintains global state. Workers are stateless and focus on one capability.

**When to use:** Task can be decomposed into independent subtasks. Workers don't need to communicate with each other.

---

# Pattern 3: Supervisor-Worker (Hierarchical)

Like orchestrator-worker, but the supervisor actively monitors, corrects, and re-assigns work.

```
                    ┌──────────────┐
                    │  Supervisor  │
                    │ (monitors +  │
                    │  reassigns)  │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
      ┌──────────┐  ┌──────────┐  ┌──────────┐
      │ Agent A  │  │ Agent B  │  │ Agent C  │
      │ Research │  │ Writing  │  │ Review   │
      └──────────┘  └──────────┘  └──────────┘
            │              │              │
            └──────────────┼──────────────┘
                           ▼
                    ┌──────────────┐
                    │  Supervisor  │
                    │ (validates)  │
                    └──────────────┘
```

**Difference from orchestrator-worker:** Supervisor checks quality mid-execution and can re-route, retry, or abort. Orchestrator just dispatches and merges.

**When to use:** High-stakes tasks where quality control matters at each step.

---

# Pattern 4: Fan-Out / Fan-In

Parallel execution of independent tasks, then aggregation.

```
                    ┌─────────┐
                    │  Query  │
                    └────┬────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐
   │  Search   │  │  Search   │  │  Search   │
   │  Source A │  │  Source B │  │  Source C │
   └─────┬─────┘  └─────┬─────┘  └─────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                  ┌─────────────┐
                  │   Merger    │
                  │ (dedupe,    │
                  │  rank,      │
                  │  synthesize)│
                  └─────────────┘
```

**Who uses it:** Perplexity (parallel web searches), RAG hybrid search (vector + keyword + graph in parallel).

**When to use:** Independent data sources. Latency-sensitive (parallel = faster than sequential).

---

# Pattern 5: Pipeline (Sequential Chain)

Each stage processes and passes output to the next. Output of stage N = input of stage N+1.

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Extract │──▶│ Analyze │──▶│  Write  │──▶│ Review  │
└─────────┘   └─────────┘   └─────────┘   └─────────┘
```

**When to use:** Each step depends on the previous step's output. Order matters.

**Real example:** Document processing: Parse PDF → Extract tables → Summarize → Generate report.

---

# Pattern 6: Reflection / Self-Critique

Agent evaluates its own output and iterates.

```
┌────────────────────────────────────┐
│                                    │
│   Generate ──▶ Critique ──▶ Score  │
│       ▲                      │     │
│       │         Score < T?   │     │
│       │              │       │     │
│       │         Yes  ▼  No   │     │
│       └──── Revise   Done ◀──┘     │
│                                    │
│   Max iterations = 3 (CRITICAL)    │
└────────────────────────────────────┘
```

**Who uses it:** Code review agents, writing assistants, any quality-critical output.

**CRITICAL:** Always set a max iteration limit. Without it, agents enter infinite revision loops. 3 rounds is typical.

---

# Pattern 7: Actor-Critic (Dual-Agent)

Separate generator and evaluator. Different from reflection because the critic is a DIFFERENT agent/model.

```
┌──────────┐          ┌──────────┐
│  Actor   │──draft──▶│  Critic  │
│(Generator)│         │(Evaluator)│
│          │◀─score───│  Score +  │
│          │ feedback │  Feedback │
└──────────┘          └──────────┘
     │                      │
     │    Max 3 rounds      │
     │                      │
     ▼                      ▼
 Final Draft          Approval
```

**Who uses it:** Your Seismic Agent Migration tool (RLAIF-critic scoring), enterprise content generation.

**Difference from reflection:** Reflection = agent critiques itself. Actor-Critic = a separate agent (often a different model) does the critique. Critic can be cheaper model focused on evaluation.

---

# Pattern 8: Swarm (Peer-to-Peer)

No central coordinator. Agents self-claim tasks from a shared state.

```
┌───────────────────────────────────┐
│         Shared Task Board         │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐    │
│  │ T1 │ │ T2 │ │ T3 │ │ T4 │    │
│  │done│ │ ⚡ │ │wait│ │wait│    │
│  └────┘ └────┘ └────┘ └────┘    │
└──────────┬──────────┬────────────┘
           │          │
     ┌─────┴──┐  ┌────┴───┐
     │Agent A │  │Agent B │
     │claims  │  │claims  │
     │T2      │  │T3      │
     └────────┘  └────────┘
```

**Who uses it:** Your Seismic Agent Migration tool (tasks.md as shared state), OpenAI Swarm (archived).

**When to use:** Highly parallel, independent tasks. Research exploration.

**Warning:** <cite index="62-1">For regulated domains (finance, healthcare, anything in EU AI Act Annex III), swarm is usually not a defensible architecture</cite> due to lack of audit trail.

---

# Pattern Selection Decision Tree

```
                    Your Task
                       │
               ┌───────┴───────┐
               │               │
          Single Step?    Multi-Step?
               │               │
               ▼               ▼
          ReAct Loop    Can steps run
          (Pattern 1)   in parallel?
                           │
                    ┌──────┴──────┐
                    │             │
                   Yes           No
                    │             │
                    ▼             ▼
               Fan-Out/In    Pipeline
               (Pattern 4)  (Pattern 5)
                    │             │
                    │      Need quality
                    │      control?
                    │         │
                    │    ┌────┴────┐
                    │    │        │
                    │   Yes      No
                    │    │        │
                    │    ▼        ▼
                    │ Actor-    Pipeline
                    │ Critic    done
                    │ (P7)
                    │
               Need multiple
               specialists?
                    │
              ┌─────┴─────┐
              │           │
             Yes         No
              │           │
              ▼           ▼
       Need central   Fan-Out/In
       control?       done
              │
         ┌────┴────┐
         │        │
        Yes      No
         │        │
         ▼        ▼
    Supervisor   Swarm
    (Pattern 3) (Pattern 8)
```

---

# Pattern Economics (Real 2026 Data)

<cite index="62-1">Independent multi-agent setups incur about 58% token overhead. Centralized multi-agent (supervisor/orchestrator) incurs around 285%.</cite>

A 2026 research finding: <cite index="62-1">when you give a single agent the same total compute a multi-agent system uses, the single agent often matches or beats it on reasoning tasks.</cite>

**Rule:** Don't go multi-agent unless specialization, parallelism, or critique provides measurable value over a single agent with equivalent compute budget.

---

# Part 2 — System Design Exercises (Whiteboard-Ready)

---

# System 1: Design a RAG Pipeline

**Reference:** Perplexity, any enterprise knowledge assistant
**Interview Prompt:** "Design a system that lets employees ask questions about internal docs and get cited answers."

---

**Whiteboard Diagram (draw this)**

```
┌─────────────────── OFFLINE (Ingestion) ───────────────────┐
│                                                           │
│  Documents ──▶ Loader ──▶ Chunker ──▶ Embedder ──▶ VectorDB │
│  (PDF,Wiki,     │         │           │           │       │
│   Slack,Git)    │    ┌────┴────┐      │      ┌────┴────┐  │
│                 │    │Semantic │      │      │ Qdrant/ │  │
│                 │    │chunks   │      │      │Pinecone │  │
│                 │    │(tree-   │      │      └─────────┘  │
│                 │    │sitter   │      │                   │
│                 │    │for code)│      │   + Metadata      │
│                 │    └─────────┘      │   (source, date,  │
│                 │                     │    author, dept)   │
└─────────────────┴─────────────────────┴───────────────────┘

┌─────────────────── ONLINE (Query) ────────────────────────┐
│                                                           │
│  User Query                                               │
│      │                                                    │
│      ▼                                                    │
│  Query Processor                                          │
│  ├── Rewrite ("pricing" → "enterprise pricing plans")     │
│  ├── Expand (add synonyms)                                │
│  └── Classify (factual? analytical? navigational?)        │
│      │                                                    │
│      ▼                                                    │
│  ┌─────────── Hybrid Search ──────────┐                   │
│  │                                    │                   │
│  │  Vector Search    Keyword (BM25)   │                   │
│  │  (semantic)       (exact match)    │                   │
│  │      │                │            │                   │
│  │      └───────┬────────┘            │                   │
│  │              ▼                     │                   │
│  │     Reciprocal Rank Fusion         │                   │
│  └────────────────┬───────────────────┘                   │
│                   ▼                                       │
│              Reranker (Cross-Encoder)                      │
│                   │                                       │
│                   ▼                                       │
│              Top-N Documents                              │
│                   │                                       │
│                   ▼                                       │
│  Context Builder                                          │
│  ├── System Prompt (10% budget)                           │
│  ├── Retrieved Docs (50% budget)                          │
│  ├── Conversation History (20% budget)                    │
│  ├── Memory (10% budget)                                  │
│  └── Generation Reserve (10% budget)                      │
│                   │                                       │
│                   ▼                                       │
│                  LLM                                      │
│                   │                                       │
│                   ▼                                       │
│         Response + Citations                              │
└───────────────────────────────────────────────────────────┘
```

---

**How Perplexity Does It**

<cite index="16-1">Perplexity uses custom embedding models (pplx-embed) for similarity matching. These determine which documents enter the candidate pool before ranking.</cite>

Their Deep Research mode is an **agentic RAG loop** — not a single retrieval pass but an iterative cycle: retrieve → read → reason about what's missing → retrieve again → iterate.

Latest evolution (June 2026): <cite index="17-1">Instead of calling a fixed search API, the model writes a custom Python script to run the search, combining multiple search operations into a single workflow.</cite> They call this "Search as Code."

---

**Trade-off Matrix**

| Decision | Option A | Option B | When to pick A | When to pick B |
|----------|----------|----------|---------------|---------------|
| Chunk size | Small (128 tokens) | Large (512 tokens) | High precision needed, FAQ | Long documents, research papers |
| Search type | Vector only | Hybrid (vector + BM25) | Conversational queries | Mix of exact terms + concepts |
| Reranker | Skip | Cross-encoder | Low latency required | Quality critical |
| Top-K | 5 | 20 | Fast, focused | High recall needed |

---

**Interview Scenario:**

> "You have 50,000 internal Confluence pages. Engineers ask questions like 'How do I deploy to staging?' and 'What's the on-call rotation for Team X?' Latency target: <3 seconds. Budget: minimal."

**Answer approach:**
1. Chunking: Document-aware (split by Confluence headings)
2. Search: Hybrid (BM25 catches exact team names, vector catches semantic meaning)
3. Reranker: Yes — Confluence pages are noisy, reranking is critical
4. Model: Small model (Haiku/GPT-4o-mini) — factual extraction, not reasoning
5. Cache: Semantic cache for repeated questions ("how to deploy" asked 50x/day)

---

# System 2: Design an AI Memory System

**Reference:** Mem0, ChatGPT Dreaming V3, Claude Memory
**Interview Prompt:** "Design a system that remembers user preferences across sessions and personalizes responses."

---

**Whiteboard Diagram**

```
┌─────────── WRITE PATH (After Each Conversation) ─────────┐
│                                                           │
│  Conversation Turn                                        │
│       │                                                   │
│       ▼                                                   │
│  Fact Extraction (LLM)                                    │
│  "User is a backend engineer at Google, prefers Python"   │
│       │                                                   │
│       ▼                                                   │
│  Candidate Memories                                       │
│  ├── "User is backend engineer"                           │
│  ├── "User works at Google"                               │
│  └── "User prefers Python"                                │
│       │                                                   │
│       ▼  (for each candidate)                             │
│  Vector Search: find top-K similar existing memories      │
│       │                                                   │
│       ▼                                                   │
│  Operation Classifier (LLM)                               │
│  ├── ADD    → new fact, store it                          │
│  ├── UPDATE → refines existing memory, replace            │
│  ├── DELETE → contradicts existing, remove old            │
│  └── NOOP   → already known, skip                         │
│       │                                                   │
│       ▼                                                   │
│  Storage                                                  │
│  ├── Vector Store (semantic search)                       │
│  ├── Graph Store (relationships: user→company→project)    │
│  └── History Log (audit trail)                            │
└───────────────────────────────────────────────────────────┘

┌─────────── READ PATH (At Query Time) ────────────────────┐
│                                                           │
│  User Query                                               │
│       │                                                   │
│       ▼                                                   │
│  Memory Retrieval                                         │
│  ├── Vector similarity search                             │
│  ├── Metadata filter (user_id, recency)                   │
│  └── Graph traversal (related entities)                   │
│       │                                                   │
│       ▼                                                   │
│  Ranking                                                  │
│  score = similarity × recency_weight × importance         │
│       │                                                   │
│       ▼                                                   │
│  Top Memories → inject into context                       │
└───────────────────────────────────────────────────────────┘
```

---

**Real-World Comparison**

| System | Architecture | Storage | Temporal Awareness |
|--------|-------------|---------|-------------------|
| Mem0 | Extract → Classify (ADD/UPDATE/DELETE/NOOP) → Vector + Graph | Vector DB + Neo4j | No native temporal |
| ChatGPT Dreaming V3 | Background synthesis ("dreaming") from conversation history | Separate data layer, injected into system prompt | Yes — auto-updates past events |
| Claude Memory | Derived from past conversations, periodic background updates | Injected into context | Partial |

ChatGPT's approach is notably different — <cite index="41-1">no vector database, no complex retrieval mechanism. Instead, a lightweight system that pre-computes summaries and injects them directly into the system prompt.</cite>

The June 2026 Dreaming V3 rebuild: <cite index="42-1">Time-sensitive memory accuracy went from 9.4% under the 2024 system to 75.1% under Dreaming V3 — the single biggest delta in any metric ChatGPT has ever published for an internal-component upgrade.</cite>

---

**Interview Scenario:**

> "Your AI assistant serves 100K users. Each user has ~500 past conversations. Users complain the assistant doesn't remember them. Storage budget is limited. Latency budget: <200ms for memory retrieval."

**Answer approach:**
1. Don't store raw conversations — extract atomic facts (Mem0 pattern)
2. ~500 conversations × extraction = maybe 50-200 facts per user (compact)
3. Per-user vector index (tenant isolation)
4. Retrieval: top-5 memories by similarity + recency weighting
5. Memory aging: TTL on low-importance memories
6. Conflict resolution: latest wins + version history
7. Inject top memories into system prompt (ChatGPT pattern — fast, no retrieval latency)

---

# System 3: Design MCP (Model Context Protocol)

**Reference:** modelcontextprotocol.io (Anthropic)
**Interview Prompt:** "Design a protocol that lets any AI app use any external tool through a standardized interface."

---

**Whiteboard Diagram**

```
┌─────────────────────────────────────────────────────────┐
│                    HOST APPLICATION                       │
│                 (Claude Desktop / Cursor)                 │
│                                                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │ MCP Client │  │ MCP Client │  │ MCP Client │        │
│  │     1      │  │     2      │  │     3      │        │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘        │
└────────┼───────────────┼───────────────┼────────────────┘
         │               │               │
    JSON-RPC 2.0    JSON-RPC 2.0    JSON-RPC 2.0
    (stdio/HTTP)    (stdio/HTTP)    (HTTP+SSE)
         │               │               │
   ┌─────┴──────┐  ┌─────┴──────┐  ┌─────┴──────┐
   │ MCP Server │  │ MCP Server │  │ MCP Server │
   │  (GitHub)  │  │(PostgreSQL)│  │  (Slack)   │
   └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
         │               │               │
   ┌─────┴──────┐  ┌─────┴──────┐  ┌─────┴──────┐
   │  GitHub    │  │  Database  │  │   Slack    │
   │  API       │  │            │  │   API      │
   └────────────┘  └────────────┘  └────────────┘
```

**Protocol Lifecycle (draw this sequence)**

```
Client                              Server
  │                                    │
  │──── initialize ───────────────────▶│
  │     {protocolVersion, capabilities}│
  │                                    │
  │◀─── initialize response ──────────│
  │     {capabilities, serverInfo,     │
  │      tools list}                   │
  │                                    │
  │──── tools/list ───────────────────▶│
  │                                    │
  │◀─── tool schemas ─────────────────│
  │     [{name, description,           │
  │       inputSchema}]                │
  │                                    │
  │ ─ ─ ─ RUNTIME ─ ─ ─ ─ ─ ─ ─ ─ ─ │
  │                                    │
  │──── tools/call ───────────────────▶│
  │     {name: "create_issue",         │
  │      arguments: {title, body}}     │
  │                                    │
  │◀─── result ───────────────────────│
  │     {content: [{type: "text",      │
  │      text: "Issue #42 created"}]}  │
  │                                    │
```

**The N×M Problem MCP Solves**

```
WITHOUT MCP:                    WITH MCP:
N tools × M apps = N×M         N servers + M clients = N+M
integrations                    integrations

3 tools × 4 apps = 12          3 servers + 4 clients = 7
10 tools × 10 apps = 100       10 + 10 = 20
```

**Three Capability Types (memorize this)**

| Type | Controlled By | Example | Direction |
|------|--------------|---------|-----------|
| Tools | Model decides when to call | `create_issue`, `query_db` | Model → Server |
| Resources | Application decides what to include | File contents, API docs | App → Context |
| Prompts | User decides when to invoke | "Code review" template | User → App |

---

# System 4: Design an AI Code Editor

**Reference:** Cursor
**Interview Prompt:** "Design a VS Code fork where the AI understands the entire codebase and can make multi-file edits."

---

**Whiteboard Diagram**

```
┌───────────────────────────────────────────────────────────┐
│                    CURSOR ARCHITECTURE                     │
│                                                           │
│  ┌─────────────── Codebase Indexer ────────────────┐      │
│  │                                                 │      │
│  │  File Watcher ──▶ Tree-sitter ──▶ Chunker      │      │
│  │  (Merkle tree      (AST parser)    (functions,  │      │
│  │   detects changes)                  classes)     │      │
│  │                        │                        │      │
│  │                        ▼                        │      │
│  │                   Embedder                      │      │
│  │                        │                        │      │
│  │                        ▼                        │      │
│  │               Turbopuffer (Vector DB)            │      │
│  │               [embeddings only, NOT source code] │      │
│  └─────────────────────────────────────────────────┘      │
│                                                           │
│  ┌─────────────── Context Engine (RAG) ────────────┐      │
│  │                                                 │      │
│  │  User Query ──▶ Embed ──▶ Semantic Search       │      │
│  │                              │                  │      │
│  │  @ References ──────────────▶│                  │      │
│  │  (@file, @codebase,         │                  │      │
│  │   @docs, @git)               │                  │      │
│  │                              ▼                  │      │
│  │                    Context Assembly              │      │
│  │                    (13K token budget)             │      │
│  └──────────────────────┬──────────────────────────┘      │
│                         │                                 │
│  ┌──────────────────────┼──────────────────────────┐      │
│  │         Model Router │                          │      │
│  │              ┌───────┼───────┐                  │      │
│  │              ▼       ▼       ▼                  │      │
│  │         Claude    GPT-4   cursor-small          │      │
│  │         (logic)  (speed)  (autocomplete)        │      │
│  └─────────────────────────────────────────────────┘      │
│                                                           │
│  ┌──────── Tab Model (Autocomplete) ──────────┐          │
│  │  Speculative Decoding:                      │          │
│  │  - Predict DIFF, not full file              │          │
│  │  - Skip unchanged code                      │          │
│  │  - RL loop: learn what NOT to suggest       │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌──────── Background Agents ─────────────────┐          │
│  │  BugBot: automated PR review                │          │
│  │  Long-running: refactoring, migrations      │          │
│  └─────────────────────────────────────────────┘          │
│                                                           │
│  ┌──────── MCP Integration ───────────────────┐          │
│  │  External tools via MCP servers             │          │
│  │  (DB queries, docs, APIs)                   │          │
│  └─────────────────────────────────────────────┘          │
└───────────────────────────────────────────────────────────┘
```

**Why fork VS Code instead of building an extension?**

<cite index="22-1">GitHub Copilot operates as a VS Code extension — it's constrained by the extension API. It can suggest completions and answer chat questions, but it cannot deeply index your codebase, apply multi-file edits atomically, or run background agents.</cite>

Cursor forked VS Code to get full control. The extension API is too limited for codebase-level RAG and multi-file atomic edits.

---

# System 5: Design an AI Coding Agent

**Reference:** Claude Code
**Interview Prompt:** "Design a terminal agent that reads, edits, tests code, and iterates until the task is done."

---

**Whiteboard Diagram**

```
┌──────────────────── CLAUDE CODE ────────────────────────┐
│                                                         │
│  User (terminal) ──▶ Agent Core                         │
│                         │                               │
│                    while(true):                          │
│                         │                               │
│                    ┌────┴────┐                           │
│                    │  LLM    │ ← Reason about next step  │
│                    └────┬────┘                           │
│                         │                               │
│                    ┌────┴────┐                           │
│                    │  Tool   │ ← Generate tool call      │
│                    │  Call   │                           │
│                    └────┬────┘                           │
│                         │                               │
│              ┌──────────┼──────────┐                    │
│              ▼          ▼          ▼                    │
│         Permission   Permission  Permission             │
│         Pipeline     Pipeline    Pipeline               │
│              │          │          │                    │
│         ┌────┴────┐ ┌───┴───┐ ┌───┴───┐               │
│         │  Bash   │ │ Read  │ │ Edit  │               │
│         │(universal│ │       │ │       │               │
│         │ adapter)│ │       │ │       │               │
│         └────┬────┘ └───┬───┘ └───┬───┘               │
│              │          │          │                    │
│    Also: Write, Grep, Glob, Task (sub-agents),         │
│          TodoWrite                                      │
│              │                                          │
│              ▼                                          │
│         Observe result                                  │
│              │                                          │
│         Done? ──No──▶ back to LLM                       │
│           │                                             │
│          Yes                                            │
│           │                                             │
│           ▼                                             │
│        Response                                         │
└─────────────────────────────────────────────────────────┘

Permission Pipeline (3-tier):
┌─────────┐   ┌──────────┐   ┌──────────┐   ┌──────┐
│ .claude/ │──▶│ Tool     │──▶│ Mode     │──▶│ User │
│ rules    │   │ logic    │   │classifier│   │prompt│
└─────────┘   └──────────┘   └──────────┘   └──────┘
```

**The Surprising Simplicity**

<cite index="31-1">Claude Code runs a while(tool_call) loop — no DAGs, no classifiers, no RAG. The model decides everything.</cite>

<cite index="31-1">Eight core tools: Bash, Read, Edit, Write, Grep, Glob, Task (sub-agents), TodoWrite. That's the entire arsenal.</cite>

**Why grep instead of RAG for code search?**
<cite index="31-1">Early versions used Voyage embeddings for semantic code search. Anthropic switched to grep-based (ripgrep) agentic search — no index sync required, no security liabilities from external embeddings.</cite>

**Sub-agent architecture:**
The `Task` tool spawns a sub-agent with its own context window. Main agent plans, sub-agents execute specific subtasks in isolation.

---

**Devin's Architecture (for comparison)**

```
┌──────────────── DEVIN ─────────────────────────┐
│                                                 │
│  Planner Agent                                  │
│       │                                         │
│       ▼                                         │
│  ┌─────────────── Sandbox VM ────────────────┐  │
│  │  Full Ubuntu VM (per session)              │  │
│  │                                            │  │
│  │  ┌──────────┐  ┌───────────┐              │  │
│  │  │  Shell   │  │ Headless  │              │  │
│  │  │(terminal)│  │ Browser   │              │  │
│  │  └──────────┘  └───────────┘              │  │
│  │                                            │  │
│  │  ┌──────────┐  ┌───────────┐              │  │
│  │  │  Code    │  │  Package  │              │  │
│  │  │  Editor  │  │  Managers │              │  │
│  │  └──────────┘  └───────────┘              │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  ┌── Integrations ──┐                           │
│  │ GitHub, Slack,    │                           │
│  │ Linear, Jira      │                           │
│  └───────────────────┘                           │
└─────────────────────────────────────────────────┘
```

<cite index="55-1">Devin runs within a dedicated, containerized virtual machine. Every user session spins up a fresh VM with full access to the file system, package managers, and runtime compilers.</cite>

**Key architectural difference:** Claude Code runs on YOUR machine with YOUR permissions. Devin runs in a cloud sandbox. This changes the entire trust/permission model.

---

# System 6: Design an LLM Serving System

**Reference:** vLLM
**Interview Prompt:** "Design a system that serves LLM inference to 10K concurrent users with <2s latency."

---

**Whiteboard Diagram**

```
┌─────────────────── LLM Serving ────────────────────────┐
│                                                         │
│  HTTP Requests                                          │
│       │                                                 │
│       ▼                                                 │
│  Request Queue                                          │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────── Scheduler ──────────┐                     │
│  │                                │                     │
│  │  Continuous Batching:          │                     │
│  │  ┌───┐ ┌───┐ ┌───┐           │                     │
│  │  │R1 │ │R2 │ │R3 │ ← running │                     │
│  │  └───┘ └───┘ └───┘           │                     │
│  │         ┌───┐                 │                     │
│  │         │R4 │ ← joins mid-   │                     │
│  │         └───┘    batch        │                     │
│  │  R2 finishes → removed        │                     │
│  │  R5 joins → takes R2's slot   │                     │
│  └────────────────────────────────┘                     │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────── KV Cache ───────────┐                     │
│  │                                │                     │
│  │  PagedAttention:               │                     │
│  │  ┌────┬────┬────┬────┐        │                     │
│  │  │Pg 1│Pg 2│Pg 3│ .. │ R1     │                     │
│  │  └────┴────┴────┴────┘        │                     │
│  │  ┌────┬────┬────┐             │                     │
│  │  │Pg 1│Pg 2│Pg 3│ R2          │                     │
│  │  └────┴────┴────┘             │                     │
│  │                                │                     │
│  │  Non-contiguous pages          │                     │
│  │  (like virtual memory)         │                     │
│  │  Reduces waste by ~60%         │                     │
│  └────────────────────────────────┘                     │
│       │                                                 │
│       ▼                                                 │
│  ┌─────────── GPU Execution ──────┐                     │
│  │                                │                     │
│  │  Tensor Parallel (split model  │                     │
│  │  across GPUs horizontally)     │                     │
│  │                                │                     │
│  │  GPU 0 ◄──► GPU 1             │                     │
│  │    │           │               │                     │
│  │  GPU 2 ◄──► GPU 3             │                     │
│  └────────────────────────────────┘                     │
│       │                                                 │
│       ▼                                                 │
│  Streaming Output (SSE)                                 │
└─────────────────────────────────────────────────────────┘
```

**PagedAttention (the core innovation):**

Traditional: Allocate max_seq_len × kv_size contiguous memory per request. If max = 4096 but actual = 200 tokens, 95% is wasted.

PagedAttention: Allocate small pages on demand. Like OS virtual memory — physical pages can be non-contiguous, mapped via page table. When a request finishes, pages are freed immediately.

**Speculative Decoding:**
```
Draft Model (small, fast):  generates tokens [A, B, C, D, E]
                                    │
                                    ▼
Main Model (large, slow):  verifies all 5 in ONE forward pass
                                    │
                         ┌──────────┼──────────┐
                         ▼          ▼          ▼
                      [A ✓]      [B ✓]      [C ✓]   [D ✗] → regenerate from D
```

If draft is 80% correct, you get ~4x speedup.

---

# System 7: Design an AI Customer Support System

**Reference:** Intercom Fin, Zendesk AI
**Interview Prompt:** "Design an AI system that handles customer support with 80% automation rate, escalating complex cases to humans."

---

**Whiteboard Diagram**

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  Customer Message                                          │
│       │                                                    │
│       ▼                                                    │
│  ┌──────────────────────┐                                  │
│  │   Intent Classifier   │                                  │
│  │   (small fast model)  │                                  │
│  └──────────┬───────────┘                                  │
│             │                                              │
│    ┌────────┼────────┬──────────┐                          │
│    ▼        ▼        ▼          ▼                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐                    │
│  │ FAQ  │ │Action│ │Comp- │ │Escalate│                    │
│  │      │ │      │ │laint │ │        │                    │
│  └──┬───┘ └──┬───┘ └──┬───┘ └───┬────┘                    │
│     │        │        │         │                          │
│     ▼        ▼        ▼         ▼                          │
│   RAG      Tools    Empathy   Human                        │
│   over     (CRM,    + RAG    Agent                         │
│   KB       order    + Tools  (with full                    │
│            track,            context                       │
│            refund)           transfer)                     │
│     │        │        │                                    │
│     └────────┼────────┘                                    │
│              ▼                                             │
│     ┌──────────────────┐                                   │
│     │ Confidence Gate  │                                   │
│     │                  │                                   │
│     │ Score > 0.85? ───┼──▶ Yes → Send Response            │
│     │                  │                                   │
│     │ Score < 0.85? ───┼──▶ No  → Escalate to Human        │
│     └──────────────────┘                                   │
│              │                                             │
│              ▼                                             │
│     ┌──────────────────┐                                   │
│     │  Async Feedback  │                                   │
│     │  Loop            │                                   │
│     │                  │                                   │
│     │  Resolved tickets│                                   │
│     │  → Golden dataset│                                   │
│     │  → KB updates    │                                   │
│     └──────────────────┘                                   │
└────────────────────────────────────────────────────────────┘
```

**Lessons from Real Failures:**

Air Canada (2024): Chatbot fabricated a refund policy. Customer relied on it. Tribunal found Air Canada liable. **Design lesson:** Guardrails must prevent the model from making commitments. Output validation should flag promises/commitments for human review.

Chevrolet chatbot (2023): Agreed to sell a car for $1. **Design lesson:** Action boundaries. The bot should never be able to commit to prices, discounts, or terms without authorization rules.

---

**Interview Scenario:**

> "E-commerce company, 50K tickets/month. 60% are order status, returns, and FAQs. 30% need account-specific actions. 10% are complex complaints. Target: 80% automation, CSAT > 4.2/5."

**Architecture decisions:**
1. **Intent classifier** → Small model (Haiku) routes to the right path. Fast, cheap.
2. **FAQ path** → RAG over product docs + policies. Cached responses for top-50 questions.
3. **Action path** → Tools: order lookup, return initiation, refund processing. Requires user authentication.
4. **Complaint path** → Empathetic response + RAG for context + always offer human escalation.
5. **Confidence gating** → Below threshold = human. Never guess on account actions.
6. **Feedback loop** → Human-resolved tickets automatically update KB and golden dataset.

---

# Part 3 — Interview Scenario Bank

These are "given constraints, design the system" exercises.

---

## Scenario A: Internal Knowledge Bot

> **Requirements:** 10K employees. 200K documents across Confluence, SharePoint, Slack. Must respect document-level access permissions. <2s latency. Budget-conscious.

**Architecture:**
```
Employee → Auth (SSO) → Query Processor
→ Hybrid Search (vector + BM25) with ACL filtering
→ Reranker → Context Builder → Small Model (Haiku/GPT-4o-mini)
→ Response with Citations
```

**Key decisions:**
- ACL at retrieval time — vector DB stores document permissions as metadata, filters at query time
- Small model is sufficient — this is factual extraction, not reasoning
- Semantic cache for top questions — "How do I reset my password" asked 100x/day

---

## Scenario B: Code Review Agent

> **Requirements:** Auto-review every PR. Catch bugs, security issues, style violations. Must explain findings. Must not block CI/CD if it fails.

**Architecture (Actor-Critic Pattern):**
```
PR Opened (webhook)
→ Diff Extractor (parse changed files)
→ Fan-Out: for each file
  → Context: file + surrounding code + repo conventions (.cursor/rules)
  → Reviewer Agent (find issues)
→ Fan-In: merge all findings
→ Critic Agent (filter noise, prioritize severity)
→ Post comments on PR
→ Non-blocking (advisory, not gating)
```

**Key decisions:**
- Non-blocking — if agent fails/times out, CI continues. Don't block deploys.
- Fan-out per file — parallel review, faster than sequential
- Critic filters noise — without it, too many false positives erode trust
- Store feedback — when devs dismiss a comment, learn what NOT to flag

---

## Scenario C: Financial Research Agent

> **Requirements:** Analysts ask complex questions: "Compare Q2 earnings of AAPL, MSFT, GOOG." Must cite sources. Must never hallucinate numbers. High accuracy > low latency.

**Architecture (Orchestrator-Worker + Actor-Critic):**
```
Query → Planner
→ Decompose: [AAPL Q2, MSFT Q2, GOOG Q2]
→ Fan-Out: 3 Research Workers (each searches SEC filings + news)
→ Fan-In: Synthesis Agent (compare, tabulate)
→ Critic Agent (verify every number against source)
→ Human-in-the-Loop (analyst reviews before publishing)
→ Report with Citations
```

**Key decisions:**
- Numbers MUST be verified — Critic cross-checks every figure against retrieved source
- Human-in-the-loop — financial data requires human sign-off
- Structured output — JSON with source attribution per data point
- No caching — financial data changes constantly

---

## Scenario D: Multi-Tenant AI Platform

> **Requirements:** 50 enterprise customers. Each has their own docs, policies, models. Strict data isolation. SOC 2 required. Some customers want on-prem.

**Architecture:**
```
Customer Request → API Gateway (tenant auth + API key)
→ Tenant Router (load tenant config)
→ Tenant-isolated RAG (separate vector indexes per tenant)
→ Tenant-isolated Memory (separate memory stores)
→ Model Router (tenant-specific model preferences)
→ LLM (tenant-specific system prompt)
→ Output Guardrails
→ Response
→ Tenant-isolated Observability (logs per tenant)
```

**Key decisions:**
- Tenant isolation at EVERY layer — separate indexes, memory, logs
- Tenant config drives everything — model choice, guardrails, system prompt
- SOC 2 — audit logging, encryption at rest/transit, access controls
- On-prem option — containerized deployment (Docker/K8s), customer-managed LLM

---

# Part 4 — Architecture Cheat Sheets

---

## When to Use What Pattern

| If the task is... | Use |
|------------------|-----|
| Simple question answering | ReAct loop (single agent) |
| Needs external data | RAG (retrieval) |
| Needs personalization | Memory system |
| Needs real-world actions | Tools (via MCP) |
| Multi-step with dependencies | Pipeline |
| Multi-step, steps independent | Fan-out/Fan-in |
| Needs quality control | Reflection or Actor-Critic |
| Multiple specialists needed | Orchestrator-Worker |
| High-stakes, regulated | Human-in-the-loop |
| Exploratory, parallel research | Swarm |

---

## Model Selection Guide

| Task Type | Recommended Model Tier | Why |
|-----------|----------------------|-----|
| Routing / Classification | Small (Haiku, GPT-4o-mini) | Fast, cheap, deterministic |
| FAQ / Factual extraction | Small–Medium | Don't need reasoning |
| Code generation | Large (Opus, GPT-4) | Complex reasoning |
| Creative writing | Large + high temperature | Needs diversity |
| Data extraction | Medium + structured output | Predictable format |
| Math / Logic | Reasoning model (o-series, Claude thinking) | Step-by-step |

---

## Component Necessity Checklist

Before adding a component, ask: "Does this provide measurable value?"

| Component | Add when... | Skip when... |
|-----------|-------------|-------------|
| Retrieval | Need external/private knowledge | Model already knows the answer |
| Memory | Users expect personalization across sessions | Stateless interactions (API) |
| Planner | >3 steps with dependencies | Simple routing suffices |
| Tools | Need real-world actions or live data | Static knowledge is sufficient |
| Reranker | Initial retrieval has low precision | Top-K results are already good |
| Reflection | Quality critical, latency flexible | Real-time, latency-constrained |
| Multi-agent | Genuinely independent specializations | Single agent with tools works |
| Human-in-loop | Regulated, high-stakes, irreversible actions | Low-risk, reversible |

---

# Learning Path

```
Week 1-2:   RAG Pipeline (System 1)
            → Learn: chunking, embedding, retrieval, reranking
            → Build: minimal RAG over your own docs

Week 3-4:   Memory System (System 2)
            → Learn: fact extraction, dedup, conflict resolution
            → Build: Mem0-style memory for a chatbot

Week 5-6:   MCP Server (System 3)
            → Learn: protocol design, JSON-RPC, tool schemas
            → Build: an MCP server for a tool you use

Week 7-8:   Coding Agent (System 5)
            → Learn: agentic loops, tool design, permissions
            → Build: minimal agent that reads + edits files

Week 9-10:  Multi-Agent System (Scenario C)
            → Learn: orchestration, fan-out, critic loops
            → Build: research agent with planner + workers

Week 11-12: AI Platform (Capstone)
            → Learn: platform thinking, multi-tenancy
            → Combine everything into a platform architecture
```

---

# Interview Prep Summary

**When whiteboarding, always:**
1. Clarify requirements first (latency, users, data, quality bar, constraints)
2. Draw the request lifecycle end-to-end
3. Label every component with its responsibility
4. Call out trade-offs at each decision point
5. Add production concerns (observability, security, cost, failure handling)
6. State what you'd measure (metrics) and how you'd evaluate

**The #1 mistake:** Jumping to complex architecture. Start simple, add complexity only when you can justify it with a specific requirement the simple version can't meet.
