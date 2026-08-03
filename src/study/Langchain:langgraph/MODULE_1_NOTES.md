# Module 1 — LLM Foundations

## L1: What is a Language Model?

### What It Is:
Language model = function that predicts the next token. Given a sequence of tokens, outputs a **probability distribution** over the entire vocabulary (~100k tokens). NOT a single word.

### Transformer — 3 Stages:
```
1. TOKENIZATION: text → token IDs (integers)
   "Hello world" → [15496, 995]

2. EMBEDDINGS: token IDs → vectors (lists of numbers encoding meaning)
   Similar meanings → nearby vectors in space

3. ATTENTION: each token looks at every other token, computes relevance scores
   Breakthrough: before attention, models read left-to-right and forgot early context
   Attention lets every token attend to every other token dynamically
```

### Autoregressive Generation:
Model predicts ONE token → feeds it back → predicts next → repeat until STOP token.
- **Streaming works**: each token delivered as generated
- **CoT works**: model's own output becomes its input
- **Can't "go back"**: once generated, committed

### Hallucination:
Model predicts plausible-sounding words, does NOT look up truth.

### Quiz: PASS (3/5 → retry → PASS)
- **Q1: In one sentence, what does a language model do?**
  ✅ "predict next token until stop token"
- **Q2: What does a language model output at each step — one token, or something else? Be precise.**
  ❌ Said model outputs single word → ⚠️ **It outputs a PROBABILITY DISTRIBUTION over ~100k tokens. Temperature/sampling then selects from it.**
- **Q3: What's the difference between embeddings and attention?**
  🔄 Mixed up attention with embeddings → ⚠️ **Embeddings = permanent positions (king/queen always near). Attention = dynamic relevance PER INPUT ("bank" attends to "river" vs "account" depending on context).**
- **Q4: Why do LLMs hallucinate?**
  ✅ Hallucination = predicting plausible words, not looking up truth
- **Q5: GPT-4o has 128k context window. How many words is that roughly?**
  ✅ 128k tokens ≈ 96k words
- **Retry Q: What does temperature=0 actually do to the probability distribution?**
  ✅ "temperature=0 picks highest probability" — PASS

---

## L2: Tokenization & Embeddings

### Tokenization (BPE):
Common sequences → 1 token. Rare words → multiple tokens. Tokenization = the PROCESS, token = the RESULT.
```
"Hello" → 1 token     "unhappiness" → 2-3 tokens
```

### 5 Gotchas:
- One word ≠ one token
- Code is token-expensive (parens, colons, newlines)
- Non-English costs more (tokenizer trained on English data, less compression)
- Numbers split arbitrarily ("123456" → "123" + "456")
- Token count = your bill

### Embeddings:
Vector (list of numbers) representing MEANING. 768-1536 dimensions.
- Similar meaning → nearby vectors → measurable with cosine similarity
- Two types: token embeddings (inside model, you never see) vs text embeddings (YOU use for RAG)

### Cosine Similarity:
Measures the ANGLE between two vectors. 0 = unrelated, 1 = identical meaning.
- ⚠️ **Embeddings CREATE vectors. Cosine similarity MEASURES closeness. Different things.**
- ⚠️ **Why not exact equality? No two texts produce the SAME vector. Even "I love dogs" vs "I really love dogs" differ slightly. Need a SCORE (0-1), not yes/no.**

### Chunking (preview):
- ⚠️ **Chunking ≠ tokenization.** Tokenization = LLM splits text into subword pieces. Chunking = YOU split large documents into meaningful sections (~200-500 tokens) for RAG search.
- ⚠️ **500-page PDF as 1 vector = information loss.** One vector is a vague average of everything. Can't distinguish which PART answers "Q3 revenue?" Fix: chunk into 1000 pieces, embed each separately.

### Quiz: PASS (1/4) — but clarifications resolved gaps
- **Q1: Why does non-English text cost more tokens? (Not "different meanings" — think about the tokenizer.)**
  🔄 Said "different meanings" → ⚠️ **Real reason: tokenizer trained mostly on English. English words appear millions of times → merged into single tokens. Japanese chars are rare → need 2-3 byte-level tokens each. It's about FREQUENCY in training data, not meaning.**
- **Q2: You have 15 tools on your agent. Before the user says anything, how many tokens are already used?**
  ✅ 15 tools × 200 tokens = 3000 tokens burned before user speaks
- **Q3: What is cosine similarity and why do we need it instead of exact vector equality?**
  ❌ Described embeddings, not cosine similarity → correction above
- **Q4: Why is embedding a 500-page PDF as one vector a bad idea?**
  🔄 Said "too many tokens" → ⚠️ **Embedding models always produce fixed-size vector regardless of input. Real problem is information loss — one vector can't distinguish which PART is relevant.**
- Student asked 4 clarification questions: tokens vs tokenization, chunking, vectors, top-p → all answered

---

## L3: Temperature, Sampling & Inference

### The Sampling Pipeline (in order):
```
Model output (logits/probabilities)
    → Temperature (reshape distribution)
    → Top-K (keep only K candidates — fixed window)
    → Top-P / nucleus (keep until cumulative prob ≥ P — dynamic window)
    → Sample (pick one token)
```

### Temperature:
```
0   = deterministic, always highest prob. Same input → same output.
0.3 = mostly predictable, slight variation
0.7 = balanced (conversation default)
1.0 = original distribution
2.0 = chaotic, near-random
```

### Top-K vs Top-P:
- Top-K: fixed number of candidates (top 50 tokens, ignore rest)
- Top-P: dynamic — keeps tokens until cumulative probability hits P
- ⚠️ **Top-P is INDEPENDENT of Top-K — separate filters, NOT nested. Top-P adapts to model's confidence; Top-K always keeps exactly K.**

### Practical Settings:
```
Tool calling / code    → temp=0
Conversation / chatbot → temp=0.7
Creative writing       → temp=0.9-1.0
```

### Quiz: PASS (2/3)
- **Q1: You're building a classification agent (P0-P3). What temperature and why?**
  ✅ temp=0 for classification agent — deterministic, same input always gives same classification
- **Q2: Developer's chatbot gives different answers to the same question every time. What's wrong?**
  ✅ Temperature too high — reduce to 0 or near 0 for consistent outputs
- **Q3: What advantage does top-p have over top-k?**
  ❌ Said "top-p picks the highest from top-k" → ⚠️ **They're independent. Top-P advantage: ADAPTS to confidence. Model confident (95% on one token) → top-p keeps 1-2 tokens. Model uncertain → top-p keeps many. Top-K always keeps exactly K regardless.**

---

## L4: Context Windows & Token Limits

### Core Concept:
Context window = max tokens (input + output) per API call. HARD limit.
```
GPT-4o: 128k tokens (~96k words)
Claude: 200k tokens
Gemini: 1M tokens
```

### The Math:
input + output ≤ context window. 120k input → only 8k left for response.

### Agents Burn Context Fast:
Each loop iteration carries ALL previous messages. 5 tool calls = SystemMsg + HumanMsg + 5×(AIMsg + ToolMsg) = grows every turn.

### 5 Management Strategies:
1. Sliding window (keep last N messages)
2. Summarization (compress old messages)
3. RAG (retrieve only relevant docs)
4. Smart tool results (concise, not database dumps)
5. Model routing (large-context model only when needed)

### Lost in the Middle:
⚠️ **LLMs attend more to BEGINNING and END of context. Middle gets less attention. For RAG: put most relevant docs at start or end, not buried in middle.**

### Quiz: PASS (partial)
- **Q1: GPT-4o has 128k context. Your input is 120k tokens. How much is left for the response? What's the risk?**
  🔄 Partial — got numbers but imprecise
- **Q2: You're building a RAG agent. Where should you place the most relevant retrieved docs — beginning, middle, or end of context? Why?**
  ✅ Lost-in-middle — put relevant docs at start or end, not buried in middle
- **Q3: Name 3 strategies to manage context window growth in a multi-turn agent.**
  🔄 Partial — listed strategies but not detailed enough

---

## L5: Prompt Engineering

### Three Message Roles:
- **System** (SystemMessage): persona, rules, constraints. User never sees.
- **User** (HumanMessage): end user's input.
- **Assistant** (AIMessage): model's previous responses.

### Three Techniques:
```
Zero-shot:  Just instructions, no examples. "Classify as positive/negative."
Few-shot:   Input→output examples so model learns the pattern.
CoT:        "Think step by step" — forces model to show reasoning.
```

### Why CoT Works:
⚠️ **Autoregressive generation. Each generated token becomes input for the next. Model writes "Step 1: 17×20=340" → those tokens are now in context → acts as scratch paper/working memory. Without CoT, model must jump to answer in one step.**

### CoT vs Few-Shot:
⚠️ **Different tools for different problems. Few-shot = "here's WHAT I want" (shows format). CoT = "show me HOW you got there" (reasoning). Can combine: few-shot CoT = example of step-by-step reasoning.**

### Tradeoffs:
```
Zero-shot → low tokens, OK accuracy
Few-shot  → medium tokens, good accuracy
CoT       → high tokens, best accuracy (costs more)
```

### Quiz: PASS (2/3)
- **Q1: When would you use zero-shot vs few-shot prompting?**
  ✅ Zero-shot vs few-shot distinction clear
- **Q2: WHY does Chain-of-Thought improve accuracy? (Not "it thinks harder" — connect it to how the model generates.)**
  🔄 Said "show their work" (right instinct) but missed autoregressive connection → correction above
- **Q3: Write a system prompt that classifies ServiceNow tickets into P0-P3 with category.**
  ❌→✅ First: didn't write prompt, just said "I'd use few-shot." Retry: wrote actual prompt with 4 fields, constrained options, JSON output. ⚠️ **Bugs in prompt: said "three keys" but had four fields (copy-paste error). No severity criteria (P0 vs P3 undefined → model guesses randomly). Criteria make prompts reliable.**

---

## L6: Structured Outputs & Tool Calling

### Tool Calling Flow (6 steps):
```
Step 1: YOU define tools with JSON schemas
Step 2: User asks a question
Step 3: LLM outputs a tool call REQUEST (just JSON text!)
Step 4: YOUR CODE executes the actual function
Step 5: You send the result back to LLM as ToolMessage
Step 6: LLM generates human-readable response
```

### LLM Called TWICE:
- Call 1: decides WHICH tool + arguments → outputs request
- Call 2: reads tool result → generates human response

### 🚨 THE LLM NEVER EXECUTES ANYTHING:
⚠️ **CRITICAL misconception — took 3 retries to correct.**
- LLM = doctor writing a prescription. Your code = pharmacist who fills it.
- LLM = frontend sending API request. Your code = backend that executes it.
- The LLM has NO network access, NO filesystem, NO runtime. It can ONLY output text.

### Tool Calling vs "Return JSON":
- "Return JSON" = no schema enforcement. Model picks whatever keys. Fragile.
- Tool calling = schema-enforced. Model CONSTRAINED to output exact keys/types. Production-safe.

### Quiz: FAIL (0/3 → retried 3 times)
- **Q1: In the tool calling flow, who executes the tool — the LLM or your code? Walk through all 6 steps.**
  ❌❌❌ Said "LLM calls/executes the tool" THREE TIMES. → ⚠️ **LLM's job = DECIDE which tool and OUTPUT the request as JSON. Your code's job = EXECUTE the function and send result back. The separation is a security feature — you control what actually runs.**
- **Q2: How many times is the LLM called during one tool-calling interaction? What happens in each call?**
  🔄 Got "2 calls" right but wrong description (follows from Q1 error)
- **Q3: What's the difference between asking the LLM to "return JSON" vs using tool calling?**
  ❌ Didn't answer the actual question (schema enforcement)
- Eventually corrected on Module 1 Exam ✅

---

## L7: Reasoning Models & Their Tradeoffs

### Standard vs Reasoning Models:
```
Standard (GPT-4o, Claude Sonnet, Gemini Flash):
  One forward pass. Fast (1-3s), cheap.
  Great for: chatbot, classification, tool calling, summarization.

Reasoning (o1, o3, Claude extended thinking):
  Built-in CoT (internal reasoning). Slow (10-60s), 3-10x cost.
  Great for: complex math, planning, tricky logic, architecture.
  Many DON'T support tool calling.
```

### Hybrid Pattern (production):
Standard model = agent backbone (fast, tools) → calls reasoning model for specific hard sub-tasks via a tool.

### Don't Use Reasoning for Lookup:
⚠️ **"Look up customer order" = standard model + search tool, NOT reasoning model. Reasoning is for THINKING, not SEARCHING.**

### Quiz: PASS (2/2)
- **Q1: You're building a ServiceNow agent. Which tasks get standard models, which get reasoning models?**
  ✅ Standard for routine (lookup, classification), reasoning for complex billing disputes
- **Q2: Why NOT just use reasoning models for everything?**
  ✅ Slow (10-60s), expensive (3-10x), overkill for simple tasks, many don't support tool calling

---

## MODULE 1 EXAM: 72% PASS (retry) — threshold 70%

### Initial: 63% FAIL

**A1: What does a language model output at each step? (6/10)**
⚠️ My answer: ❌ Implied it outputs a single token directly.
✅ Correct: Outputs a **probability distribution** over all tokens in the vocabulary. Then sampling (temperature, top-p, top-k) picks one token from that distribution.

**A2: Walk through the 5-step process from prompt to output. (5/10)**
🔄 My answer: Right flow but too vague — needed one precise sentence per step.
✅ Correct: Tokenize → Embed → Attention (all-to-all context) → Predict next token distribution → Sample/decode → Repeat until stop token.

**A3: Why does RAG reduce hallucination? (7/10)**
⚠️ My answer: ❌ Said "RAG gives attention" — RAG doesn't give attention, the LLM does.
✅ Correct: RAG retrieves real documents and injects them into the prompt. The LLM attends to that grounded context, making it less likely to fabricate.

**B1: Set temperature for: customer support, creative writing, classification. (13/15)**
My answer: ✅ All 3 temperatures correct.

**B2: Write a system prompt for a ServiceNow support agent. (0/15)**
⚠️ My answer: ❌ **SKIPPED — refused to write it. Second time skipping prompt writing.**

**C1: GPT-4o has 128k context. Input is 120k tokens. What's the risk? (8/10)**
My answer: ✅ Context window diagnosis correct — only 8k left for response, risk of cut-off.

**C2: Chatbot gives different answers to same question. Diagnose and fix. (7/10)**
🔄 My answer: Right fix (temp=0) but wrong explanation of why.

**D1: Classify each task — standard model or reasoning model: classification, lookup, paging, resolution. (17/25)**
My answer: Classification ✅, Paging ✅, Resolution ✅.
⚠️ Lookup: ❌ Said reasoning model — WRONG. Lookup = standard model + search tool, NOT reasoning.

### Retry: 72% PASS
- R1 ✅ "Output is a probability distribution, not a single token"
- R2 ❌ Skipped system prompt AGAIN (3rd time total)
- R3 ✅ "Lookup = standard model + search tool"

### Key Weak Areas from Module 1:
- ⚠️ **Tool calling execution**: kept saying LLM "executes" tools (corrected 3x, finally got it on exam)
- ⚠️ **Prompt writing**: skipped writing system prompts 3 times. Cannot build agents without this skill.
- ⚠️ **Top-P vs Top-K**: thought top-p picks from top-k (they're independent filters)
- ⚠️ **Cosine vs embeddings**: mixed up what creates vs what measures
- ✅ **Cleared**: temperature settings, lost-in-middle, autoregressive generation, standard vs reasoning models
