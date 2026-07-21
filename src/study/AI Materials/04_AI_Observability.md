"You cannot operate, debug, or improve an AI system if you cannot observe what it is doing."

Modern AI systems are significantly more complex than traditional software. A single user request may involve planning, retrieval, memory access, multiple tool calls, reasoning, and evaluation before generating a response. AI Observability provides the visibility required to understand, monitor, debug, and optimize these complex workflows.

---

# Part 1: Observability Fundamentals

---

# 4.1 Introduction to AI Observability

**What is it?**

Observability is the ability to understand the internal state of a system by analyzing the data it produces — logs, metrics, traces, and events.

Unlike monitoring, which focuses on detecting known failures, observability enables engineers to investigate unknown failures, understand system behavior, and identify root causes.

In AI systems, observability extends beyond infrastructure to include prompts, retrieval, memory, reasoning, tool usage, evaluation, latency, and cost.

**Why does it exist?**

Traditional applications execute deterministic code:
```
Request → Business Logic → Database → Response
```

AI systems are probabilistic with multiple interacting components:
```
User → Planner → Retriever → Memory → Context Builder → LLM → Tools → Evaluation → Response
```

Failures can occur at any stage. Without observability, identifying the root cause becomes extremely difficult.

**Goals of AI Observability**

AI observability aims to answer:
- Why did the planner fail?
- Why was the wrong tool selected?
- Why was incorrect memory retrieved?
- Why did latency suddenly increase?
- Why did token usage double?
- Why is hallucination rate increasing?
- Which workflow is producing the highest cost?

**Characteristics of Good Observability**

A production AI system should provide: end-to-end visibility, component-level tracing, real-time monitoring, historical analysis, root cause analysis, cost visibility, evaluation integration, and business impact measurement.

**Trade-offs**

Advantages:
- Faster debugging
- Better reliability
- Improved system quality
- Lower operational costs

Disadvantages:
- Additional infrastructure
- Storage overhead
- Instrumentation effort
- Operational complexity

**Interview Notes**

AI Observability is the practice of understanding, debugging, monitoring, and optimizing AI systems through logs, metrics, traces, evaluation data, and production telemetry.

---

# 4.2 Monitoring vs Observability

**Monitoring** answers: "Did something fail?" It focuses on predefined metrics and alerts (CPU > 90%, API latency > 2s, database unavailable). Monitoring detects known problems.

**Observability** answers: "Why did it fail?" It enables investigation of unexpected behaviors (planner selected wrong strategy, retriever returned irrelevant documents, hallucination rate increased after deployment).

| Monitoring | Observability |
|-----------|--------------|
| Detects known issues | Explains unknown issues |
| Alert-focused | Investigation-focused |
| Metrics | Logs + Metrics + Traces + Events |
| Infrastructure | Entire system |
| Reactive | Exploratory |

**Interview Notes**

Monitoring tells you that something is wrong. Observability tells you why it is wrong.

---

# 4.3 The Three Pillars of Observability

```
Observability
│
├── Logs
├── Metrics
└── Traces
```

Together they provide a complete understanding of system behavior.

---

# 4.4 Logs

Timestamped records describing events that occurred during execution. They answer: "What happened?"

**AI-specific logs include:** prompt sent, completion received, tool invocation, memory lookup, retrieved documents, evaluation score, errors, warnings.

**Best Practices**
- Use structured logs (JSON).
- Avoid logging sensitive data (PII, credentials, full user prompts in plaintext).
- Include trace IDs in every log entry.
- Include timestamps.
- Log important decisions, not every token.

---

# 4.5 Metrics

Numerical measurements collected over time to quantify system health. They answer: "How well is the system performing?"

**Infrastructure Metrics:** CPU, Memory, GPU, Network.

**AI Metrics:** Prompt Latency, Completion Latency, Token Usage, Cost, Hallucination Rate, Tool Success Rate, Planner Accuracy, Retrieval Recall, Memory Hit Rate.

**Metric Types**

- **Counter** — Cumulative value that only goes up (total requests: 152,432).
- **Gauge** — Current value that goes up and down (GPU utilization: 82%).
- **Histogram** — Distribution of values (p50/p95/p99 latency).

---

# 4.6 Traces

Traces capture the complete journey of a single request through the system. They answer: "How did this request travel through the system?"

```
User Request → Planner → Retriever → Memory → LLM → Tool → Response
```

Each request has its own trace. Traces reveal latency per component, failures, dependencies, execution order, and bottlenecks.

**Interview Notes**

Logs explain what happened. Metrics show how often. Traces explain how a specific request behaved.

---

# 4.7 Distributed Tracing

**What is it?**

Distributed tracing follows a single request as it travels across multiple services, components, and agents.

A single request may touch: API Gateway, Planner, Router, Retriever, Memory, LLM, Tool Calls, Evaluation, Database, Cache. Without distributed tracing, identifying bottlenecks across these components is extremely difficult.

**How does it work?**

Every request receives a unique **Trace ID**. Each component generates one or more **Spans**. All spans together form the complete trace.

**Trace ID** — Uniquely identifies an entire request across all services. Every component processing this request shares the same Trace ID.

**Span** — Represents a single operation within a trace (planner execution, retrieval, memory lookup, tool execution). Each span records start time, end time, duration, metadata, and status.

**Span Hierarchy**
```
Trace
│
├── Planner (parent span)
│   ├── Retriever (child span)
│   ├── Memory (child span)
│   └── Tool (child span)
└── LLM
```

Nested spans help identify which operation contributes most to latency.

**Correlation ID** — Links related requests across business workflows. Unlike a Trace ID (one request), a Correlation ID may span multiple workflows. Example: Customer submits support request → AI Agent processes it → CRM updates ticket → Email sent — all share one Correlation ID.

| Trace ID | Correlation ID |
|----------|---------------|
| Tracks one request | Tracks related business workflows |
| Technical | Business-oriented |
| Usually short-lived | Can span multiple systems |

---

# 4.8 Context Propagation

Context propagation ensures that tracing information is preserved as requests move between services.

Without propagation, each service starts a new trace and debugging across services becomes impossible.

**Information Propagated:** Trace ID, Parent Span ID, Correlation ID, User Context, Tenant ID, Authentication Context.

---

# 4.9 OpenTelemetry (OTel)

**What is it?**

OpenTelemetry is the industry-standard open-source framework for collecting telemetry data from distributed systems. It provides a unified way to collect logs, metrics, and traces.

**Why does it exist?**

Different systems previously used different observability formats. OpenTelemetry standardizes instrumentation across all of them.

**Architecture**
```
Application → OTel SDK → OTel Collector → Backend (Grafana / Phoenix / Langfuse)
```

**Components**

- **SDK** — Adds instrumentation to applications.
- **Collector** — Receives telemetry, processes it, exports to multiple backends.
- **Exporters** — Send telemetry to Grafana, Jaeger, Prometheus, Phoenix, Langfuse.

**Production Uses**

Almost every cloud-native production system. OpenTelemetry is the base instrumentation layer — AI-specific tools (Langfuse, Phoenix) sit on top.

---

# 4.10 SLIs, SLOs, SLAs & Error Budgets

**SLI (Service Level Indicator)** — A quantitative measurement of service performance. Examples: availability, latency, error rate, tool success rate, planner accuracy, memory hit rate.

**SLO (Service Level Objective)** — The target value for an SLI. Examples: 99.9% availability, p95 latency < 500ms, tool success > 98%.

**SLA (Service Level Agreement)** — A contractual commitment with business consequences when targets are not met. Example: 99.99% availability, else financial penalty.

| SLI | SLO | SLA |
|-----|-----|-----|
| Measurement | Internal Target | Customer Commitment |

**Error Budget** — How much unreliability is acceptable before changes should slow down.

```
SLO: 99.9% → Allowed Failure: 0.1%
```

If the budget is exhausted: pause deployments, focus on reliability, investigate incidents.

Error budgets balance innovation with stability.

---

# 4.11 Monitoring Frameworks

**RED Metrics** — For service-level monitoring.
- **R**equest Rate (requests per second)
- **E**rrors (failed requests)
- **D**uration (request latency)

Best for: APIs, LLM Services, Tool Calls, Inference Servers.

**USE Metrics** — For infrastructure resources.
- **U**tilization (how busy is the resource?)
- **S**aturation (how close to capacity?)
- **E**rrors (is it functioning correctly?)

Best for: GPU, CPU, Memory, Storage, Network.

**Golden Signals** (Google SRE) — Four signals to monitor any service.
- **Latency** — How long does a request take?
- **Traffic** — How many requests are arriving?
- **Errors** — How many requests fail? (Includes hallucinations, tool failures, timeouts.)
- **Saturation** — How close is the system to capacity? (GPU utilization, LLM queue length.)

---

# Part 2: LLM Observability

---

# 4.12 LLM Observability Overview

**What is it?**

LLM Observability is the practice of monitoring, tracing, debugging, and optimizing every stage of an LLM request. Unlike traditional APIs, an LLM request consists of multiple internal steps that influence the final response.

A poor response can originate from: bad prompt, incorrect retrieval, wrong memory, context overflow, slow model, failed tool, or poor evaluation. Without observability, these failures are difficult to diagnose.

```
User → System Prompt → Conversation History → Memory → Retriever
→ Context Builder → LLM → Output → Evaluation
```

Every stage should be observable.

---

# 4.13 Prompt Observability

Tracks every prompt sent to the LLM and measures how prompt construction affects response quality.

**Observe:** Prompt version, prompt length, prompt tokens, system prompt, user prompt, template variables, prompt hash, prompt cost.

**Key Questions:** Which prompt version performs best? Which prompt increases hallucinations? Which prompt costs the most?

**Best Practices:** Version prompts. Compare prompt experiments. Avoid logging sensitive information. Track prompt changes over time.

---

# 4.14 Context Observability

Measures everything added to the model context before inference.

```
User Prompt + Conversation + Memory + Retrieved Docs + Tool Output → Context Window
```

**Observe:** Context size, token count, context sources, memory usage, retrieved documents, compression ratio, context overflow.

**Key Questions:** Was relevant information included? Did the context exceed the limit? Was unnecessary information injected?

---

# 4.15 Retrieval Observability

Measures retrieval performance in RAG pipelines.

```
Query → Embedding → Vector DB → Top K → Reranker → LLM
```

**Observe:** Retrieval latency, embedding time, top-K results, similarity scores, recall, precision, reranker latency, hit rate, miss rate.

**Key Questions:** Were correct documents retrieved? Did reranking improve quality? Was retrieval too slow?

---

# 4.16 Memory Observability

Tracks how memory is stored, retrieved, updated, and used during AI workflows — both for single LLM requests and agent execution.

```
Conversation → Memory Search → Memory Ranking → Memory Injection → LLM/Agent
```

**Observe:** Memory lookup latency, memory hit rate, memory miss rate, retrieved memories, memory confidence, memory importance, duplicate memories, memory expiration, shared vs local memory usage (for multi-agent systems), memory updates.

**Key Questions:** Was the correct memory retrieved? Was stale memory injected? Why was memory ignored? Is memory actually improving responses?

---

# 4.17 LLM Inference Observability

Monitors the execution of the language model itself.

```
Prompt → Tokenizer → Inference → Decoder → Completion
```

**Observe:** Queue time, model latency, Time to First Token (TTFT), Tokens per Second (TPS), completion latency, model used, temperature, top-p, max tokens.

**Production Metrics:** p50/p95/p99 latency, throughput, GPU utilization.

**Key Questions:** Which model is slowest? Why did inference spike? Is GPU saturated?

---

# 4.18 Output Observability

Measures the quality and characteristics of generated responses.

**Observe:** Response length, completion tokens, hallucination rate, toxicity, faithfulness, groundedness, safety violations, user feedback.

---

# 4.19 Token & Cost Observability

**Token Observability**

```
Input Tokens → Context Tokens → Completion Tokens → Total Tokens → Cost
```

**Observe:** Input tokens, output tokens, context tokens, cached tokens, token growth, token distribution.

Token usage directly affects cost, latency, context window pressure, and throughput.

**Cost Observability**

```
Prompt + Inference + Tool Calls + Memory + Retriever + Evaluation → Total Cost
```

**Observe:** Cost per request, cost per user, cost per agent, cost per tool, cost per workflow, daily/monthly cost.

**Key Questions:** Which workflow is most expensive? Which model has the highest cost? Can smaller models reduce spending?

**Cost Attribution Challenge:** In shared infrastructure (multiple models on shared GPU clusters), attributing costs accurately is non-trivial. Tag every request with the model, workflow, and user to enable granular cost breakdowns.

---

# Part 3: Agent Observability

---

# 4.20 Agent Observability Overview

**What is it?**

Agent Observability tracks an entire workflow consisting of planning, reasoning, memory, tools, execution, and evaluation — not just a single LLM inference.

AI agents make autonomous decisions. Failures can occur long before the LLM generates a response: poor planning, wrong routing, infinite loops, incorrect tool selection, memory failures, retry storms.

```
User Goal → Planner → Router → Memory → Tool Selection
→ Execution → Reflection → Evaluation → Final Response
```

Every stage should generate telemetry.

---

# 4.21 Planner Observability

```
Goal → Planner → Execution Plan → Workers
```

**Observe:** Planning latency, number of steps, plan quality, plan complexity, failed plans, replanning frequency.

**Key Questions:** Did the planner create unnecessary steps? Was the task decomposition correct? Why did planning fail?

---

# 4.22 Router Observability

```
Task → Router → Best Agent
```

**Observe:** Routing latency, selected agent, confidence score, routing accuracy, failed routes.

**Key Questions:** Was the correct specialist selected? Why wasn't another agent chosen? Was confidence too low?

---

# 4.23 Tool Observability

```
Agent → Tool → API → Result
```

**Observe:** Tool selected, API latency, API errors, retry count, timeout rate, authentication errors.

**Key Questions:** Was the correct tool selected? Why did the tool fail? Was retry successful?

---

# 4.24 Multi-Agent Communication Observability

```
Planner → Research Agent → Writer Agent → Reviewer → Final Response
```

**Observe:** Messages sent/received, delegation count, communication latency, failed messages.

**Key Questions:** Which agent introduced delay? Were messages duplicated? Was communication lost?

---

# 4.25 Agent Execution & Reflection Observability

**Execution Observability**

Measures the complete lifecycle of an agent executing a task.

**Observe:** Execution time, waiting time, active time, retry count, success rate, failure rate.

**Reflection Observability**

Measures how agents evaluate and improve their own outputs before continuing.

**Observe:** Reflection count, revision count, improvement score, reflection latency.

**Key Questions:** Was reflection useful? Did it improve quality? Did the agent enter an infinite revision loop?

---

# 4.26 Multi-Agent Tracing

Every agent should contribute to the same distributed trace.

```
Trace ID → Planner → Router → Search Agent → Code Agent → Judge → Response
```

This enables engineers to visualize the complete execution path across collaborating agents.

---

# Part 4: Production Operations

---

# 4.27 AI Telemetry

**What is it?**

AI Telemetry is the unified collection of operational, AI-specific, evaluation, and business signals.

```
Logs + Metrics + Traces + Evaluation + Cost + Feedback → AI Telemetry
```

**Telemetry Categories**

| Category | Examples |
|----------|---------|
| Infrastructure | CPU, GPU, Memory, Network |
| LLM | Latency, Token Usage, Cost |
| Agent | Planner Accuracy, Routing Accuracy, Tool Success |
| Quality | Hallucination Rate, Groundedness, Faithfulness, Evaluation Score |
| Business | User Satisfaction, Task Success, Cost per User |

---

# 4.28 Dashboards

Dashboards provide a real-time visual representation of system health. Good dashboards answer: "What is happening right now?"

**Key Dashboard Categories**

| Dashboard | Key Metrics |
|-----------|------------|
| Infrastructure | CPU, GPU, Memory, Disk, Network, Queue Length |
| LLM | Prompt/Completion Latency, TTFT, TPS, Context Size, Token Usage |
| RAG | Retrieval Recall/Precision, Top-K Quality, Similarity Score, Reranker Latency |
| Memory | Hit Rate, Miss Rate, Lookup Latency, Duplicate/Expired Memories |
| Agent | Planner Accuracy, Routing Accuracy, Tool Success, Delegation Depth, Retry Count |
| Cost | Cost per Request/User/Workflow, Daily/Monthly Cost, Token Cost, Model Cost |
| Quality | Hallucination Rate, Groundedness, Faithfulness, Evaluation Score, User Satisfaction |

**Best Practice:** Focus dashboards on key indicators. Hundreds of graphs with no actionable insight is an anti-pattern (see Section 4.39).

---

# 4.29 Alerting

Alerting automatically notifies engineers when important thresholds are exceeded.

**Alert Categories**

- **Infrastructure:** GPU > 90%, CPU > 90%, Disk Full, Network Failure
- **LLM:** Prompt Latency > 5s, Hallucination Rate ↑, Token Usage Spike
- **RAG:** Retrieval Recall ↓, Retrieval Timeout, Embedding Failure
- **Agent:** Planner Failure, Routing Failure, Retry Storm, Infinite Loop, Tool Failure
- **Cost:** Daily Budget Exceeded, Cost Spike
- **Business:** User Satisfaction Drop, Task Success Drop

**Best Practices**
- Alert on symptoms users experience, not just raw metrics.
- Use severity levels (Info, Warning, Critical).
- Avoid alert fatigue by reducing noisy alerts.
- Route alerts to the appropriate team.

---

# 4.30 Incident Response

**What is it?**

Incident Response is the structured process for detecting, investigating, mitigating, and resolving production issues.

```
Alert → Incident Created → Assign Owner → Investigate → Mitigate → Resolve → Postmortem → Improve
```

**Mitigation examples:** Roll back deployment, switch to fallback model, disable failing tool.

**Postmortem — Document:** Root cause, timeline, impact, corrective actions.

---

# 4.31 Root Cause Analysis & Failure Analysis

**What is it?**

Root Cause Analysis identifies the underlying reason for an incident instead of treating symptoms. In AI systems, failures can originate from any component.

**Unified Failure Analysis Workflow**

```
Bad Response
↓
Prompt? → Ambiguous instructions, prompt regression
↓
Retriever? → Wrong documents, missing documents
↓
Memory? → Stale memory, incorrect ranking, duplicates
↓
Context? → Overflow, missing information, irrelevant context
↓
Planner? → Poor decomposition, unnecessary steps
↓
Router? → Wrong specialist, low confidence
↓
LLM? → Hallucination, incorrect reasoning, truncation
↓
Tool? → Timeout, API errors, authentication failure, wrong tool selected
↓
Communication? → Lost messages, sync errors (multi-agent)
↓
Reflection? → Infinite revision loop, overcorrection
↓
Evaluation? → Judge bias, wrong metric
↓
Root Cause Found → Fix → Validate → Monitor
```

**Example**

Symptom: Hallucinated response.
Investigation: Retriever returned outdated documents.
Root Cause: Incorrect metadata filtering introduced in latest deployment.
Fix: Correct retrieval filters, re-index affected documents, validate with evaluation pipeline.

**Best Practices**
- Use traces to follow execution path.
- Validate assumptions with logs and metrics.
- Document findings for future prevention.

---

# 4.32 AI KPIs & Health Score

**What is it?**

AI KPIs measure whether a system is achieving its technical and business objectives. A system may have low latency, low cost, and high availability yet still produce poor responses. Operational metrics alone cannot determine AI system health.

**KPI Categories**

| Category | Metrics |
|----------|---------|
| Operational | Request Throughput, Average Latency, p95 Latency, Availability, Error Rate |
| AI Quality | Hallucination Rate, Groundedness, Faithfulness, Task Success Rate, Evaluation Score, Tool Success Rate |
| Business | User Satisfaction, Resolution Rate, First Response Accuracy, Cost per Successful Task, Active Users |

**AI Health Score**

A composite score representing overall system health:
```
Latency + Evaluation Score + Cost + Failures + Hallucination Rate + User Satisfaction → AI Health Score
```

**Best Practices:** Combine operational and quality metrics. Weight metrics based on business priorities. Track trends instead of isolated values.

---

# 4.33 Prompt & Model Versioning

**What is it?**

Tracks changes to prompts and models over time, enabling reproducibility, comparison, and safe deployments.

Small changes can significantly affect accuracy, latency, cost, and hallucinations. Versioning makes these changes measurable and reversible.

**Prompt Versioning:** Prompt v1 → Evaluation → Prompt v2 → A/B Testing → Deploy.

**Model Versioning:** GPT-4 → GPT-4.1 → Claude 4 → Gemini → Compare → Deploy.

**Deployment Strategies**
- **Canary Deployment** — Route a small percentage of traffic to the new version, monitor metrics, expand if healthy.
- **A/B Testing** — Split traffic between versions, compare metrics statistically.
- **Shadow Testing** — Run new version alongside production without serving its output. Compare results offline.
- **Rollback** — Instantly revert to previous version on regression.

**Best Practices:** Version every production prompt. Never overwrite prompts. Compare before deployment. Roll back on regressions.

---

# 4.34 Drift Detection

**What is it?**

Identifies changes in system behavior that negatively affect performance over time. Unlike traditional ML feature drift, AI systems experience multiple forms.

**Types of Drift**

- **Prompt Drift** — Prompt modifications reduce response quality.
- **User Behavior Drift** — Users begin asking different types of questions.
- **Retrieval Drift** — Retriever quality decreases (e.g., index becomes stale).
- **Memory Drift** — Stored memories become outdated or irrelevant.
- **Tool Drift** — External APIs change behavior or responses.
- **Model Drift** — A newer model version behaves differently.

**Detection Workflow**
```
Production → Metrics → Trend Analysis → Drift Detection → Alert → Investigation
```

**Best Practices:** Compare against historical baselines. Detect gradual degradation, not just sudden failures. Monitor quality and operational metrics together.

---

# 4.35 Semantic Monitoring

**What is it?**

Evaluates the meaning and quality of AI responses rather than only system performance.

Traditional monitoring asks: "Is the service healthy?"
Semantic monitoring asks: "Is the answer actually good?"

**Metrics:** Hallucination Rate, Groundedness, Faithfulness, Relevance, Completeness, Toxicity, Safety, Helpfulness.

**Best Practices:** Combine semantic monitoring with automated evaluations. Track trends over time. Correlate quality metrics with user feedback.

---

# 4.36 Feedback Loops

**What is it?**

User feedback flows back to improve the system over time. This closes the loop between observability and improvement.

```
User Response → Thumbs Up/Down → Feedback Store
→ Failure Analysis → Evaluation Dataset Update
→ Prompt/Retrieval Improvement → Better Responses
```

**Types of Feedback**
- **Explicit** — User clicks thumbs up/down, rates response, submits correction.
- **Implicit** — User reformulates query (signal of poor first response), user abandons conversation, user copies/uses the output (signal of good response).

**Why it matters:** Explicit feedback is sparse (most users don't rate). Implicit signals are noisy but abundant. Production systems need both. Feedback should flow into golden datasets (Chapter 3) and trigger prompt/retrieval investigations.

---

# 4.37 Observability Sampling

**What is it?**

In production, you can't log every request at full fidelity — the storage and processing cost would be prohibitive. Sampling determines which requests get full observability treatment.

**Sampling Strategies**

- **Head-based Sampling** — Decide at the start of a request whether to trace it (e.g., trace 10% of requests). Simple but misses interesting failures.
- **Tail-based Sampling** — Decide after the request completes. Always keep traces for errors, high latency, low evaluation scores. Discard routine successes. More expensive to implement but catches the failures you actually care about.
- **Always-sample errors** — Any request that fails, times out, or produces low evaluation scores should always be fully traced regardless of sampling rate.

**Best Practice:** Use tail-based sampling in production. Always capture full traces for errors and slow requests.

---

# 4.38 Privacy & Compliance in Observability

Observability data often contains sensitive information that must be handled carefully.

**Challenges**
- Full prompts may contain PII (names, emails, medical info).
- User conversations are subject to GDPR right to deletion.
- Multi-tenant systems must isolate observability data per tenant.
- Retention policies determine how long traces/logs can be stored.

**Best Practices**
- Mask or redact PII before logging.
- Implement data retention policies with automatic expiration.
- Ensure tenant isolation in multi-tenant observability stores.
- Provide mechanisms to delete user data from traces/logs on request.
- Classify observability data by sensitivity level.

---

# 4.39 Observability Anti-Patterns

**Logging Every Token** — Massive storage cost, high processing overhead. Log meaningful events instead.

**Missing Trace IDs** — Cannot correlate components across workflows. Assign a Trace ID to every request.

**Monitoring Infrastructure Only** — CPU and memory appear healthy while response quality degrades. Monitor operational, quality, and business metrics together.

**Dashboard Overload** — Hundreds of graphs with no actionable insight. Focus on key indicators.

**Alert Fatigue** — Engineers ignore alerts because too many trigger. Alert only on actionable conditions.

**Logging Sensitive Prompts** — Security and privacy risks. Mask or redact before logging.

**Ignoring Cost Metrics** — System works correctly but becomes financially unsustainable. Track cost per request, workflow, user, and model.

**No Evaluation in Traces** — Traces show execution but not response quality. Attach evaluation scores to traces.

**Cardinality Explosion** — Too many unique label combinations (per-user × per-prompt-version × per-model) overwhelm metrics storage. Keep label cardinality bounded; use logs for high-cardinality data, metrics for low-cardinality aggregates.

---

# 4.40 Observability Data Pipeline

**Architecture**
```
AI Application → OpenTelemetry SDK → OTel Collector → Kafka → Storage → Dashboards → Alerts
```

**Recommended Stack**

| Layer | Tool |
|-------|------|
| Instrumentation | OpenTelemetry |
| Metrics | Prometheus |
| Dashboards | Grafana |
| LLM Observability | Langfuse |
| RAG Debugging | Arize Phoenix |
| Prompt & Workflow Eval | Weave |
| Alerting | Alertmanager |
| Log Storage | Loki / Elasticsearch |
| Distributed Tracing | Jaeger / Tempo |

---

# 4.41 LLM Observability Frameworks

| Framework | Best For | Strengths |
|-----------|---------|-----------|
| LangSmith | LangChain applications | Prompt tracing, debugging, evaluation |
| Arize Phoenix | RAG & LLM observability | Retrieval analysis, hallucination debugging |
| Weave | Experiment tracking | Prompt comparison, evaluations |
| Langfuse | Production observability | Traces, costs, dashboards |
| Helicone | API analytics | Request logging, token tracking |
| OpenTelemetry | Vendor-neutral telemetry | Logs, metrics, traces across systems |

---

# 4.42 Production Case Study

**Scenario:** An enterprise AI assistant suddenly begins producing incorrect responses.

**Incident:** Dashboard reports hallucination rate ↑, retrieval recall ↓, evaluation score ↓. Latency remains normal.

**Investigation:** Trace analysis shows:
```
Retriever → Returned outdated documents → Incorrect metadata filter → Poor context → Hallucination
```

**Root Cause:** A deployment introduced an incorrect metadata filtering rule, causing the retriever to ignore the latest documentation.

**Resolution:** Fix retrieval filters → Re-index affected documents → Validate with evaluation pipeline → Monitor metrics after deployment.

**Lessons Learned**
- Infrastructure metrics alone were insufficient.
- Distributed traces isolated the failing component.
- Evaluation scores confirmed degraded response quality.
- Telemetry enabled rapid root cause analysis and recovery.

---

# 4.43 Production Best Practices

- Instrument every component consistently.
- Assign a Trace ID to every request.
- Correlate logs, metrics, and traces.
- Define SLIs before setting alerts.
- Track latency, cost, quality, and business KPIs together.
- Monitor planner, retriever, memory, tools, and evaluation independently.
- Alert on user impact rather than raw infrastructure metrics.
- Use tail-based sampling — always capture full traces for errors.
- Mask PII before logging; implement retention policies.
- Watch for cardinality explosion in metrics labels.
- Version prompts and models; never deploy without comparison.
- Automate root cause analysis where possible.
- Perform postmortems after major incidents.
- Build feedback loops from user signals back to evaluation datasets.
- Continuously refine dashboards and alert thresholds.
