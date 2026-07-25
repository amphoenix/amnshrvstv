# LLM Foundations — Master Document
## How Transformers actually work, layer by layer, and WHY every piece exists

*"Everything in modern AI systems — from RAG and agents to memory and evaluation — starts with understanding how LLMs work."*

This is the depth under your foundations chapter — for when the interviewer says "okay, but WHY does dividing by √dₖ prevent softmax saturation?" or "walk me through the KV cache memory calculation for a 70B model."

**Format**: every section has **MECHANISM** (what actually happens), **WHY** (the design reason), and **INTERVIEW LINE** (say it verbatim). Math is included where it builds understanding, not for show. Learn the WHYs hardest.

**Honesty rule**: if you haven't trained a model or implemented an optimizer, bright line: "the mechanism works like X; I've used/tuned/debugged this at the application layer." Reasoning + honesty beats recall.

---

## PART 1 — THE MENTAL MODEL

### 1.1 What an LLM Actually Is — One Sentence

An LLM is a function that takes a sequence of token IDs and outputs a probability distribution over the vocabulary for the next token. That's it. Everything else — chat, reasoning, code generation, tool use — is emergent behavior from next-token prediction at scale.

```
f(x₁, x₂, ..., xₙ) → P(xₙ₊₁ | x₁, ..., xₙ)  for every token in vocabulary V
```

**WHY this framing matters**: when someone says "the model understands X" or "the model reasons about Y," what's actually happening is that the probability distribution over next tokens, conditioned on the context, happens to assign high probability to tokens that look like understanding or reasoning. There is no separate "reasoning module" — it's all next-token prediction shaped by training data and RLHF.

**INTERVIEW LINE**: "An LLM is a conditional probability distribution over tokens. Everything we call 'intelligence' is a consequence of what that distribution learned to predict during training."

### 1.2 The AI → ML → DL → Transformer → LLM Stack

This hierarchy matters because each layer constrains what the layers above can do:

```
AI ─── the goal: systems that perform tasks requiring human intelligence
 └─ ML ─── the method: learn patterns from data instead of hardcoding rules
     └─ DL ─── the architecture: multi-layer neural networks that learn features
         └─ Transformers ─── the mechanism: self-attention for parallel sequence processing
             └─ LLMs ─── the scale: billions of parameters + massive data + next-token objective
```

**The key transition to explain in interviews**: RNNs/LSTMs processed tokens sequentially — token 100 had to wait for tokens 1-99. This meant (a) no parallelism during training (slow, expensive), and (b) information from token 1 was attenuated by the time it reached token 100 (vanishing gradients, even with LSTM gates). Transformers replaced recurrence with self-attention: every token attends to every other token in one parallel operation. Training went from O(n) sequential steps to O(1) parallel — GPUs could finally be fully utilized. This single architectural change is why we went from "language models are a niche research topic" to "GPT-4 exists."

**DEPTH: Why Self-Supervised Learning Is the Key Unlock**

The training objective matters as much as the architecture. LLMs use self-supervised learning: the label is the next token in the sequence, which comes free from the data itself. No human labeling needed.

```
Training example from raw text:
  Input:  "The capital of France is"
  Label:  "Paris"
  
  Input:  "The capital of France is Paris, known for"
  Label:  "the"
```

**WHY this scales**: supervised learning requires human-labeled data (expensive, bottlenecked). Self-supervised learning generates labels from the data itself — every token boundary in every document is a training example. A 2T-token training corpus gives you ~2 trillion training examples for free. This is the data flywheel that makes LLMs possible.

---

## PART 2 — TOKENIZATION (THE FIRST REAL ENGINEERING DECISION)

### 2.1 Why Tokenization Exists

Neural networks process fixed-size numerical vectors, not variable-length strings. Tokenization bridges the gap: text → discrete integer IDs → embeddings (vectors).

**The design choice**: what should a "token" be?

| Granularity | Example: "unhappiness" | Vocab Size | Sequence Length | Trade-off |
|---|---|---|---|---|
| Character-level | u, n, h, a, p, p, i, n, e, s, s | ~256 | Very long | Sequences too long for attention |
| Word-level | unhappiness | ~500K+ | Short | Vocabulary too large; can't handle new words |
| **Subword** | un, happiness | ~32K-128K | Balanced | **The production sweet spot** |

### 2.2 BPE (Byte Pair Encoding) — The Algorithm That Powers Most LLMs

**MECHANISM — the training phase** (run once on the training corpus):

```
1. Start with a vocabulary of individual bytes (256 entries)
2. Count every adjacent pair of tokens in the corpus
3. Find the most frequent pair
4. Merge that pair into a new token, add to vocabulary
5. Re-encode the corpus with the new token
6. Repeat steps 2-5 until vocabulary reaches target size (e.g., 32K, 50K, 128K)

Example on "low lower lowest":
  Start:  l o w _ l o w e r _ l o w e s t
  Most frequent pair: (l, o) → merge into "lo"
  Result: lo w _ lo w e r _ lo w e s t
  Next:   (lo, w) → merge into "low"
  Result: low _ low e r _ low e s t
  Next:   (e, r) → merge into "er"
  ...continue until vocab_size reached
```

**MECHANISM — the encoding phase** (run on every input at inference):

```
1. Start with the input as bytes
2. Iteratively apply learned merges in priority order (most frequent first)
3. Result: sequence of token IDs from the vocabulary

"ChatGPT is amazing!" → ["Chat", "G", "PT", " is", " amazing", "!"]
                       → [1204, 531, 918, 27, 4102, 6]
```

**WHY BPE specifically**: it naturally handles the frequency distribution of language. Common words ("the", "is") become single tokens. Rare words are decomposed into common subwords. Novel words (new product names, code identifiers) are always encodable as byte sequences — no `<UNK>` token needed. This is why BPE-based tokenizers have effectively zero out-of-vocabulary rate.

**DEPTH: The Vocabulary Size Trade-off — With Real Numbers**

```
Vocabulary size V directly determines:

1. Embedding matrix size: V × d_model × bytes_per_param
   - V = 32K,  d = 4096, FP16: 32K × 4096 × 2 = 256 MB
   - V = 128K, d = 4096, FP16: 128K × 4096 × 2 = 1 GB
   - V = 256K, d = 4096, FP16: 256K × 4096 × 2 = 2 GB
   
   The embedding matrix appears TWICE: input embeddings + output projection (lm_head).
   Many models tie these weights (same matrix), but if untied: double the cost.

2. Sequence length for fixed text:
   - Larger vocab → fewer tokens per text → shorter sequences → less attention cost
   - GPT-2 (50K vocab): "unhappiness" = ["un", "happiness"] = 2 tokens
   - Character-level (256 vocab): "unhappiness" = 11 tokens
   - Attention is O(n²) — halving n reduces attention cost by 4×

3. Output softmax cost: computing P(next_token) over V candidates every step
   - V = 32K:  softmax over 32K — fast
   - V = 256K: softmax over 256K — ~8× more compute per token generation
```

**Production reality**: GPT-4 uses ~100K tokens (cl100k_base). Llama 3 uses 128K. The trend is toward larger vocabularies because the attention cost savings outweigh the embedding/softmax costs, especially for multilingual models (more languages need more subwords).

**Special Tokens — Why They Exist**:
```
<BOS> / <s>     — Beginning of sequence. Tells the model "this is the start."
<EOS> / </s>    — End of sequence. Model generates this when it's "done."
<PAD>           — Fills sequences to uniform length in batches. Masked out in attention.
<|im_start|>    — Chat template markers (ChatML format). Delimits roles (system/user/assistant).
```

**SDE3 Interview Follow-up**: "A user reports that a query in Hindi produces worse results than the same query in English. Why?"

Tokenization bias. BPE vocabularies are trained on corpora dominated by English text. A Hindi word that would be one token in a Hindi-optimized tokenizer might become 3-5 tokens in an English-dominant tokenizer. Consequences: (1) the Hindi query consumes more of the context window, (2) the model has fewer training examples per Hindi token (less-learned representations), (3) the sequence is longer so attention cost is higher. This is a known equity problem in multilingual LLMs.

**INTERVIEW LINE**: "Tokenization is the first engineering decision that shapes everything downstream — vocabulary size controls embedding memory, sequence length, and generation speed. BPE's strength is that it adapts to corpus frequency distribution, but that's also its bias: undertrained languages get fragmented into more tokens."

---

## PART 3 — EMBEDDINGS (TOKENS → GEOMETRY)

### 3.1 The Embedding Matrix — What It Actually Is

```
Embedding matrix E ∈ ℝ^(V × d_model)

V = vocabulary size (e.g., 128,000)
d_model = embedding dimension (e.g., 4096)

Lookup: token_id 1204 → E[1204] → vector of 4096 floats
```

This is a lookup table, not a computation. Token ID 1204 selects row 1204 from the matrix. The matrix is learned during training — backpropagation adjusts these vectors so that semantically related tokens end up near each other.

**WHY learned, not designed**: you can't manually assign 4096-dimensional vectors to 128K tokens such that semantic relationships are captured. The training objective (predict the next token) implicitly forces tokens that appear in similar contexts to have similar embeddings — because similar embeddings produce similar predictions, and similar-context tokens should produce similar predictions.

**The Geometry of Meaning**:

```
The classic: King - Man + Woman ≈ Queen

What's happening: the vector offset (King - Man) captures the concept "royalty"
independent of gender. Adding that offset to Woman lands near Queen.

This works because the embedding space has learned linear directions for
semantic properties: gender, tense, plurality, formality, etc.
```

**DEPTH: Embedding Dimension — The Capacity/Cost Trade-off**

```
d_model controls the information capacity of each token's representation.

Too small (d=64):   tokens can't encode enough distinctions — "bank" (financial)
                    and "bank" (river) get similar vectors
Too large (d=16384): diminishing returns + massive memory + slower computation

The scaling relationship (empirical, from scaling laws):
  d_model ≈ 128 × (num_parameters / 1B)^(1/2)  — very rough
  
  7B model:   d = 4096   (Llama 2 7B, Mistral 7B)
  13B model:  d = 5120   (Llama 2 13B)
  70B model:  d = 8192   (Llama 2 70B, Llama 3 70B)
  405B model: d = 16384  (Llama 3.1 405B)

Memory for embedding matrix (FP16):
  128K vocab × 4096 dim × 2 bytes = 1 GB
  128K vocab × 8192 dim × 2 bytes = 2 GB
  128K vocab × 16384 dim × 2 bytes = 4 GB
```

---

## PART 4 — THE TRANSFORMER (THE FULL ARCHITECTURE WITH MATH)

### 4.1 The Decoder Block — What Actually Happens Per Layer

A modern decoder-only transformer (GPT, Claude, Llama) stacks N identical blocks:

```
For each of N layers (e.g., N=32 for 7B, N=80 for 70B):

  Input: x ∈ ℝ^(seq_len × d_model)
  
  1. x_norm = RMSNorm(x)                    ← Pre-normalization
  2. attn_out = CausalSelfAttention(x_norm)  ← Multi-head attention with causal mask
  3. x = x + attn_out                        ← Residual connection
  4. x_norm = RMSNorm(x)                    ← Pre-normalization
  5. ffn_out = FFN(x_norm)                   ← Feed-forward network
  6. x = x + ffn_out                         ← Residual connection
  
Output: x ∈ ℝ^(seq_len × d_model)
```

After all N layers:
```
  7. x_norm = RMSNorm(x)                    ← Final normalization
  8. logits = x_norm @ W_output              ← Project to vocabulary size (d_model → V)
  9. probs = softmax(logits)                 ← Probability distribution over next token
```

**Every component exists for a specific reason. Let's go deep on each.**

---

### 4.2 Self-Attention — The Full Derivation and WHY Every Step Exists

**MECHANISM — step by step with dimensions:**

Given input X ∈ ℝ^(n × d_model) where n = sequence length:

```
Step 1: Project into Q, K, V spaces
  Q = X × W_Q    where W_Q ∈ ℝ^(d_model × d_k)
  K = X × W_K    where W_K ∈ ℝ^(d_model × d_k)
  V = X × W_V    where W_V ∈ ℝ^(d_model × d_v)
  
  Typically d_k = d_v = d_model / num_heads
  
  For Llama 2 7B: d_model=4096, num_heads=32, d_k=128

Step 2: Compute attention scores
  scores = Q × Kᵀ                  → ℝ^(n × n)
  
  Each entry scores[i][j] = qᵢ · kⱼ = how much token i should attend to token j

Step 3: Scale
  scores = scores / √d_k
  
Step 4: Apply causal mask
  scores[i][j] = -∞  for all j > i  (can't attend to future tokens)

Step 5: Softmax (row-wise)
  weights = softmax(scores)         → ℝ^(n × n), each row sums to 1
  
Step 6: Weighted sum of values
  output = weights × V              → ℝ^(n × d_v)
```

**Full formula**:
```
Attention(Q, K, V) = softmax(QKᵀ / √d_k + M) × V

where M is the causal mask: M[i][j] = 0 if j ≤ i, -∞ if j > i
```

### 4.3 WHY √d_k — The Softmax Saturation Problem (Guaranteed Interview Question)

This is not optional knowledge. You will be asked this.

**The problem without scaling**:

```
Q and K entries are initialized/normalized to roughly mean=0, variance=1.
The dot product qᵢ · kⱼ = Σ(q_m × k_m) for m=1..d_k

By the CLT, this sum has:
  E[qᵢ · kⱼ] = 0
  Var[qᵢ · kⱼ] = d_k    (each term has variance ~1, and they're ~independent)
  Std[qᵢ · kⱼ] = √d_k

For d_k = 128: std ≈ 11.3
So dot products range roughly in [-30, +30]
```

**What happens when softmax sees large values**:

```
softmax([30, 0, 0, 0, ...]) ≈ [1.0, 0.0, 0.0, 0.0, ...]

The largest value dominates completely — softmax saturates into a one-hot vector.
```

**WHY saturation kills training**:

```
Softmax gradient: ∂softmax(z)ᵢ/∂zⱼ = softmax(z)ᵢ × (δᵢⱼ - softmax(z)ⱼ)

When softmax ≈ [1, 0, 0, 0]:
  All gradients ≈ 0 because softmax(z)ᵢ × (1 - softmax(z)ⱼ) ≈ 0 for most i,j
  
  The network can't learn to redistribute attention — it's stuck.
  This is the vanishing gradient problem, but inside attention.
```

**The fix — divide by √d_k**:

```
scores / √d_k → variance of each dot product becomes d_k / d_k = 1

Now dot products range roughly in [-3, +3]
softmax([-3, 1, 2, -1]) → [0.01, 0.07, 0.87, 0.05]

Gradients are healthy — the model can learn to adjust attention weights.
```

**INTERVIEW LINE**: "We divide by √dₖ because the dot product's variance scales linearly with d_k. Without scaling, dot products for d_k=128 have standard deviation ~11, pushing softmax into saturation where gradients vanish. Dividing by √dₖ normalizes variance to 1, keeping softmax in its gradient-friendly regime."

**SDE3 Interview Follow-up**: "What happens to attention at very long sequence lengths even with scaling?"

The attention matrix has n² entries. Even with √dₖ scaling, at n=100K tokens, some dot products will be large by chance (birthday paradox on scores). More importantly, softmax is computed per-row over n values — at large n, the distribution spreads thinner and the model may struggle to "focus." This is part of why models trained on short contexts struggle with long contexts — the attention patterns learned at short n don't transfer. Solutions: RoPE (relative position encoding degrades gracefully), attention sinks (first/last token as anchors), and training with mixed-length sequences.

---

### 4.4 Multi-Head Attention — Why Multiple Heads, and the Projection Math

**MECHANISM**:

```
Instead of one attention with d_model dimensional Q, K, V:
  Split into h heads, each with d_k = d_model / h dimensions

For h=32, d_model=4096: each head operates in d_k=128 dimensions

Each head has its own learned projections:
  Q_i = X × W_Qi    where W_Qi ∈ ℝ^(d_model × d_k)
  K_i = X × W_Ki    where W_Ki ∈ ℝ^(d_model × d_k)
  V_i = X × W_Vi    where W_Vi ∈ ℝ^(d_model × d_v)

Each head computes attention independently:
  head_i = Attention(Q_i, K_i, V_i)   → ℝ^(n × d_v)

Concatenate all heads and project:
  MultiHead = Concat(head_1, ..., head_h) × W_O
  where W_O ∈ ℝ^(h·d_v × d_model)
```

**WHY multiple heads**: each head learns to attend to different types of relationships:

```
Empirically observed head specializations (from visualization studies):
  Head 3:  attends to the previous token (local syntax)
  Head 7:  attends to the subject of the sentence (coreference)
  Head 15: attends to tokens with similar semantic role (semantic matching)
  Head 22: attends to the beginning of the sequence (global context)
```

A single head would need to compress all these relationship types into one attention pattern per token. Multiple heads let the model maintain parallel "channels" of attention — each head captures one relationship type, and the output projection W_O mixes them.

**DEPTH: Grouped-Query Attention (GQA) — The Modern Optimization**

```
Standard MHA: h query heads, h key heads, h value heads
  - KV cache scales with h (expensive at inference — see §6.2)

GQA: h query heads share g groups of KV heads (g < h)
  - Llama 2 70B: 64 query heads, 8 KV heads (8:1 ratio)
  - Llama 3 8B:  32 query heads, 8 KV heads (4:1 ratio)

Memory savings: KV cache shrinks by factor h/g
  Llama 2 70B: 8× smaller KV cache vs MHA (same quality)

Extreme: Multi-Query Attention (MQA) — all query heads share 1 KV head
  - Fastest inference, but quality degrades for complex tasks
  - GQA is the Pareto-optimal middle ground
```

**INTERVIEW LINE**: "GQA is the production standard because it directly reduces the KV cache — which is the inference memory bottleneck — by sharing KV heads across query head groups, with negligible quality loss. Llama 2 70B uses 8 KV heads for 64 query heads, shrinking the KV cache 8×."

---

### 4.5 The Feed-Forward Network — The Memory of the Transformer

**MECHANISM**:

```
FFN(x) = W₂ · activation(W₁ · x + b₁) + b₂

Where:
  W₁ ∈ ℝ^(d_model × d_ff)     — "up-projection"
  W₂ ∈ ℝ^(d_ff × d_model)     — "down-projection"
  d_ff = 4 × d_model typically (e.g., 4096 → 16384 for Llama 7B)
  
Modern variant (Llama, Mistral): SwiGLU activation
  FFN(x) = W_down · (SiLU(W_gate · x) ⊙ W_up · x)
  
  Three matrices instead of two, with element-wise gating (⊙).
  d_ff adjusted to keep parameter count similar (d_ff = 2/3 × 4 × d_model ≈ 11008 for 4096)
```

**WHY the FFN is bigger than attention**: attention is ~1/3 of parameters, FFN is ~2/3. The "knowledge storage" hypothesis: attention patterns determine WHICH tokens to combine; FFN transforms WHAT each token's representation means. Think of FFN as a key-value memory:

```
W₁ acts as keys: each row is a pattern detector
activation: sparsely activates matching patterns
W₂ acts as values: each column stores the information for that pattern

Research (Geva et al., 2021) found that individual FFN neurons correspond to
interpretable concepts: "this neuron activates for programming languages,"
"this neuron activates for locations in Europe."
```

**DEPTH: FFN Parameter Count**

```
For a 7B model (Llama 2 7B):
  d_model = 4096, d_ff = 11008, N_layers = 32
  
  Per layer: W_gate + W_up + W_down = 3 × d_model × d_ff = 3 × 4096 × 11008
           = 135M parameters per layer
  
  Total FFN: 32 × 135M = 4.3B parameters (out of 6.7B total)
  
  FFN is ~64% of the entire model.
```

---

### 4.6 Residual Connections — Why They're the Most Important Architectural Detail

**MECHANISM**:

```
output = x + SubLayer(Norm(x))

where SubLayer is either Attention or FFN
```

This is a skip connection — the input is added directly to the sublayer's output.

**WHY — The Gradient Flow Problem**:

In a deep network with N layers, without residuals, the gradient from the loss to layer 1 is:

```
∂L/∂x₁ = ∂L/∂xₙ × ∂xₙ/∂xₙ₋₁ × ... × ∂x₂/∂x₁

= product of N-1 Jacobians

If each Jacobian has spectral norm < 1: product → 0 (vanishing gradients)
If each Jacobian has spectral norm > 1: product → ∞ (exploding gradients)
```

**With residuals**:

```
xₗ₊₁ = xₗ + F(xₗ)

∂xₗ₊₁/∂xₗ = I + ∂F(xₗ)/∂xₗ

The gradient from layer N to layer 1:
∂L/∂x₁ = ∂L/∂xₙ × Π(I + ∂F(xₗ)/∂xₗ)

Expanding the product: the Identity term creates a DIRECT gradient path
from the loss to every layer. Even if ∂F/∂x is small, the gradient
flows through the identity shortcut unattenuated.
```

**WHY this enables deep transformers**: Llama 3 405B has 126 layers. Without residual connections, training a 126-layer network would be essentially impossible — gradients would vanish or explode long before reaching early layers. The residual connection gives every layer a direct gradient highway to the loss function.

**The "residual stream" mental model** (Anthropic's interpretation): think of the residual connections as a shared communication bus. Each layer reads from the stream, computes something, and writes an additive update back. The stream accumulates information layer by layer. This is why we can talk about "what information is in the residual stream at layer 40" — it's the sum of all previous layers' contributions plus the original embedding.

---

### 4.7 Layer Normalization — The Statistics

**MECHANISM (RMSNorm, the modern standard)**:

```
RMSNorm(x) = x / √(mean(x²) + ε) × γ

Where:
  x is a vector (one token's representation, d_model floats)
  mean(x²) = (1/d) Σ xᵢ²  — the mean square of the elements
  ε ≈ 1e-6 — prevents division by zero
  γ ∈ ℝ^d — learned per-element scale (the only learned parameters)
```

**WHY RMSNorm over LayerNorm**: original LayerNorm computes mean AND variance, then shifts and scales. RMSNorm drops the mean-centering (just normalizes by root-mean-square). Empirically: same training stability, ~10% faster because you skip the mean computation. At scale, 10% on an operation called billions of times matters.

**WHY Pre-Norm (normalize before sublayer) over Post-Norm (original Transformer)**:

```
Post-Norm (original):  x + SubLayer(x)  →  Norm(result)
Pre-Norm (modern):     x + SubLayer(Norm(x))

Post-Norm: the residual and sublayer output are added BEFORE normalization.
  Problem: at initialization, the sublayer output can have arbitrary scale,
  and the accumulated residual grows with depth. Normalization has to fight
  an increasingly large signal. Training is unstable without careful
  learning-rate warmup.

Pre-Norm: normalize FIRST, then the sublayer operates on well-behaved input.
  The residual stream stays stable because we're adding normalized-scale 
  updates. Training is much more stable at scale.
```

**INTERVIEW LINE**: "Pre-RMSNorm is the modern standard because it stabilizes the residual stream — each sublayer receives normalized input, so its output scale is bounded regardless of depth. Post-Norm required careful warmup because the residual accumulated unbounded magnitudes."

---

### 4.8 Positional Encoding — RoPE (How It Actually Works)

**WHY position encoding is needed**: self-attention is permutation-equivariant — if you shuffle the input tokens, the attention weights shuffle the same way but the actual values don't change. "Dog bites man" and "Man bites dog" produce identical attention patterns without positional information. The model literally can't tell token order.

**RoPE (Rotary Position Embeddings) — the mechanism**:

```
Insight: encode position by ROTATING the query and key vectors in 2D subspaces.

Split each d_k-dimensional vector into d_k/2 pairs of dimensions.
For position m, rotate the i-th pair by angle m × θᵢ:

  θᵢ = 10000^(-2i/d)     (frequency for dimension pair i)
  
  [q₂ᵢ, q₂ᵢ₊₁] at position m → rotate by angle m × θᵢ:
  
  q'₂ᵢ   = q₂ᵢ × cos(mθᵢ) - q₂ᵢ₊₁ × sin(mθᵢ)
  q'₂ᵢ₊₁ = q₂ᵢ × sin(mθᵢ) + q₂ᵢ₊₁ × cos(mθᵢ)
  
  Same rotation applied to keys.
```

**WHY rotation works for relative position**:

```
When computing attention: q_m · k_n (query at position m, key at position n)

After rotation:
  q'_m · k'_n = f(q, k, m-n)
  
  The dot product depends ONLY on the relative position (m-n), not absolute 
  positions m and n individually. This is because rotation is a group operation:
  rotate-by-m then dot-with-rotate-by-n = dot-with-rotate-by-(m-n).
```

**WHY RoPE dominates**:
1. Relative position for free — no separate relative position bias matrix
2. Decays naturally — distant tokens have many rotations between them, their dot products decorrelate → natural attention decay with distance
3. Extrapolates — by adjusting θ base frequency (NTK-aware scaling, YaRN), you can extend context length beyond training without retraining the full model

**SDE3 Interview Follow-up**: "How do you extend a model trained on 4K context to 128K?"

RoPE base frequency scaling: increase the base (10000) to a larger value (e.g., 500000), which "slows down" the rotation rate. Positions 0-128K with the new base map to the same rotation range as 0-4K with the original base. Fine-tune on a small amount of long-context data. This is how Llama 3 went from 8K to 128K context. The approach (NTK-aware, YaRN, or similar) preserves short-range attention quality while gaining long-range coverage.

---

### 4.9 Causal Masking — Why Decoders Can't See the Future

**MECHANISM**:

```
Before softmax, add a mask matrix M to the attention scores:

M[i][j] = 0    if j ≤ i    (can attend)
M[i][j] = -∞   if j > i    (cannot attend — softmax(-∞) = 0)

After softmax:
  Token 1 attends to: [Token 1]
  Token 2 attends to: [Token 1, Token 2]
  Token 3 attends to: [Token 1, Token 2, Token 3]
  ...
  Token n attends to: [Token 1, ..., Token n]
```

**WHY causal masking exists**: during training, the model predicts the next token for EVERY position simultaneously (teacher forcing). Without the mask, token 5 could "cheat" by looking at tokens 6, 7, 8... and just copying the answer. The mask forces each position to predict the next token using only past context — the same constraint that exists at inference time. This alignment between training and inference is what makes autoregressive generation work.

**WHY this distinguishes decoders from encoders**: BERT (encoder) uses NO mask — every token attends to every other token, both past and future. This makes BERT great for understanding (classification, NER) because it sees full context, but unusable for generation — it can't be deployed autoregressively because it was trained to see the future.

---

## PART 5 — THE TRAINING PIPELINE (WITH REAL NUMBERS)

### 5.1 Cross-Entropy Loss — WHY It Works for Next-Token Prediction

**MECHANISM**:

```
The model outputs logits z ∈ ℝ^V for position t (one score per vocabulary token).
The true next token is y_t (the integer ID of the correct token).

Step 1: Convert logits to probabilities
  P(token_i) = softmax(z)_i = exp(zᵢ) / Σⱼ exp(zⱼ)

Step 2: Cross-entropy loss
  L_t = -log P(y_t) = -log(softmax(z)_{y_t})

For a sequence of T tokens:
  L = (1/T) Σ_{t=1}^{T} -log P(y_t | y_1, ..., y_{t-1})
```

**WHY cross-entropy** (not MSE, not another loss):

```
Cross-entropy is the negative log-likelihood of the training data under the model.
Minimizing it is equivalent to maximum likelihood estimation (MLE) —
the most statistically principled way to fit a probability distribution.

Information-theoretic view: cross-entropy H(p, q) = -Σ p(x) log q(x)
where p = true distribution (one-hot: the correct token), q = model's distribution.

H(p, q) = H(p) + KL(p || q)

Since H(p) is fixed (entropy of a one-hot is 0), minimizing cross-entropy
= minimizing KL divergence between the model's predictions and the true distribution.
```

**WHY -log specifically**: the log makes the loss linear in the "orders of magnitude" of probability. If the model assigns probability 0.001 to the correct token, log(0.001) = -6.9. If it assigns 0.01, log(0.01) = -4.6. The loss is proportional to how many "bits" the model is wrong by, not the raw probability difference. This means the model gets strong gradient signal even when it's very wrong (small probability → large loss → large gradient).

**Perplexity — the intuitive metric**:

```
Perplexity = exp(L) = exp(average cross-entropy loss)

Perplexity ≈ "how many tokens is the model equally uncertain between?"
  Perplexity 1: perfect prediction (always assigns prob 1.0 to the right token)
  Perplexity 10: on average, model is choosing between ~10 equally likely tokens
  Perplexity 100: very uncertain

GPT-3 on test data: perplexity ~20-30 (depending on domain)
State-of-the-art 2024-era models: perplexity ~8-15 on standard benchmarks
```

---

### 5.2 Backpropagation Through Transformers — The Chain Rule at Scale

**MECHANISM**: backprop computes ∂L/∂θ for every parameter θ using the chain rule.

```
Forward pass: Input → Layer 1 → Layer 2 → ... → Layer N → Loss

Backward pass: ∂L/∂layer_N → ∂L/∂layer_{N-1} → ... → ∂L/∂layer_1

At each layer, compute gradients for:
  - W_Q, W_K, W_V, W_O (attention projections)
  - W_1, W_2 (or W_gate, W_up, W_down for SwiGLU)
  - γ (RMSNorm scale)
  - Embedding matrix E
```

**WHY Adam is the standard optimizer** (not plain SGD):

```
SGD: θ ← θ - lr × ∇L
  Problem: learning rate is the same for all parameters. Parameters that
  rarely get updates (rare token embeddings) need large steps; parameters
  that update constantly (attention weights) need small steps.

Adam: maintains per-parameter running averages:
  m_t = β₁ × m_{t-1} + (1 - β₁) × ∇L          (momentum — smoothed gradient)
  v_t = β₂ × v_{t-1} + (1 - β₂) × (∇L)²       (RMS — smoothed squared gradient)
  
  θ ← θ - lr × m_t / (√v_t + ε)
  
  Effect: divide gradient by its own RMS → adaptive per-parameter learning rate.
  Rare parameters (small v_t) get larger effective steps.
  
  Standard hyperparams: β₁=0.9, β₂=0.999, ε=1e-8
  But: Adam stores m AND v for every parameter → 2× model size in optimizer state
```

**DEPTH: Training Memory — Why You Need So Many GPUs**

```
Model: 7B parameters in FP16

Memory breakdown during training:
  1. Parameters:        7B × 2 bytes (FP16)           = 14 GB
  2. Gradients:         7B × 2 bytes (FP16)           = 14 GB
  3. Adam optimizer states:
     - m (momentum):    7B × 4 bytes (FP32)           = 28 GB
     - v (variance):    7B × 4 bytes (FP32)           = 28 GB
  4. Activations:       depends on batch/seq, but ~10-30 GB with activation checkpointing
  
  Total: ~85-115 GB for a 7B model
  
  Single A100: 80 GB → can't train a 7B model on one GPU!
  
For 70B: ~850-1150 GB → need 10-15+ A100s minimum

For 405B: ~5-7 TB → need 80-100+ A100s (or H100s)
```

**WHY training is distributed** — the three parallelism strategies:

```
1. Data Parallelism: same model on multiple GPUs, each sees different data batches,
   gradients averaged. Scales data throughput, doesn't solve model-too-large problem.

2. Tensor Parallelism: split individual weight matrices across GPUs.
   One attention head on GPU 0, another on GPU 1, etc.
   Requires fast interconnect (NVLink, InfiniBand) — communication per-step.

3. Pipeline Parallelism: put different layers on different GPUs.
   Layer 1-8 on GPU 0, Layer 9-16 on GPU 1, etc.
   Introduces "pipeline bubbles" (GPU idle time between forward/backward).

Production: use all three simultaneously (3D parallelism).
  E.g., Llama 3 405B: 16K GPUs, months of training.
```

---

### 5.3 Scaling Laws — The Chinchilla Result (Know This)

**The Kaplan Scaling Laws (2020)**: loss scales as power laws in model size N, dataset size D, and compute C.

```
L(N) ∝ N^(-0.076)    — loss decreases with model size
L(D) ∝ D^(-0.095)    — loss decreases with data size
L(C) ∝ C^(-0.050)    — loss decreases with compute budget
```

**The Chinchilla Result (Hoffmann et al., 2022)**: for a fixed compute budget, there's an optimal ratio of model size to training data.

```
Optimal: D ≈ 20 × N   (tokens ≈ 20 × parameters)

This means:
  7B model should train on ~140B tokens
  70B model should train on ~1.4T tokens
  
GPT-3 (175B params) was trained on ~300B tokens → UNDERTRAINED by 10× per Chinchilla
Llama 2 (70B params) was trained on 2T tokens → ~30× ratio (overtrained, but intentionally —
  inference-time compute savings from a smaller, well-trained model)
```

**WHY Chinchilla matters for system design interviews**: it tells you that "just make the model bigger" has diminishing returns without proportionally more data. And in practice, post-Chinchilla, the trend is toward smaller models trained on MORE data (Llama 3 8B on 15T tokens, 1800× ratio), because training is a one-time cost but inference cost is ongoing. A smaller model that's well-trained is cheaper to serve.

**DEPTH: Training Cost Estimation**

```
Rule of thumb: training FLOPs ≈ 6 × N × D
  (forward pass = 2ND, backward = 4ND, total ≈ 6ND)

Llama 3 70B on 15T tokens:
  FLOPs = 6 × 70B × 15T = 6.3 × 10²⁴ = 6.3 ZettaFLOPs

H100 GPU: ~1 PFLOP/s (FP16/BF16 with sparsity) ≈ ~3.3 × 10²⁰ FLOP/day
  
  GPU-days = 6.3 × 10²⁴ / 3.3 × 10²⁰ ≈ 19,000 GPU-days
  
  With 2000 H100s: ~10 days  (but MFU ~40-50%, so realistically ~20-25 days)
  
  Cost: 2000 H100s × 25 days × ~$2/GPU-hour = ~$2.4M
  (Rough — actual infrastructure, networking, salaries push this to $10M+ for frontier models)
```

---

### 5.4 Alignment — RLHF, DPO, and WHY They Exist

**WHY pretraining alone isn't enough**: a pretrained model predicts the next likely token, not the next HELPFUL token. Ask it a question and it might complete your question with another question (that's what web text looks like). It might generate toxic content (that's in web text too). It has no notion of "being helpful" or "being safe."

**Stage 1: Supervised Fine-Tuning (SFT)**: train on (instruction, ideal response) pairs. This teaches the model the FORMAT of being helpful — question → answer, not question → continuation.

**Stage 2: RLHF (Reinforcement Learning from Human Feedback)**:

```
1. Collect comparison data: show humans two model responses to the same prompt,
   they pick which is better. ~100K comparisons.

2. Train a reward model R: R(prompt, response) → scalar score
   R learns to predict which response humans would prefer.
   Training: given (prompt, chosen, rejected) triples, optimize:
   
   L = -log σ(R(prompt, chosen) - R(prompt, rejected))
   
   (Bradley-Terry model — P(A preferred) = σ(R(A) - R(B)))

3. Optimize the LLM policy π against R using PPO (Proximal Policy Optimization):
   
   Maximize: E[R(prompt, response)] - β × KL(π || π_ref)
   
   - First term: generate high-reward responses
   - Second term: don't drift too far from the SFT model (π_ref)
   - β controls the trade-off (too low → reward hacking, too high → no improvement)
```

**WHY the KL penalty matters**: without it, the model finds degenerate "reward hacks" — responses that score high on the reward model but are actually bad (e.g., extremely verbose responses that pattern-match the reward model's training data). The KL penalty keeps the model close to the "sane" SFT model.

**DPO (Direct Preference Optimization) — the simpler alternative**:

```
Key insight: you can skip the reward model entirely.
The optimal RL policy has a closed-form relationship with the reward:

  R*(prompt, response) = β × log(π*(response|prompt) / π_ref(response|prompt)) + const

So you can directly optimize preferences:

  L_DPO = -log σ(β × [log π(chosen|prompt)/π_ref(chosen|prompt)
                       - log π(rejected|prompt)/π_ref(rejected|prompt)])

No reward model, no RL loop, no PPO instabilities.
Just a supervised loss on preference pairs.
```

**WHY DPO became popular**: RLHF requires training two models (reward model + policy) with a complex RL loop (PPO is notoriously hard to tune). DPO reduces this to a single supervised training run. The trade-off: DPO may be less flexible for complex preference structures, and some argue RLHF produces better results at the frontier. In practice, most production models use some variant of DPO or a combination.

---

## PART 6 — INFERENCE (THE PRODUCTION-CRITICAL SECTION)

### 6.1 The Two Phases of Inference

**MECHANISM**:

```
Phase 1: PREFILL
  Process the entire input prompt in parallel (like training).
  All tokens attend to all previous tokens simultaneously.
  Time: proportional to input length. Compute-bound (matrix multiplications).
  
  Output: KV cache entries for every input token at every layer.

Phase 2: DECODE (autoregressive generation)
  Generate one token at a time.
  Each new token attends to ALL previous tokens (via KV cache).
  Time: proportional to output length. Memory-bandwidth-bound (small compute per token,
  but must read the entire KV cache from memory for each token).
  
  This is why generation is slow: each token requires reading the full KV cache.
```

**WHY this distinction matters for production**:

```
Time to First Token (TTFT) = prefill time ≈ proportional to input length
Time Per Output Token (TPOT) = decode time ≈ constant (but slow due to memory bandwidth)
Total latency = TTFT + (output_tokens × TPOT)

For a request with 2000 input tokens, 500 output tokens:
  TTFT ≈ 200-500ms (depends on model/hardware)
  TPOT ≈ 20-50ms per token
  Total ≈ 500ms + 500 × 35ms ≈ 18 seconds

Optimization levers:
  TTFT: prefix caching (reuse KV cache for common system prompts)
  TPOT: smaller KV cache (GQA, quantization), faster memory (HBM3)
  Both: smaller model, speculative decoding
```

---

### 6.2 KV Cache — The Full Memory Calculation (Guaranteed Interview Territory)

**MECHANISM**: during generation, each new token needs to attend to all previous tokens. Without caching, you'd recompute Q, K, V for the entire sequence at every step (O(n²) per step, O(n³) total). The KV cache stores K and V from all previous tokens, so each new token only computes its own Q, K, V and attends to the cached KV.

**The Memory Calculation (drill this)**:

```
KV cache size = 2 × n_layers × n_kv_heads × d_head × seq_len × bytes_per_param

Where:
  2         — one for K, one for V
  n_layers  — number of transformer layers
  n_kv_heads — number of KV heads (< n_heads if GQA)
  d_head    — dimension per head (d_model / n_heads)
  seq_len   — current sequence length
  bytes     — 2 for FP16, 1 for INT8

Example: Llama 2 70B, 4096 context, FP16
  n_layers = 80, n_kv_heads = 8 (GQA!), d_head = 128, seq_len = 4096, bytes = 2
  
  KV cache = 2 × 80 × 8 × 128 × 4096 × 2
           = 2 × 80 × 8 × 128 × 4096 × 2
           = 671,088,640 bytes
           ≈ 640 MB per request

Without GQA (all 64 heads): 
  KV cache = 2 × 80 × 64 × 128 × 4096 × 2 ≈ 5.1 GB per request
  
  GQA saves 8× → 640 MB vs 5.1 GB. At 100 concurrent requests, 
  that's 64 GB vs 512 GB. This is why GQA was adopted.

For 128K context (Llama 3):
  KV cache = 2 × 80 × 8 × 128 × 131072 × 2 ≈ 20 GB per request
  
  At 100 concurrent requests: 2 TB of KV cache alone.
  This is why long-context serving is expensive.
```

**SDE3 Interview Follow-up**: "Your GPU is running out of memory during inference. Walk me through the diagnosis."

```
Step 1: What's consuming memory?
  - Model weights: fixed (e.g., 140 GB for 70B in FP16)
  - KV cache: scales with batch_size × seq_len
  - Activations: small during inference (no gradient storage)

Step 2: The diagnosis ladder:
  1. Reduce batch size (fewer concurrent requests)
  2. Reduce max_seq_len (cap context window)
  3. Quantize KV cache (FP16 → INT8 halves KV memory)
  4. Use GQA model variant (8× KV reduction)
  5. Use PagedAttention (vLLM — eliminates KV cache fragmentation)
  6. Quantize model weights (FP16 → INT4, halves model memory)
  7. Add GPUs (tensor parallelism splits model across devices)
```

---

### 6.3 PagedAttention (vLLM) — How It Actually Manages Memory

**The problem**: each request has a different sequence length, so KV caches have different sizes. Allocating contiguous memory for max_seq_len per request wastes ~60-80% of GPU memory (internal fragmentation).

**MECHANISM**:

```
Borrow the idea from OS virtual memory:

1. Divide KV cache memory into fixed-size PAGES (e.g., 16 tokens per page)
2. Maintain a PAGE TABLE per request: logical KV position → physical GPU memory page
3. Allocate pages on demand as the sequence grows
4. When a request finishes, return its pages to a free pool
5. Pages can be non-contiguous in physical memory — the page table maps them

Physical GPU memory:
  [Page 0: req A tokens 0-15] [Page 1: req B tokens 0-15] [Page 2: req A tokens 16-31] ...

Request A page table: logical 0→physical 0, logical 1→physical 2, ...
Request B page table: logical 0→physical 1, ...
```

**WHY it works**: near-zero waste. Memory utilization goes from ~20-40% (contiguous allocation) to ~95%+ (paged allocation). This translates directly to higher throughput: more concurrent requests fit in the same GPU memory.

**Additional trick — copy-on-write for beam search / parallel sampling**: multiple beams share the same KV cache pages (they have the same prefix). Only when beams diverge do they get their own pages. Same as OS fork() copy-on-write.

---

### 6.4 Flash Attention — Why It's About IO, Not Compute

**The problem**: standard attention materializes the full n×n attention matrix in GPU HBM (High Bandwidth Memory). For n=8K, that's 64M entries × 4 bytes = 256 MB. The matrix is computed, read, softmaxed, read again, multiplied with V, read again. Memory bandwidth is the bottleneck, not FLOP/s.

**MECHANISM**:

```
Flash Attention's insight: never materialize the full attention matrix.

1. Tile the computation: process attention in blocks that fit in GPU SRAM (~20 MB)
2. For each block: compute QK^T for that block, apply softmax (using online softmax
   algorithm that doesn't need the full row), multiply by V, accumulate the result
3. The full n×n matrix never exists in HBM — only block-sized tiles in SRAM

Memory: O(n) instead of O(n²)
Speed: 2-4× faster for typical sequence lengths (IO-bound → compute-bound)
```

**WHY "IO-awareness" is the key insight**: GPU SRAM is ~10-20× faster than HBM. By restructuring the computation to stay in SRAM (even though it does slightly more arithmetic), the total wall-clock time drops dramatically. This is the same principle as cache-oblivious algorithms in systems programming — minimize data movement, not FLOP count.

**Production reality**: Flash Attention 2/3 is standard in every inference framework (vLLM, TGI, TensorRT-LLM). If you're serving LLMs without Flash Attention, you're leaving 2-4× throughput on the table.

---

### 6.5 Speculative Decoding — The Verification Math

**MECHANISM**:

```
1. Small "draft" model (e.g., 1B params) generates K candidate tokens quickly
   (it's fast because it's small)

2. Large "target" model processes all K candidates in ONE parallel forward pass
   (same cost as processing one token — the magic is in parallel verification)

3. For each candidate token, compare:
   P_target(token) vs P_draft(token)
   
   Accept with probability: min(1, P_target / P_draft)
   
   If rejected at position i: sample from the adjusted distribution
   (P_target - P_draft, renormalized) and discard positions i+1..K

4. Expected accepted tokens per step: depends on draft-target agreement
   Typical: 3-5 accepted out of 8 candidates → 3-5× speedup
```

**WHY the acceptance criterion preserves the target distribution**: the rejection sampling scheme guarantees that the final output distribution is EXACTLY P_target, not some approximation. The draft model doesn't affect output quality — it only affects speed. If draft and target agree perfectly: all K tokens accepted (K× speedup). If they disagree completely: 1 token per step (no speedup, no harm).

**INTERVIEW LINE**: "Speculative decoding is free quality — the draft model only affects latency, never output distribution. The rejection sampling criterion guarantees exact equivalence to the target model. The speedup comes from converting K sequential decode steps into one parallel verification step."

---

### 6.6 Continuous Batching — Why Static Batching Wastes GPUs

```
Static batching:
  Request A: 50 tokens to generate
  Request B: 200 tokens to generate
  Batch completes when the LONGEST request finishes.
  Request A's GPU slot sits idle for 150 tokens (75% waste).

Continuous batching (iteration-level scheduling):
  At every decode step, check for:
  1. Completed requests → free their slot (and KV cache pages)
  2. Waiting requests → insert them into the freed slot
  
  GPU utilization stays near 100% — no idle slots.
```

**Production frameworks**: vLLM, TensorRT-LLM, and SGLang all implement continuous batching. It's the single biggest throughput optimization after Flash Attention.

---

## PART 7 — QUANTIZATION (WITH QUALITY TRADE-OFFS)

### 7.1 The Precision Ladder — What Each Level Actually Means

```
Format    Bits  Range (approx)           Memory for 70B model
────────  ────  ───────────────────────  ────────────────────
FP32      32    ±3.4 × 10³⁸             280 GB
BF16      16    ±3.4 × 10³⁸ (same!)     140 GB  ← training standard
FP16      16    ±6.5 × 10⁴              140 GB
INT8       8    -128 to 127              70 GB
INT4       4    -8 to 7                  35 GB
```

**WHY BF16 over FP16 for training**: BF16 has the same exponent range as FP32 (8 bits exponent) but less precision (8 bits mantissa vs 23). FP16 has more precision but a much smaller range — gradients can underflow/overflow during training. BF16 never overflows because it has the same range as FP32. For inference, FP16 is fine (no gradient dynamics to worry about).

### 7.2 Post-Training Quantization — The Quality Degradation Curve

```
Empirical quality degradation (typical, varies by model):

  FP16 → INT8:  <1% quality loss on most benchmarks
                 Often within noise of the FP16 baseline
                 50% memory reduction
                 1.5-2× speedup
                 
  FP16 → INT4:  2-5% quality loss (noticeable on reasoning tasks)
                 Coding and math degrade more than language
                 75% memory reduction
                 2-3× speedup

  FP16 → INT4 (GPTQ/AWQ with calibration): 1-3% quality loss
                 Calibration data helps preserve quality on target tasks
                 Same memory reduction as naive INT4

The Pareto frontier:
  - For serving: INT8 is almost always the right default
    (negligible quality loss, 2× memory savings)
  - INT4 acceptable for: draft models in speculative decoding,
    edge deployment, cost-sensitive low-stakes applications
  - Never acceptable: medical, legal, financial (where 2-5% matters)
```

**DEPTH: How Quantization Actually Works (Absmax)**:

```
Simplest scheme (absmax per-tensor):

  scale = max(|W|) / 127    (map the largest weight to INT8 max)
  W_int8 = round(W / scale)
  W_dequant = W_int8 × scale  (approximately reconstructs W)
  
  Error: rounding error = |W - W_dequant| ≤ scale/2

Better schemes:
  - Per-channel: separate scale per output channel (more accurate, same speed)
  - Per-group: separate scale per group of 128 weights (much more accurate, slight overhead)
  - AWQ (Activation-Aware): weight channels that produce large activations get 
    higher precision (protects the critical computation paths)
  - GPTQ: uses calibration data to minimize quantization error on real inputs
```

---

## PART 8 — FINE-TUNING (THE PRACTICAL MATH)

### 8.1 LoRA — Low-Rank Adaptation (The Mechanism)

```
Key insight: fine-tuning weight updates are low-rank.

Instead of updating the full weight matrix W ∈ ℝ^(d × d):
  W' = W + ΔW

Factor ΔW as a low-rank product:
  ΔW = B × A    where B ∈ ℝ^(d × r), A ∈ ℝ^(r × d)
  
  r = rank (typically 8-64, vs d = 4096)
  
  Trainable parameters: B and A
  Frozen: original W

Forward pass:
  output = W × x + (B × A) × x = W × x + B × (A × x)
```

**Parameter reduction**:
```
Full fine-tuning of a 7B model:
  Trainable: 7B parameters
  Adam optimizer states: 2 × 7B × 4 bytes = 56 GB
  Total training memory: ~115 GB

LoRA (r=16) on attention matrices only:
  Per matrix: 2 × d × r = 2 × 4096 × 16 = 131K parameters
  4 attention matrices × 32 layers = 128 matrices
  Total trainable: 128 × 131K = 16.8M parameters (0.24% of 7B)
  Adam states: 2 × 16.8M × 4 bytes = 134 MB
  Total training memory: ~16 GB (fits on one GPU!)
```

**QLoRA**: quantize the base model to 4-bit, apply LoRA adapters in FP16. Train on a single consumer GPU (24 GB). The quantization only affects the frozen weights (used for forward pass), not the LoRA gradients (computed in FP16 for numerical stability).

---

## PART 9 — SAMPLING (THE GENERATION CONTROL PANEL)

### 9.1 Temperature — The Exact Math

```
Standard softmax: P(token_i) = exp(zᵢ) / Σⱼ exp(zⱼ)

With temperature T: P(token_i) = exp(zᵢ/T) / Σⱼ exp(zⱼ/T)

T = 1.0: standard distribution (as trained)
T → 0:   distribution sharpens → approaches argmax (greedy, deterministic)
T → ∞:   distribution flattens → approaches uniform (random)

Example:
  Logits: [5.0, 3.0, 1.0]
  
  T=1.0: softmax → [0.84, 0.11, 0.04]    (model's "intended" distribution)
  T=0.5: softmax → [0.97, 0.03, 0.00]    (sharper — more confident)
  T=2.0: softmax → [0.58, 0.27, 0.15]    (flatter — more exploration)
```

**WHY temperature works**: dividing logits by T before softmax scales the differences between logits. Small T amplifies differences (winner takes all). Large T compresses differences (everyone gets a chance). This is the same as the temperature parameter in statistical mechanics (hence the name).

### 9.2 Top-p (Nucleus Sampling)

```
1. Sort tokens by probability, descending
2. Accumulate probabilities until the sum ≥ p (e.g., p=0.9)
3. Sample only from this "nucleus" set
4. Renormalize probabilities within the set

Example with p=0.9:
  Sorted probs: [0.40, 0.25, 0.15, 0.10, 0.05, 0.03, 0.02]
  Cumulative:   [0.40, 0.65, 0.80, 0.90, ...]
  Nucleus: first 4 tokens (cumulative = 0.90)
  
  The long tail of unlikely tokens (0.05, 0.03, 0.02) is excluded.
```

**WHY top-p over top-k**: top-k (e.g., k=50) always considers exactly 50 tokens, regardless of whether the distribution is peaked (only 3 tokens are reasonable) or flat (200 tokens are reasonable). Top-p adapts: in a peaked distribution, the nucleus is small; in a flat distribution, it's large. This gives more appropriate diversity per-token.

---

## PART 10 — RAPID-FIRE Q&A (drill AI-off, 60-90 seconds each)

**"What is an LLM, precisely?"**
→ A function mapping a token sequence to a probability distribution over the vocabulary for the next token. Trained via next-token prediction (cross-entropy loss) on massive text corpora. Everything we call "intelligence" is the shape of that conditional distribution.

**"Why divide by √dₖ in attention?"**
→ Dot products have variance proportional to d_k. For d_k=128, std≈11, pushing softmax into saturation where gradients vanish. Dividing by √dₖ normalizes variance to 1, keeping softmax in its gradient-friendly regime. §4.3.

**"Walk me through a single forward pass."**
→ Token IDs → embedding lookup → add positional encoding (RoPE rotation) → for each of N layers: RMSNorm → causal multi-head attention (Q·Kᵀ/√dₖ + mask → softmax → ×V) → residual add → RMSNorm → SwiGLU FFN → residual add → final RMSNorm → linear projection to vocab size → softmax → sample next token. §4.1.

**"What is the KV cache and calculate it for a 70B model."**
→ Stores K and V from all previous tokens so we don't recompute them. Size = 2 × layers × kv_heads × d_head × seq_len × bytes. Llama 2 70B with GQA (8 KV heads): 2×80×8×128×4096×2 = 640 MB per request. Without GQA: 5.1 GB. At 100 concurrent requests: 64 GB vs 512 GB — GQA makes long-context serving viable. §6.2.

**"Why did Transformers replace RNNs?"**
→ Parallelism: RNNs process sequentially (token 100 waits for 1-99), transformers process all tokens in parallel. Long-range dependencies: RNN gradients vanish over long sequences even with LSTM gates; self-attention connects every token pair in one step. Training speed: O(1) parallel steps vs O(n) sequential, which means GPUs are fully utilized. §1.2.

**"Explain residual connections and why they enable deep networks."**
→ output = x + SubLayer(x). The identity shortcut creates a direct gradient path from loss to every layer: ∂x_{l+1}/∂x_l = I + ∂F/∂x. Even if sublayer gradients are small, the identity term passes gradients unattenuated. This is how you train 126-layer models (Llama 3 405B) without vanishing gradients. Think of it as a shared communication bus that each layer reads from and writes to additively. §4.6.

**"What is cross-entropy loss and why does it work for LLMs?"**
→ L = -log P(correct_token). Minimizing this = maximum likelihood estimation = minimizing KL divergence between model distribution and true distribution. The log makes the loss proportional to "bits of surprise" — strong gradient signal even when the model assigns very low probability to the correct token. Perplexity = exp(L) ≈ "how many tokens is the model equally choosing between." §5.1.

**"Explain the Chinchilla scaling law and why it matters."**
→ For a fixed compute budget, optimal training uses D ≈ 20×N tokens. GPT-3 (175B params, 300B tokens) was undertrained by 10×. Post-Chinchilla trend: smaller, better-trained models (Llama 3 8B on 15T tokens). Matters for system design because training is one-time but inference is ongoing — a smaller, well-trained model saves orders of magnitude in serving cost. §5.3.

**"How does speculative decoding work?"**
→ Small draft model generates K candidate tokens fast. Target model verifies all K in one parallel pass. Accept each with prob min(1, P_target/P_draft). Rejection sampling guarantees output distribution is EXACTLY P_target. Typical: 3-5 accepted of 8 candidates → 3-5× speedup with zero quality loss. §6.5.

**"RLHF vs DPO?"**
→ Both align models to human preferences. RLHF: train reward model on comparisons → optimize policy with PPO against reward + KL penalty to SFT model. DPO: skip the reward model — closed-form relationship between optimal policy and reward → single supervised loss on preference pairs. DPO is simpler (no RL loop), RLHF may be more flexible at the frontier. §5.4.

**"How does Flash Attention work?"**
→ Never materializes the n×n attention matrix in HBM. Tiles the computation into blocks that fit in GPU SRAM (~20 MB). Uses online softmax to compute exact attention without storing the full matrix. Reduces memory from O(n²) to O(n) and is 2-4× faster because SRAM is 10-20× faster than HBM. IO-awareness, not FLOP reduction, is the key insight. §6.4.

**"When is quantization acceptable vs. not?"**
→ INT8: almost always acceptable (<1% quality loss, 2× memory savings, 1.5-2× speed). Default for production serving. INT4: 2-5% loss, acceptable for draft models, edge deployment, low-stakes applications. Never for medical/legal/financial where accuracy matters. Use calibrated methods (GPTQ/AWQ) to minimize degradation. §7.2.

**"RAG vs fine-tuning — when do you use which?"**
→ Four requirements fatal to fine-tuning: freshness (data changes), citations (weights can't cite), ACLs (weights have no permission model), deletion (can't un-train a data point). Fine-tuning changes behavior and form (tone, format, domain vocabulary). RAG provides knowledge. If you need updateable, citable, permission-controlled knowledge: RAG. If you need the model to behave differently: fine-tune. Often: both.

**"What is PagedAttention?"**
→ Borrows virtual memory from OS design. KV cache divided into fixed-size pages (e.g., 16 tokens). Page table per request maps logical positions to physical GPU memory. Pages allocated on demand, freed on completion, non-contiguous in physical memory. Eliminates 60-80% memory fragmentation from contiguous allocation. Copy-on-write for shared prefixes (beam search). §6.3.

---

## HONESTY GUARDRAILS

- **Bright line**: "the mechanism works like X; I've applied this at the application layer by [tuning inference params / choosing model sizes / working with quantized models / building RAG over LLMs]." Don't claim you trained a 70B model or implemented Flash Attention kernels unless you did.
- **Numbers you CAN do live**: KV cache calculation (just plug in the model's published specs), training cost estimation (6×N×D rule), embedding matrix size, parameter count decomposition. Practice with real model specs (Llama 3, Mistral, etc.).
- **If pushed past this doc**: "I haven't gone below the CUDA kernel level — my working model is X, and I'd verify in the Flash Attention or vLLM source." Reasoning + honesty over recall.
