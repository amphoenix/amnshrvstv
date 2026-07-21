"A multi-agent system improves reliability by decomposing complex tasks into specialized, collaborating agents instead of relying on a single general-purpose agent."

Note: Agent fundamentals, the ReAct loop, and basic patterns (Fan-Out, Pipeline, Reflection, Actor-Critic, Swarm, Blackboard) were introduced in Chapters 6 and 8. This chapter goes deeper into multi-agent orchestration, advanced patterns, production architecture, and the economics of multi-agent systems.

---

# Part 1 — Why Multi-Agent Systems

---

# 9.1 When Single Agents Hit Their Limits

A single agent works well for most tasks. But as complexity grows, it fails in predictable ways:

**Context overflow** — Long conversations and multi-step research exceed the context window, degrading reasoning.

**Cascading failures** — An early mistake propagates through all subsequent steps with no independent verification.

**Generalist performance** — One prompt can't be expert at research AND coding AND SQL AND review simultaneously. Jack of all trades, master of none.

**Sequential bottleneck** — Everything executes one step at a time. No parallelism.

**No independent verification** — The agent reviews its own work. No second opinion.

**The architecture vs model size argument:**

A 2026 research finding: when you give a single agent the same total compute budget a multi-agent system uses, the single agent often matches or beats it on reasoning tasks. This means multi-agent is NOT about "more agents = better." It's about solving specific architectural problems — specialization, parallelism, independent verification, fault isolation — that a single agent structurally cannot address regardless of compute budget.

**Rule:** Don't go multi-agent unless the task genuinely benefits from specialization, parallelism, or independent critique. Multi-agent adds 58-285% token overhead.

---

# 9.2 What Multi-Agent Solves

Instead of making the model bigger or the prompt better:

```
Bigger Model ❌ (doesn't solve orchestration)
Better Prompt ❌ (doesn't solve verification)
Better Architecture ✅ (solves both)
```

Multi-agent introduces:

**Specialization** — Each agent solves one problem well (Search Agent, Code Agent, SQL Agent, Reviewer).

**Fault isolation** — If the Math Agent fails, retry it without restarting the entire workflow.

**Parallelism** — Independent subtasks run simultaneously. Latency = slowest branch, not sum of all.

**Independent verification** — A separate Critic/Judge agent reviews output before it reaches the user.

**Scalability** — Adding a new capability = registering a new agent, not modifying a monolithic prompt.

---

# 9.3 Multi-Agent Economics (Real 2026 Data)

These numbers matter for interview discussions:

| Architecture | Token Overhead vs Single Agent |
|-------------|-------------------------------|
| Independent multi-agent (peer) | ~58% more |
| Centralized multi-agent (supervisor/orchestrator) | ~285% more |

**Where the cost goes:** The supervisor/orchestrator's growing context window dominates token spend — not the worker calls. Each time the orchestrator receives results and decides next steps, it processes everything seen so far.

**Model tiering saves cost:** Production systems don't use the same model for every agent.

| Agent Role | Recommended Model Tier |
|-----------|----------------------|
| Planner / Supervisor | Large (Opus, GPT-4) — needs strong reasoning |
| Router / Classifier | Small (Haiku, GPT-4o-mini) — fast, cheap |
| Specialist Worker | Medium (Sonnet, GPT-4o) — good enough for focused tasks |
| Critic / Judge | Medium-Large — needs to evaluate quality |

---

# Part 2 — Multi-Agent Architecture

---

# 9.4 Production Multi-Agent Architecture

```
                User
                  │
                  ▼
            API Gateway
            (auth, rate limit)
                  │
                  ▼
           Planner Agent
           (decompose goal into subtasks)
                  │
                  ▼
            Orchestrator
            (coordinate, don't solve)
                  │
                  ▼
               Router
     ┌──────────┼──────────┐
     ▼          ▼          ▼
  Search     Coding      SQL
  Agent      Agent       Agent
     │          │          │
     └──────────┼──────────┘
                ▼
          Shared Memory
          (task state, intermediate results)
                │
                ▼
           Tool Layer
           (MCP, APIs, databases)
                │
                ▼
          Critic / Judge
          (verify quality before returning)
                │
                ▼
         Evaluation + Observability
                │
                ▼
          Final Response
```

---

# 9.5 Core Components

**Planner** — Creates the execution strategy. Decomposes "Build a REST API for user management" into: 1) Define schema, 2) Write endpoints, 3) Add auth, 4) Write tests, 5) Review. The planner does NOT execute — it plans.

**Orchestrator** — Coordinates execution. Delegates subtasks, synchronizes results, manages retries, handles failures. The orchestrator should be lightweight — it coordinates, not solves.

**Router** — Selects the best specialist for each subtask. Routing methods:

| Method | How It Works | When to Use |
|--------|-------------|-------------|
| Rule-based | `if "SQL" in query → SQL Agent` | Obvious, deterministic cases |
| Embedding similarity | Compare query embedding to agent capability embeddings | Ambiguous queries |
| Confidence-based | Each agent scores its confidence; highest wins | Multiple capable agents |
| LLM routing | Ask an LLM "which agent should handle this?" | Most flexible, highest latency |

Production systems layer these: rules first (fast, cheap), then embedding/confidence for ambiguous cases, LLM routing as fallback.

**Specialist Agents** — Each focused on one domain: Search, Code, SQL, Vision, Translation, Math, Legal, etc. Each has its own system prompt, tools, and potentially its own model.

**Shared Memory** — Task state, intermediate results, shared knowledge accessible to all agents. Not the same as user memory (Chapter 2) — this is workflow-level shared state.

**Local Memory** — Private per-agent. Internal reasoning, temporary variables. Prevents context pollution between agents.

**Critic / Judge** — Independent quality assurance. Checks correctness, safety, completeness. Critical for production — without it, errors pass through unverified.

---

# 9.6 Agent Communication Models

How agents exchange information:

**Direct (Request-Response)** — Planner calls Search Agent, waits for result. Most common. Simple, synchronous.

**Publish-Subscribe** — Agent publishes event ("document indexed"). Interested agents react. Loose coupling, async.

**Shared Memory / Blackboard** — Agents read/write to a common knowledge space. No direct communication. Extremely loose coupling.

**Event Bus** — Events flow through a central bus. Multiple agents can react to the same event independently.

**Handoff (OpenAI pattern)** — Agent A transfers control to Agent B, passing along conversation context. Used in OpenAI Agents SDK. Clean ownership transfer.

**A2A Protocol (Google)** — Agent-to-Agent protocol announced in 2025. Standardizes how agents discover each other's capabilities and communicate across organizational boundaries — like MCP but for agent-to-agent (MCP is agent-to-tool). Still early but worth knowing for interviews.

| Pattern | Coupling | Best For |
|---------|---------|---------|
| Request-Response | Tight | Simple delegation |
| Pub-Sub | Loose | Reactive, async systems |
| Shared Memory | Loose | Collaborative reasoning |
| Event Bus | Loose | Scalable, distributed |
| Handoff | Medium | Ownership transfer |

---

# 9.7 State Management in Multi-Agent Systems

The hardest engineering problem in multi-agent: managing state across agents that may run in parallel, fail mid-execution, or need to resume after interruption.

**LangGraph's approach:** Model workflows as state graphs. Each node is a function/agent. Edges define transitions. The entire graph state is checkpointed after each step, enabling resume-from-checkpoint on failure.

```
State Graph:
┌────────┐     ┌────────┐     ┌────────┐
│ Plan   │────▶│Execute │────▶│Review  │
│        │     │        │     │        │
└────────┘     └────┬───┘     └────┬───┘
                    │              │
              checkpoint     checkpoint
              (persist)      (persist)
```

If "Execute" fails at step 3 of 5, the system reloads the checkpoint at step 2 and retries — without re-running "Plan."

**What goes in shared state:**
- Current workflow step
- Completed subtask results
- Pending subtasks
- Error history
- Agent assignments

**What does NOT go in shared state:**
- Full conversation history of every agent (too large)
- Internal reasoning chains (private to each agent)
- Raw tool outputs (summarize first, store summary)

---

# Part 3 — Advanced Multi-Agent Patterns

Patterns 1-8 (ReAct, Orchestrator-Worker, Supervisor, Fan-Out/Fan-In, Pipeline, Reflection, Actor-Critic, Swarm, Blackboard) were covered in Chapter 8. The patterns below are unique to multi-agent and not previously covered.

---

# 9.8 Sequential Handoff Pattern

The simplest multi-agent pattern. Each agent performs one step; output flows to the next.

```
User → Research Agent → Analysis Agent → Writer Agent → Reviewer Agent → Response
```

**When to use:** Fixed pipelines where each stage depends on the previous output. Report generation, document processing, translation pipelines.

**When NOT to use:** When steps are independent (use Fan-Out instead).

**Key risk:** Errors propagate downstream. Add validation between stages.

**Real-world example:** Translation pipeline: Translate → Proofread → Localize → Format.

---

# 9.9 Hierarchical Pattern (Multi-Level)

Supervisors of supervisors. A top-level manager delegates to mid-level managers, who delegate to workers.

```
            Executive Agent
           ┌───────┼───────┐
           ▼       ▼       ▼
       Research  Engineering  QA
       Manager   Manager      Manager
       ┌──┼──┐  ┌──┼──┐     ┌──┼──┐
       ▼  ▼  ▼  ▼  ▼  ▼     ▼  ▼  ▼
      Web DB Doc FE BE API  Unit Integ E2E
```

**When to use:** Large enterprise tasks with natural organizational structure. Software development with research, coding, and testing teams.

**Risk:** Deep hierarchies add latency and token cost at every level. Keep to 2-3 levels max.

**Real-world:** Devin uses a hierarchical architecture — planner decomposes high-level tasks, specialized executors handle coding/testing/deployment within isolated sandbox VMs.

---

# 9.10 Collaborative Pattern (Peer Agents)

Peer agents work together toward a shared goal without a strict hierarchy. They exchange ideas and refine solutions collectively.

```
     Shared Objective
    ┌─────┼─────┐
    ▼     ▼     ▼
Agent A Agent B Agent C
    ▲     │     ▲
    └─────┼─────┘  (exchange ideas)
          ▼
    Shared Solution
```

**When to use:** Brainstorming, design reviews, strategic planning — tasks where multiple perspectives improve the outcome.

**Risk:** Consensus delays. Agents may "agree to agree" rather than challenge each other. Set conversation limits.

---

# 9.11 Competitive Pattern (Independent Solvers + Judge)

Multiple agents solve the same problem independently. A judge picks the best result.

```
         Same Task
    ┌────────┼────────┐
    ▼        ▼        ▼
Agent A   Agent B   Agent C
(approach 1)(approach 2)(approach 3)
    │        │        │
    └────────┼────────┘
             ▼
        Judge Agent
             ▼
       Best Response
```

**When to use:** Safety-critical decisions, mathematical proofs, code generation where correctness matters more than speed.

**Variants:** Majority Voting (most common answer wins), Confidence Selection (highest confidence), LLM-as-Judge (dedicated evaluator).

**Trade-off:** 3x the compute cost (3 agents + judge). Use only when correctness justifies the expense.

**Real-world:** Medical AI diagnosis systems often run multiple models and aggregate predictions.

---

# 9.12 Adversarial Debate Pattern

Agents actively argue AGAINST each other's solutions. A judge evaluates the debate.

```
         Problem
    ┌────────┴────────┐
    ▼                 ▼
Agent A            Agent B
(Solution A)       (Solution B)
    │                 │
    └────── Debate ───┘
         (critique each other)
             ▼
        Judge Agent
             ▼
       Final Decision
```

**Difference from Competitive:** In competitive, agents work independently and are ranked. In debate, agents INTERACT — they critique each other's reasoning, expose flaws, and refine arguments.

**When to use:** Complex reasoning, scientific analysis, legal analysis, code review where hidden assumptions need to be surfaced.

**Risk:** Agents can enter circular arguments. Limit debate rounds (2-3 max).

---

# 9.13 RLVR Feedback Pattern

Agents learn from verifiable outcomes — not human labels, but objective signals.

```
Task → Agent → Execution → Verifier → Reward → Policy Update
```

**Verifiable rewards:** Unit tests passed, SQL query returns correct results, compilation succeeds, math answer matches known solution, API response validates.

**Difference from RLHF:** RLHF uses human preferences (subjective). RLVR uses automatically verifiable signals (objective). RLVR is especially powerful for coding and math where correctness is measurable.

**When to use:** Domains where you can automatically verify outcomes. Coding agents (tests pass?), math agents (answer correct?), data agents (query returns expected results?).

---

# 9.14 Hybrid Routing Pattern

Combine multiple routing strategies in a cascade:

```
User Query
    │
    ▼
Rules Engine (fast, deterministic)
    │
    ├── Matched? → Route to specialist
    │
    └── Not matched? → ▼
                 Embedding Similarity
                       │
                       ├── High confidence? → Route
                       │
                       └── Low confidence? → ▼
                                        LLM Routing
                                        (most flexible, slowest)
```

**Why cascade?** Rules handle 70% of requests instantly (zero LLM cost). Embedding handles 20% more. LLM routing handles the remaining 10% of ambiguous cases. Cost-efficient.

---

# Part 4 — Production Concerns

---

# 9.15 Failure Recovery Strategies

```
Failure
    │
    ▼
Retry (transient failures)
    │
    ▼
Fallback Agent (if specialist unavailable)
    │
    ▼
Graceful Degradation (answer with partial results)
    │
    ▼
Circuit Breaker (stop calling failing service)
    │
    ▼
Human Escalation (if all else fails)
```

**Checkpoint recovery:** For long-running workflows, save state after each step. On failure, resume from last checkpoint instead of restarting.

---

# 9.16 Multi-Agent Anti-Patterns

**God Orchestrator** — Orchestrator plans, routes, executes, validates, and manages memory. Keep it lightweight — coordinate, don't solve.

**Agent Explosion** — Agent for every tiny task. More communication overhead than useful work. Create specialists only when justified.

**Circular Delegation** — A → B → C → A. Always define max recursion depth.

**Context Pollution** — Passing entire conversation to every agent. Give each agent ONLY its task-relevant context.

**Shared Memory Abuse** — Every agent writes everything. Memory pollution, duplicate facts, slow retrieval. Use ownership and access control.

**Over-Verification** — Three reviewers for a trivial response. Use verification proportional to task risk.

**Resume-Driven Development** — Adding multi-agent because it's fashionable. Start with a single agent. Add agents only when you can demonstrate measurable improvement.

---

# 9.17 Observability for Multi-Agent Systems

Every agent interaction needs tracing:

```
Trace ID: abc123
├── Planner (120ms, 450 tokens)
│   └── Plan: [search, code, test]
├── Router (15ms, 50 tokens)
│   └── Decision: Search Agent
├── Search Agent (800ms, 1200 tokens)
│   └── Tool: web_search("React vs Vue 2026")
│   └── Result: 5 documents
├── Router (15ms, 50 tokens)
│   └── Decision: Code Agent
├── Code Agent (2100ms, 3400 tokens)
│   └── Tool: file_write("api.ts")
│   └── Tool: bash("npm test")
│   └── Result: 4/4 tests pass
├── Critic (400ms, 800 tokens)
│   └── Score: 0.92 (pass)
└── Total: 3.45s, 5950 tokens, $0.04
```

**What to measure per agent:** Latency, token usage, tool calls, success rate, routing accuracy.

**What to measure per workflow:** End-to-end latency, total cost, task completion rate, delegation depth, retry count.

---

# 9.18 Framework Comparison (2026)

| Framework | Strength | Best For |
|-----------|---------|---------|
| LangGraph | Graph-based orchestration, strong state management | Production workflows |
| CrewAI | Role-based collaboration, simple mental model | Team-style agents |
| AutoGen | Conversational multi-agent, flexible communication | Research, prototyping |
| Google ADK | Enterprise agent development | Google ecosystem |
| OpenAI Agents SDK | Tool orchestration, handoff primitives | OpenAI-native apps |
| Semantic Kernel | Enterprise orchestration | Microsoft/.NET |

**Production reality:** Most production teams use LangGraph or build custom orchestration. CrewAI and AutoGen are popular for prototyping. The framework choice matters less than the pattern choice.

---

# Part 5 — Pattern Comparison & Selection

---

# 9.19 Pattern Comparison Matrix

| Pattern | Complexity | Latency | Token Cost | Reliability | Best Use Cases |
|---------|-----------|---------|-----------|------------|---------------|
| Sequential Handoff | Low | High | Low | Medium | Pipelines, document generation |
| Hierarchical | Medium | Medium | High | High | Enterprise assistants, coding agents |
| Collaborative | High | High | High | High | Research, brainstorming |
| Competitive | High | Very High | Very High | Very High | Safety-critical reasoning |
| Fan-Out/Fan-In | Medium | Low | Medium | High | Parallel research, search |
| Event-Driven | Medium | Low | Medium | High | Monitoring, automation |
| Adversarial Debate | Very High | Very High | Very High | Very High | Scientific reasoning, code review |
| Actor-Critic | Medium | Medium | Medium | High | Coding assistants, content generation |
| RLVR Feedback | High | Medium | Medium | Very High | Self-improving agents |
| Hybrid Routing | Medium | Low-Med | Medium | High | Enterprise copilots |
| Blackboard | High | Medium | Medium | High | Distributed planning |
| Swarm | Very High | Low | Medium | High | Exploration, optimization |

---

# 9.20 Pattern Selection Decision Tree

```
Is the task simple enough for one agent?
├── Yes → Single Agent (ReAct loop) — STOP
└── No ↓

Is the workflow fixed and sequential?
├── Yes → Sequential Handoff
└── No ↓

Are subtasks independent?
├── Yes → Fan-Out / Fan-In
└── No ↓

Need dynamic task decomposition?
├── Yes → Hierarchical (Orchestrator-Worker)
└── No ↓

Need multiple perspectives on the same problem?
├── Yes ↓
│   Is correctness more important than speed?
│   ├── Yes → Competitive or Adversarial Debate
│   └── No → Collaborative
└── No ↓

Need continuous quality improvement?
├── Yes → Actor-Critic or RLVR
└── No ↓

Is the system reactive/event-based?
├── Yes → Event-Driven
└── No ↓

Need massive parallelism with no coordinator?
├── Yes → Swarm (use with caution)
└── No → Hierarchical (default production choice)
```

**Default recommendation:** When in doubt, use Hierarchical (Orchestrator-Worker). It's the most widely deployed pattern, the easiest to debug, and has the most framework support.

---

# 9.21 Real-World Production Examples

| Product | Primary Pattern | Details |
|---------|----------------|---------|
| Cursor | Orchestrator-Worker | Context engine orchestrates codebase indexer, RAG, Tab model, Chat model |
| Claude Code | ReAct (single agent) + Sub-agents | Simple while loop; Task tool spawns sub-agents for isolation |
| Devin | Hierarchical | Planner → specialized executors in sandbox VMs |
| Perplexity Deep Research | Agentic Fan-Out | Iterative search loop, parallel source retrieval |
| GitHub Copilot Workspace | Pipeline | Plan → Implement → Test → Review |
| Windsurf Cascade | Orchestrator-Worker | Cascade agent with codemaps for codebase understanding |

---

# 9.22 Interview Notes

**Q: When would you choose multi-agent over single agent?**
When the task has genuinely independent subtasks that benefit from specialization, parallelism, or independent verification. Not for complexity's sake — a single agent with equivalent compute often matches multi-agent on reasoning tasks.

**Q: What's the most common production pattern?**
Orchestrator-Worker (~70% of production deployments). Supervisor is second. Swarm is mostly research.

**Q: How do you prevent infinite loops in multi-agent systems?**
Max delegation depth, max iterations per agent, circuit breakers, timeout limits, and explicit termination criteria.

**Q: How do you debug multi-agent failures?**
Distributed tracing with a single trace ID spanning all agents. Each agent logs its decisions, tool calls, and results. Trace the request path to find where quality degraded.

**Q: Orchestrator vs Supervisor?**
Orchestrator dispatches and merges — it's a coordinator. Supervisor actively monitors execution, checks quality mid-workflow, and can re-route or abort. Supervisor is more expensive but catches failures earlier.

**Q: Debate vs Competitive?**
Competitive: agents solve independently, judge picks the best. Debate: agents interact, critique each other's reasoning, and refine arguments before a judge decides. Debate is higher quality but much higher cost and latency.

**Q: What's A2A Protocol?**
Google's Agent-to-Agent protocol. MCP standardizes agent-to-tool communication. A2A standardizes agent-to-agent communication across organizational boundaries — agents discover each other's capabilities and delegate tasks. Complementary to MCP.

**Q: What's the biggest mistake in multi-agent design?**
Adding agents before proving a single agent can't solve the problem. Multi-agent adds 58-285% token overhead. The complexity must be justified by measurable improvement in quality, reliability, or capability.
