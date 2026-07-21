# Common Interview Questions & Answers

**What 2026 AI interviews actually test (from 100+ real interview reports):**

<cite index="75-1">The role is not ML engineer. You will not be asked to derive backprop or train a model from scratch. You will be asked how you would chunk a 200-page PDF for retrieval, when to use a reranker, and how you would evaluate an agent that calls four tools in a loop.</cite>

<cite index="76-1">Five topic clusters cover 90% of 2026 loops: LLM and transformer basics, RAG architecture, agentic systems, prompt engineering and evals, and system design for LLM-backed products.</cite>

<cite index="76-1">Eval methodology is the new system design. Expect at least one round where someone asks how you would build a golden set, run an LLM-as-judge, and catch regressions before they hit prod.</cite>

---

## Chapter 1 — LLM Foundations

**Q: Why did Transformers replace RNNs?**

RNNs process tokens sequentially — token 5 must wait for tokens 1-4. This makes training slow and causes the vanishing gradient problem where early information fades. Transformers introduced self-attention, letting every token attend to every other in parallel. This enables massively parallel GPU training, handles long-range dependencies naturally (token 1 directly attends to token 1000), and scales better. LSTMs partially fixed vanishing gradients but were still sequential. Transformers eliminated the bottleneck entirely.

---

**Q: Difference between Token IDs and Embeddings?**

Token: The text chunk ("Hello"). Token ID: An integer index (3421). Just a lookup number — zero semantic meaning. Embedding: A dense vector ([0.28, -0.62, 0.41, ...]) learned during training that captures semantic meaning. Similar-meaning words produce similar vectors.

Token IDs are addresses. Embeddings are meaning.

---

**Q: Why Positional Encoding?**

Self-attention treats tokens as a set with no concept of order. "Dog bites man" and "Man bites dog" look identical. Positional encoding adds order information before tokens enter the Transformer. Modern LLMs use RoPE (Rotary Position Embeddings) which encodes position by rotating vectors, generalizing better to longer sequences than sinusoidal encoding.

---

**Q: Why Multi-Head Attention?**

A single head learns one relationship type. Multiple heads learn different relationships in parallel — syntax, coreference, semantic similarity. Heads are concatenated and projected into a richer representation than any single head could produce. Typical: 32-128 heads.

---

**Q: RAG vs Fine-Tuning?**

RAG changes what the model reads (context). Fine-tuning changes how the model behaves (weights). RAG is cheap, easy to update, best for dynamic knowledge. Fine-tuning is expensive, requires retraining, best for behavioral adaptation. Use RAG when knowledge changes. Use fine-tuning when you need different model behavior. Most production systems use RAG.

---

**Q: Context vs Memory?**

Context is temporary — current prompt, conversation, retrieved docs. Dies when conversation ends. Limited by context window. Memory is persistent — stored externally across sessions in vector DBs, graphs, SQL. Survives conversations. Enables personalization and continuity.

Context is what the model sees NOW. Memory is what the system REMEMBERS from before.

---

**Q: Why Decoder-only architecture?**

Decoder-only won because: simpler (one architecture for understanding AND generation), scales better, and next-token prediction is remarkably general — it implicitly learns classification, reasoning, translation, coding. Causal masking (each token only sees previous tokens) naturally fits generation. The key insight: predicting the next token billions of times teaches deep language understanding as a side effect.

---

**Q: Explain the attention formula.**

Attention(Q, K, V) = softmax(QKᵀ / √dₖ) × V. Dot product QKᵀ computes raw similarity scores. Divide by √dₖ to prevent softmax saturation (large dot products push softmax to extremes with tiny gradients). Softmax normalizes to probabilities. Multiply by V to produce weighted context vectors. Self-attention means Q, K, V all come from the same sequence. Cross-attention means Q from one sequence, K/V from another.

---

**Q: What is a loss function and why cross-entropy for LLMs?**

A loss function measures how wrong the model's predictions are. Cross-entropy loss measures the difference between predicted token probabilities and the true next token. It's used for LLM pretraining because the training objective IS next-token prediction — "given all tokens so far, predict the probability distribution over the next token."

---

## Chapter 2 — Memory

**Q: Design ChatGPT Memory.**

Two production approaches: (1) Mem0 style: LLM extracts atomic facts from conversation → classify each as ADD/UPDATE/DELETE/NOOP against existing memories → store in vector DB + graph. (2) ChatGPT Dreaming V3: Background synthesis periodically processes history → generates lightweight summaries → injects directly into system prompt. No vector DB.

Key decisions: extract facts not raw conversations (compact), dedup, conflict resolution (latest wins), aging (old low-importance expires), tenant isolation.

---

**Q: SQL vs Vector Database?**

SQL stores structured data with exact queries ("WHERE department = 'engineering'"). Vector DBs store embeddings and search by meaning using approximate nearest neighbor (HNSW). Production AI needs BOTH: vector for semantic retrieval, SQL for structured metadata. Hybrid: vector finds candidates, SQL metadata filters narrow results.

---

**Q: Why Knowledge Graphs?**

Vector search finds similar text. Knowledge graphs find relationships. "Which projects does Alice work on?" → Graph traverses Alice → WORKS_ON → Project Phoenix → USES → Python. Excels at multi-hop reasoning, entity disambiguation, organizational hierarchies. Complementary to vector search.

---

**Q: How would you prevent memory explosion?**

Five strategies: importance scoring (value based on recency/frequency/relevance), memory aging (importance decays over time), deduplication (semantic similarity check), consolidation (merge related memories), controlled forgetting (TTL on temporary memories).

---

**Q: How do you rank memories?**

score = (similarity × w1) + (recency × w2) + (importance × w3) + (frequency × w4). Similarity = relevance to current query. Recency = when last accessed. Importance = business value. Frequency = how often retrieved. Weights tuned empirically.

---

**Q: How do you forget stale memories?**

TTL-based expiration (auto-delete after N days of no access), importance decay (score drops over time, below threshold → archive), active conflict resolution (new fact "works at Microsoft" deletes old "works at Google"). Archive before deleting — version history enables rollback.

---

## Chapter 3 — Evaluation

**Q: How do you evaluate a RAG pipeline?**

Evaluate EACH component: Retrieval (precision, recall, MRR, NDCG, context precision/recall). Generation (faithfulness, relevance, groundedness). End-to-end (answer correctness vs golden dataset, citation accuracy, user satisfaction). A perfect model with bad retrieval produces confident wrong answers. Frameworks: RAGAS, ARES.

---

**Q: How do you know retrieval is failing?**

Symptoms: hallucination rate increases, answer quality drops on answerable questions. Diagnosis: measure context precision (are chunks relevant?) and context recall (is needed info present?). Low precision → fix chunking, add reranking. Low recall → fix embeddings, add hybrid search. Retrieval quality determines answer quality more than model choice.

---

**Q: Why not evaluate only the LLM?**

A production system has planner, retriever, memory, context builder, tools, post-processor. The LLM might be perfect but wrong retrieval, stale memory, or a failed tool still produces wrong answers. Evaluate every layer independently AND end-to-end.

---

**Q: Explain Offline vs Online Evaluation.**

Offline: Before deployment. Golden datasets, regression tests. Fast, safe, repeatable. Doesn't capture real behavior. Online: In production. A/B testing, user feedback, telemetry. Real behavior. Slow, can impact users. Need both: offline gates deployment, online measures real-world performance.

---

**Q: Design an Evaluation Pipeline.**

Code-based evals (format, schema) → LLM-as-Judge (quality, faithfulness) → Full regression suite → Human review (edge cases) → Deploy → Online monitoring. Layer by cost. Use different model family as judge. Track metrics over time.

---

**Q: What metrics would you monitor in production?**

Quality: hallucination rate, faithfulness, eval score, CSAT. Performance: p50/p95/p99 latency, TTFT, throughput. Cost: per request, per user, daily spend. Reliability: error rate, retry rate, tool failures. Retrieval: recall, precision, hit rate. Business: task completion, resolution rate.

---

**Q: What is Pointwise vs Pairwise vs Reference-based evaluation?**

Pointwise: Score a single output on a rubric (1-5). Simple but subjective — judges disagree on what "3" means. Pairwise: Compare two outputs, pick the better one. More reliable — relative comparison is easier than absolute scoring. Used by Chatbot Arena, MT-Bench. Reference-based: Compare against gold answer (BLEU, ROUGE, exact match). Works for factual tasks, breaks for open-ended generation.

---

## Chapter 4 — Observability

**Q: Monitoring vs Observability?**

Monitoring: "Did something fail?" Predefined alerts. Observability: "WHY did it fail?" Investigation of unknown problems via logs + metrics + traces. Monitoring tells you something is wrong. Observability tells you why.

---

**Q: What are the Three Pillars?**

Logs (WHAT happened — timestamped events), Metrics (HOW MUCH — numerical measurements over time), Traces (HOW — complete journey of a single request through all components). Together: complete understanding.

---

**Q: What is a Trace ID and why does it matter?**

Unique identifier assigned at entry point, shared by every component processing that request. Without it, you can't connect which planner call goes with which retriever call. With it, reconstruct entire request path, measure per-component latency, pinpoint failures. In multi-agent systems, one Trace ID spans all agents.

---

**Q: Explain SLI vs SLO vs SLA.**

SLI: what you measure ("p95 latency is 450ms"). SLO: what you aim for internally ("p95 < 500ms"). SLA: what you promise externally ("99.99% availability, else penalty"). Error Budget = SLO - actual. Exhausted budget → slow deployments, focus on reliability.

---

**Q: RED vs USE vs Golden Signals — when to use which?**

RED (Rate, Errors, Duration): For services/APIs — LLM endpoints, tool calls. USE (Utilization, Saturation, Errors): For infrastructure — GPUs, CPU, memory. Golden Signals (Latency, Traffic, Errors, Saturation): Google SRE's superset. Default choice if picking one.

---

**Q: How would you debug a slow AI response?**

Find Trace ID → open distributed trace → identify bottleneck component (Planner? Retriever? LLM? Tool?) → drill into span metadata (context size, model used, tool called) → compare against baseline → root cause (database timeout, oversized context, rate limit) → fix and verify. The trace is your roadmap.

---

**Q: What is semantic monitoring?**

Traditional monitoring: "Is the service healthy?" Semantic monitoring: "Is the ANSWER good?" Evaluates meaning and quality — hallucination rate, faithfulness, groundedness, toxicity. A system can have perfect uptime while producing garbage. Semantic monitoring catches this.

---

**Q: Design an observability pipeline for a RAG system.**

RAG System → OTel SDK → Collector → Prometheus (metrics), Grafana (dashboards), Langfuse/Phoenix (LLM traces), Loki (logs), Alertmanager (alerts). Instrument: query processing, embedding, retrieval (latency, scores, recall), reranking, context assembly (token count), LLM (TTFT, model), output (faithfulness). One Trace ID per request. Tail-based sampling — always keep error/slow traces.

---

## Chapter 5 — Optimization

**Q: Explain the Optimization Triangle.**

Quality vs Latency vs Cost. Larger model → better quality, higher latency/cost. Cache → lower latency/cost, might serve stale answers. Model routing → lower cost, roughly maintains quality. No universal optimum — balance depends on business requirements.

---

**Q: How would you reduce cost without hurting quality?**

Layered: (1) Model routing — simple → cheap model, complex → expensive. (2) Semantic caching — 30-60% hit rate for chatbots. (3) Prompt compression. (4) Context pruning — fewer, more relevant docs. (5) Token limits. (6) Prefix caching. (7) Embedding caching. Measure eval scores before/after each change.

---

**Q: KV Cache — what it does and why it matters?**

Without: generating token N recomputes attention for ALL N-1 previous tokens. Quadratic (N²/2). With: store computed K/V, only compute new token's K/V. Linear (N). Single most impactful inference optimization. Trade-off: consumes GPU memory (~40GB for 70B model at 4096 tokens). PagedAttention manages this like OS virtual memory.

---

**Q: Continuous Batching vs Fixed Batching?**

Fixed: wait for N requests, process together, GPU waits for slowest. 30-50% utilization. Continuous: requests join/leave dynamically — when R2 finishes, R9 takes its slot. GPU never idles. 80-95% utilization. Throughput doubles or triples.

---

**Q: When would you use Model Routing vs Model Cascading?**

Routing: classify upfront, send to right model once. Fast. Risk: misclassification. Cascading: start cheap, escalate if low confidence. More reliable. Trade-off: failed attempts add latency. Use routing when classification is reliable. Use cascading when it isn't.

---

**Q: What is Speculative Decoding?**

Small draft model generates N candidate tokens. Large model verifies ALL N in one forward pass (parallel verification). If 4/5 correct → 4 tokens for ~1 forward pass cost. ~3-4x speedup when draft accuracy is ~80%. Trade-off: two models in memory.

---

**Q: How do you optimize retrieval latency?**

Hybrid search in parallel (not sequential). Vector index tuning (HNSW ef_search). Lighter reranker or skip if retrieval is good. Top-K reduction. Retrieval caching. Embedding caching. Metadata pre-filtering before vector search.

---

**Q: Semantic Cache vs Exact Cache?**

Exact: identical requests only. Safe, no false matches. Semantic: similar meaning matches. Higher hit rate. Risk: "Tell me about Python" incorrectly matching "Python 3.12 asyncio changes." Threshold tuning is the hard problem. Use both: exact match first (fast, safe), semantic as fallback.

---

**Q: What is ColBERT / late interaction?**

Instead of one embedding per document, store one embedding per token. At query time, compute MaxSim (maximum similarity between each query token and all document tokens). More accurate than single-vector dense retrieval but 10-50x more expensive in storage and compute. Know the trade-off — interviewers check if you've read the actual literature.

---

## Chapter 6 — Architecture

**Q: AI Application vs AI System?**

Application: User → Prompt → LLM → Response. A demo. System: Gateway → Orchestrator → Retriever → Memory → Context Builder → Router → LLM → Tools → Evaluation → Observability → Response. Production-ready. The difference is everything AROUND the LLM.

---

**Q: Draw an end-to-end production AI request lifecycle.**

User → Gateway (auth, rate limit, input guardrails) → Orchestrator → Planner/Router → Retrieval + Memory → Context Builder (token budgeting) → Model Router → LLM → Tools → Post Processor (output guardrails, citations) → Response → [Async: Logging, Evaluation, Memory Update, Observability].

Key: evaluation, memory updates, analytics run ASYNCHRONOUSLY — don't add user-facing latency.

---

**Q: Planner vs Router?**

Planner: "WHAT steps are needed?" Decomposes complex goals into subtasks. Reasoning activity. Slower (LLM call). Router: "WHERE should this go?" Classification and dispatch. Fast (can be rule-based). Prefer routing when planning is unnecessary — most requests just need routing.

---

**Q: What does the Context Builder do and why separate it?**

Assembles final prompt from system prompt + query + retrieved docs + memory + conversation + tool outputs. Applies token budgeting, deduplication, ranking. Without it: context overflow, duplicates, inconsistent formatting. Makes context assembly a first-class engineering concern.

---

**Q: What are Guardrails and where do they sit?**

Input guardrails (at Gateway): injection detection, jailbreak detection, PII redaction, content filtering. Output guardrails (at Post Processor): PII scan, toxicity, hallucination check, format compliance. Both needed — input catches malicious inputs, output catches model misbehavior. Enterprise customers ask about this first.

---

**Q: Design an Enterprise RAG architecture.**

User → Gateway (SSO) → Query Processor → Hybrid Search (Vector + BM25) → RRF → Reranker → ACL Filtering (per-user document permissions) → Context Builder → Model Router → LLM → Post Processor (citations, guardrails) → Response → [Async: Eval, Observability, Cache]. Key: ACL at retrieval time, SOC 2 compliance, multi-tenant isolation.

---

**Q: Build vs Buy?**

LLM Provider → Buy. Vector DB → Usually Buy. Gateway → Buy or Build. Orchestrator → Build (your differentiation). Business Logic → Build. Observability → Usually Buy. Evaluation → Hybrid. Domain Knowledge → Build. Build what differentiates you. Buy commodity infrastructure.

---

**Q: How does AI architecture evolve?**

Stage 1: User → LLM (prototype). Stage 2: + Gateway (production API). Stage 3: + Retriever (RAG). Stage 4: + Planner + Memory + Tools (enterprise assistant). Stage 5: Platform + Distributed + Multi-Agent + Eval + Observability (enterprise platform). Grow incrementally. Don't design Stage 5 on day one.

---

**Q: What logic belongs in the orchestrator vs the LLM?**

The orchestrator handles workflow — sequencing, retries, timeouts, error handling, delegation, state management. Deterministic logic. The LLM handles reasoning — understanding queries, generating responses, deciding which tools to call, interpreting results. Probabilistic reasoning. Mixing them makes both harder to debug and maintain.

---

## Chapter 7 — Security

**Q: What is the #1 AI security risk and why?**

Prompt injection. #1 on OWASP LLM Top 10. LLMs cannot distinguish instructions from data — everything is tokens. A user can override system instructions through natural language. No complete solution exists — every mitigation reduces risk but none eliminates it.

---

**Q: Prompt Injection vs Jailbreaking?**

Injection targets the APPLICATION (overriding system prompt, exfiltrating data). Jailbreaking targets the MODEL's safety training (producing prohibited content via role-play, encoding, escalation). Different targets, different defenses.

---

**Q: What is Indirect Prompt Injection? Give a real example.**

Malicious instructions hidden in content the model RETRIEVES — web pages, emails, documents — not typed by the user. Example: Researchers placed hidden text on web pages. Bing Chat retrieved those pages and followed hidden instructions, including attempting to exfiltrate user data. More dangerous because users don't see the attack and it scales (one poisoned document affects all users).

---

**Q: How do you prevent PII leakage in a RAG system?**

Defense at every layer: (1) Ingestion: classify/redact PII before indexing. (2) Retrieval: ACL — users only retrieve authorized docs. (3) Context: scan for PII before sending to LLM. (4) Output: scan response for PII before returning. (5) Multi-tenant: strict isolation via tenant_id in every query filter. (6) Logging: redact PII from traces.

---

**Q: How do you secure AI agent tool access?**

Least privilege (minimum permissions). Action allow-lists (explicitly define permitted actions). Human-in-the-loop for high-risk actions (delete, send, transfer). Input validation (parameterized queries, never raw LLM output to SQL/shell). Credential management (secrets in vaults, never in prompts). Sandboxing (generated code in isolated containers). Audit logging (every tool call recorded).

---

**Q: What is Defense in Depth for AI?**

Nine layers: Network (TLS) → API (auth, rate limiting) → Input Guardrails → Context Security (RAG ACL, memory isolation) → Model Safety (alignment) → Output Guardrails → Tool Security (least privilege) → Agent Security (action boundaries) → Monitoring (anomaly detection). Each catches what previous layers missed.

---

**Q: Name a real-world AI security incident.**

Samsung (2023): Employees pasted proprietary source code into ChatGPT. Data entered training pipeline. Samsung banned all AI tools. What went wrong: no data governance, no technical controls, no enterprise deployment. Others: Bing system prompt extracted (2023), Air Canada chatbot fabricated policy and company found liable (2024), lawyers sanctioned for ChatGPT-fabricated case citations (2023).

---

**Q: What is the OWASP LLM Top 10?**

Industry-standard framework: 1) Prompt Injection, 2) Insecure Output Handling, 3) Training Data Poisoning, 4) Model DoS, 5) Supply Chain, 6) Sensitive Info Disclosure, 7) Insecure Plugin Design, 8) Excessive Agency, 9) Overreliance, 10) Model Theft.

---

## Chapter 8 — Design Real AI Systems

**Q: Design a RAG pipeline for 50K internal documents.**

Offline: Docs → Loader → Semantic Chunker → Embed → Qdrant (with metadata: source, date, department, ACL). Online: Query → Rewrite → Hybrid Search (vector + BM25 parallel) → RRF → Cross-encoder Reranker (20 → 5) → ACL filter → Context Builder (50% docs, 20% conversation, 10% system, 10% memory, 10% reserve) → Small model for factual, Large for analytical → Citations. Cache: Semantic cache for top-50 repeated questions.

---

**Q: Design an AI Memory system like Mem0.**

Write: Conversation → LLM extracts atomic facts → For each: vector search existing → classify ADD/UPDATE/DELETE/NOOP → Store in Vector DB + Graph + History Log. Read: Query → embed → similarity search + metadata filter (user_id, recency) → rank (similarity × recency × importance) → top-5 → inject into context. Key: extract facts not raw conversations, per-user isolation, aging, conflict resolution, dedup.

---

**Q: How does MCP work behind the scenes?**

JSON-RPC 2.0 over stdio (local) or HTTP+SSE (remote). Client sends `initialize` → Server responds with capabilities + tool list → Client requests `tools/list` → Server returns schemas (name, description, input JSON schema) → schemas injected into LLM context → LLM decides to call → client sends `tools/call` → server executes → returns result. Solves N×M problem: 10 tools × 10 apps = 100 integrations → 10 servers + 10 clients = 20.

---

**Q: How does Cursor index and search a codebase?**

File watcher → Merkle tree (only re-index changed files) → Tree-sitter (AST parser, chunk at function/class boundaries) → Embed chunks → Turbopuffer (vector DB, stores embeddings not code). Search: embed query → nearest-neighbor in Turbopuffer → retrieve code chunks across files → context assembly (~13K budget) → LLM.

---

**Q: Why does Claude Code use grep instead of RAG?**

Switched from Voyage embeddings to ripgrep because: no index to maintain (always searches current code), no external embedding dependency (simpler, fewer security liabilities), internal benchmarks matched RAG, and the agent iteratively refines search terms. Trade-off: slower per search than pre-indexed vectors, but operational simplicity won.

---

**Q: Design an AI Customer Support system with 80% automation.**

Message → Intent Classifier (small model) → FAQ (RAG + cache top-50) / Action (tools: order lookup, refund, CRM) / Complaint (empathy + RAG + escalation offer) / Escalation (human with full context) → Confidence Gate (>0.85 send, <0.85 escalate) → [Async: resolved tickets → update KB + golden dataset]. Lessons: Air Canada (don't fabricate policies), Chevrolet (action boundaries prevent unauthorized promises).

---

**Q: How does PagedAttention work?**

Traditional KV cache allocates contiguous max-length memory per request (95% wasted). PagedAttention borrows OS virtual memory — stores KV in non-contiguous pages allocated on demand, freed when done. ~60% less waste, more requests per GPU, higher throughput. vLLM's core innovation.

---

**Q: Given requirements and constraints, which architecture pattern?**

Simple Q&A + docs → Single Agent + RAG. Multi-step coding → ReAct loop with tools. Parallel research → Fan-Out/Fan-In. Independent specialist domains → Orchestrator-Worker. Quality critical → Actor-Critic. High-stakes → Human-in-the-Loop. Reactive → Event-Driven. The #1 mistake: jumping to multi-agent when single agent works. Multi-agent adds 58-285% overhead.

---

## Chapter 9 — Multi-Agent Systems

**Q: When would you choose multi-agent over single agent?**

Only when specialization (different expertise per subtask), parallelism (independent tasks run simultaneously), or independent verification (separate critic) provides measurable value. NOT "it seems complex." A single agent with equivalent compute budget often matches multi-agent on reasoning. Overhead: 58% (independent) to 285% (centralized).

---

**Q: What is the most common production pattern?**

Orchestrator-Worker (~70%). Central orchestrator decomposes and delegates to stateless workers. Dominates because: easiest to debug (single control flow), scales horizontally (add workers), strong framework support. Token spend dominated by orchestrator's growing context — not workers.

---

**Q: Orchestrator vs Supervisor?**

Orchestrator: dispatches and merges. Coordinator. Supervisor: actively monitors, checks quality mid-execution, can re-route/retry/abort. Manager. Supervisor costs more (extra LLM calls) but catches failures earlier. Use orchestrator for routine, supervisor for high-stakes.

---

**Q: How do you prevent infinite loops in multi-agent systems?**

Max delegation depth (cap at 3). Max iterations per agent. Circuit breakers (stop calling failing agents). Timeout limits. Explicit termination criteria ("tests pass" or "critic scores > 0.9" or "3 rounds complete"). Without these: circular delegation (A → B → C → A) or infinite revision loops.

---

**Q: Debate vs Competitive pattern?**

Competitive: agents solve independently, judge picks best. No interaction. Good for diversity, majority voting. Debate: agents INTERACT — critique each other's reasoning, expose flaws. Judge evaluates the debate. Higher quality, much higher cost. Use competitive for robustness. Use debate for surfacing hidden errors.

---

**Q: How do you debug a multi-agent workflow?**

Single Trace ID spanning all agents. Each logs decisions, tool calls, inputs, outputs. Trace: Planner (120ms) → Router → Search Agent (800ms) → Code Agent (2100ms) → Critic (400ms) → Total: 3.45s, 5950 tokens. Follow the path, find where quality degraded or latency spiked.

---

**Q: What are the token economics of multi-agent?**

Independent (peer): ~58% overhead. Centralized (supervisor/orchestrator): ~285% overhead. Supervisor's context window dominates cost. Model tiering saves: Planner = Large, Router = Small (Haiku), Workers = Medium (Sonnet), Critic = Medium-Large.

---

**Q: Design a multi-agent research system.**

Planner (Large) → decompose [React, Vue, Svelte] → Fan-Out: 3 Research Workers (parallel web search + extraction) → Fan-In: Synthesis Agent (merge, compare) → Writer Agent (structured report + citations) → Critic Agent (accuracy, gaps, bias) → max 2 revision rounds → Final Report. Pattern: Orchestrator-Worker + Fan-Out + Actor-Critic.

---

**Q: What's the difference between a function-calling model and an agent?**

Function calling is a single decision — model suggests which function to call. An agent is a sustained process — it reasons about a goal, plans actions, executes them, observes outcomes, and adapts when something fails. Function calling is one mechanism the agent uses. The agent is the loop wrapped around it.

---

**Q: How do you detect and handle agent goal drift?**

Goal drift happens gradually as the agent processes more context and loses focus on the original objective. Detect via: explicit goal tracking (re-check alignment every N steps), divergence metrics (is the agent's behavior moving away from expected patterns?), behavioral bounds checking (flag when actions seem unrelated to the goal), periodic re-grounding (re-inject the original goal into context). Handle by: reverting to last checkpoint, re-planning from the original goal, or escalating to human.

---

## Chapter 10 — FDE-Specific Questions

<cite index="78-1">FDE interviewers are not grading your answer. They are watching how you think through a problem you have never seen before.</cite>

<cite index="83-1">The inability to whiteboard an LLM-as-Judge eval suite is an immediate disqualifier for 70% of applicants.</cite>

---

**Q: A customer says "our AI chatbot gives wrong answers." How do you diagnose?**

Don't jump to solutions. Structured diagnosis: (1) Collect examples of wrong answers. (2) For each: trace the request — was it a retrieval failure (wrong docs), memory failure (stale info), context failure (overflow/noise), model failure (hallucination), or tool failure? (3) Check eval metrics — did hallucination rate spike after a recent deployment? (4) Check retrieval recall — are the right documents being found? (5) Check the knowledge base — is the source data correct and up-to-date?

The root cause is almost never "the model is bad." It's almost always retrieval, context, or data quality.

---

**Q: Compare hosted vs self-hosted LLM deployment for a regulated enterprise.**

Hosted (API): Faster to deploy, no GPU management, always latest models, vendor handles scaling. Risks: data leaves your network, vendor lock-in, compliance concerns (GDPR, HIPAA), limited customization.

Self-hosted: Data stays on-premise, full control, no vendor dependency, meets strict compliance. Costs: GPU procurement/management, model updates are manual, operational overhead, need ML ops expertise.

Recommendation for regulated customer: Start with hosted + zero-data-retention API (Anthropic, Azure OpenAI). Move to self-hosted only if regulatory requirements explicitly prohibit data leaving the network.

---

**Q: How do you know your AI system is actually working?**

<cite index="78-1">"How do you know your AI system is actually working?" is the differentiator question.</cite>

Three levels: (1) Operational — is it up, fast, and not erroring? (latency, error rate, availability). (2) Quality — are the answers good? (faithfulness, hallucination rate, eval scores vs golden dataset). (3) Business — are users succeeding? (CSAT, resolution rate, task completion, repeat contact).

Most teams only measure level 1. Level 2 requires evaluation pipelines. Level 3 requires product analytics. All three are needed.

---

**Q: A customer wants to deploy an AI agent that can access their database, send emails, and create Jira tickets. How do you architect the security?**

Least privilege per tool: DB tool gets read-only access to specific tables, email tool can only send to approved domains, Jira tool can only create (not delete) in specific projects. Human approval for sensitive actions (sending external emails, modifying production data). All tool calls logged with user ID, timestamp, inputs, outputs. Credential rotation on schedule. Sandbox code execution. Rate limits per user. Input validation on all tool arguments (parameterized queries, never raw LLM-generated SQL).

---

**Q: Your customer's RAG system works in testing but fails in production. What changed?**

Common causes: (1) Data drift — production queries differ from test queries (more ambiguous, more diverse). (2) Knowledge base grew — retrieval precision dropped as index size increased. (3) Document updates broke chunking — new document formats weren't handled by the chunker. (4) Prompt regression — a prompt change improved one use case but degraded others. (5) Traffic patterns — high load caused timeouts in retrieval or inference.

Diagnosis: compare test and production query distributions, check retrieval metrics in production, review recent deployments, run production queries through offline eval pipeline.

---

**Q: A non-technical VP asks "why can't we just use ChatGPT for everything?" How do you respond?**

Acknowledge what ChatGPT does well — general knowledge, writing, brainstorming. Then explain the gaps for enterprise: (1) It doesn't know your company's data (need RAG). (2) It can't take actions in your systems (need tool integration). (3) It doesn't enforce your security policies (need guardrails). (4) You can't measure if answers are correct for your domain (need evaluation). (5) Customer data goes to OpenAI's servers (compliance risk). (6) No observability into what's happening.

Frame it: "ChatGPT is a great model. We need to build the SYSTEM around it — security, your data, your tools, monitoring — to make it production-ready for our use case."

---

**Q: Walk through how you would debug a customer integration where a third-party API starts timing out intermittently.**

(1) Check the distributed trace — is the timeout in our call to the API, or in the API itself? (2) Check if it's specific to certain request types (large payloads? specific endpoints?). (3) Check timing patterns — is it load-related (peak hours)? (4) Check our retry logic — are we creating a retry storm that's making it worse? (5) Implement circuit breaker if not already present. (6) Add fallback behavior (cached response, graceful degradation). (7) Communicate with the API provider with specific evidence (timestamps, request IDs, error codes).

FDE differentiator: awareness of the CUSTOMER's operational reality — downtime costs, change windows, who to escalate to.

---

**Q: How would you scope an AI project for a new enterprise customer?**

(1) Understand the actual problem — not "we want AI" but "what specific workflow is painful?" (2) Identify data sources — what data exists, where, what format, what quality? (3) Define success metrics — what does "working" look like? Specific numbers. (4) Identify constraints — latency, compliance, budget, team expertise. (5) Start with the smallest valuable deployment — one use case, one team, prove value, expand. (6) Plan evaluation from day one — how will we know it's working?

The biggest FDE mistake: building what the customer asks for instead of what they need.

---

## Things Beyond This

Only after all of the above:

- A2A Protocol (Google) — agent-to-agent communication standard
- Agent Handoff patterns (OpenAI Agents SDK)
- LangGraph state management internals
- Advanced RAG (GraphRAG, RAPTOR, ColBERT late interaction)
- Production fine-tuning pipelines (LoRA, QLoRA)
- LLM training from scratch
- Reinforcement Learning (RLHF, DPO, RLAIF, RLVR)
- Multi-modal architectures
- Edge/on-device inference
- Robotics
- Model Training

---

## Resources

- OWASP LLM Top 10: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- Anthropic MCP Docs: https://modelcontextprotocol.io
- Exponent FDE Interview Guides (OpenAI, Anthropic, Google): https://www.tryexponent.com
- RAGAS Documentation: https://docs.ragas.io
- vLLM Documentation: https://docs.vllm.ai
- LangGraph Documentation: https://langchain-ai.github.io/langgraph/
- Attention Is All You Need (original Transformer paper): Vaswani et al., 2017
- MT-Bench / Chatbot Arena: https://chat.lmsys.org
- SWE-bench: https://www.swebench.com
- DataCamp RAG Interview Questions: https://www.datacamp.com/blog/rag-interview-questions
- Careery AI Engineer Interview Guide: https://careery.pro/blog/ai-careers/ai-engineer-interview-questions
