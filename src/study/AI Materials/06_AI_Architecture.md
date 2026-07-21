"An AI model answers questions. An AI system delivers reliable, scalable, secure, observable, and production-ready intelligence."

---

# Part 1 — AI System Architecture Fundamentals

---

# 6.1 What is AI System Architecture?

AI System Architecture is the overall design of a production AI application. It defines how all components — the LLM, retrieval system, memory, tools, orchestration, routing, security, observability, evaluation, and infrastructure — work together to process a user's request from start to finish.

Unlike traditional software architecture that primarily coordinates application logic and databases, an AI system must coordinate probabilistic models, external knowledge, reasoning, tool execution, and continuous feedback loops.

**Why does it exist?**

Calling an LLM directly is sufficient only for simple demos. Production systems must authenticate users, retrieve external knowledge, personalize responses, execute tools, monitor quality, optimize cost, scale to thousands of requests, and remain reliable during failures. Without architecture, these responsibilities become scattered, making the system difficult to maintain.

**How does it work?**

Instead of asking one model to solve everything, different components contribute different capabilities:

```
User Request → Gateway → Orchestrator → Retrieval + Memory → Context Builder
→ Model Selection → LLM → Tools (if required) → Validation → Response
```

Each component has a single responsibility. Together they form the complete AI system.

**Trade-offs:** Increased architectural complexity, more infrastructure, higher operational overhead vs. modular maintenance, better scalability, improved reliability, easier testing.

---

# 6.2 AI Application vs AI System

| Feature | AI Application | AI System |
|---------|---------------|-----------|
| Complexity | Low | High |
| Components | Few | Many |
| Scalability | Limited | High |
| Observability | Basic | Comprehensive |
| Evaluation | Minimal | Continuous |
| Security | Basic | Enterprise-grade |
| Reliability | Limited | High |
| Production Ready | Usually No | Yes |

An AI application is User → Prompt → LLM → Response.
An AI system is a distributed, modular, observable, secure, scalable production system.

---

# 6.3 Goals of AI System Architecture

| Dimension | Goals |
|-----------|-------|
| Functional | Accurate responses, relevant retrieval, correct tool execution, multi-step workflows |
| Performance | Low latency, high throughput, efficient resource utilization |
| Reliability | Fault tolerance, graceful degradation, retry mechanisms, high availability |
| Scalability | Horizontal scaling, elastic infrastructure, load balancing |
| Cost | Efficient model utilization, intelligent routing, caching, token optimization |
| Security | Authentication, authorization, guardrails, secret management, data protection |
| Quality | Continuous evaluation, monitoring, feedback loops, regression prevention |

---

# 6.4 Core Architectural Principles

**Separation of Concerns** — Each component has one clear responsibility. Retrieval retrieves. Memory remembers. Planner plans. Router routes. LLM generates.

**Loose Coupling** — Components interact through well-defined interfaces. Replacing one component should not require changes throughout the system.

**High Cohesion** — Each component focuses on one domain. Avoid combining unrelated responsibilities.

**Stateless Processing** — Request processing remains stateless wherever possible. Persistent information belongs in dedicated storage.

**Observability by Design** — Every component emits logs, metrics, and traces from the start — not bolted on later.

**Security by Design** — Security exists throughout the architecture, not only at the API boundary.

**Evaluation by Design** — Quality measurement is integrated into production workflows, not an afterthought.

---

# 6.5 High-Level Production AI Architecture

```
                User
                  │
                  ▼
            AI Gateway
                  │
                  ▼
            Orchestrator
                  │
    ┌─────────────┼──────────────┐
    ▼             ▼              ▼
 Planner      Retriever       Memory
    │             │              │
    └─────────────┼──────────────┘
                  ▼
          Context Builder
                  │
                  ▼
           Model Router
                  │
                  ▼
                LLM
                  │
         ┌────────┴─────────┐
         ▼                  ▼
      Tools          Post Processor
         │                  │
         └────────┬─────────┘
                  ▼
              Response
```

---

# 6.6 End-to-End Request Lifecycle

```
User Request → Gateway → Planning → Retrieval → Memory → Context Building
→ Model Selection → Generation → Tool Execution → Validation → Response
→ [Async: Logging, Evaluation, Memory Update]
```

Some operations — evaluation, memory updates, analytics — execute asynchronously after the response is returned.

---

# 6.7 Architecture Layers

| Layer | Responsibility |
|-------|---------------|
| Interface Layer | User interaction and APIs |
| Gateway Layer | Authentication, routing, rate limiting |
| Orchestration Layer | Workflow coordination |
| Knowledge Layer | Retrieval and memory |
| Intelligence Layer | Planning, routing, reasoning |
| Model Layer | LLM inference |
| Tool Layer | External actions and integrations |
| Response Layer | Validation and formatting |
| Platform Layer | Evaluation, observability, optimization |

---

# Part 2 — Core AI Components

---

# 6.8 AI Gateway

The entry point into an AI system. Every request passes through it before reaching any downstream component.

**Responsibilities:** Authentication, Authorization, Rate Limiting, Routing, Input Validation, Logging, Guardrails (filter unsafe inputs), Cost Tracking.

```
User Request → Authenticate → Authorize → Rate Limit → Validate
→ Apply Guardrails → Log → Forward to Orchestrator
```

**Best Practices:** Keep stateless. Deploy multiple instances. Enforce authentication before any expensive operations.

---

# 6.9 Orchestrator

The central coordinator. It determines which components participate in processing a request and in what order. It does not perform retrieval, reasoning, or generation itself — it coordinates.

**Static Orchestration** — Fixed workflow, predictable, faster, easier debugging.
**Dynamic Orchestration** — Workflow determined at runtime, flexible, more adaptive, more complex.

**Best Practices:** Keep orchestration separate from business logic. Track workflow state. Support retries and recovery.

---

# 6.10 Planner vs Router

**Planner** — Decides what steps are required. Planning is reasoning, not execution. Output is a plan:
```
1. Search documentation
2. Retrieve user data
3. Analyze information
4. Generate report
```

Use when tasks require multiple steps, dependencies exist, or execution order matters. Avoid for trivial requests. Cache reusable plans.

**Router** — Decides where a request should go. Classification and dispatch, not reasoning.
```
Weather Question → Weather Tool
Code Question → Coding Assistant
```

| Planner | Router |
|---------|--------|
| What should happen? | Where should it go? |
| Multi-step reasoning | Single routing decision |
| Higher latency | Lower latency |

**Best Practice:** Prefer routing whenever planning is unnecessary.

---

# 6.11 Context Builder

Assembles the final prompt sent to the LLM. Combines information from multiple sources into a coherent, token-aware context.

**Inputs:** System prompt, User query, Conversation history, Retrieved documents, Memory, Tool outputs.

**Responsibilities:** Merge sources, Remove duplicates, Manage token budget, Prioritize information, Format consistently.

Without a dedicated Context Builder: context windows overflow, duplicates accumulate, important context gets omitted, formatting becomes inconsistent.

---

# 6.12 Retriever & Memory

**Retriever** — Fetches relevant external knowledge to ground the LLM. Sources: vector databases, full-text search, knowledge graphs, enterprise documents, APIs.

**Memory** — Stores and retrieves information from previous interactions. Provides personalization and continuity. Types: Session, Episodic, Semantic, Procedural (covered in Chapter 2).

**Key distinction:** Retrieval accesses external knowledge. Memory provides personal context.

---

# 6.13 Model Router

Selects the most appropriate model per request based on task complexity, latency, capabilities, and cost.

**Strategies:** Rule-based, Capability-based, Cost-aware, Confidence-based cascading, Learned classifiers.

```
Simple Question → Small Model
Complex Coding → Large Reasoning Model
```

Configure fallback models. Monitor routing performance continuously.

---

# 6.14 LLM

The reasoning and generation engine. Consumes prepared context and produces output.

**Important:** The LLM is only one component. It should NOT be responsible for authentication, retrieval, memory management, tool execution, or observability.

---

# 6.15 Tools

Enable interaction with the external world. Instead of generating hypothetical answers, the system performs real actions.

```
LLM → Tool Call → External System → Result → LLM
```

Examples: Web search, Database queries, Calculator, Email, GitHub, Calendar, CRM, Payment APIs.

**Best Practices:** Validate inputs. Handle failures gracefully. Limit permissions. Log every invocation.

**MCP (Model Context Protocol)** — Anthropic's open protocol for standardized tool integration. Uses JSON-RPC over stdio/SSE/streamable HTTP. Provides a consistent interface for tools, resources, and prompt templates. Production tools like Cursor, Claude Desktop, and Windsurf use MCP for tool connectivity. Covered in detail in Chapter 1.

---

# 6.16 Post Processor

Performs final processing before the response reaches the user: output validation, response formatting, guardrail enforcement, citation insertion, content filtering, schema validation.

LLM outputs may violate formatting requirements, contain unsafe content, include unsupported claims, or fail schema validation. The Post Processor ensures production standards.

---

# 6.17 Guardrails Architecture

**What is it?**

Guardrails are safety and quality controls applied at both input and output boundaries of the AI system.

**Input Guardrails** (at Gateway):
- Prompt injection detection — identify attempts to override system instructions.
- Content policy filtering — block prohibited content before it reaches the LLM.
- PII detection — flag or redact personal information in user input.
- Schema validation — reject malformed requests.

**Output Guardrails** (at Post Processor):
- Hallucination detection — flag unsupported claims.
- Toxicity filtering — block harmful content.
- PII leakage prevention — prevent the model from exposing sensitive data from context.
- Refusal validation — ensure the model refuses when it should AND doesn't over-refuse.
- Format compliance — enforce structured output schemas.

```
User Input → Input Guardrails → [AI Pipeline] → Output Guardrails → Response
```

For FDE roles, guardrails are often the first requirement enterprise customers ask about. Demonstrating guardrail architecture is a prerequisite for deployment approval in regulated industries.

---

# 6.18 Caching Layer

Production AI systems cache at multiple levels to reduce latency and cost:

- **Exact Cache** — Identical requests return cached responses.
- **Semantic Cache** — Semantically similar requests return cached responses.
- **Prefix Cache** — Shared prompt prefixes reuse computed attention states.
- **Embedding Cache** — Previously computed embeddings are reused.
- **Retrieval Cache** — Search results for repeated queries are cached.

Caching sits between the Gateway and the intelligence layers, intercepting requests before expensive computation occurs.

```
Request → Cache Lookup → Hit? → Return cached response
                        → Miss? → Continue to AI pipeline → Cache result
```

---

# Part 3 — AI Design Patterns

"Architecture defines the components. Design patterns define how those components collaborate to solve problems."

---

# 6.19 Single Agent Pattern

One LLM (or agent) performs the complete task. May call tools but all reasoning happens within one agent.

```
User → Single Agent → Tools/Memory → Response
```

Best for: chatbots, FAQ assistants, small copilots. Simple, low latency, low cost. Trade-off: prompt becomes large, hard to specialize, single bottleneck.

---

# 6.20 Multi-Agent Pattern

Multiple specialized agents collaborate. Each owns a specific domain.

```
Supervisor → Research Agent + Coding Agent + Review Agent → Response
```

Best for: software engineering agents, research platforms, enterprise automation. Trade-off: more LLM calls, communication overhead, higher latency.

---

# 6.21 Planner–Executor Pattern

Planning and execution are separated. One component determines what should happen; another performs the work.

```
User → Planner → Execution Plan → Executor → Tools → Response
```

Best for: enterprise agents, workflow automation, research. Enables transparent reasoning, plan approval, easier auditing. Trade-off: extra LLM call, additional latency.

---

# 6.22 Supervisor Pattern

A central controller coordinates multiple agents. All coordination passes through the supervisor rather than agents communicating freely.

Best for: coordinated multi-domain tasks. Centralized monitoring, better dependency management. Trade-off: supervisor becomes critical infrastructure, additional latency.

---

# 6.23 Reflection Pattern

Agent critiques its own output and improves it before returning the final answer.

```
Generate → Review → Improve → Repeat (if needed) → Return
```

Best for: code generation, writing, report generation, complex reasoning. Better quality, reduced hallucinations. Trade-off: higher latency, more model calls. Always define iteration limits.

---

# 6.24 Fan-Out/Fan-In Pattern

Distribute work to multiple workers simultaneously, then aggregate results.

```
Task → Fan Out → Worker 1 + Worker 2 + Worker N → Fan In → Aggregated Result
```

Best for: parallel retrieval from multiple sources, batch processing, research across multiple topics. Lower latency than sequential execution. Trade-off: aggregation logic, handling partial failures.

---

# 6.25 Swarm Pattern

Agents self-claim tasks from a shared task list rather than being assigned by a supervisor. No central coordinator.

```
Shared Task List (tasks.md) → Agent A claims Task 1 → Agent B claims Task 2 → ...
```

Best for: highly parallel workloads where tasks are independent. Agents operate autonomously. Trade-off: coordination through shared state, potential conflicts, harder to guarantee coverage.

---

# 6.26 Blackboard Pattern

A shared workspace where multiple agents read and write information. Agents don't communicate directly — collaboration occurs through shared state.

Best for: research systems, knowledge discovery, collaborative AI. Loose coupling, easy scalability. Trade-off: synchronization issues, shared-state contention.

---

# 6.27 Actor-Critic Pattern

One agent generates output (Actor). Another evaluates and scores it (Critic). The Actor revises based on feedback.

```
Actor → Draft → Critic → Score + Feedback → Actor → Revised Draft → ...
```

Can include maximum revision rounds to prevent infinite loops. Best for: quality-critical content generation, code review workflows, RLAIF-style scoring.

---

# 6.28 Event-Driven Agent Pattern

Components react to events rather than direct invocations. Each event triggers the next stage.

```
Document Uploaded → Indexer → Document Indexed → Evaluation → Notification
```

Best for: background processing, async AI pipelines, document processing. Loose coupling, high scalability. Trade-off: harder debugging, eventual consistency.

---

# 6.29 Pattern Comparison & Selection

| Pattern | Best For | Complexity | Latency | Cost |
|---------|---------|-----------|---------|------|
| Single Agent | Simple assistants | Low | Low | Low |
| Multi-Agent | Specialized workflows | High | High | High |
| Planner–Executor | Multi-step tasks | Medium | Medium | Medium |
| Supervisor | Coordinated agents | High | High | High |
| Reflection | High-quality outputs | Medium | High | High |
| Fan-Out/Fan-In | Parallel processing | Medium | Low | Medium |
| Swarm | Independent parallel tasks | Medium | Low | Medium |
| Blackboard | Collaborative reasoning | High | Medium | Medium |
| Actor-Critic | Quality-critical generation | Medium | High | High |
| Event-Driven | Async processing | High | Low (user-facing) | Medium |

**Selection principle:** Start with the simplest pattern. Introduce complexity only when justified by measurable requirements.

---

# Part 4 — Retrieval Architecture

"An LLM is only as good as the information it receives."

---

# 6.30 Retrieval Pipeline

```
User Query → Query Processing → Retrieval → Reranking → Filtering → Context Assembly → LLM
```

| Stage | Responsibility |
|-------|---------------|
| Query Processing | Improve search query |
| Retrieval | Find candidate documents |
| Reranking | Improve ordering |
| Filtering | Remove unwanted results |
| Context Assembly | Prepare final context |

---

# 6.31 Query Processing

Transform the user's raw query to improve retrieval:
- **Query Rewriting** — "pricing" → "Current enterprise pricing for Product X"
- **Query Expansion** — "AI" → "AI, Machine Learning, LLM, Generative AI"
- **Query Decomposition** — "Compare AWS and Azure pricing" → Search AWS + Search Azure → Compare
- **Query Classification** — Route different query types to different retrieval strategies.

---

# 6.32 Hybrid Search Architecture

```
Query → Vector Search + Keyword Search + Graph Search → Fusion Layer → Reranker → Top Results
```

| Method | Best At |
|--------|---------|
| Vector | Meaning, semantic similarity |
| Keyword | Exact terms, IDs, error codes |
| Graph | Relationships between entities |

**Fusion Layer** — Combines results from multiple methods into unified ranked set. Strategies: Reciprocal Rank Fusion (RRF), Weighted Score Fusion, Learning-to-Rank.

---

# 6.33 Multi-Stage Retrieval

Large-scale retrieval is performed in progressive stages:

1. **Recall Stage** — Retrieve all potentially relevant docs quickly (ANN, BM25, Graph). Priority: high recall.
2. **Reranking Stage** — Improve ordering (Cross Encoder, Cohere Rerank, ColBERT). Priority: high precision.
3. **Filtering Stage** — Remove duplicates, outdated info, unauthorized docs, low-confidence results.
4. **Context Assembly** — Format, truncate, order, token budget.

---

# 6.34 Knowledge Graph & Memory Integration

**Knowledge Graphs** store entities and relationships. Text search answers "Where is Alice mentioned?" Graph search answers "Which projects is Alice working on?"

**Memory Integration** — Retrieval isn't limited to external documents. Production systems retrieve from documents + memory + conversation history simultaneously, enabling personalized responses.

---

# Part 5 — Workflow Architecture

"Components define what exists. Workflows define how those components collaborate."

---

# 6.35 Workflow Types

**Sequential** — Task A → Task B → Task C. Simple, deterministic, no parallelism. Use when tasks depend on previous outputs.

**DAG (Directed Acyclic Graph)** — Independent tasks run in parallel while respecting dependencies. A → (B + C) → D. Frameworks: Airflow, Prefect, Dagster, LangGraph.

**State Machine** — Finite states with explicit transitions (Idle → Planning → Retrieving → Generating → Reviewing → Done). Predictable, easy auditing, reliable. Use for controlled, deterministic workflows.

**Event-Driven** — Components react to events via message bus. Loose coupling, high scalability, async execution. Harder debugging, eventual consistency.

**Human-in-the-Loop** — Manual review/approval before critical actions. Required for healthcare, legal, financial, security. Higher reliability, regulatory compliance. Slower workflows.

---

# 6.36 Workflow Selection

| Requirement | Recommended |
|------------|-------------|
| Simple linear task | Sequential |
| Independent subtasks | DAG |
| Controlled execution | State Machine |
| Async processing | Event-Driven |
| Critical decisions | Human-in-the-Loop |

| Workflow | Parallelism | State Tracking | Scalability | Complexity |
|---------|------------|---------------|------------|-----------|
| Sequential | No | Low | Low | Low |
| DAG | Yes | Medium | High | Medium |
| State Machine | Limited | High | Medium | Medium |
| Event-Driven | High | Distributed | Very High | High |
| HITL | Depends | High | Medium | Medium |

---

# 6.37 Workflow Error Handling & State Management

**Error Handling:** Configure retry policies with exponential backoff, use fallback models/services, log all failures, avoid infinite retry loops.

```
Failure → Retry? → Fallback? → Escalate? → Terminate
```

**State Management:** Long-running workflows need persistent state (Workflow ID, Current Step, Completed/Pending Tasks, Context, Errors, Result). Store externally. Version definitions. Persist checkpoints.

---

# Part 6 — AI Platform Architecture

"An AI application serves users. An AI platform serves applications."

---

# 6.38 What is AI Platform Architecture?

Shared infrastructure supporting the entire AI lifecycle across multiple applications, teams, and models.

Without a platform, every team independently builds authentication, LLM integration, RAG, monitoring, and prompt management — creating duplication and inconsistency.

| AI Application | AI Platform |
|---------------|-------------|
| Solves business problems | Provides shared AI capabilities |
| Used by end users | Used by developers |
| One product | Many products |
| Domain-specific | Organization-wide |

---

# 6.39 Platform Architecture

```
AI Applications (Chatbot, Copilot, Search, Agent)
                    │
            AI Platform APIs
                    │
┌───────────────────┼────────────────────┐
Gateway    Orchestration    Retrieval    Memory
│               │              │           │
Model Mgmt   Prompt Mgmt   Tool Layer  Evaluation
│               │              │           │
Observability  Security    Deployment   Cost Control
                    │
            Infrastructure Layer
```

---

# 6.40 Platform Services

**Model Management** — Provider abstraction, registry, versioning, routing, fallbacks. Applications request capabilities, not specific provider APIs.

**Prompt Management** — Centralized templates, versioning, variables, testing, rollback. Prompts become managed platform assets, not embedded in application code.

**Tool Platform** — Standardized access to external systems. Centralized credential management, permission controls, logging.

**Memory Platform** — Centralized storage/retrieval for session and long-term memory. User-level isolation, expiration policies.

**Evaluation Platform** — Organization-wide quality assessment, benchmarking, regression testing, experiment comparison.

**Observability Platform** — Centralized logs, metrics, traces, cost, latency, tokens, tool calls, failures.

**Security & Governance** — Authentication, authorization, secret management, encryption, audit logging, compliance, policy enforcement.

**Deployment Platform** — CI/CD, canary releases, rollbacks, autoscaling, environment management.

**Cost Management** — Token accounting, model costs, budget limits, usage reports, optimization recommendations.

---

# 6.41 AI Platform Maturity Model

| Level | Characteristics |
|-------|----------------|
| Level 1 – Experimental | Individual AI apps, minimal shared infrastructure |
| Level 2 – Standardized | Shared APIs, prompt templates, model integrations emerge |
| Level 3 – Platformized | Centralized retrieval, memory, evaluation, observability, tooling as reusable services |
| Level 4 – Enterprise | Strong governance, security, CI/CD, cost optimization, org-wide standards |
| Level 5 – Intelligent | Adaptive routing, automated optimization, self-healing, continuous evaluation, platform-wide learning |

---

# Part 7 — Distributed AI Systems

"As AI workloads grow beyond a single process, systems must distribute computation, data, and coordination across multiple services."

---

# 6.42 What are Distributed AI Systems?

Multiple independent services, agents, models, and infrastructure components working together over a network. Responsibilities distributed across specialized services that scale and evolve independently.

A single AI service eventually reaches limits in CPU/GPU capacity, memory, bandwidth, throughput, fault tolerance, and geographic availability.

---

# 6.43 Distributed Components

Each major capability becomes an independent deployable service: Gateway, Orchestrator, Retrieval Service, Memory Service, Model Service, Tool Service, Evaluation Service, Observability Service, Storage Services. Each scales independently.

**Distributed Inference** — Large models across multiple GPUs (Tensor Parallelism, Pipeline Parallelism, Data Parallelism, Expert Parallelism/MoE).

**Distributed Retrieval** — Search across multiple indexes, regions, or storage systems simultaneously. Merge results. Handle cross-region latency.

**Distributed Memory** — Multiple storage systems (session, semantic, episodic, graph) behind a unified API.

**Distributed Agents** — Agents execute on different hosts/containers while collaborating. Parallel execution, independent scaling, fault isolation. Challenges: coordination, communication latency, state synchronization.

---

# 6.44 Communication Patterns

**Synchronous** — Service A → Request → Service B → Response. Simple, immediate. Trade-off: blocking, cascading failures.

**Asynchronous** — Service A → Message Queue → Service B. Loose coupling, better scalability. Trade-off: eventual consistency, complex debugging.

**Event Streaming** — Producer → Event Stream → Multiple Consumers. Useful for telemetry, indexing, long-running workflows.

---

# 6.45 Consistency, Fault Tolerance & Scalability

**CAP Theorem** — In a distributed system, you can guarantee at most two of three: Consistency, Availability, Partition tolerance. Since network partitions are unavoidable, the real choice is between consistency and availability during failures.

**Strong Consistency** — Every service immediately sees the latest update. Higher latency, reduced availability during failures. Use for: financial transactions, authentication.

**Eventual Consistency** — Updates propagate over time. Better scalability, higher availability. Use for: search indexes, user preferences, analytics.

**Fault Tolerance:** Health checks, retries, circuit breakers, timeouts, replication, failover. Systems should continue operating despite individual service failures.

**Scalability:** Horizontal scaling (add instances) is generally preferred over vertical scaling (bigger machines) for production AI platforms.

---

# 6.46 Distributed Deployment

```
Global DNS → Global Load Balancer
→ Region A (Gateway → AI Services) + Region B (Gateway → AI Services) + Region C
→ Shared Data Platform
```

Supports high availability, disaster recovery, and low-latency access across regions.

---

# Part 8 — Architectural Trade-offs & Decision Framework

"There is no universally best AI architecture. Every decision is a trade-off."

---

# 6.47 The AI Architecture Trade-off Triangle

```
        Quality
       /       \
      /         \
   Cost ------- Latency
```

| Decision | Benefit | Cost |
|----------|---------|------|
| Large Model | Better reasoning | Higher latency & cost |
| Small Model | Faster & cheaper | Lower capability |
| Multi-Agent | Specialization | Coordination overhead |
| Single Agent | Simplicity | Limited scalability |
| Reflection | Higher quality | More LLM calls |
| Retrieval | Better grounding | Additional latency |
| Memory | Personalization | Storage & complexity |
| Distributed | Scalability | Network complexity |
| Human Approval | Reduced risk | Slower workflows |

---

# 6.48 Architecture Decision Framework

1. **Define the Problem** — What is the application? Who are the users? What business value?
2. **Define Constraints** — Max latency, budget, regulations, team size, infrastructure.
3. **Define Quality Goals** — Accuracy, reliability, scalability, availability, security.
4. **Select Components** — Does the system need retrieval, memory, tools, planner, router, multi-agent, evaluation? Avoid adding components without measurable value.
5. **Choose Workflow** — Sequential, DAG, State Machine, Event-Driven, HITL.
6. **Validate with Production Metrics** — Latency, cost, error rate, user satisfaction. Architecture should evolve based on data, not assumptions.

---

# 6.49 Architecture Selection Matrix

| Need | Use |
|------|-----|
| Simple chatbot | Single Agent |
| Private knowledge | RAG + Memory |
| Coding assistant | Planner + Tools + Retrieval |
| Research assistant | Multi-Agent + Planner |
| Customer support | Retrieval + Memory + Tools |
| Autonomous workflow | Supervisor + State Machine |
| Financial assistant | HITL + Strong Governance |
| Large enterprise | Distributed Platform Architecture |
| Global AI service | Multi-region Distributed Architecture |

---

# 6.50 Build vs Buy

| Capability | Common Choice |
|-----------|--------------|
| LLM Provider | Buy |
| Vector Database | Usually Buy |
| Gateway | Buy or Build |
| Orchestrator | Usually Build |
| Business Logic | Build |
| Enterprise Integrations | Build |
| Evaluation | Often Hybrid |
| Observability | Often Buy |
| Domain Knowledge | Build |

---

# 6.51 Architecture Evolution

Systems evolve incrementally:

**Stage 1:** User → LLM (Prototype)
**Stage 2:** User → Gateway → LLM (Production API)
**Stage 3:** Gateway → Retriever → LLM (RAG system)
**Stage 4:** Gateway → Planner → Retriever → Memory → LLM → Tools (Enterprise assistant)
**Stage 5:** Platform → Distributed Services → Multi-Agent → Evaluation → Observability (Enterprise platform)

**Principle:** Grow architecture incrementally. Avoid designing for requirements that don't yet exist.

---

# 6.52 Architectural Anti-Patterns

- **Overengineering** — Complex architectures for simple use cases.
- **LLM-Centric Design** — Expecting the model to handle retrieval, memory, orchestration, and security.
- **Tight Coupling** — Components depend on implementation details rather than interfaces.
- **Premature Distribution** — Splitting services before scalability requires it.
- **Missing Observability** — Operating distributed systems without logs, metrics, or traces.
- **Ignoring Evaluation** — Deploying without measuring quality.
- **Tool Overuse** — Invoking tools when the model already has sufficient context.
- **Excessive Retrieval** — Sending irrelevant context to the model.
- **Unbounded Workflows** — Allowing infinite planning, reflection, or agent communication loops.
- **Architecture by Trend** — Selecting architectures because they're popular rather than appropriate.

---

# Part 9 — Reference Architectures & Production Readiness

---

# 6.53 Reference Architecture — AI Chatbot

```
User → Gateway → Retriever → LLM → Response
```
Simple, low latency, low cost. Suitable for FAQ bots, customer support, internal assistants.

---

# 6.54 Reference Architecture — Enterprise RAG

```
User → Gateway → Retriever → Reranker → Context Builder → LLM → Response
```
Additional: Vector DB, Keyword Search, Memory, Observability, Evaluation.

---

# 6.55 Reference Architecture — AI Copilot

```
User → Gateway → Planner → Retriever → Memory → Tool Layer → LLM → Response
```
Tool execution, personalization, multi-step reasoning.

---

# 6.56 Reference Architecture — Multi-Agent System

```
Supervisor → Research Agent + Coding Agent + Review Agent → Shared Context → Response
```

---

# 6.57 Reference Architecture — Enterprise AI Platform

```
Applications → Platform API → Gateway + Retrieval + Memory
→ Models + Tools + Evaluation + Observability → Infrastructure
```

---

# 6.58 End-to-End Production Architecture

```
User → AI Gateway (Auth, Rate Limit, Guardrails)
→ Orchestrator → Planner/Router/Workflow Engine
→ Context Builder ← (Retriever + Memory + Conversation)
→ Model Router → GPT/Claude/Local Models
→ Tool Execution → Post Processing (Validation, Guardrails, Citations)
→ Response
→ [Async: Evaluation, Observability, Memory Update]
```

---

# 6.59 Production Readiness Checklist

**Architecture:** Clearly defined responsibilities, modular components, loose coupling, replaceable services.

**Security:** Authentication, authorization, encryption, secret management, guardrails (input + output).

**Retrieval:** Indexed knowledge, hybrid search, reranking, access control.

**Memory:** Session + long-term memory, expiration policy, personalization strategy.

**Models:** Routing, fallbacks, version management, cost optimization.

**Tools:** Input validation, permission controls, retry policies, logging.

**Workflows:** Retry strategy, timeout handling, error recovery, human approval (if needed).

**Quality:** Offline + online evaluation, regression testing, quality dashboards.

**Observability:** Logs, metrics, traces, alerts, dashboards.

**Deployment:** CI/CD, canary rollout, rollback, monitoring.

**Scalability:** Horizontal scaling, load balancing, stateless services, caching.

**Reliability:** Health checks, circuit breakers, failover, disaster recovery.

---

# 6.60 Interview Notes

**Key component responsibilities:**
Gateway → Security. Orchestrator → Coordination. Planner → What steps. Router → Where to go. Retriever → External knowledge. Memory → Personal context. Context Builder → Assemble prompt. Model Router → Pick model. LLM → Reason and generate. Tools → External actions. Post Processor → Validate output.

**Common comparisons:** Application vs System, Retrieval vs Memory, Planner vs Router, Single Agent vs Multi-Agent, Sequential vs DAG, Strong vs Eventual Consistency, Platform vs Enterprise Architecture.

**Biggest architectural mistake:** Optimizing for complexity instead of requirements — adding multi-agent, distributed services, or advanced orchestration before they provide measurable value.

**Core principle:** Build the simplest system that satisfies today's requirements. Let production metrics guide evolution.
