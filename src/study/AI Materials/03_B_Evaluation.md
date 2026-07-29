# AI Evaluation & AutoEval — Master Document
## How evaluation actually works in production AI systems, layer by layer, and WHY every metric exists

*"You can't improve what you can't measure." — And you can't trust what you can't evaluate independently at each layer.*

This is the depth under your evaluation chapter — for when the interviewer says "how does faithfulness scoring actually work?" or "how many test cases do you need to detect a 5% regression with 95% confidence?"

**Format**: every section has **MECHANISM** (what actually happens), **WHY** (the design reason), and **INTERVIEW LINE** (say it verbatim). Math is included where it builds understanding.

---

## PART 1 — THE MENTAL MODEL

### 1.1 Why Evaluation Is a Systems Problem, Not an LLM Problem

The single most important insight in AI evaluation: **the goal is not to determine whether the LLM is good — it's to identify which component of the AI system is responsible for failures.**

A production AI system is a pipeline:

```
User → Planner → Retriever → Memory → Context Builder → LLM → Tools → Response
```

Any layer can fail. A perfectly capable LLM fed garbage retrieval produces garbage output. A perfect retriever feeding a poorly prompted LLM also produces garbage. Evaluating only the final output tells you something is wrong but not WHERE. Component-level evaluation tells you what to fix.

**The Evaluation Pyramid** — each layer depends on the correctness of layers below it:

```
        Business Evaluation  ← "Did the user succeed?"
               ▲
        Workflow Evaluation   ← "Did the full pipeline complete correctly?"
               ▲
         Agent Evaluation     ← "Did the agent achieve its goal efficiently?"
               ▲
          Tool Evaluation     ← "Did the LLM select the right tool with correct args?"
               ▲
        Memory Evaluation     ← "Did the retrieved memories improve the response?"
               ▲
       Retrieval Evaluation   ← "Did the retriever return the right documents?"
               ▲
          LLM Evaluation      ← "Is the generated text accurate, relevant, faithful?"
```

A broken retrieval layer causes failures ALL the way up the pyramid, even if every other component is perfect. **Debug bottom-up, not top-down.**

**INTERVIEW LINE**: "When the system produces a bad response, my first question isn't 'is the LLM bad?' — it's 'did the right chunks arrive in context?' Over half the 'hallucination' bugs I've seen were actually retrieval bugs: the correct document was never retrieved, so the LLM had nothing to ground on. Component-level eval is how you diagnose this."

---

### 1.2 The Three Evaluator Types — And When Each Earns Its Cost

| Evaluator | Mechanism | Latency | Cost/eval | Best For | Worst For |
|---|---|---|---|---|---|
| **Code-based** | Deterministic rules: regex, schema validation, exact match, length check | <1ms | ~$0 | Format correctness, JSON validity, safety keyword blocking | Quality, nuance, open-ended generation |
| **LLM-as-Judge** | A stronger/different LLM scores the output against criteria | 500ms-3s | $0.001-0.01 | Quality, coherence, faithfulness, relevance — at scale | Absolute scoring (biases), adversarial inputs |
| **Human** | Domain expert rates the output | Minutes-hours | $1-50 | Creativity, safety, ambiguous/high-stakes, calibrating LLM judges | Scale, speed, consistency |

**The Tiered Strategy (production standard)**:

```
Every response:
  Layer 1: Code-based checks (~1ms, ~$0)
    - JSON schema valid?
    - Response length within bounds?
    - No PII patterns in output?
    - Citations present if required?
  
  → If passes, sample 10-20% for:
  Layer 2: LLM-as-Judge (~1s, ~$0.005)
    - Faithfulness score
    - Relevance score
    - Coherence score
  
  → Failures/edge cases/judge disagreements escalate to:
  Layer 3: Human review (minutes, ~$5-50)
    - Weekly batch review of flagged cases
    - Calibration: are LLM judge scores aligned with human judgment?
    - New failures → golden dataset additions

Cost at 500K requests/day:
  Layer 1: 500K × $0 = $0 (self-hosted regex/schema)
  Layer 2: 50K × $0.005 = $250/day = $7,500/month
  Layer 3: 200 × $10 = $2,000/day (outsourced) or internal reviewer salary
  Total eval cost: ~$10-15K/month (~1-5% of the LLM inference cost)
```

---

## PART 2 — LLM-AS-JUDGE (THE IMPLEMENTATION DEEP DIVE)

### 2.1 How LLM-as-Judge Actually Works

**MECHANISM**: a "judge" LLM receives the original query, the system's response, and (optionally) the retrieved context and a reference answer. It scores the response against defined criteria.

**The prompt structure**:

```
SYSTEM: You are an expert evaluator. Score the following response on {criterion}.

CRITERION: Faithfulness — Does every claim in the response have support in 
the provided context? A faithful response makes no unsupported claims.

SCORING RUBRIC:
  5: Every claim is directly supported by the context
  4: Nearly all claims supported, minor omissions
  3: Most claims supported, some unsupported statements
  2: Significant unsupported claims
  1: Mostly unsupported or contradicts the context

INPUT: {user_query}
CONTEXT: {retrieved_chunks}
RESPONSE: {model_response}

Evaluate step by step, then provide your score (1-5).
```

**G-Eval (Liu et al., EMNLP 2023) — the standard framework**:

G-Eval uses three components to improve judge quality:

```
1. EVALUATION STEP GENERATION (auto-CoT):
   Given the criterion in natural language, the LLM auto-generates
   detailed evaluation steps:
   
   "To evaluate faithfulness:
    Step 1: Identify all factual claims in the response.
    Step 2: For each claim, check if the retrieved context contains supporting evidence.
    Step 3: Count supported vs unsupported claims.
    Step 4: Assign a score based on the ratio."

2. JUDGING:
   The generated steps are used as part of the scoring prompt.
   The judge LLM reads the steps, applies them to the actual output,
   and produces a score.

3. PROBABILITY-WEIGHTED SCORING:
   Instead of taking the judge's raw integer output (e.g., "4"),
   compute the expected score from token-level log-probabilities:
   
   G-Eval score = Σ(s=1 to 5) s × P(s) / Σ(s'=1 to 5) P(s')
   
   Where P(s) = exp(log_prob("s")) for each score value
   
   WHY: this produces continuous, fine-grained scores (e.g., 3.7)
   instead of discrete integers, reducing ties and improving
   correlation with human judgment.
```

**Results**: G-Eval with GPT-4 achieved a Spearman correlation of 0.514 with human judgments on the SummEval summarization benchmark, outperforming all prior automated evaluators across coherence, consistency, fluency, and relevance.

**WHY the probability-weighted step matters**: without it, you get integer scores (1-5) with massive tie rates. Two responses both scoring "4" are indistinguishable. Probability weighting produces continuous scores (3.72 vs 4.15), making it possible to rank and detect finer regressions.

### 2.2 Pointwise vs. Pairwise vs. Reference-Based

| Method | Mechanism | Strength | Weakness | When to Use |
|---|---|---|---|---|
| **Pointwise** | Score a single output on a rubric (1-5) | Simple, independent | Subjective — judges disagree on what "3" vs "4" means | Quality monitoring on production traffic |
| **Pairwise** | Compare two outputs, pick the better one | More reliable — relative comparison is easier than absolute scoring | Only tells you which is better, not whether either is good | A/B testing, model comparison, prompt comparison |
| **Reference-Based** | Compare output to a gold answer | Objective for factual tasks | Breaks for open-ended generation; requires gold answers | Regression testing, retrieval eval |

**WHY pairwise is more reliable**: humans and LLMs are bad at absolute scoring (is this a "3" or a "4"?) but good at comparison ("A is better than B"). This is the insight behind Chatbot Arena (LMSYS) and MT-Bench. When you need to compare two prompt versions or two models, always prefer pairwise.

### 2.3 LLM Judge Biases — The Traps and Mitigations

**Five documented biases** (Zheng et al., 2023):

| Bias | Mechanism | Mitigation |
|---|---|---|
| **Position bias** | In pairwise, judges prefer the first response shown | Randomize order; run each comparison twice (A,B) and (B,A); take majority |
| **Verbosity bias** | Judges rate longer responses higher regardless of quality | Include "penalize unnecessary verbosity" in the rubric; normalize by length |
| **Self-enhancement** | Models favor their own outputs (GPT-4 judging GPT-4) | Use a different model family as judge (Claude judging GPT-4, or vice versa) |
| **Criteria vagueness** | Poorly defined rubrics → inconsistent scoring | Explicit rubrics with concrete examples for each score level |
| **Recency bias** | In multi-turn, judges weight later messages more | Segment evaluation by turn; evaluate each turn independently |

**The cross-family rule**: always use a different model family for judging than the model being evaluated. GPT-4 judging GPT-4 inflates scores by ~10-15% compared to human judgment. Claude judging GPT-4 (or vice versa) aligns much closer to human scores.

---

## PART 3 — RETRIEVAL EVALUATION (THE RAG QUALITY FOUNDATION)

### 3.1 The Metrics — With Formulas and WHY Each Exists

**Retrieval evaluation requires a golden set**: real queries paired with the correct source chunks/documents.

**Recall@K** — the headline metric for RAG:

```
Recall@K = |{relevant docs in top K}| / |{all relevant docs}|

Example: query has 3 relevant docs in the corpus
  Top-5 retrieval returns 2 of them
  Recall@5 = 2/3 = 0.667

WHY this is THE metric: RAG feeds the top K chunks to the LLM.
If a relevant chunk isn't in the top K, the LLM has no chance of using it.
Recall@K directly measures "did the right stuff arrive in context?"
```

**MRR (Mean Reciprocal Rank)** — cares about being at the top:

```
For each query: RR = 1 / rank_of_first_relevant_result
MRR = average(RR) across all queries

Example:
  Query 1: first relevant at rank 1 → RR = 1.0
  Query 2: first relevant at rank 3 → RR = 0.333
  Query 3: first relevant at rank 2 → RR = 0.5
  MRR = (1.0 + 0.333 + 0.5) / 3 = 0.611

WHY MRR: when you only show users 1-2 chunks (or when the LLM
primarily uses the first chunk), rank of the first relevant result matters.
```

**nDCG@K** (Normalized Discounted Cumulative Gain) — graded relevance, position-weighted:

```
DCG@K = Σ(i=1 to K) (2^rel_i - 1) / log₂(i + 1)

Where rel_i is the relevance grade of the document at position i
(e.g., 0=irrelevant, 1=partial, 2=perfect)

IDCG@K = the DCG of the ideal ranking (best possible)
nDCG@K = DCG@K / IDCG@K ∈ [0, 1]

WHY nDCG: handles graded relevance (not just binary relevant/not)
and cares about ORDER (relevant docs at rank 1 count more than at rank 10).
The standard IR metric. Use when relevance isn't binary.
```

**INTERVIEW LINE**: "For RAG, recall@K is my headline metric because it directly measures what the LLM gets to see. If recall@5 is 0.6, the LLM is missing 40% of relevant context — no prompt engineering fixes that. MRR when position matters, nDCG when relevance is graded."

### 3.2 RAGAS — The RAG Evaluation Framework

RAGAS (Es et al., 2024) provides a reference-free evaluation framework with four core metrics split across retriever and generator:

**Retriever metrics**:

```
Context Precision: are relevant chunks ranked higher than irrelevant ones?
  (measures retrieval ranking quality)

Context Recall: does the retrieved context contain all information needed
  to answer the question?
  Requires ground truth answer as reference.
  Computed by: decompose ground truth into claims → check each claim
  against retrieved context → recall = supported claims / total claims
```

**Generator metrics**:

```
Faithfulness: does the response stick to the retrieved context?
  
  MECHANISM (how RAGAS computes it):
  1. Decompose the response into atomic claims using an LLM:
     "Einstein was born in Germany on March 14, 1879" →
     Claim 1: "Einstein was born in Germany"
     Claim 2: "Einstein was born on March 14, 1879"
  
  2. For each claim, check if it's supported by the retrieved context:
     Claim 1: context says "born in Ulm, Germany" → SUPPORTED
     Claim 2: context says "born on 14 March 1879" → SUPPORTED
  
  3. Faithfulness = supported_claims / total_claims = 2/2 = 1.0
  
  A response saying "Einstein was born on March 20, 1879" would score:
     Claim "born on March 20" → NOT supported → Faithfulness = 1/2 = 0.5

Answer Relevancy: does the response address the question?
  Computed by generating N hypothetical questions from the response,
  then measuring cosine similarity with the original question.
  High similarity = the response is about the right topic.
```

**Critical nuance** (say this unprompted): faithfulness is reference-FREE (doesn't need ground truth — just checks response against context). Context recall is reference-BASED (needs ground truth to check if the context contains all needed info). Confusing the two is a common mistake.

---

## PART 4 — AGENT EVALUATION (THE HARDEST LAYER)

### 4.1 Why Agent Eval Is Different

Agents have a unique challenge: they take ACTIONS in the real world (tool calls, API requests, file modifications). A wrong action is worse than a wrong sentence. And agents take SEQUENCES of actions — the evaluation must cover the full trajectory, not just the final output.

**What to evaluate**:

```
1. TASK COMPLETION — did the agent achieve the goal?
   Binary: yes/no, measured on a test suite of tasks with known solutions

2. TRAJECTORY QUALITY — was the path efficient?
   Did the agent take unnecessary steps?
   Did it use the right tools in the right order?
   Did it recover from errors gracefully?

3. TOOL SELECTION ACCURACY — did the model pick the correct tool?
   Given a query and available tools, did it call the right one?
   Were the arguments correct?

4. PASS^K — consistency across repeated runs
   Single success rate of 90% sounds great, but:
   pass^1 = 0.90
   pass^4 = 0.90^4 = 0.656 (only 65.6% chance of 4 consecutive successes)
   pass^10 = 0.90^10 = 0.349 (only 35% chance of 10 consecutive successes)
   
   WHY this matters: an agent running once per user request at 90% is fine.
   An agent running a 10-step workflow needs 90% per step, which gives
   0.9^10 = 34.9% end-to-end success. You need per-step rates > 99%
   for reliable multi-step workflows.
   
   Caveat: the 0.9^k formula assumes independent failures.
   If failures are correlated (same input always fails), actual pass^k
   is lower. Analyze failure clustering alongside the aggregate.
```

**Tool Selection Evaluation — the metrics**:

```
Tool Call Accuracy = correct_tool_calls / total_tool_calls

Tool Call F1: treats tool selection as a classification problem
  Precision = correct_tool_calls / all_tool_calls_made
  Recall = correct_tool_calls / all_tool_calls_that_should_have_been_made
  F1 = 2 × (Precision × Recall) / (Precision + Recall)

Argument Accuracy: even with the right tool, were the args correct?
  get_weather(city="Paris, France") ✅
  get_weather(city="paris") ⚠️ (might work, might not)
  get_weather(city="France") ❌ (wrong argument)
```

**Production War Story: The Completeness Metric That Caught a Silent Failure**

Your own uxc-generative-ai system hit this: the Analyze Task Trends agent had its record limit increased from 8 to 50, combined with 10 hardcoded parallel slots. The Task Completeness metric dropped from 90% to 52% while Tool Choice Accuracy and Tool Calling Correctness held steady. Without the completeness metric, the silent data truncation would have shipped. The accuracy metrics said "the tools are being called correctly" — they were, just on truncated data. The completeness metric said "the answer isn't covering all the data" — catching the real failure.

**INTERVIEW LINE**: "Agent eval needs separate metrics per dimension — tool selection accuracy, argument correctness, and task completeness can move independently. Our real production bug was a completeness drop from 90% to 52% while accuracy held at 95%. Without the completeness metric, we'd have shipped a silently truncating agent."

---

## PART 5 — STATISTICAL RIGOR (THE MATH THAT MATTERS)

### 5.1 Sample Size — How Many Test Cases Do You Actually Need?

**The question**: "We want to detect a 5% absolute regression in faithfulness (from 90% to 85%) with 95% confidence and 80% power. How many test cases?"

**Two-proportion z-test**:

```
n = (Z_{α/2} + Z_β)² × (p₁(1-p₁) + p₂(1-p₂)) / (p₁ - p₂)²

Where:
  p₁ = 0.90 (baseline faithfulness rate)
  p₂ = 0.85 (regressed rate — 5% absolute drop)
  Z_{α/2} = 1.96 (95% confidence, two-tailed)
  Z_β = 0.84 (80% power)

n = (1.96 + 0.84)² × (0.90×0.10 + 0.85×0.15) / (0.05)²
n = (2.80)² × (0.09 + 0.1275) / 0.0025
n = 7.84 × 0.2175 / 0.0025
n = 7.84 × 87
n ≈ 682 test cases per group

So: ~680 labeled test cases to detect a 5% faithfulness regression.
```

**Practical implications**:

```
To detect smaller regressions, you need MORE test cases:
  5% absolute drop: ~680 cases
  3% absolute drop: ~1,900 cases
  1% absolute drop: ~17,000 cases

This is why automated eval generation matters — you can't hand-craft 17K test cases.
And it's why most teams target detecting 3-5% regressions,
not 1% (the test set cost is prohibitive).
```

### 5.2 Confidence Intervals — Reporting Metrics Correctly

**Wilson Score Interval** (better than Wald for proportions near 0 or 1):

```
If you tested 500 queries and faithfulness passed on 425:
  Point estimate: p̂ = 425/500 = 0.85
  
  Wilson CI:
  p̂_adj = (p̂ + z²/2n) / (1 + z²/n)
  width = z × √(p̂(1-p̂)/n + z²/4n²) / (1 + z²/n)
  
  For z=1.96, n=500, p̂=0.85:
  CI ≈ (0.817, 0.878)
  
  Report: "Faithfulness: 85.0% (95% CI: 81.7% – 87.8%, n=500)"
```

**WHY Wilson over Wald**: Wald intervals (`p̂ ± z√(p̂(1-p̂)/n)`) can produce CIs below 0 or above 1 for extreme proportions. Wilson corrects this. Always use Wilson for evaluation metrics.

### 5.3 Cohen's Kappa — Judge Agreement

When multiple judges (human or LLM) score the same outputs, measure how much they agree BEYOND chance:

```
κ = (p_o - p_e) / (1 - p_e)

Where:
  p_o = observed agreement (fraction of cases where judges agree)
  p_e = expected agreement by chance

Example: two judges, binary (pass/fail) on 100 cases:
                Judge B
              Pass  Fail
  Judge A  
    Pass      60    15    = 75 pass by A
    Fail      10    15    = 25 fail by A
              70    30

  p_o = (60 + 15) / 100 = 0.75
  
  Expected by chance:
    P(both pass) = (75/100) × (70/100) = 0.525
    P(both fail) = (25/100) × (30/100) = 0.075
    p_e = 0.525 + 0.075 = 0.60
  
  κ = (0.75 - 0.60) / (1 - 0.60) = 0.15 / 0.40 = 0.375

Interpretation:
  κ < 0.20 — slight (your rubric is broken)
  κ = 0.21-0.40 — fair (needs rubric improvement)
  κ = 0.41-0.60 — moderate (acceptable for subjective criteria)
  κ = 0.61-0.80 — substantial (good for production eval)
  κ > 0.80 — near-perfect (target for clear-cut categories)
  
  Our example: κ = 0.375 (fair) → the rubric needs work before trusting scores.
```

**For more than two judges**: use Krippendorff's Alpha (generalizes to multiple judges, ordinal/interval scales, and missing data).

**SDE3 Interview Follow-up**: "Your LLM-as-judge has κ = 0.45 agreement with human annotators. Is that good enough?"

It depends on the criterion. For binary safety classification (is this response harmful?), κ = 0.45 is too low — you need κ > 0.80 for safety-critical decisions. For subjective quality scoring (how coherent is this?), κ = 0.45 is acceptable as a signal but not a gate. Fix it by making the rubric more explicit with concrete examples for each score level, or switch to pairwise (which typically achieves higher agreement than pointwise).

---

## PART 6 — BUILDING THE EVAL PIPELINE (PRODUCTION ENGINEERING)

### 6.1 The CI/CD Integration — Eval-Driven Development

```
Developer makes a change (prompt, model, retrieval config, tool definition)
  │
  ├── 1. FAST GATE: Code-based checks (seconds)
  │     - Output schema validation
  │     - Response length bounds
  │     - Required fields present
  │     - No forbidden patterns
  │     Threshold: 100% pass rate (hard gate)
  │
  ├── 2. REGRESSION GATE: Golden dataset eval (minutes)
  │     - Run full golden dataset (~500-2000 cases)
  │     - Compute: faithfulness, relevance, recall@K, tool accuracy
  │     - Compare against baseline (last deployment's scores)
  │     Threshold: no metric drops > 3% absolute (configurable per metric)
  │     
  │     If any metric regresses:
  │       → Block deployment
  │       → Report: which metric, which test cases failed, diff from baseline
  │
  ├── 3. LLM-AS-JUDGE GATE: Quality eval on sample (minutes)
  │     - Run LLM judge on 100-200 representative cases
  │     - Score: coherence, helpfulness, instruction following
  │     - Compare against baseline
  │     Threshold: no metric drops > 5% (judge scores are noisier)
  │
  └── 4. HUMAN REVIEW (optional, async)
        - For high-risk changes (new tool, major prompt rewrite)
        - Reviewer checks 20-50 edge cases
        - Approval required before production rollout

Total CI eval time: 3-10 minutes (parallelized)
Total CI eval cost: ~$5-15 per pipeline run
  (golden dataset: ~500 LLM calls × $0.005 = $2.50
   + judge calls: ~200 × $0.01 = $2.00
   + compute: negligible)
```

### 6.2 The Golden Dataset — How to Build and Maintain It

**Initial construction**:

```
1. Mine production logs: identify real user queries (100-500 diverse queries)
2. For each query, run the current system and capture:
   - Retrieved chunks
   - Generated response
   - User feedback (if available)
3. Have domain experts annotate:
   - Expected answer (or acceptable answer range)
   - Correct source documents
   - Edge case classification
4. Include deliberate adversarial cases:
   - Prompt injection attempts
   - Out-of-scope queries (should trigger refusal)
   - Ambiguous queries (should trigger clarification)
   - Empty or malformed inputs
```

**Ongoing maintenance (the growth loop)**:

```
Production traffic
  → Online monitoring detects failures (low user ratings, wrong source flags)
  → Failed cases reviewed weekly by team
  → Confirmed failures → new golden dataset entries
  → Golden dataset grows harder over time

This is critical: a static golden dataset gets "gamed" — the system overfits
to it over time. The growth loop ensures the eval set reflects real production
failure modes and gets progressively harder.
```

**Stratified sampling** (ensure balanced coverage):

```
Category             Count    %     Rationale
──────────────────── ──────── ───── ──────────────────────
Factual QA            200     30%   Core use case
Multi-hop reasoning   100     15%   Complex queries
Refusal/safety        100     15%   Should refuse or flag
Out-of-scope          50      7%    Should say "I don't know"
Adversarial           50      7%    Injection, extraction attempts
Edge cases            75      11%   Ambiguous, partial info
Recent failures       100     15%   From production failure log
──────────────────── ──────── 
Total                 675     100%
```

### 6.3 Synthetic Test Case Generation — Bootstrapping Coverage

**MECHANISM**: use a strong LLM to generate test cases programmatically:

```python
prompt = """Generate 30 customer support queries about refund policies.
Include:
- Standard refund requests (10)
- Edge cases: expired refunds, partial refunds, international (10)
- Adversarial: attempts to manipulate the policy, social engineering (5)
- Ambiguous: queries that could be about refunds OR exchanges (5)

For each, provide:
- query: the user's question
- expected_behavior: what the system should do
- difficulty: easy/medium/hard
- category: standard/edge/adversarial/ambiguous

Return as JSON array."""
```

**WHY synthetic + human validation**: LLM-generated test cases bootstrap coverage fast (100s of cases in minutes) but need human validation because: (1) the LLM may generate unrealistic queries, (2) the expected outputs may be wrong, (3) the distribution may not match production traffic. Use synthetic for breadth, human-validated for the golden set.

**Cost**: generating 1000 synthetic test cases with a strong LLM costs ~$5-10. Validating them with human reviewers costs ~$500-1000 (at $0.50-1.00 per case). The generation is cheap; the validation is the investment.

---

## PART 7 — OBSERVABILITY (PRODUCTION MONITORING)

### 7.1 What to Monitor in Production

```
LATENCY:
  p50, p95, p99 for:
  - End-to-end response time
  - Retrieval latency (vector search + reranking)
  - LLM generation time (TTFT + total)
  - Tool call latency (per tool)
  
  Alert: p99 > 2× baseline

COST:
  - Token usage per request (input + output)
  - Cost per request ($)
  - Daily/weekly cost trend
  - Cost per user
  
  Alert: daily cost > 2× rolling average

QUALITY (sampled):
  - Faithfulness score (LLM judge, sampled 10-20%)
  - Retrieval recall (on queries with known good sources)
  - User feedback rate (thumbs up/down)
  - Refusal rate (are we refusing too much? too little?)
  
  Alert: 7-day rolling faithfulness < threshold

ERRORS:
  - LLM API error rate
  - Tool call failure rate
  - Retry rate
  - Rate limit hits
  - Context window overflow rate
  
  Alert: error rate > 1% over 5 minutes

DRIFT:
  - Topic distribution shift (are users asking different things?)
  - Response length distribution shift
  - Tool usage pattern shift
  - Embedding similarity distribution shift
  
  Alert: KL divergence of topic distribution > threshold
```

### 7.2 Tracing — The Observability Foundation

Every request produces a **trace** — a full record of what happened at every step:

```json
{
  "trace_id": "tr-abc-123",
  "timestamp": "2026-07-26T10:30:00Z",
  "user_id": "user-456",
  "spans": [
    {
      "name": "retrieval",
      "duration_ms": 45,
      "input": {"query": "What is our refund policy?"},
      "output": {"chunks": [...], "scores": [0.92, 0.87, 0.83]},
      "metadata": {"top_k": 5, "model": "bge-large-v1.5"}
    },
    {
      "name": "llm_generation",
      "duration_ms": 2300,
      "input": {"prompt_tokens": 3500},
      "output": {"completion_tokens": 450, "model": "claude-sonnet-4-6"},
      "metadata": {"temperature": 0.0, "cost": 0.0173}
    },
    {
      "name": "output_guardrails",
      "duration_ms": 15,
      "output": {"pii_detected": false, "toxicity_score": 0.01}
    }
  ],
  "eval_scores": {
    "faithfulness": 0.92,
    "relevance": 0.88
  },
  "user_feedback": null
}
```

**WHY tracing matters for eval**: traces are the raw material for evaluation. When a user reports a bad response, you pull the trace and see exactly which chunks were retrieved, what the prompt looked like, and what scores the guardrails assigned. Without tracing, debugging is guessing.

**Frameworks**: Langfuse, Phoenix (Arize), LangSmith, OpenTelemetry (the emerging standard for AI tracing spans).

---

## PART 8 — CONFIDENCE CALIBRATION

### 8.1 The Problem — LLMs Are Not Calibrated

A well-calibrated system's confidence should match its accuracy:

```
If the system says "I'm 90% confident": it should be correct 90% of the time.

Reality: LLMs are systematically overconfident.
  LLM says 90% confident → actually correct ~60-70% of the time
  LLM says 50% confident → actually correct ~40-50% of the time
```

**WHY this matters**: if you use confidence to decide when to show a disclaimer ("I'm not sure about this") or when to trigger human review, miscalibration means the system confidently serves wrong answers and hesitates on correct ones.

**Production calibration techniques**:

```
1. CONSISTENCY SAMPLING (most practical):
   Run the same query N times (e.g., N=5) with temperature > 0
   If the answer is the same 5/5 times → high confidence
   If answers vary → low confidence
   
   Confidence ≈ agreement_rate across N samples
   
   Cost: N × the inference cost (5× for N=5)
   Latency: can be parallelized, so ~1.3× latency (not 5×)
   
   Practical: only for high-stakes queries (medical, financial, legal)

2. CALIBRATION LAYER:
   Train a lightweight model that maps (query, response, context) → 
   calibrated confidence score
   
   Training data: collect (query, response, was_correct) tuples from production
   Model: logistic regression or small neural net
   Features: response length, retrieval score, number of sources, 
             semantic similarity of response to retrieved chunks
   
   Cost: negligible (small model inference)
   Accuracy: requires sufficient training data (~1000+ labeled examples)

3. RETRIEVAL SCORE AS PROXY:
   If the best retrieval score is < 0.75 → low confidence
   (the system didn't find strongly relevant context)
   
   Simple, cheap, and surprisingly effective for RAG systems.
```

---

## PART 9 — EVALUATION BENCHMARKS AND PAPERS

### 9.1 The Key Papers to Know

| Paper / Benchmark | Year | What It Does | Why It Matters |
|---|---|---|---|
| **MT-Bench** (Zheng et al.) | 2023 | Multi-turn benchmark; introduced LLM-as-judge + pairwise eval | Established pairwise > pointwise for LLM eval; powers Chatbot Arena |
| **G-Eval** (Liu et al.) | 2023 | CoT-based evaluation with probability-weighted scoring | Standard framework for LLM-as-judge; 0.514 Spearman with human judgment |
| **RAGAS** (Es et al.) | 2024 | Reference-free RAG evaluation: faithfulness, relevance, precision, recall | The standard RAG eval framework; adopted across industry |
| **MMLU** | 2021 | 57-subject multiple-choice benchmark | Most cited general LLM capability benchmark (but saturating) |
| **SWE-bench** | 2024 | Real GitHub issues → model generates code fix | The standard coding agent benchmark; Verified subset is more reliable |
| **τ-bench** (Yao et al.) | 2024 | Tool-use agent evaluation in simulated environments | Eval for agent tool selection and execution |
| **HELM** (Stanford) | 2023 | Holistic evaluation across 42 scenarios × 7 metrics | Comprehensive, transparent multi-scenario eval |
| **Reflexion** (Shinn et al.) | 2023 | Agent self-reflection loop driven by eval feedback | Showed eval-in-the-loop improves agent performance |
| **Arena-Hard** | 2024 | Automated pairwise eval pipeline for model comparison | Correlates with Chatbot Arena rankings without human crowd |

### 9.2 Evaluation Frameworks (Current as of 2026)

| Framework | Primary Use Case | Key Strength |
|---|---|---|
| **DeepEval** | Unit testing for LLMs (pytest-style) | Code-native, CI/CD integration, built-in G-Eval/RAG metrics |
| **RAGAS** | RAG evaluation | De facto standard for retrieval + generation eval |
| **Promptfoo** | Prompt regression testing | YAML-based, fast iteration, model-agnostic |
| **Langfuse** | Observability + eval | Tracing + annotation + scoring in one platform |
| **LangSmith** | LangChain-native tracing + eval | Deep LangChain integration, annotation queues |
| **Phoenix (Arize)** | Observability + eval | OpenTelemetry-native, embedding drift detection |
| **Braintrust** | Evaluation platform | Managed eval runs, comparison views, logging |

---

## PART 10 — RAPID-FIRE Q&A (drill AI-off, 60-90 seconds each)

**"What is the goal of AI evaluation?"**
→ Not to determine whether the LLM is good — it's to identify which component is responsible for failures. Evaluate each layer independently: retrieval, memory, tools, planner, LLM, and business outcomes. A broken retrieval layer causes failures all the way up even if the LLM is perfect. Debug bottom-up. §1.1.

**"How does LLM-as-judge work?"**
→ A judge LLM receives the query, response, context, and a scoring rubric. G-Eval (EMNLP 2023) adds auto-CoT evaluation steps + probability-weighted scoring for continuous (not integer) scores. Spearman 0.514 with human judgment. Always use a different model family as judge than the model being evaluated (cross-family rule avoids self-enhancement bias). §2.1.

**"How does RAGAS faithfulness work?"**
→ Two-step: (1) decompose the response into atomic claims using an LLM, (2) check each claim against the retrieved context for support. Faithfulness = supported_claims / total_claims. Range 0-1. Reference-free — doesn't need ground truth, just checks response vs. context. Context recall, by contrast, IS reference-based. Don't confuse the two. §3.2.

**"What's your headline retrieval metric?"**
→ Recall@K, because it directly measures what the LLM gets to see. If recall@5 is 0.6, 40% of relevant context never reaches the model. MRR when rank of first relevant matters. nDCG when relevance is graded, not binary. Always evaluate retrieval separately from generation — most "hallucination bugs" are actually retrieval bugs. §3.1.

**"How many test cases for a 5% regression?"**
→ Two-proportion z-test: ~680 cases per group at 95% confidence, 80% power, for a 5% absolute drop (90% → 85%). For 3% drop: ~1,900 cases. For 1% drop: ~17K cases. This is why teams target 3-5% detection thresholds and use synthetic generation to bootstrap coverage. §5.1.

**"What is pass^k and why does it matter for agents?"**
→ Probability of k consecutive successes. If single-run success is 90%: pass^1=0.90, pass^4=0.66, pass^10=0.35. A 10-step agent workflow at 90% per-step reliability has only 35% end-to-end success. You need 99%+ per-step for reliable multi-step agents. Assumes independent failures — correlated failures make it worse. §4.1.

**"Pointwise vs pairwise evaluation?"**
→ Pointwise: score one output on a rubric (1-5). Simple but subjective — judges disagree on absolute scores. Pairwise: compare two outputs, pick the better one. More reliable because relative comparison is easier than absolute scoring. Use pairwise for A/B testing, model comparison, prompt comparison. Chatbot Arena and MT-Bench use pairwise. §2.2.

**"How do you build a golden dataset?"**
→ Start from production logs (real queries), identify failure cases, have domain experts annotate expected outputs, include adversarial/edge cases, version alongside code. Critical: the golden set grows from production failures — the growth loop ensures eval gets harder over time, not stale. Stratify by category (factual, reasoning, refusal, adversarial, edge, recent failures). §6.2.

**"What LLM judge biases should I know?"**
→ Position bias (prefers first in pairwise — randomize order), verbosity bias (rates longer higher — penalize in rubric), self-enhancement (GPT-4 favors GPT-4 output — use cross-family judges), criteria vagueness (poor rubric → inconsistent scores — use concrete examples per score level). Measure agreement with Cohen's Kappa: κ > 0.60 for production, > 0.80 for safety-critical. §2.3.

**"How do you integrate evals in CI/CD?"**
→ Four gates: (1) code-based checks in seconds (schema, format, 100% pass required), (2) golden dataset regression in minutes (~500-2000 cases, block if any metric drops > 3%), (3) LLM-as-judge quality on a sample (~200 cases, block if drop > 5%), (4) optional human review for high-risk changes. Total: 3-10 minutes, $5-15 per run. Every deployment meets eval thresholds before release. §6.1.

**"How do you handle confidence calibration?"**
→ LLMs are systematically overconfident. Three production approaches: (1) consistency sampling — run N times, agreement rate ≈ confidence (5× cost, but parallelizable), (2) trained calibration layer — logistic regression on (query features, response features) → calibrated probability, (3) retrieval score as proxy — low retrieval score → low confidence. Use for medical/legal/financial where "I'm not sure" is more valuable than a wrong answer. §8.1.

---

## HONESTY GUARDRAILS

- **Your real eval experience**: your Auto Eval pipeline with Task Completeness, Tool Choice Accuracy, and Tool Calling Correctness is exactly the component-level eval this chapter describes. The truncation bug (completeness dropping 90% → 52% while accuracy held) is a perfect production war story that demonstrates why multi-dimensional eval matters.
- **What to claim**: "I built an automated evaluation pipeline that caught a silent data truncation bug because our task completeness metric regressed while our accuracy metrics held steady. That taught me that you need orthogonal metrics per evaluation dimension."
- **What to be honest about**: if you haven't implemented G-Eval's probability-weighted scoring or formal sample-size calculations, say "I use LLM-as-judge with explicit rubrics; the probability-weighted scoring from G-Eval is a refinement I'd add for fine-grained score discrimination."
- **Numbers you can do live**: sample size calculation (the z-test formula with p₁, p₂), Wilson CI, Cohen's Kappa from a 2×2 table, faithfulness calculation (supported claims / total claims). Practice these.
