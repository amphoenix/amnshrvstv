# Forward Deployed Engineering — Master Document
## The Role, the Interview, the System Design Playbook, and WHY the Industry Needs 729% More of You

*"A 2025 MIT study found that 95% of enterprise AI pilots delivered no measurable P&L impact. The problem isn't model quality — it's implementation. The FDE is the role specifically designed to close that gap."*

This doc covers: the history and mechanics of the FDE role, who's hiring and why, the interview process across companies, the system design patterns that matter, the customer-facing skillset, compensation reality, and a rapid-fire Q&A for interview prep.

**Factual sourcing**: every claim here is sourced from published reports, company announcements, and publicly reported data. No assumptions. Where numbers vary across sources, ranges are given.

---

## PART 1 — WHAT AN FDE ACTUALLY IS

### 1.1 The Definition — Precise, Not Buzzwordy

A Forward Deployed Engineer (FDE) is a software engineer who embeds directly with a customer to scope, build, and deploy production software inside that customer's environment. The same engineer who maps the problem on day one is the engineer who responds when something breaks in production six months later.

**The three words that define the role**:
- **Forward** — you work at the customer site (or their environment), not at HQ.
- **Deployed** — you ship production code, not slide decks.
- **Engineer** — you write, debug, and operate real systems, not configure existing ones.

**What an FDE is NOT** (guaranteed interview question — "how is this different from X?"):

| Role | What They Do | Key Difference from FDE |
|---|---|---|
| **Solutions Engineer (SE)** | Pre-sales: demos, POCs, technical selling | SE supports the sale. FDE delivers after the sale. SE doesn't write production code. |
| **Solutions Architect (SA)** | Designs the system, produces architecture docs | SA designs and hands off. FDE designs AND builds AND operates. |
| **Customer Success Engineer (CSE)** | Configuration, enablement, technical guidance | CSE works within what the product supports. FDE extends the product for the customer. |
| **Implementation Consultant** | Configures vendor software per customer requirements | Consultant configures. FDE writes custom production code and patches product gaps. |
| **Professional Services** | Time-bounded project delivery | PS delivers a project and exits. FDE owns the outcome long-term. |

**The bright line**: an FDE writes production-grade code and contributes back to the core product. They close the gap between what the product does today and what the customer needs it to do. That gap is where all the value lives.

**INTERVIEW LINE**: "An FDE is a software engineer who embeds with the customer to scope, build, and ship production systems — not to advise, demo, or configure. The same person who discovers the problem is the one who deploys the solution and operates it. That end-to-end ownership is what separates the role from solutions engineering, consulting, and professional services."

---

### 1.2 The Origin Story — Palantir, 2005

Palantir Technologies invented the FDE role out of necessity. In 2003-2005, Palantir was selling Gotham to the CIA, NSA, and US Army intelligence units. These customers had a problem no traditional software delivery model could solve:

- Customer data was **classified** — Palantir engineers couldn't see it from Palo Alto.
- Schemas were **undocumented** — no requirements doc existed because the workflows were secret.
- "Working software" depended on **domain tradecraft** no HQ engineer would ever learn remotely.

Traditional vendors offered two options: a consultant (who couldn't write production code) or a solutions engineer (who couldn't redesign the product). Palantir invented a third: **a cleared engineer who sat at Fort Bragg or Langley for 6-12 months**, learned the customer's domain, wrote production Gotham code, and fed product requirements back to the platform team.

**The organizational model — Echo and Delta teams**:
- **Echo teams**: domain experts, often from the customer's own industry (military, healthcare, finance). They understood the real problems and served as a bridge between the customer and engineering.
- **Delta teams**: rapid prototyping engineers who built solutions fast under imperfect conditions, prioritizing speed and impact over perfect design.

Together, they functioned as a mini-startup within each client environment.

**The "gravel road to paved highway" feedback loop**: FDEs build custom solutions for specific customers (gravel roads). When the same solution is needed across multiple customers, the platform team generalizes it into a product feature (paved highway). FDE field work drives product development — not the other way around. This loop drove Palantir's US commercial revenue to surge 133% year-over-year, and by 2016, Palantir had more FDEs than traditional software engineers.

---

### 1.3 Why FDEs Exploded in 2025-2026 — The Numbers

FDE job postings grew from 643 in April 2025 to 5,330 in April 2026 — a **729% year-over-year surge** (Indeed data, reported by Business Insider). This is one of the fastest-growing roles in tech.

**The root cause**: the MIT Media Lab's Project NANDA published "The GenAI Divide: State of AI in Business 2025" (July 2025), examining 300 public AI deployments, 52 executive interviews, and 153 executive surveys. The finding: **95% of enterprise generative AI pilots delivered no measurable P&L impact**, despite $30-40 billion in enterprise AI spending. Only 5% reached production with measurable value. The divide was not model quality or regulation — it was **implementation approach**.

The key insight from the MIT report: "It's not the quality of the AI models, but the learning gap for both tools and organizations." Generic tools like ChatGPT show 80%+ adoption for individual productivity but stall in enterprise use because they don't learn from or adapt to workflows. The 5% that succeeded embedded AI deeply into specific high-value workflows with integration, memory, and learning loops.

**This is exactly what FDEs do.** The role exists to close the gap between "we have an AI model" and "it's working in production inside our business."

**Who's hiring FDEs in 2026**:

| Tier | Companies | Focus |
|---|---|---|
| **AI frontier labs** | OpenAI, Anthropic ("Applied AI Engineer"), Cohere | Deploy frontier models into enterprise environments |
| **Data/AI platforms** | Palantir (the originator), Databricks, Snowflake, Scale AI | Platform deployment + customer data integration |
| **Vertical AI startups** | ElevenLabs, Sierra, Harvey, Decagon, Cognition, xAI | Domain-specific AI deployment |
| **Established enterprises** | Adobe, Salesforce, Ramp, Rippling, Stripe | AI feature deployment for strategic customers |
| **Cloud providers** | Google Cloud (CEO Thomas Kurian confirmed ramped hiring in 2026) | AI/ML solution deployment |
| **Consulting** | EY (launched FDE roles in UK, April 2026), PwC, McKinsey | AI implementation services |

**OpenAI's strategic bet**: in May 2026, OpenAI launched the **OpenAI Deployment Company**, a majority-owned subsidiary backed by over $4 billion in initial capital (from TPG, Bain Capital, Brookfield, and consulting partners including McKinsey and Capgemini). They simultaneously acquired **Tomoro**, a London-based applied AI consulting firm with ~150 FDEs, whose clients included Tesco, Virgin Atlantic, and Supercell. The signal: OpenAI considers deployment important enough to create an entire company and spend billions on it, rather than scaling FDEs internally.

**Geographic shift**: New York City has overtaken San Francisco as the largest US hub for FDE roles (35% of postings vs 11%), driven by demand from regulated industries (fintech, healthcare, legal) where FDE integration complexity is highest.

---

## PART 2 — THE FDE SKILLSET (WHAT'S ACTUALLY TESTED)

### 2.1 The Skill Stack — Three Layers, Roughly Equal Weight

FDE interviews test three capabilities with roughly equal weight. Most candidates over-index on one and fail the others:

```
┌────────────────────────────────────────────────────────┐
│  LAYER 3: CUSTOMER JUDGMENT (~30%)                      │
│  Stakeholder communication, scoping ambiguity,          │
│  translating business goals to technical plans,         │
│  pushing back on bad ideas without breaking trust       │
├────────────────────────────────────────────────────────┤
│  LAYER 2: SYSTEM DESIGN & AI ARCHITECTURE (~40%)        │
│  RAG, agents, evals, inference optimization,            │
│  data pipelines, deployment architecture,               │
│  security/compliance, observability                     │
├────────────────────────────────────────────────────────┤
│  LAYER 1: SOFTWARE ENGINEERING (~30%)                   │
│  Coding (Python/TS), API design, integration,           │
│  debugging, production operations                       │
└────────────────────────────────────────────────────────┘
```

### 2.2 Layer 1: Software Engineering — The Foundation

FDE coding interviews are **not** LeetCode gauntlets. The focus is integration thinking — can you design systems that communicate with each other under real-world constraints?

**What's tested**:
- Build a RAG pipeline over a folder of documents (end-to-end, working code)
- Implement retry-with-backoff-and-jitter + circuit breaker for a flaky tool call
- Design API endpoints with authentication for a customer integration
- SQL for real analytics (not LeetCode SQL — think "find customers with 30%+ return rate, then make it fast")
- Working with AI coding assistants (Claude Code, Cursor) — agentic coding tools are now named in a large share of senior FDE JDs; interviewers watch how you direct the model, what you accept vs reject

**Languages**: Python is primary across almost all FDE roles. TypeScript/JavaScript for full-stack. SQL is mandatory.

### 2.3 Layer 2: AI System Design — The Differentiator

This is where most candidates fail. FDE system design is **not** "design Twitter" — it's "design a deployment for a regulated customer with messy data, SSO, and a strict change-control window."

**What's tested** (from actual FDE interview reports at OpenAI, Palantir, Google, Databricks):

**RAG architecture**: chunking strategies, embedding model selection, hybrid search (BM25 + vector), reranking, evaluation (recall@K, faithfulness), production concerns (incremental indexing, access control, document freshness)

**Agent orchestration**: when to use agents vs. deterministic pipelines, tool use design, multi-agent coordination, planning and reflection patterns (ReAct, self-reflection), failure handling and retry, human-in-the-loop gates

**Evaluation (the differentiator question)**: "How do you know your AI system is actually working?" Hand-waving fails. You need: LLM-as-judge pipelines, evaluation datasets, offline vs online metrics, regression detection, confidence intervals on metrics, A/B testing for prompt changes

**Inference performance**: latency budgets (TTFT, TPOT), token cost estimation, caching (prefix caching, semantic caching), batching, model selection trade-offs (when Haiku vs Sonnet), quantization, streaming for perceived latency

**Data integration**: connecting to messy source systems, handling PII and data residency, batch vs streaming ingestion, schema normalization across 12 different data sources

**Security and compliance**: VPC deployment, HIPAA/SOC 2/GDPR constraints, data residency, SSO (SAML/OIDC/SCIM), prompt injection defense, audit logging

**Real example questions reported from interviews**:
- "Design a private, VPC-deployed RAG system for a healthcare customer with HIPAA constraints and 50M documents."
- "Design an evaluation framework for an AI agent that handles shipment rerouting across 500 regional warehouse managers."
- "Design the ingestion and transformation pipeline for a Fortune 500 retailer that wants to unify 12 fragmented data sources into a forecasting model."
- "This LLM feature is too slow and too expensive for the customer. What do you do?"

**Strong answers always cover**: data flow, trust boundaries, auth and identity, observability, failure modes, rollback strategy, and an honest discussion of trade-offs (cost, latency, complexity, maintainability).

**Common rejection reason**: jumping straight to a perfect production architecture instead of a walking-skeleton MVP. FDE thinking is "what's the simplest thing I can ship in week one to prove value, then iterate?"

### 2.4 Layer 3: Customer Judgment — The Lowest Pass Rate

The FDE case study round has the **lowest pass rate (~40%)** and the **highest weight (~30%)** of any interview stage. It's a 45-60 minute ambiguous scenario where a hypothetical customer hands you a vague problem and you decompose it into a plan.

**What's tested**:
- Scoping ambiguity into concrete requirements (without over-engineering)
- Communicating technical constraints to non-technical executives
- Prioritizing customer outcomes over technical elegance
- Pushing back when the customer wants something that would compromise data governance
- Delivering bad news ("the deployment slipped three weeks and the customer's CTO is on the line")
- Explaining why a system cannot guarantee 100% accuracy without losing trust

**Example scenarios**:
- "The customer's security team won't provide production credentials. Resolve it."
- "You disagree with the customer's chosen architecture. Hold the line without breaking the relationship."
- "The customer wants the whole system shipped in 3 weeks. You think it needs 8. Navigate this."
- "Explain to a non-technical VP why your RAG system will sometimes give wrong answers."

**The 48-second rule** (from OpenAI interview analysis): your initial reaction to an underspecified prompt determines your progression far more than how quickly you code. The interviewer is watching whether you ask clarifying questions, state assumptions, and structure your thinking — or whether you panic-dive into solution mode.

**INTERVIEW LINE**: "The FDE's first job isn't to write code — it's to figure out which problem actually matters. I start every engagement by understanding the customer's workflow, their constraints, and their definition of success before proposing any architecture."

---

## PART 3 — THE FDE SYSTEM DESIGN PLAYBOOK

### 3.1 The FDE System Design Framework — Not "Design Instagram"

FDE system design differs from standard SWE system design in fundamental ways:

| Standard SWE System Design | FDE System Design |
|---|---|
| Abstract users ("1B users") | Specific customer (name, industry, constraints) |
| Greenfield architecture | Integrate with existing legacy systems |
| Design for scale | Design for deployment in a specific environment |
| Happy path first | Failure modes and rollback first |
| "How would you design..." | "How would you deploy this for a customer who..." |
| Components and data flow | Components + trust boundaries + compliance + cost |

**The FDE system design answer structure**:

```
1. SCOPE (2-3 minutes)
   "Let me understand the customer first."
   - Who is the customer? What industry? What regulations apply?
   - What's the actual business problem they're trying to solve?
   - What does success look like? What's the metric they care about?
   - What existing systems do they have? What data is available?
   - What are the constraints? (on-prem? VPC? HIPAA? SOC 2? timeline?)
   
2. WALKING SKELETON (5-7 minutes)
   "Here's the simplest thing we could ship in week 1 to prove value."
   - Minimal end-to-end system that touches every component
   - Not production-grade — a proof of value
   - Demonstrates the core capability the customer cares about
   
3. PRODUCTION ARCHITECTURE (10-15 minutes)
   "Here's how we harden this for production."
   - Data pipeline: ingestion, cleaning, chunking, embedding, indexing
   - Retrieval: hybrid search, reranking, access control
   - Model layer: model selection, prompt design, guardrails
   - Tool/agent layer: what tools, what permissions, what approval flows
   - Evaluation: how do we know it's working? what metrics? what alerting?
   - Security: auth, data residency, encryption, audit logging
   - Observability: traces, metrics, logs, cost monitoring
   
4. TRADE-OFFS (3-5 minutes)
   "Here's what I'd do differently with more time/budget."
   - Cost vs. quality: model tier, caching strategy
   - Latency vs. accuracy: reranking adds latency, improves relevance
   - Build vs. buy: managed vector DB vs. self-hosted
   - Complexity vs. maintainability: agent system vs. deterministic pipeline
   
5. ROLLOUT STRATEGY (2-3 minutes)
   "Here's how I'd stage the deployment so the customer sees value fast."
   - Week 1: walking skeleton with 100 documents, 5 pilot users
   - Week 2-3: expand to full document corpus, 50 users
   - Week 4-6: production hardening, monitoring, training
   - Week 8+: iterate based on eval results and user feedback
```

### 3.2 Canonical FDE System Design: Enterprise RAG for a Regulated Customer

**Prompt**: "A healthcare organization with 50M documents wants a private AI search system for their clinical staff. They have HIPAA constraints, on-prem infrastructure preferences, and their data is in 12 different source systems. Design it."

**SCOPE**:
```
Customer: healthcare org, clinical staff users (~5000)
Regulations: HIPAA → PHI must stay in their environment, audit logging required,
             BAA (Business Associate Agreement) needed with any cloud provider
Data: 50M documents across 12 source systems (EMR, claims, policies, research,
      clinical guidelines, lab results, imaging reports, discharge summaries...)
Constraints: on-prem preferred (or VPC with BAA), no data leaving their region
Success metric: clinicians find the right clinical guideline in <30 seconds
                (currently: 4-5 minutes via manual search)
Users: 5000 clinicians, ~20 queries/user/day = 100K queries/day
```

**WALKING SKELETON (Week 1)**:
```
Pick ONE source system (clinical guidelines — highest value, cleanest data)
~10K documents → chunk → embed (open-source model, on-prem) → vector store
Simple search UI → query → retrieve → LLM generates answer with citations
Deploy on their existing Kubernetes cluster
5 pilot clinicians, qualitative feedback only
```

**PRODUCTION ARCHITECTURE**:
```
┌─ DATA PIPELINE ──────────────────────────────────────────────────┐
│                                                                   │
│  12 Source Systems → Connectors (Airbyte/custom per system)       │
│    → Document Processing (extract text, OCR for scans)            │
│    → PHI Detection + De-identification (before any processing)    │
│    → Chunking (structure-aware: section headers, clinical fields) │
│    → Embedding (self-hosted model: e.g., BGE-large, on-prem GPU) │
│    → Vector Store (Elasticsearch on-prem cluster)                 │
│    → Metadata: source system, document type, department,          │
│      date, access level                                           │
│                                                                   │
│  Incremental sync: every 6 hours for active systems               │
│  Full re-index: weekly (off-hours)                                │
└───────────────────────────────────────────────────────────────────┘

┌─ RETRIEVAL + GENERATION ─────────────────────────────────────────┐
│                                                                   │
│  User query → Hybrid search (BM25 + vector, RRF fusion)          │
│    → Access control filter (user's department/role → allowed docs)│
│    → Reranker (cross-encoder, top 5-8 from top 50)               │
│    → Context assembly (system prompt + chunks + query)            │
│    → LLM (self-hosted Llama 3 70B on their GPUs,                 │
│           or Azure OpenAI with BAA in their region)               │
│    → Output guardrails (PHI scan, hallucination check)            │
│    → Response with citations (doc title, section, link to source) │
│                                                                   │
│  Latency budget: <5s p99 (retrieval 200ms + LLM 3-4s)            │
└───────────────────────────────────────────────────────────────────┘

┌─ EVALUATION ─────────────────────────────────────────────────────┐
│                                                                   │
│  Offline: golden set of 500 clinical questions with known answers │
│    → recall@5, faithfulness, answer relevance                     │
│    → run before every deployment, block on regression             │
│                                                                   │
│  Online: thumbs up/down on every response + "wrong source" flag  │
│    → weekly review: failures → new golden set entries             │
│    → track: answer rate, refusal rate, citation accuracy          │
│                                                                   │
│  Compliance: every query/response logged with user ID, timestamp, │
│    retrieved docs, model version (HIPAA audit trail)              │
└───────────────────────────────────────────────────────────────────┘

┌─ SECURITY ───────────────────────────────────────────────────────┐
│                                                                   │
│  Auth: SSO via their existing IdP (SAML/OIDC)                    │
│  RBAC: department-level access controls on documents              │
│  Encryption: TLS in transit, AES-256 at rest                     │
│  PHI: de-identified before embedding; re-identified only at       │
│    response time for authorized users                             │
│  Audit: every access logged, 7-year retention (HIPAA)             │
│  Network: runs inside their VPC, no external egress               │
└───────────────────────────────────────────────────────────────────┘
```

**CAPACITY PLANNING**:
```
Documents: 50M × avg 500 tokens → 25B tokens to embed
Embedding: BGE-large at ~1000 tokens/sec on A100 → ~7,000 GPU-hours
  At $2/GPU-hour (on-prem amortized): ~$14K for initial embedding
  Incremental: ~10K new/updated docs/day → negligible ongoing cost

Storage: 50M docs × 1024-dim × 4 bytes = ~200 GB vectors
  + metadata + full text: ~2 TB total
  Elasticsearch cluster: 3 nodes × 500GB each → comfortable

Inference: 100K queries/day
  If self-hosted (Llama 3 70B on 4× A100):
    ~10 queries/sec capacity → needs 1-2 instances for peak
    Cost: ~$15K/month (GPU lease)
  If Azure OpenAI (with BAA):
    100K × 3K tokens avg × $3/MTok = $900/day = $27K/month
    
Total monthly operating cost: $15-30K/month
  vs. current: clinician time savings at $150/hour × 4 min saved × 100K queries
  = ~$1M/month in clinician time → massive ROI
```

**TRADE-OFFS**:
```
Self-hosted LLM vs. cloud API:
  Self-hosted: full data control (HIPAA simpler), higher upfront cost, ops burden
  Cloud API with BAA: easier ops, per-query cost, must negotiate BAA
  
  Recommendation: start with cloud API + BAA for faster deployment;
  evaluate self-hosting after 3 months when usage patterns are clear

Single embedding model vs. hybrid:
  Single: simpler ops, one vector space
  Hybrid: BM25 handles clinical codes/IDs that embeddings miss
  
  Recommendation: hybrid from day one — clinical queries are full of
  specific codes (ICD-10, CPT) that embeddings garble
```

---

### 3.3 Canonical FDE System Design: AI Agent for Enterprise Workflow

**Prompt**: "A logistics company wants an AI agent that can reroute shipments when disruptions occur (weather, port closures, truck breakdowns). The agent needs to check inventory, reroute orders, notify affected customers, and update their TMS (Transport Management System). Design it."

**Scope → Walking Skeleton → Production Architecture → Evaluation → Rollout** — the same framework, but now with agent-specific concerns:

```
CRITICAL AGENT-SPECIFIC DESIGN DECISIONS:

1. AGENTIC vs. DETERMINISTIC
   Question: does this need an LLM making routing decisions, or can it be
   a deterministic rules engine with LLM-generated notifications?
   
   Answer: hybrid. Disruption classification (weather → which routes affected)
   benefits from LLM reasoning. But the actual rerouting should follow
   deterministic rules (cheapest available route that meets SLA) with LLM
   as the "explain why" layer. The notification is LLM-generated.
   
   WHY hybrid: a pure agent deciding rerouting is dangerous — one bad decision
   routes 10,000 packages wrong. Deterministic rules with LLM augmentation
   gives you auditability + explainability + safety.

2. TOOL PERMISSIONS (Principle of Least Privilege)
   - read_inventory: ✅ (read-only, no approval needed)
   - read_routes: ✅ (read-only)
   - update_route: ⚠️ (requires rule-engine validation, auto-approved if within SLA)
   - notify_customer: ⚠️ (auto-approved for standard templates, human-approved for custom)
   - update_TMS: ⚠️ (requires confirmation for orders over $10K value)
   - cancel_shipment: ❌ (human-only — too high stakes for automation)

3. EVALUATION
   - Offline: 200 historical disruption scenarios with known-optimal rerouting
   - Metric: % of reroutes that match or beat human dispatcher decisions
   - Online: dispatcher review of agent-proposed reroutes before execution (first 30 days)
   - Graduation: after 95%+ match rate for 30 days, auto-approve standard reroutes

4. FAILURE MODES
   - Agent proposes reroute but TMS is down → queue the action, alert human
   - Agent misclassifies disruption severity → over-reroutes (expensive) or under-reroutes (SLA miss)
   - Customer notification contains hallucinated delivery date → reputation damage
   - Circuit breaker: if >5% of reroutes are rejected by dispatchers in 1 hour → disable auto-mode
```

---

## PART 4 — THE INTERVIEW PROCESS (COMPANY BY COMPANY)

### 4.1 Interview Process Overview

Most FDE loops run **3-6 weeks** from recruiter screen to offer, with 5-7 distinct stages:

```
1. Recruiter Screen (30-45 min)
   "Why FDE, not SWE?" is the key question.
   Your answer: you want to build AND stay close to customers.
   
2. Hiring Manager Screen (30-45 min)
   Project deep-dive: pick a project you owned end-to-end.
   Cover: problem, architecture choices, what broke, how you fixed it.
   
3. Take-Home / Technical Screen (varies)
   OpenAI: ~5 hour take-home (build a RAG system, agent, or eval harness)
   Google: standard coding round
   Palantir: coding + data modeling
   
4. System Design / Case Study (45-60 min) — THE KEY ROUND
   Ambiguous customer problem → decompose into plan → design the system
   This round has the LOWEST pass rate and HIGHEST weight
   
5. Coding Round(s) (1-2 rounds, 45-60 min each)
   Integration-focused, not algorithm-focused
   "Build an endpoint that integrates an LLM to answer questions over documents"
   
6. Customer/Behavioral Round (45-60 min)
   Stakeholder scenarios, delivering bad news, pushing back, explaining trade-offs
   
7. Values/Culture (30-45 min)
   Company-specific (Google: Googleyness, OpenAI: mission alignment)
```

### 4.2 Company-Specific Notes

**OpenAI** (the most documented FDE loop):
- 7-stage process, 3-4 weeks
- Heavy emphasis on **evaluation**: "How do you know your AI system is actually working?" is the differentiator question. Inability to whiteboard an LLM-as-judge eval suite is reportedly an immediate disqualifier for ~70% of applicants
- Take-home project: build something real on OpenAI's APIs (RAG system, agent, evaluation harness)
- System design: "cost-per-query, LLM-driven pipelines" — not traditional microservices
- Customer empathy is weighted as heavily as technical depth
- Must reason through multi-turn agent traces and drift detection

**Google Cloud** (newer loop, still standardizing):
- Compressed format, potentially as few as 2 interviews over 2 days
- Standard Google coding bar + deployment judgment
- System design emphasizes RAG pipelines, vector DB integrations, multi-agent workflows
- Expect questions about LangGraph, CrewAI, Google's Agent Development Kit, ReAct patterns
- 6-8 weeks from recruiter call to decision

**Palantir** (the original):
- Focus on data modeling, Spark, SQL, lakehouse architecture
- Customer workshop and notebook collaboration is part of the loop
- More data-platform-centric, less LLM-centric than frontier labs
- "Decompose" round: given a vague real-world problem, break it into technical tasks

**Anthropic** (titled "Applied AI Engineer"):
- Focus on safety-aware deployments and Claude-specific integrations
- Expect questions about guardrails, constitutional AI, responsible deployment
- System design may include: "How would you design a language model that minimizes harmful outputs while still being useful?"

**Salesforce / Stripe / Ramp**:
- More full-stack: frontend + backend + AI integration
- Customer-facing communication weighted very heavily
- Design questions are product-focused: "Design an agent for a retail customer; call out your assumptions; show scalability"

---

## PART 5 — THE FDE ENGAGEMENT LIFECYCLE

### 5.1 How an FDE Engagement Actually Works — Week by Week

```
PHASE 1: DISCOVERY (Week 1-2)
├── Meet stakeholders (line analysts to VPs/CTOs)
├── Understand the actual problem (not what the sales team promised)
├── Map existing systems, data sources, workflows
├── Identify constraints (compliance, infra, timeline, budget)
├── Define success metrics WITH the customer
└── Output: scoping document with clear deliverables + timeline

PHASE 2: WALKING SKELETON (Week 2-4)
├── Build minimal end-to-end system
├── Use customer's real data (even a subset)
├── Deploy in their environment (not a demo on your laptop)
├── Get feedback from actual users (not just the buyer)
└── Output: working POC that proves the core value proposition

PHASE 3: PRODUCTION HARDENING (Week 4-8)
├── Scale data pipeline to full corpus
├── Add auth, RBAC, encryption, audit logging
├── Build evaluation pipeline (offline + online)
├── Add monitoring and alerting
├── Handle edge cases identified in POC feedback
├── Performance tuning (latency, cost, throughput)
└── Output: production-grade system with eval framework

PHASE 4: ROLLOUT & HANDOFF (Week 8-12)
├── Staged rollout: 5 users → 50 → 500 → all
├── Train customer's team on operations
├── Document architecture, runbooks, troubleshooting guides
├── Set up on-call rotation (initially FDE + customer team)
├── Establish feedback loop for continuous improvement
└── Output: customer can operate independently (but FDE stays available)

PHASE 5: PRODUCT FEEDBACK LOOP (Ongoing)
├── Customer-specific features that could be generalized
├── Feed insights back to product/platform team
├── "Gravel road → paved highway" conversion
└── Output: product improvements that benefit all customers
```

**The biggest delta from Palantir-era FDEs to AI-era FDEs**: AI FDEs in 2026 spend 30-40% of their week on conversational customer discovery — understanding what the customer actually needs the AI to do, not just what data they have. The problem is less "connect these systems" and more "figure out which workflow benefits from AI and prove it."

---

## PART 6 — COMPENSATION (THE REAL NUMBERS)

Based on the 2026 Perspective AI compensation report (1,200 data points from Levels.fyi, public job postings, and pay-transparency bands):

```
TIER 1: FRONTIER AI LABS (OpenAI, Anthropic)
  Mid-Level:    Base $160-280K + equity → TC $350-450K
  Senior:       Base $200-300K + equity → TC $450-550K
  Staff:        → TC $600K+
  Principal:    → TC approaching or exceeding $1M (equity-heavy)
  
  Equity represents 55-70% of comp at the top of the market.
  Note: TC at these levels is heavily equity-dependent;
  private-company equity is illiquid and valuation-dependent.

TIER 2: PALANTIR (the original, public company)
  Mid-Level:    TC $205-300K
  Senior:       TC $300-486K
  Staff:        TC $630K+
  
  Public equity (liquid RSUs), more stable but lower ceiling than frontier labs.
  Palantir median TC: ~$238K (across all levels).

TIER 3: BIG TECH (Google Cloud, Salesforce, Stripe)
  Base $160-200K, RSU-based equity (liquid)
  TC $200-350K+ depending on level

TIER 4: AI STARTUPS (Series B-C)
  Base $140-180K, larger equity % (0.2-0.5%)
  Higher risk, higher potential upside

GEOGRAPHIC NOTE:
  India GCC roles: up to ₹2.2 Cr (~$260K) at top companies
  Remote-friendly roles: some companies adjust for location

WHY FDE COMP IS HIGH:
  1. Direct revenue impact — a failed implementation can lose an entire contract
  2. Rare skill combination — deep engineering + customer empathy is uncommon
  3. Talent war — frontier labs competing aggressively for deployment talent
  4. AI-literacy premium — 60-150% premium over Palantir's classic FDSE baseline
```

---

## PART 7 — FDE-SPECIFIC KNOWLEDGE FOR INTERVIEWS

### 7.1 The POC-to-Production Cliff

The MIT study found that the 95% failure rate is primarily at the pilot-to-production transition. FDE interview questions probe this directly:

**"How do you stage a rollout so the customer sees value in week one, not month six?"**

```
Week 1: Walking skeleton — 1 data source, 1 use case, 5 users, real data
  The goal: the customer says "oh, this is useful" at least once
  
Week 2-3: Expand — more data, more users, handle the first round of "but what about..."
  The goal: daily usage by pilot group, quantitative feedback
  
Week 4-6: Harden — auth, monitoring, eval, edge cases
  The goal: the system is reliable enough that users trust it
  
Week 8+: Scale — full rollout, training, handoff planning
  The goal: the customer's team can operate it without you

The trap: spending 6 weeks building the "perfect" system before anyone uses it.
By the time you demo, the customer's priorities may have changed,
their champion may have moved teams, or budget review killed the project.
Ship early, iterate based on real usage.
```

### 7.2 Agentic vs. Deterministic — The Design Decision

A key FDE judgment call: when does a customer problem need an AI agent, and when is a deterministic pipeline better?

```
USE AN AGENT WHEN:
  - The workflow requires multi-step reasoning over ambiguous inputs
  - The number of possible paths is too large for rules
  - The task benefits from natural language interaction
  - Users need to ask follow-up questions
  
USE A DETERMINISTIC PIPELINE WHEN:
  - The workflow is well-defined and repeatable
  - Reliability matters more than flexibility (medical, financial)
  - The cost of a wrong decision is high and irreversible
  - Audit/compliance requires explainable decision paths
  
USE HYBRID (most FDE deployments):
  - LLM for understanding/classification/generation
  - Deterministic rules for actions/decisions/routing
  - Human-in-the-loop for high-stakes actions
  
THE FDE ANSWER: "I always start with the simplest thing that works.
If rules can handle it, use rules. Add LLM reasoning where it
demonstrably improves outcomes. An agent is a last resort, not a
first instinct, because every autonomous decision is a liability
the customer is accepting."
```

### 7.3 Cost-Per-Query Thinking

FDE interviews at OpenAI and Anthropic require you to estimate costs as part of system design:

```
"The customer has 50K employees doing 10 queries/day each."

Step 1: Volume
  50K × 10 = 500K queries/day = ~5.8 QPS avg, ~17 QPS peak

Step 2: Token estimation
  Input: system prompt (1K) + RAG chunks (3K) + user query (200) = ~4.2K tokens
  Output: ~500 tokens
  
Step 3: LLM cost
  Claude Sonnet: $3/$15 per MTok (input/output)
  Input: 500K × 4.2K / 1M × $3 = $6,300/day
  Output: 500K × 500 / 1M × $15 = $3,750/day
  Total: $10,050/day = ~$300K/month

Step 4: Optimization levers
  - Prompt caching: -30% input cost → save $1,890/day
  - Model tiering (Haiku for simple queries, 60%): -40% total → save $4,020/day
  - Semantic caching (20% hit rate): -20% remaining → save $830/day
  
  Optimized: ~$3,300/day = ~$100K/month (67% reduction)

Step 5: Total system cost
  LLM: $100K/month
  Infrastructure (vector DB, app servers, monitoring): ~$5K/month
  Embedding (incremental): ~$500/month
  Total: ~$106K/month
  Per employee: ~$2.12/month
  Per query: ~$0.007/query
```

---

## PART 8 — RAPID-FIRE Q&A (drill AI-off, 60-90 seconds each)

**"What is an FDE?"**
→ A software engineer who embeds with a customer to scope, build, and deploy production systems. End-to-end ownership from problem discovery to production operation. Writes real code, not config. Feeds customer insights back to the product team. Coined by Palantir in 2005 for classified intelligence deployments; now adopted by OpenAI, Anthropic, Google, and 700%+ more companies in 2025-2026. §1.1.

**"Why are FDEs in demand right now?"**
→ MIT 2025 study: 95% of enterprise AI pilots deliver no measurable P&L impact despite $30-40B invested. The gap is implementation, not model quality. FDEs close that gap by embedding with customers and shipping production AI systems. Job postings grew 729% YoY (April 2025 → April 2026). OpenAI created a $4B Deployment Company and acquired Tomoro (150 FDEs) in May 2026. §1.3.

**"FDE vs Solutions Engineer?"**
→ SE supports the sale (pre-sales: demos, POCs, technical selling). FDE delivers after the sale (embeds with customer, writes production code, owns the outcome). SE doesn't write production code; FDE does. SE hands off; FDE stays. §1.1.

**"How do you scope an ambiguous customer problem?"**
→ Start with the customer, not the technology. Who are the users? What's their workflow today? What's broken? What does success look like as a metric? What are the constraints (compliance, infra, timeline)? Only after understanding all of that do I propose an architecture. The first deliverable is a scoping document, not code. §5.1.

**"Walk me through how you'd design a RAG system for a regulated customer."**
→ Scope (HIPAA? VPC? Data residency?) → Walking skeleton (one data source, 5 users, week 1) → Production (hybrid search with ACLs, self-hosted or BAA'd cloud LLM, PHI detection, audit logging) → Evaluation (golden set, faithfulness, recall@K) → Staged rollout. Always cover: data flow, trust boundaries, auth, observability, failure modes, rollback, cost estimation. §3.2.

**"When would you use an agent vs a deterministic pipeline?"**
→ Agent when workflow requires multi-step reasoning over ambiguous inputs and possible paths are too numerous for rules. Deterministic when reliability > flexibility, especially for high-stakes decisions (medical, financial). Hybrid is the default: LLM for understanding/generation, rules for actions/decisions, human-in-the-loop for high-stakes. Start with the simplest thing that works; add agent reasoning only where it demonstrably improves outcomes. §7.2.

**"How do you know your AI system is working?"**
→ Two loops. Offline: golden evaluation set (500+ questions with known answers), measure recall@K, faithfulness, answer relevance. Run before every deployment, block on regression. Online: user feedback (thumbs up/down, "wrong source" flag), weekly review, production failures feed back into the golden set so eval gets harder over time. Statistical rigor: 430+ samples per metric to detect 5% regression at 95% confidence. §2.3.

**"This LLM feature is too slow and too expensive. What do you do?"**
→ Measure first: where is latency spent? (Prefill? Decode? Retrieval? Network?) Then the lever ladder: (1) cache repeated queries (semantic cache, 15-30% hit rate), (2) model tier — use a smaller/cheaper model for simple sub-tasks, (3) prompt trim — reduce system prompt and retrieved context, (4) batch where possible, (5) stream responses for perceived latency, (6) quantize the model if self-hosted. Always measure the impact of each change before moving to the next. §7.3.

**"Tell me about a time you pushed back on a customer."**
→ Framework: empathy first (I understand why you want X), data second (here's what happens if we do X — latency, cost, risk), alternative third (here's what I'd recommend instead and why), alignment last (does this meet your actual goal?). Never say "no" — say "here's a better way to get what you actually need." The FDE's job is to be the customer's trusted technical advisor, not their order-taker.

**"Why FDE and not SWE?"**
→ The answer that works: "I want to build AND stay close to the impact. In a pure SWE role, I'd be three handoffs away from the customer who uses my code. As an FDE, I see the problem firsthand, build the solution, and watch it create value. That feedback loop makes me a better engineer." Be genuine — interviewers can tell when this is rehearsed without conviction.

---

## HONESTY GUARDRAILS

- **Your positioning**: you're an SDE3 at ServiceNow with deep AI systems experience (AMNOS, MCP, RAG, multi-agent architectures). You've built developer tooling, presented on AI coding tools, and worked on production systems. Frame your FDE readiness through real projects: "I built a multi-agent migration tool with Fan-out/Fan-in, Swarm, and Actor-Critic patterns" is more credible than any rehearsed answer.
- **What you have**: production engineering experience, AI architecture depth, distributed systems thinking, a track record of building and shipping.
- **What to address honestly**: customer-facing experience may be lighter than a Palantir veteran's. Frame it as: "I've communicated technical decisions to stakeholders internally; the FDE role is where I want to develop that muscle further with direct customer engagement."
- **Numbers**: the compensation and job-posting numbers here are from published 2026 reports. They shift; use them directionally, not as guarantees.
