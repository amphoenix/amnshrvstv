# Module 1 — LLM Foundations

## L1: What is a Language Model?

### Key Concepts:

**1. Language model = function that predicts the next token given a sequence.**
You give it tokens, it returns a **probability distribution** over the entire vocabulary (~100,000 tokens). NOT a single word — a distribution showing the probability of EVERY possible next token.

**2. Transformer architecture — 3 stages:**
- **Tokenization**: text → token IDs (integers). "Hello world" → [15496, 995]
- **Embeddings**: token IDs → vectors (lists of numbers encoding meaning). Each token becomes a point in high-dimensional space.
- **Attention**: each token looks at every other token, computes relevance scores. "The cat sat on the ___" → "cat" and "sat" get high attention when predicting the blank.

**3. Attention breakthrough:**
Before attention, models processed left-to-right and forgot early context. Attention lets every token attend to every other token dynamically — this is why transformers can handle long text.

**4. Autoregressive generation:**
Model predicts ONE token → feeds it back to itself → predicts next token → repeat until STOP token. Each token is a separate prediction step. This is why:
- **Streaming works**: each token can be delivered as soon as it's generated
- **CoT works**: model's own generated tokens become part of its input
- **Models can't "go back"**: once a token is generated, it's committed

**5. Hallucination:**
Model predicts plausible-sounding words, it does NOT look up truth. "Paris is the capital of ___" → "France" gets high probability because it's seen this pattern, not because it's "looking up" a fact.

**6. What you control as an engineer:**
Prompt, model choice, temperature, tools, memory, guardrails. The model handles next-token prediction and attention.

### Quiz Q&A:
**Q1: What does a language model actually do in one sentence?**
A: Predicts the next token given a sequence by outputting a probability distribution over the entire vocabulary.

**Q2: What is the output of a language model — a single word or something else?**
A: A probability distribution over ~100k tokens. NOT a single word. Temperature/sampling then selects from this distribution.

**Q3: Why do LLMs hallucinate?**
A: They predict statistically plausible next words, they don't look up facts. If a false statement is plausible, it gets high probability.

**Q4: How many tokens in 128k context window ≈ how many words?**
A: ~96k words (roughly 1 token ≈ 0.75 words).

**Q5: If temperature=0, what happens?**
A: Always picks the highest-probability token → deterministic output. Same input = same output every time.

---

## L2: Tokenization & Embeddings

### Key Concepts:

**1. Tokenization (BPE — Byte Pair Encoding):**
Common sequences → 1 token. Rare words → multiple tokens.
```
"Hello" → 1 token
"AI" → 1 token
"Pneumonoultramicroscopicsilicovolcanoconiosis" → many tokens
```

**2. Five tokenization gotchas:**
- One word ≠ one token (some words are multiple tokens)
- Code is token-expensive (special chars, indentation each cost tokens)
- Non-English costs more tokens per word
- Numbers are split arbitrarily ("123456" might be "123" + "456")
- Token count = your bill (you pay per token, not per word)

**3. Embeddings:**
Vector (list of numbers) representing MEANING. 768 or 1536 dimensions typically.
- Similar meaning → nearby vectors in space
- "king" and "queen" are close; "king" and "bicycle" are far
- This is how the model "understands" meaning — through geometric proximity

**4. Two types of embeddings:**
- **Token embeddings** (inside the model): internal representation during generation. You never see these.
- **Text embeddings** (you use for RAG): `embed("your text")` → vector you store and search. You use these directly.

**5. Cosine similarity:**
Measures the angle between two vectors. Scale: 0 = unrelated, 1 = identical meaning.
- Cosine MEASURES similarity. Embeddings CREATE the vectors. Different things.
- Used in RAG to find which stored documents are closest to a query.

**6. RAG preview:**
Embed documents → store vectors in vector DB → embed user query → find nearest vectors (cosine similarity) → feed those documents to LLM as context.

### Quiz Q&A:
**Q1: "king" and "queen" embeddings — what's the cosine similarity, high or low?**
A: High (~0.8+). They share semantic meaning (royalty, ruler).

**Q2: What's the difference between cosine similarity and embeddings?**
A: Embeddings CREATE vector representations of meaning. Cosine similarity MEASURES how close two vectors are. One creates, the other measures.

**Q3: Why does non-English text cost more?**
A: Tokenizers are trained mostly on English data. English words map to fewer tokens. Other languages need more tokens to represent the same content.

---

## L3: Temperature, Sampling & Inference

### Key Concepts:

**1. The sampling pipeline (in order):**
```
Model output (logits/probabilities)
    → Temperature (reshape distribution)
    → Top-K (keep only K candidates)
    → Top-P (keep until cumulative prob P)
    → Sample (pick one token)
```

**2. Temperature:**
- `0` = deterministic. Always picks highest probability. Same input → same output.
- `0.3` = mostly predictable, slight variation
- `0.7` = balanced (good for conversation)
- `1.0` = original distribution (model's natural randomness)
- `2.0` = chaotic, near-random

**3. Top-K:**
Keep only the K most probable tokens, zero out everything else. Fixed window.
- Top-K=50 → only consider top 50 tokens, ignore the other 99,950

**4. Top-P (nucleus sampling):**
Keep tokens until cumulative probability reaches P. **Dynamic window** — adapts to confidence.
- If model is 95% confident about one token, top-p=0.9 might keep only 1-2 tokens
- If model is uncertain, top-p=0.9 might keep 100 tokens
- Top-P is INDEPENDENT of Top-K — they're separate filters, not nested

**5. Practical settings:**
```
Tool calling / code    → temp=0 (deterministic, no creativity needed)
Conversation / chatbot → temp=0.7 (balanced)
Creative writing       → temp=0.9-1.0 (more variety)
```

### Quiz Q&A:
**Q1: What temperature for a customer support bot that calls tools?**
A: 0. Tool calls need deterministic, consistent behavior.

**Q2: Does top-p pick from top-k's results?**
A: No. They're independent filters applied in sequence. Top-P adapts dynamically based on the probability distribution; Top-K is a fixed window. They don't depend on each other.

**Q3: What temperature for creative story writing?**
A: 0.9-1.0. You want variety and creativity, not deterministic outputs.

---

## L4: Context Windows & Token Limits

### Key Concepts:

**1. Context window = max tokens (input + output) per single API call. HARD limit.**
```
GPT-4o:   128,000 tokens (~96k words)
Claude:   200,000 tokens
Gemini:   1,000,000 tokens
```

**2. The math: input + output ≤ context window**
If window is 128k and your input is 120k tokens, you only have 8k tokens left for the response.

**3. Agents burn context FAST:**
Each agent loop iteration carries ALL previous messages. After 5 tool calls:
SystemMsg + HumanMsg + AIMsg(tool1) + ToolMsg(result1) + AIMsg(tool2) + ToolMsg(result2) + ... = context grows every turn.

**4. Five management strategies:**
1. **Sliding window**: keep only last N messages, drop oldest
2. **Summarization**: periodically summarize old messages into a shorter version
3. **RAG**: don't put everything in context — retrieve only relevant docs
4. **Smart tool results**: return concise results, not entire database dumps
5. **Model routing**: use large-context model only when needed, small model for simple queries

**5. "Lost in the middle":**
LLMs attend more to the BEGINNING and END of context. Information in the MIDDLE gets less attention. This matters for RAG — put the most relevant documents at the start or end, not buried in the middle.

**6. Bigger ≠ better:**
More tokens = higher cost, slower inference, more lost-in-middle issues. Don't stuff context just because you can.

### Quiz Q&A:
**Q1: Agent uses 100k of 128k context. How much is left for response?**
A: 28,000 tokens.

**Q2: Where should you put the most important RAG documents in the context?**
A: Beginning or end. Middle gets less attention (lost-in-middle effect).

**Q3: Name 3 strategies to manage context limits.**
A: Sliding window, summarization, RAG retrieval (also: smart tool results, model routing).

---

## L5: Prompt Engineering

### Key Concepts:

**1. Three message roles:**
- **System** (SystemMessage): developer sets persona, rules, constraints. User never sees this.
- **User** (HumanMessage): the end user's input.
- **Assistant** (AIMessage): model's previous responses (for multi-turn context).

**2. Zero-shot prompting:**
Just instructions, no examples. "Classify this text as positive or negative."

**3. Few-shot prompting:**
Provide input→output examples so the model learns the pattern:
```
Input: "Great product!" → Output: "positive"
Input: "Terrible service" → Output: "negative"
Input: "It was okay" → Output: ???
```

**4. Chain-of-thought (CoT):**
"Think step by step" — forces model to show reasoning before answering.
- **WHY it works**: autoregressive generation. Each generated token becomes input for the next token. When the model writes "Step 1: ..." those tokens are now in its context, acting as scratch paper/working memory.
- CoT = giving the model scratch paper to think on.

**5. Tradeoffs:**
```
Zero-shot → low tokens, OK accuracy
Few-shot  → medium tokens, good accuracy
CoT       → high tokens, best accuracy (but costs more)
```

### Quiz Q&A:
**Q1: What's the difference between zero-shot and few-shot?**
A: Zero-shot = just instructions, no examples. Few-shot = provide input→output examples for the model to learn the pattern.

**Q2: WHY does chain-of-thought improve accuracy? What's the mechanism?**
A: Autoregressive generation — the model's own generated reasoning tokens become part of its input for predicting the next token. It's like giving the model scratch paper. Without CoT, it must jump to the answer in one step.

**Q3: Write a system prompt for a ticket classifier with 4 severity levels.**
A: Should include: role/persona, the 4 levels with criteria for each, output format, and rules (e.g., "when in doubt, classify higher").

---

## L6: Structured Outputs & Tool Calling

### Key Concepts:

**1. Tool calling flow (6 steps):**
```
Step 1: You define tools with JSON schemas (name, description, parameters)
Step 2: User asks a question ("What's the weather in Tokyo?")
Step 3: LLM outputs a structured tool call REQUEST: {"name": "get_weather", "args": {"city": "Tokyo"}}
Step 4: YOUR CODE executes the function: get_weather("Tokyo") → "72°F, sunny"
Step 5: You send the result back to LLM as a ToolMessage
Step 6: LLM generates a human-readable response: "It's 72°F and sunny in Tokyo!"
```

**2. LLM is called TWICE:**
- Call 1: LLM sees the question → decides which tool to call → outputs tool request
- Call 2: LLM sees the tool result → generates human-friendly response

**3. 🚨 THE LLM NEVER EXECUTES ANYTHING:**
The LLM only OUTPUTS TEXT — specifically, a JSON structure requesting a tool call. YOUR code reads that JSON and executes the actual function.

**Analogies:**
- LLM = doctor writing a prescription. Your code = pharmacist who fills it.
- LLM = frontend sending an API request. Your code = backend that executes it.
- LLM = customer ordering food. Your code = kitchen that cooks it.

**4. Structured output (JSON mode):**
Force the model to return data in a specific JSON schema. Used for classification, extraction, parsing — when you need data, not prose.

### Quiz Q&A:
**Q1: Who executes the tool — the LLM or your code?**
A: YOUR CODE. The LLM only outputs a request (name + arguments). Your code reads the request and calls the actual function.

**Q2: How many times is the LLM called in a single tool-use interaction?**
A: Twice. First to decide which tool + arguments. Second to read the tool result and generate a human response.

**Q3: The LLM called the wrong tool. What's most likely broken?**
A: The tool's description/schema. The LLM reads tool descriptions to decide which one to use — if the description is ambiguous or wrong, it picks the wrong tool.

---

## L7: Reasoning Models & Their Tradeoffs

### Key Concepts:

**1. Standard models (GPT-4o, Claude Sonnet, Gemini Flash):**
- One forward pass through the network
- Fast (seconds), cheap
- Great for: chatbot, classification, tool calling, summarization

**2. Reasoning models (o1, o3, Claude with extended thinking):**
- Built-in chain-of-thought (internal reasoning before answering)
- Slow (10-60+ seconds), 3-10x cost
- Great for: complex math, multi-step planning, tricky logic, architecture design
- Many DON'T support tool calling

**3. Decision framework:**
```
Routine task (chatbot, classify, search) → Standard model
Complex reasoning (math, planning, logic) → Reasoning model
```

**4. Hybrid pattern (production):**
Standard model as the agent backbone (fast, supports tools) → calls a reasoning model for specific hard sub-tasks via a tool. Best of both worlds.

**5. Don't use reasoning for lookup:**
"Look up customer order" = standard model + search tool, NOT a reasoning model. Reasoning is for THINKING, not for searching.

### Quiz Q&A:
**Q1: Customer support chatbot that sometimes handles billing disputes. Standard or reasoning?**
A: Standard for routine support. For complex billing disputes, use hybrid pattern: standard agent calls reasoning model as a sub-task.

**Q2: Why not use reasoning models for everything?**
A: Slow (10-60s response), 3-10x more expensive, overkill for simple tasks, many don't support tool calling.

---

## MODULE 1 EXAM: 72% PASS (threshold 70%)

### What went wrong:
- Skipped system prompt writing (multiple times)
- Said LLM output is single token (it's probability distribution)
- Said "reasoning model" for lookup (should be standard + search tool)

### What went right:
- Temperature settings correct (0, 0.3, 0.8)
- Lost-in-middle correct
- Tool calling flow (LLM decides, code executes) ← finally locked in

### Retry questions that got me to pass:
- R1: Output is a probability distribution, not a single token ✅
- R3: Lookup = standard model + search tool, not reasoning ✅
