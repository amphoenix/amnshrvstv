# Module 5 — Memory Systems

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

### Quiz: PASS (1.5/3)
**Q1: Name the 4 core types of agent memory with descriptions.**
🔄 My answer: Listed the 4 types but didn't give descriptions for each.
✅ Correct: Short-term (current conversation, like RAM), Long-term (user facts across conversations, like hard drive), Semantic (domain knowledge via RAG/vector stores), Episodic (specific past interactions with timestamps).

**Q2: RAG = which memory type?**
My answer: ✅ Semantic memory — domain knowledge stored in vector stores.

**Q3: Agent remembers things within a chat but forgets user's name across conversations. What's missing?**
⚠️ My answer: ❌ Said semantic memory is missing.
✅ Correct: Short-term is working fine (remembers within chat). Missing **LONG-TERM memory** (user facts that persist across conversations). Semantic = domain knowledge, NOT personal facts.

**Key distinction**: long-term = user facts, semantic = domain knowledge.

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

### Quiz: PASS (2.5/3)
**Q1: Agent crashes after 200 turns. What happened?**
My answer: ✅ Context window exceeded. Fix: trimming/compression (windowing, summarization, or token-based).

**Q2: User said "allergic to peanuts" in turn 1. Windowed agent (last 5 messages) recommends peanut dish. What happened?**
🔄 My answer: Said "long-term memory" — valid fix but not the SHORT-TERM strategy answer being asked.
✅ Better answer: Windowing dropped message #1. Fix within short-term: SUMMARIZATION — compress old messages into summary that preserves key facts like allergies.

**Q3: Two users accidentally use the same thread_id. What happens?**
My answer: ✅ Both see each other's messages — data leak. thread_id = conversation isolation boundary.

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

### Quiz: PASS (2.5/3)
**Q1: What's the difference between a Checkpointer and a Store?**
My answer: ✅ Checkpointer = saves graph state (messages, node progress) per thread. Store = saves user facts (preferences, profile) cross-thread.

**Q2: Using InMemoryStore in production. Problem?**
My answer: ✅ RAM only, lost on restart. Use persistent backend (SQLite, Postgres, Redis).

**Q3: Design namespaces for: user profile, user tickets, company FAQ.**
🔄 My answer: Got user namespaces right but missed `("global", "faq")` for company-wide data.
✅ Correct: `("users", "aman", "profile")`, `("users", "aman", "tickets")`, `("global", "faq")` — company-wide data goes in top-level namespace, NOT under any user.

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

### Quiz: PASS (1/3) — Diagnose the specific problem BEFORE proposing fix.
**Q1: Your context is 8500 tokens but budget is 8000. What's wrong and how to fix?**
🔄 My answer: Said over budget but didn't emphasize the response headroom problem.
✅ Correct: Over budget AND no response headroom — LLM has zero tokens left to respond = crash or cut-off. Fix: summarize conversation to shrink it, always reserve 10-20% for response.

**Q2: Contextual compression vs just lowering k — what's the difference?**
🔄 My answer: Described both but didn't nail the tradeoff.
✅ Correct: Lower k = fewer chunks, might MISS relevant info. Compression = keep all chunks but shrink each to relevant parts only → breadth (many sources) + precision (only useful content).

**Q3: Agent forgets the refund discussed earlier in the conversation. Diagnose and fix.**
⚠️ My answer: ❌ Listed all 5 techniques instead of diagnosing the specific problem.
✅ Correct: Windowing dropped the old messages containing the refund discussion. Fix: SUMMARIZATION — preserves key facts in summary even after original messages are trimmed.

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

### Quiz: PASS (2.5/3)
**Q1: What is a knowledge graph triple? Give an example.**
My answer: ✅ (subject, predicate, object). Example: `("Aman", "has_role", "SDE 3")`.

**Q2: Why is a knowledge graph better than a vector store for "Who approves refunds for the team handling my account?"**
🔄 My answer: Said "relationship of data" — correct direction but missed the key term.
✅ Better answer: **Multi-hop traversal** — User → account → team → refund_approver (3 hops). Vector store can't chain relationships. KG traverses hop by hop.

**Q3: When to use KG vs vector store vs key-value store?**
My answer: ✅ KG = rich relationships + multi-hop. Vector store = unstructured prose + semantic similarity. Key-value = simple user facts + preferences.

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

### Quiz: PASS (3/3)
**Q1: Using SQLite with 3 server instances behind a load balancer. What breaks?**
My answer: ✅ Each instance has its own local SQLite file. State not shared — requests hit different servers, random state loss. Fix: PostgresSaver (shared DB).

**Q2: When Redis vs Postgres?**
My answer: ✅ Redis for ultra-fast temporary session state/caching. Postgres for durable persistent memory (production, ACID, multi-instance).

**Q3: Architecture uses Redis + Pinecone + MongoDB + S3. Is there a simpler approach?**
My answer: ✅ Postgres for everything — PostgresSaver (checkpointer) + PostgresStore (user facts) + pgvector (RAG) + regular tables (audit). One database, four purposes. Only add specialized services when you outgrow Postgres.

---

## MODULE 5 EXAM — 95% PASS (9.5/10) — First attempt.

### Section A (3.5/4):

**A1: Name the 4 memory types and the mechanism/tool used for each.**
🔄 My answer: 3/4 correct. Got short-term (messages), long-term (LangGraph Store), episodic (summaries with timestamps).
⚠️ Semantic memory: ❌ Said LangGraph Store — WRONG.
✅ Correct: Semantic memory mechanism = **Vector store (RAG)**. LangGraph Store = key-value for user facts (long-term), NOT semantic.

**A2: What's the difference between a checkpointer and a store?**
My answer: ✅ Checkpointer = graph state per thread. Store = user facts cross-thread.

**A3: What is response headroom and why does it matter?**
My answer: ✅ Must reserve 10-20% of context window for the LLM's response. Fill 100% = 0 tokens left to answer = crash or cut-off.

**A4: Why is a knowledge graph better than a vector store for multi-hop queries?**
My answer: ✅ KG traverses relationships hop by hop. Vector store can't chain entity relationships.

### Section B (4/4):

**B1: Debug this memory system — find 3 bugs.**
My answer: ✅ All 3 found: (1) windowing/trimming drops important early context, (2) InMemoryStore lost on restart, (3) multi-instance deployment can't share in-memory state.

**B2: Design memory architecture for a health assistant that needs: conversation history, patient allergies, medical knowledge, appointment history.**
My answer: ✅ All 4 mapped correctly — short-term (conversation), long-term/store (allergies), semantic/RAG (medical knowledge), episodic (appointment history). Consolidated on Postgres.

### Section C (2/2):

**C1: You have 8000 token budget. System prompt=500, RAG=3000, conversation=6000. Walk through how you'd fix this.**
My answer: ✅ Reserved headroom first (~1200), summarized conversation to shrink from 6000, reranked RAG chunks to keep only most relevant. Clean token budget walkthrough.

### Key Correction: Semantic memory = vector store (RAG), not LangGraph Store (key-value).
