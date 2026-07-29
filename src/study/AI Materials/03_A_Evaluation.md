"You can't improve what you can't measure."

# 3.1 What is AI Evaluation?

**What is it?**

AI Evaluation (Evals) is the process of systematically measuring whether an AI system performs its intended task accurately, safely, consistently, and efficiently.

Unlike traditional software, AI outputs are probabilistic rather than deterministic, so correctness must be measured using multiple evaluation techniques.

**Why does it exist?**

Traditional software:
```
Input → Code → Same Output
```

AI Systems:
```
Input → LLM → Different Valid Outputs
```

Evaluation helps answer:
- Is the system good enough to deploy?
- Did the latest change improve or degrade performance?
- Which component is failing?
- Is performance drifting over time?
- Is the system solving the user's problem?

**Where is it used?**
- ChatGPT
- Claude
- Gemini
- Cursor
- GitHub Copilot
- AI Search
- Customer Support Bots
- Coding Agents
- Enterprise AI Platforms

**Trade-offs**

Advantages:
- Detects regressions
- Measures quality
- Improves reliability
- Enables safe deployment

Disadvantages:
- Expensive to build
- Requires datasets
- Human evaluation is slow

**Frameworks**
- DeepEval
- Promptfoo
- LangSmith
- Langfuse
- Braintrust
- Phoenix

---

# 3.2 Why AI Systems Need Evaluation

**AI System ≠ LLM**

One of the biggest misconceptions is assuming that an AI application is just an LLM. A production AI system consists of multiple components working together.

Even if the LLM is highly capable, failures in retrieval, planning, memory, or tool execution can still produce poor responses.

```
User
↓
Planner
↓
Retriever
↓
Memory
↓
Context Builder
↓
LLM
↓
Tool Calls
↓
Response
```

Any layer can fail. Therefore, we evaluate every layer independently.

**Garbage In, Garbage Out**

A powerful LLM cannot compensate for poor inputs.

```
Poor Retrieval + Excellent LLM = Poor Response
```

Similarly, incorrect memory, wrong tool outputs, or bad planning will all reduce final response quality. The goal of evaluation is not to determine whether the LLM is good — it is to identify which component of the AI system is responsible for failures.

---

# 3.3 Evaluation Taxonomy

Every AI system should be evaluated at multiple levels.

```
AI System
│
├── LLM Evaluation
├── Retrieval Evaluation
├── Memory Evaluation
├── Tool Evaluation
├── Planner Evaluation
├── Agent Evaluation
├── Workflow Evaluation
└── Business Evaluation
```

Each layer measures a different aspect of the system.

**Evaluation Pyramid**

Higher layers depend on the correctness of lower layers.

```
        Business Evaluation
               ▲
        Workflow Evaluation
               ▲
         Agent Evaluation
               ▲
        Planner Evaluation
               ▲
          Tool Evaluation
               ▲
        Memory Evaluation
               ▲
       Retrieval Evaluation
               ▲
          LLM Evaluation
```

A broken retrieval layer will cause failures all the way up the pyramid, even if the LLM, planner, and tools are perfect.

---

# 3.4 Offline vs Online Evaluation

**Offline Evaluation**

Evaluation performed before deployment using curated datasets.

Why? Catch regressions before users see them.

Examples:
- Golden datasets
- Benchmarks
- Regression tests
- Synthetic test cases

Advantages:
- Fast
- Repeatable
- Safe

Disadvantages:
- Doesn't capture real-world behavior

**Online Evaluation**

Evaluation performed on production traffic.

Examples:
- A/B testing
- User feedback
- Production logs
- Telemetry

Advantages:
- Real user behavior

Disadvantages:
- Slow
- Can impact users

---

# 3.5 Types of Evaluators

**Code-Based Evaluation**

Rule-based evaluation.
```
assert output == expected
```

Used for:
- JSON validation
- Regex matching
- Exact match
- Schema validation
- Length constraints
- Format checks

Advantages:
- Fast
- Cheap
- Deterministic

Disadvantages:
- Cannot judge quality or nuance

**LLM-as-a-Judge**

A stronger LLM evaluates another model's output.

```
Question
↓
LLM
↓
Answer
↓
Judge LLM
↓
Score
```

Advantages:
- Scalable
- Relatively cheap
- Can judge quality, coherence, relevance

Disadvantages:
- Biases (see Section 3.19)
- Inconsistent scoring
- Can be gamed

**Important:** The judge should ideally be a different model family than the one being evaluated. GPT-4 judging GPT-4 outputs is less reliable than Claude judging GPT-4 outputs, due to self-enhancement bias.

**Human Evaluation**

Humans manually score responses.

Best for:
- Creativity
- Safety
- Subjective tasks
- High-stakes decisions

Highest quality. Highest cost.

**Tiered Evaluation Strategy**

In production, layer evaluators by cost:

```
Code-based checks (cheap, fast)
↓
Pass? → LLM-as-Judge (moderate cost)
↓
Pass? → Human eval (expensive, only for edge cases or judge disagreements)
```

This keeps evaluation costs manageable while maintaining quality.

---

# 3.6 Evaluation Methods: Pointwise vs Pairwise vs Reference-Based

**Pointwise**

Score a single output on a rubric (e.g., 1–5).

```
Output → Judge → Score: 4/5
```

Simple but hard — absolute scoring is subjective and judges often disagree on what a "3" vs "4" means.

**Pairwise**

Compare two outputs and pick the better one.

```
Output A vs Output B → Judge → "A is better"
```

More reliable than pointwise because relative comparison is easier than absolute scoring. Used by Chatbot Arena and MT-Bench.

**Reference-Based**

Compare output against a known gold answer.

```
Output vs Gold Answer → Metric → Score
```

Uses metrics like BLEU, ROUGE, exact match. Works well for tasks with clear correct answers. Breaks down for open-ended generation where many valid answers exist.

---

# 3.7 Golden Datasets

**What is it?**

A curated collection of test cases with expected outputs.

| Input | Expected |
|-------|----------|
| Refund Policy | Correct Policy |
| Safety Question | Refusal |
| Complaint | Empathetic Response |

**How to Build Them**

In practice, golden datasets are built iteratively:

1. Start from production logs — identify real user queries.
2. Identify failure cases — queries where the system produced bad outputs.
3. Have humans annotate expected outputs for each case.
4. Include edge cases — adversarial inputs, ambiguous queries, empty inputs.
5. Version the dataset alongside your code.
6. Continuously add new failures from production.

**Synthetic Data Generation**

Use a strong LLM to generate test cases programmatically:
```
"Generate 50 customer support queries about refund policies,
including edge cases like expired refunds, partial refunds,
and international orders."
```

Useful for bootstrapping coverage quickly but should be validated by humans.

**Best Practices**
- Version control
- Include edge cases
- Continuously update
- Add production failures
- Balance positive and negative examples

---

# 3.8 LLM Evaluation

Measures generation quality.

**Metrics (with definitions)**

- **Accuracy** — Is the answer factually correct?
- **Relevance** — Does the answer address the user's question?
- **Coherence** — Is the answer well-structured and readable?
- **Faithfulness** — Does the output stick to the provided context without hallucinating facts? (Critical for RAG systems.)
- **Hallucination Rate** — How often does the model generate unsupported information?
- **Safety** — Does the model refuse harmful requests and avoid toxic content?
- **Instruction Following** — Does the output respect the format, length, and constraints specified in the prompt?

**Methods**
- Pointwise (score a single response)
- Pairwise (compare two responses)
- Reference-based (compare against gold answer)

---

# 3.9 Retrieval Evaluation

Used for RAG systems.

```
Query
↓
Retriever
↓
Retrieved Documents
↓
LLM
```

**Metrics (with definitions)**

- **Precision** — Of the retrieved documents, what fraction is relevant?
- **Recall** — Of all relevant documents, what fraction was retrieved?
- **Hit Rate** — Did at least one relevant document appear in the top-K results?
- **MRR (Mean Reciprocal Rank)** — 1 / rank of the first relevant result, averaged across queries. If the first relevant result is at position 3, MRR for that query = 1/3.
- **NDCG (Normalized Discounted Cumulative Gain)** — Rewards relevant results appearing earlier in the ranking. A relevant document at position 1 counts more than the same document at position 10.
- **Context Precision** — Of the context chunks passed to the LLM, what fraction is actually relevant to the question? Measures retrieval noise.
- **Context Recall** — Of the information needed to answer the question, what fraction is present in the retrieved context? Measures retrieval completeness.

**Frameworks**
- RAGAS
- ARES

---

# 3.10 Memory Evaluation

Measures whether memory actually improves responses.

```
Memory
↓
Retrieved?
↓
Used?
↓
Better Answer?
```

**Metrics**
- **Memory Usefulness** — Did the retrieved memory contribute to a better response?
- **Memory Reuse** — How often are stored memories actually retrieved?
- **Freshness** — Are retrieved memories current or stale?
- **Conflict Rate** — How often do retrieved memories contradict each other?
- **Coverage** — What fraction of relevant past interactions are captured in memory?
- **Memory Decay Accuracy** — Are old irrelevant memories being properly archived/deleted?

**Measuring Memory Contribution**

A simple A/B evaluation method:
```
Run Agent Without Memory → Measure Score
Run Agent With Memory → Measure Score
Difference = Memory Contribution
```

If memory provides little or no improvement, then retrieval may be poor, memories may be stale, or wrong memories may be injected.

---

# 3.11 Tool Evaluation

Measures tool usage.

```
User
↓
LLM
↓
Tool Selection
↓
Tool Execution
↓
Result
```

**Metrics**
- **Tool Selection Accuracy** — Did the model pick the correct tool?
- **Argument Accuracy** — Were the tool arguments correct?
- **Success Rate** — Did the tool execution succeed?
- **Retry Rate** — How often did tool calls need retrying?
- **Latency** — How long did the tool call take?

**Example of Tool Selection Failure**
```
User: "What's the weather in Paris?"
↓
LLM calls search_database() ❌ Wrong Tool
↓
Should have called get_weather() ✅
```

Tool evaluation must cover selection, arguments, execution, and result quality.

---

# 3.12 Planner Evaluation

Measures planning quality.

**Questions**
- Was retrieval necessary?
- Were unnecessary steps executed?
- Was the plan optimal?
- Did execution finish?

**Metrics**
- **Plan Correctness** — Did the plan include the right steps?
- **Step Efficiency** — Were there unnecessary steps?
- **Completion Rate** — Did the plan execute to completion?
- **Decision Accuracy** — Were individual routing decisions correct?

**Example of Planner Error**
```
Question: "What is 2+2?"
↓
Planner → Retrieve from vector DB ❌
↓
Retrieval was unnecessary — this is a simple computation.
```

Conversely:
```
Question: "What is our company's refund policy?"
↓
Planner → Answer from LLM knowledge ❌
↓
Should have retrieved from company knowledge base.
```

---

# 3.13 Agent Evaluation

Measures complete agent execution.

```
Goal
↓
Planning
↓
Memory
↓
Tools
↓
Execution
↓
Result
```

**Metrics**
- **Task Completion** — Did the agent achieve the goal?
- **pass^k** — Probability of k consecutive successful runs.
- **Recovery Rate** — Can the agent recover from errors?
- **Trajectory Quality** — Was the execution path efficient?

**Understanding pass^k**

A single successful run does not imply a reliable agent.

```
Single Run Success Rate: 90%
↓
Four Consecutive Successful Runs: 0.9⁴ = 65.6%
```

pass^k measures the probability that an agent succeeds consistently across repeated executions. Higher pass^k indicates greater reliability.

**Caveat:** The 0.9^k formula assumes independent runs. If failures are correlated (the same input always fails), actual pass^k is lower than the independent calculation suggests. In practice, analyze failure clustering alongside the aggregate number.

---

# 3.14 Workflow Evaluation

Measures entire multi-step pipelines.

```
Research
↓
Analysis
↓
Risk Assessment
↓
Execution
↓
Report
```

**Metrics**
- **Workflow Completion** — Did the entire pipeline finish?
- **Stage Failures** — Which stage failed?
- **Latency** — End-to-end time.
- **End-to-End Quality** — Quality of the final output.

---

# 3.15 Business Evaluation

The most important layer.

**Questions**
- Did the user succeed?
- Was the issue resolved?
- Was the customer satisfied?

**Metrics**
- **CSAT** — Customer Satisfaction Score
- **Resolution Rate** — Percentage of issues resolved
- **Retention** — Did users come back?
- **Repeat Contact** — Did users need to follow up?
- **Time to Resolution** — How long did it take?

A system can score perfectly on technical metrics and still fail on business outcomes. Always measure both.

---

# 3.16 Guardrails & Safety Evaluation

Production systems deployed in enterprise environments need dedicated safety evaluation.

**What to evaluate:**
- **Prompt Injection Resistance** — Does the system resist attempts to override its instructions?
- **Jailbreak Resistance** — Can the model be tricked into producing harmful content?
- **PII Leakage** — Does the system accidentally expose personal information from context?
- **Toxicity** — Does the output contain offensive or harmful language?
- **Refusal Accuracy** — Does the model refuse when it should AND not refuse when it shouldn't? (Over-refusal is as much a problem as under-refusal.)

**Why this matters for FDE roles:**
Enterprise deployments have compliance requirements (GDPR, HIPAA, SOC2). Demonstrating that your system has been evaluated for safety is often a prerequisite for deployment approval.

---

# 3.17 Confidence Calibration

**What is it?**

A well-calibrated system's confidence closely matches its observed accuracy.

| Confidence | Actual Accuracy | Calibration |
|-----------|----------------|-------------|
| 90% | 89% | ✅ Well Calibrated |
| 90% | 52% | ❌ Overconfident |
| 50% | 78% | ❌ Underconfident |

**Important clarification:**

LLMs don't natively output calibrated confidence scores. Token-level log probabilities exist but aren't the same as calibrated task-level confidence.

In production, confidence is typically estimated via:
- **Consistency sampling** — Run the same query multiple times. If the model gives the same answer 9/10 times, confidence ≈ 90%.
- **Calibration layer** — A separate model or function that maps raw scores to calibrated probabilities.
- **Self-reported confidence** — Ask the LLM to rate its own confidence (unreliable but sometimes used as a signal).

---

# 3.18 Regression Testing

Every deployment should run evaluation suites.

```
Code Change
↓
Run Evals
↓
Compare Baseline
↓
Deploy / Reject
```

Purpose: Prevent regressions. A prompt change that improves one task might degrade another.

---

# 3.19 Common Evaluation Biases

LLM-based evaluators can introduce systematic biases.

- **Position Bias** — Preferring the first response in pairwise comparisons.
- **Verbosity Bias** — Rating longer responses more favorably.
- **Self-Enhancement Bias** — Models favoring their own outputs.
- **Criteria Vagueness** — Poorly defined evaluation criteria leading to inconsistent scoring.

**Mitigation:**
- Randomize response order in pairwise comparisons.
- Use explicit evaluation rubrics with concrete scoring criteria.
- Employ multiple judges (different model families).
- Incorporate human validation for disagreements.

**Inter-Annotator Agreement**

When using multiple judges (human or LLM), measure how much they agree:
- **Cohen's Kappa** — Agreement between two judges, adjusted for chance.
- **Krippendorff's Alpha** — Agreement among multiple judges.

If judges disagree significantly, your evaluation criteria are too vague. Fix the rubric before trusting the scores.

---

# 3.20 Observability

Production metrics beyond quality:
- p50 Latency
- p95 Latency
- p99 Latency
- Token Usage
- Cost per Request
- Failure Rate
- Retry Rate
- Tool Error Rate
- Context Window Utilization
- Rate Limit Hits

**Frameworks**
- Langfuse
- Phoenix
- OpenTelemetry

---

# 3.21 CI/CD Integration

Evaluations should be integrated into the deployment pipeline, layered by cost.

```
Code Change
↓
Fast Code-Based Evals (format, schema, length)
↓
Pass? → LLM-as-Judge Evals (quality, relevance)
↓
Pass? → Full Regression Suite
↓
Pass? → Human Review (optional, for edge cases)
↓
Production Deployment
```

Every deployment should meet predefined evaluation thresholds before release.

---

# 3.22 Production Evaluation Pipeline

A production AI system should evaluate every stage independently and as a complete workflow.

```
              User
                │
                ▼
            Planner
                │
        Planner Evaluation
                │
                ▼
           Retriever
                │
      Retrieval Evaluation
                │
                ▼
            Memory
                │
       Memory Evaluation
                │
                ▼
        Context Builder
                │
                ▼
              LLM
                │
         LLM Evaluation
                │
                ▼
           Tool Calls
                │
        Tool Evaluation
                │
                ▼
            Response
                │
       Workflow Evaluation
                │
                ▼
      Business Evaluation
```

---

# 3.23 Popular Evaluation Papers

| Paper | Focus |
|-------|-------|
| MT-Bench | LLM-as-a-Judge, pairwise evaluation |
| Arena-Hard | Pairwise evaluation at scale |
| HELM | Holistic LLM benchmark |
| MMLU | Massive Multitask Language Understanding — most cited general LLM benchmark |
| AlpacaEval | Automated LLM evaluation benchmark |
| RAGAS | Retrieval evaluation for RAG systems |
| ARES | Automated retrieval evaluation |
| τ-bench | Agent evaluation |
| SWE-bench | Coding agent evaluation |
| Reflexion | Evaluation-driven self-improvement in agents |

---

# 3.24 Popular Evaluation Frameworks

| Framework | Purpose |
|-----------|---------|
| DeepEval | Unit testing for LLMs |
| Promptfoo | Prompt evaluation |
| LangSmith | Tracing + evaluation |
| Langfuse | Observability |
| Braintrust | Evaluation platform |
| Phoenix | Tracing & evaluation |
| RAGAS | RAG evaluation |
| ARES | Retrieval evaluation |

---

# 3.25 Evaluation Philosophy

The primary goal of evaluation is not to determine whether the LLM is good.

The goal is to identify which component of the AI system is responsible for failures.

A production mindset asks:
- Is the planner making correct decisions?
- Is retrieval providing relevant context?
- Is memory improving outcomes?
- Are tools being selected correctly?
- Is the workflow achieving the intended business objective?

By evaluating each layer independently and collectively, AI systems become more reliable, maintainable, and production-ready.

---

# 3.26 Best Practices

- Evaluate every component, not just the LLM.
- Maintain versioned golden datasets.
- Combine code-based, LLM-based, and human evaluation in a tiered strategy.
- Use different model families for LLM-as-Judge than the model being evaluated.
- Define explicit rubrics — vague criteria produce inconsistent scores.
- Measure inter-annotator agreement when using multiple judges.
- Run regression tests before every deployment.
- Monitor production metrics continuously.
- Continuously update evaluation datasets with real failures.
- Measure both technical quality and business outcomes.
- Evaluate guardrails and safety alongside quality.
- Treat evaluation as an ongoing engineering process, not a one-time task.
