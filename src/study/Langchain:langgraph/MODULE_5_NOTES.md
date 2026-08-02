# Module 5 — Memory Systems (DONE — Exam 95% PASS)

## L1: Memory Taxonomy

### The Problem:
LLMs are STATELESS — no inherent memory between calls. Memory is something YOU build around the LLM.

### 4 Core Types of Agent Memory:

```
1. SHORT-TERM (Working Memory)
   → Current conversation messages
   → Like RAM: fast, temporary, limited capacity
   → In LangGraph: messages list with add_messages reducer
   → Cleared when conversation ends

2. LONG-TERM (Persistent Memory)
   → User facts/preferences that persist ACROSS conversations
   → Like a hard drive: slower, permanent, large
   → "Aman prefers concise answers" remembered forever
   → Stored in DB, retrieved at start of each conversation

3. SEMANTIC MEMORY
   → General domain knowledge (RAG IS semantic memory!)
   → Like an encyclopedia: "refund policy is 30 days"
   → Stored in vector stores
   → NOT personal facts — domain/world knowledge

4. EPISODIC MEMORY
   → Memories of specific past interactions with timestamps
   → Like a diary: "On July 30, Aman asked about refunds"
   → Helps personalize future interactions
```

### ⚠️ Key Distinction (missed on quiz):
```
Semantic memory  = domain KNOWLEDGE ("what's the refund policy?")
Long-term memory = USER FACTS ("Aman is allergic to peanuts", "user's name")

Forgetting user's name across conversations → LONG-TERM is missing, not semantic.
```

### 5th Type — Procedural Memory (student question):
```
Procedural = "how to do things" — skills, procedures, workflows
In agents: system prompts, tool definitions, learned strategies
Usually hard-coded rather than dynamically learned.
```

### RAG = Semantic Memory:
```
RAG (Module 4) = retrieving domain knowledge from vector stores
This IS semantic memory — searching what the agent KNOWS about the domain.
```

### Memory Hierarchy:
```
Most agents use: short-term + semantic
Advanced agents add: long-term + episodic
```

### LangGraph Mapping:
```
Short-term → messages in state + add_messages (per thread)
Long-term  → LangGraph Store API or external DB (cross-thread)
Semantic   → Vector store / RAG
Episodic   → Conversation summaries in store with timestamps
```

### Quiz Q&A:
**Q1: 4 types?** Short-term, long-term, semantic, episodic (descriptions required but not given). 🔄
**Q2: RAG = which type?** Semantic memory — domain knowledge in vector stores. ✅
**Q3: Remembers in chat, forgets name across chats?** Short-term working. Missing LONG-TERM (user facts), NOT semantic (domain knowledge). ❌

### Quiz: PASS (1.5/3) — Key distinction: long-term = user facts, semantic = domain knowledge.

---

## L2: Short-Term Memory in LangChain/LangGraph

### What It Is:
Messages from the current conversation. Every turn adds to the list. LLM sees all of them.

### In LangGraph:
```python
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]   # ← short-term memory
```

### The Growth Problem:
```
Turn 10:  ~500 tokens    → fine
Turn 200: ~10,000 tokens → expensive, slow
Turn 500: ~25,000 tokens → context window limit!
```

### 3 Trimming Strategies:

**1. Windowing (last N messages):**
```python
trimmed = trim_messages(messages, max_messages=10, strategy="last")
```
Fast, cheap. BUT: loses early context.

**2. Summarization:**
```python
summary = llm.invoke(f"Summarize: {old_messages}")
messages = [SystemMessage(f"Summary: {summary}"), *recent_messages]
```
Preserves key facts. Costs 1 extra LLM call.

**3. Token-based trimming:**
```python
trimmed = trim_messages(messages, max_tokens=4000, include_system=True)
```
Most precise — controls actual cost.

### thread_id = Conversation Isolation:
```
Same thread_id    → same messages (shared short-term memory)
Different thread_id → completely separate memory
```
⚠️ Two users with same thread_id = DATA LEAK.

### ⚠️ Key Insight (quiz):
Windowing drops old messages. If user said "allergic to peanuts" in msg #1 and you trim to last 5, it's gone. Fix: use summarization (preserves key facts in summary) or long-term memory (store as user fact).

### Quiz Q&A:
**Q1: Crashes after 200 turns?** Context window exceeded. Fix: trimming/compression. ✅
**Q2: Windowed agent forgets allergy?** Windowing dropped msg #1. Fix: summarization (keeps facts in summary). 🔄 (student said long-term memory — valid but not the short-term strategy answer)
**Q3: Two users, same thread_id?** Both see each other's messages — data leak. ✅

### Quiz: PASS (2.5/3)

---

## L3: Long-Term Memory

### What It Is:
Facts that persist ACROSS conversations. Short-term dies with the thread; long-term survives.

### LangGraph Store API:
```python
store = InMemoryStore()

# Store:
store.put(namespace=("users", "aman"), key="profile", value={...})

# Retrieve:
item = store.get(namespace=("users", "aman"), key="profile")

# Search:
items = store.search(namespace=("users", "aman"))
```

### Using Store in Graph:
```python
def chatbot(state, *, store: BaseStore):      # store injected via parameter
    memories = store.search(namespace=("users", user_id))
    # inject memories into system prompt
    
agent = graph.compile(store=store)             # pass store at compile time
```

### Checkpointer vs Store:
```
Checkpointer = saves GRAPH STATE (messages, node progress) — per thread
Store        = saves USER FACTS (preferences, profile)     — cross-thread
```

### Namespace Design:
```python
("users", "aman", "profile")       → user profile
("users", "aman", "tickets")       → user's past tickets
("global", "faq")                  → company-wide shared knowledge
```
⚠️ Company-wide data = top-level namespace, NOT under any user.

### InMemoryStore = DEV ONLY:
RAM only, lost on restart. Production: SqliteSaver, PostgresSaver, Redis.

### Quiz Q&A:
**Q1: Checkpointer vs Store?** Checkpointer=graph state, Store=user facts. ✅
**Q2: InMemoryStore in production?** RAM, lost on restart. Use persistent backend. ✅
**Q3: Namespace design?** User namespaces correct, but missed ("global", "faq") for company-wide FAQ. 🔄

### Quiz: PASS (2.5/3)

---

## L4: Context Engineering

### The Problem:
Context window is a BUDGET. Must decide what goes in and how to fit it.

### 5 Techniques (cheapest → most expensive):
```
1. Selective loading    → only load what THIS turn needs (free)
2. Windowing            → keep last N messages (free, lossy)
3. Token budgeting      → fixed limits per section (free, disciplined)
4. Summarization        → compress old messages (1 LLM call)
5. Contextual compression → shrink RAG chunks to relevant parts (N LLM calls)
```

### Token Budget Example:
```
Total: 8,000 tokens
System prompt:    500
User profile:     300
RAG context:    2,000
Conversation:   4,000
Response headroom: 1,200   ← MUST reserve this!
```

### ⚠️ Response Headroom:
If you fill 100% of context = 0 tokens left for LLM to respond = crash or cut-off. Always reserve 10-20%.

### Contextual Compression vs Lower k:
```
Lower k:     fewer chunks → might MISS relevant info
Compression: keep all chunks, shrink each to relevant parts only
             → breadth (many sources) + precision (only useful content)
```

### ⚠️ Recurring Pattern (L2 Q2, L4 Q3):
Windowing drops old messages. If important info was in dropped messages, it's GONE.
Fix = SUMMARIZATION (preserves key facts in summary even after original is trimmed).

### Quiz Q&A:
**Q1: 8500 tokens in 8000 budget?** Over budget + NO response headroom (LLM can't respond). Fix: summarize conversation, reserve headroom. 🔄
**Q2: Compression vs lower k?** Compression = breadth+precision. Lower k = fewer but complete chunks. 🔄
**Q3: Agent forgets refund from earlier?** Windowing dropped it. Fix: SUMMARIZATION. ❌ (listed all 5 techniques instead of diagnosing)

### Quiz: PASS (1/3) — Diagnose the specific problem BEFORE proposing fix.

---

## L5: Knowledge Graphs for Memory

### What It Is:
Structured network of entities + relationships. Data stored as triples: (subject, predicate, object).

### Triple Example:
```python
("Aman", "works_at", "ServiceNow")
("Aman", "has_role", "SDE 3")
("Platform Team", "managed_by", "Priya")
```

### KG vs Vector Store:
```
Vector store: "Find text SIMILAR to my query" (semantic search)
Knowledge graph: "Follow RELATIONSHIPS between entities" (graph traversal)
```

### Key Advantage — Multi-hop Reasoning:
```
"Who approves refunds for the team handling my account?"
User → account → team → refund_approver  (3 hops)
Vector store can't chain this. KG traverses hop by hop.
```

### When to Use:
```
KG:          Rich relationships, multi-hop queries, explainable paths
Vector store: Unstructured prose, semantic similarity search
Key-value:   Simple user facts, preferences, profile lookup
```

### Tools: Neo4j (production), NetworkX (prototyping), GraphCypherQAChain (LangChain).

### Best Practice — Hybrid: KG provides STRUCTURE → Vector provides CONTENT → LLM generates ANSWER.

### Quiz Q&A:
**Q1: What's a triple?** (subject, predicate, object). Example: (Aman, has_role, SDE 3). ✅
**Q2: Why KG > vector store for multi-hop?** 🔄 Said "relationship of data" — correct direction but key term is "multi-hop traversal."
**Q3: KG vs vector vs store?** Correct distinctions. ✅

### Quiz: PASS (2.5/3)

---

## L6: Persistence Backends

### What Needs Persisting:
```
Graph state (messages)  → Checkpointer  → per-thread
User facts/prefs        → Store         → cross-thread
Domain knowledge        → Vector store  → permanent
Conversation history    → Episodic      → archival
```

### 3 Backends:
```
SQLite:     File-based, zero setup, single-instance only. Dev/local apps.
PostgreSQL: Full ACID, multi-instance, production-grade. SaaS/enterprise.
Redis:      Ultra-fast, in-memory + optional persistence. Sessions/caching.
```

### Decision Matrix:
```
Single user, local?           → SQLite
Multi-user, production?       → PostgreSQL
Already using Postgres?       → PostgreSQL + pgvector (one DB for everything)
Ultra-fast session state?     → Redis
Prototype/hackathon?          → InMemory or SQLite
```

### ⚠️ SQLite Multi-Instance Problem:
Each server has its OWN local SQLite file. Behind a load balancer, requests hit different servers → state not shared → random state loss. Fix: shared DB (Postgres).

### Postgres-Does-Everything Pattern:
```
PostgreSQL
  ├── PostgresSaver   → graph state (checkpointer)
  ├── PostgresStore   → user facts (store)
  ├── pgvector        → RAG embeddings (vector store)
  └── regular tables  → audit logs, analytics
One database, four purposes. Simplest production architecture.
```

### Quiz Q&A:
**Q1: SQLite + 3 instances + load balancer?** Each instance has local file, state not shared. Fix: PostgresSaver. ✅
**Q2: Redis vs Postgres scenarios?** Redis for fast temporary state, Postgres for durable persistent memory. ✅
**Q3: Redis+Pinecone+MongoDB+S3 simpler?** Postgres for everything (+ pgvector for RAG). Only add specialized services when needed. ✅

### Quiz: PASS (3/3) — Clean.

---

## MODULE 5 EXAM — 95% PASS (9.5/10) — First attempt.

### Section A (3.5/4):
- **A1**: 3/4 types correct. Semantic memory mechanism = Vector store (RAG), NOT LangGraph Store. They're different systems.
- **A2-A4**: All perfect. Checkpointer vs store, response headroom, multi-hop reasoning.

### Section B (4/4):
- **B1**: All 3 bugs found: trimming drops context, InMemoryStore lost on restart, multi-instance can't share in-memory state.
- **B2**: Excellent health assistant architecture. All 4 needs mapped correctly with Postgres consolidation.

### Section C (2/2):
- **C1**: Clean token budget walkthrough. Reserved headroom first, summarized conversation, reranked RAG chunks.

### Key Correction: Semantic memory = vector store (RAG), not LangGraph Store (key-value).
