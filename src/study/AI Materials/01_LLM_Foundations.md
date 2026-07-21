"Everything in modern AI systems—from RAG and agents to memory and evaluation—starts with understanding how LLMs work."

# 1.1 Artificial Intelligence (AI)

**What is it?**

Artificial Intelligence (AI) is the branch of computer science focused on building systems capable of performing tasks that normally require human intelligence.

These tasks include:
- Learning
- Reasoning
- Problem Solving
- Decision Making
- Language Understanding
- Perception
- Planning

Unlike traditional software, AI systems learn patterns from data instead of relying solely on explicitly programmed rules.

**Why does it exist?**

Traditional software follows predefined instructions.

Example:
```
Input
↓
if (age > 18)
↓
Eligible
```

This works only for well-defined rules.

However, many real-world problems cannot be solved using hardcoded logic:
- Recognizing images
- Understanding language
- Driving cars
- Writing code
- Detecting fraud

AI enables computers to learn these complex patterns directly from data.

**How does it work?**

```
Data
↓
Learning Algorithm
↓
Model
↓
Predictions / Decisions
```

The model learns relationships within data during training and applies that knowledge to unseen inputs during inference.

**AI Hierarchy**

```
Artificial Intelligence
│
├── Machine Learning
│      │
│      ├── Supervised Learning
│      ├── Unsupervised Learning
│      ├── Self-Supervised Learning
│      └── Reinforcement Learning
│      │
│      └── Deep Learning
│             │
│             ├── CNN
│             ├── RNN
│             ├── LSTM
│             └── Transformers
│                    │
│                    └── Generative AI
│                           │
│                           ├── Large Language Models
│                           ├── Diffusion Models
│                           ├── Multimodal Models
│                           └── AI Agents
```

Note: Deep Learning is a subset of Machine Learning, not a sibling. Generative AI is built on Deep Learning (specifically Transformers). The hierarchy is nested, not parallel.

**Where is it used?**
- Search Engines
- Recommendation Systems
- Healthcare
- Finance
- Autonomous Vehicles
- Robotics
- Cybersecurity
- Customer Support
- Software Development

**Trade-offs**

Advantages:
- Automation
- Better predictions
- Improved decision making
- Increased productivity

Disadvantages:
- Requires large datasets
- Computationally expensive
- Can introduce bias
- Difficult to explain

---

# 1.2 Machine Learning (ML)

**What is it?**

Machine Learning is a subset of AI where models learn patterns from historical data instead of relying on manually written rules. The model improves its performance through experience.

**Why does it exist?**

Hardcoded rules become impractical when:
- The number of possible scenarios is enormous.
- Patterns continuously change.
- Rules cannot be explicitly defined.

Machine Learning automatically discovers these patterns.

**How does it work?**

```
Training Data
↓
Learning Algorithm
↓
Machine Learning Model
↓
Predictions
```

The model adjusts internal parameters to minimize prediction errors during training.

**Types of Machine Learning**

**Supervised Learning**

The model learns from labeled examples.
```
Email → Spam / Not Spam
```

Examples: Classification, Regression

Applications: Fraud Detection, Medical Diagnosis, Price Prediction

**Unsupervised Learning**

The model discovers hidden structures without labeled outputs.

Applications: Customer Segmentation, Topic Modeling, Anomaly Detection

**Self-Supervised Learning**

The model generates its own labels from the data.
```
"The capital of France is ____"
↓
Predict "Paris"
```

Modern LLMs primarily use self-supervised learning during pretraining.

**Reinforcement Learning**

The model learns through rewards and penalties while interacting with an environment.

Applications: Robotics, Games, Autonomous Systems, LLM Alignment (RLHF)

**Production Uses**
- Recommendation Systems
- Search Ranking
- Credit Scoring
- Demand Forecasting
- Predictive Maintenance

**Trade-offs**

Advantages:
- Learns from data
- Generalizes to unseen examples
- Handles complex relationships

Disadvantages:
- Data dependent
- Can overfit
- Requires monitoring

---

# 1.3 Deep Learning (DL)

**What is it?**

Deep Learning is a branch of Machine Learning that uses multi-layer neural networks to learn hierarchical representations directly from data. Instead of manually engineering features, deep learning models automatically learn useful features.

**Why does it exist?**

Traditional ML relies heavily on handcrafted features.

Image Recognition comparison:
- Traditional ML: Detect edges → Detect corners → Build features manually
- Deep Learning: Learns features automatically

**How does it work?**

```
Input
↓
Input Layer
↓
Hidden Layers
↓
Output Layer
```

Each layer extracts increasingly complex representations.

```
Image → Edges → Shapes → Objects → Prediction
```

**Artificial Neuron**

The basic building block of neural networks.
```
Inputs → Weights → Weighted Sum → Activation Function → Output
```

Each neuron decides whether to activate based on learned parameters.

**Neural Network**

A neural network consists of multiple interconnected neurons organized into layers.
```
Input Layer → Hidden Layer → Hidden Layer → Output Layer
```

As networks become deeper, they can model increasingly complex relationships.

**Activation Functions**

Activation functions introduce non-linearity, enabling neural networks to learn complex patterns.

Common activation functions:
- ReLU
- GELU
- Sigmoid
- Tanh

Modern Transformers primarily use GELU.

**Loss Functions**

A loss function measures how wrong the model's predictions are. During training, the model tries to minimize this value.

- **Cross-Entropy Loss** — Standard for classification and next-token prediction. Measures the difference between the predicted probability distribution and the true distribution. This is the loss function that makes LLM pretraining work.
- **Mean Squared Error (MSE)** — Standard for regression tasks.

**Backpropagation and Gradient Descent**

This is how neural networks actually learn.

```
Input → Forward Pass → Prediction → Loss
                                      ↓
                              Compute Gradients (Backpropagation)
                                      ↓
                              Update Weights (Gradient Descent)
                                      ↓
                              Repeat
```

**Backpropagation** computes how much each weight contributed to the error, working backwards from output to input (chain rule of calculus).

**Gradient Descent** uses those gradients to adjust weights in the direction that reduces the loss. The learning rate controls how big each step is — too large and you overshoot, too small and training is painfully slow.

In practice, models use **Stochastic Gradient Descent (SGD)** or variants like **Adam** (the most common optimizer for Transformers) which compute gradients on mini-batches rather than the entire dataset.

**Popular Deep Learning Architectures**

**CNN (Convolutional Neural Networks)**

Best for: Image Classification, Object Detection, Medical Imaging

**RNN (Recurrent Neural Networks)**

Designed for sequential data.

Problems: Slow, Vanishing gradients, Poor long-range memory

**LSTM (Long Short-Term Memory)**

Improved version of RNN.

Advantages: Better long-term memory, Reduced vanishing gradient problem

Still limited by sequential computation.

**Transformers**

Introduced the Attention Mechanism.

Advantages: Parallel processing, Long-range context, Better scalability, State-of-the-art performance

Transformers replaced RNNs and LSTMs for most NLP tasks.

**Production Uses**
- ChatGPT
- Claude
- Gemini
- Image Recognition
- Speech Recognition
- Recommendation Systems
- Autonomous Driving

**Trade-offs**

Advantages:
- Automatic feature learning
- High accuracy
- Scales well with data

Disadvantages:
- Requires large datasets
- Computationally intensive
- Expensive to train

**Interview Notes**

A common interview question: Why did Transformers replace RNNs and LSTMs?

Expected answer:
- Parallel processing
- Better handling of long-range dependencies
- Faster training
- Improved scalability
- Attention mechanism enables richer contextual understanding

---

# 1.4 Evolution of Natural Language Processing (NLP)

**What is it?**

Natural Language Processing (NLP) is the field of AI focused on enabling computers to understand, interpret, and generate human language. Modern LLMs are the result of decades of advancements in NLP.

**Why did NLP evolve?**

Earlier NLP techniques struggled with: Ambiguity, Context, Long documents, Generalization

Each generation of models attempted to overcome these limitations.

**Evolution Timeline**

```
Rule-Based Systems
↓
Statistical NLP
↓
Machine Learning
↓
RNN
↓
LSTM
↓
Transformer
↓
Large Language Models
```

**Rule-Based Systems** — Relied on manually written grammar rules and dictionaries. Easy to understand, deterministic. But difficult to scale and poor handling of ambiguity.

**Statistical NLP** — Used probabilities instead of handcrafted rules. Improved flexibility but still required feature engineering.

**RNN** — Introduced sequential memory but suffered from vanishing gradients and slow training.

**LSTM** — Improved long-term dependency handling but still processed tokens sequentially.

**Transformer** — Replaced recurrence with self-attention, enabling parallel computation and better contextual understanding.

**Large Language Models** — Scale Transformer architectures with billions of parameters and massive datasets to perform a wide range of language tasks through next-token prediction.

**Interview Notes**

Understanding why Transformers replaced earlier architectures is more important than memorizing the timeline. Interviewers often ask about the limitations of RNNs/LSTMs and how attention solved them.

---

# 1.5 Large Language Models (LLMs)

**What is it?**

A Large Language Model (LLM) is a Transformer-based deep neural network trained on massive text corpora to predict the next token in a sequence.

Although trained for next-token prediction, this objective enables LLMs to perform a wide variety of language tasks, including: Question Answering, Summarization, Translation, Code Generation, Reasoning, Content Creation, Chatbots.

**Why does it exist?**

Traditional NLP systems were built for specific tasks and required separate models: Translation Model, Sentiment Analysis Model, Spam Detection Model, Question Answering Model.

LLMs unify these capabilities into a single general-purpose model that can perform multiple tasks through prompting.

**How does it work?**

```
User Prompt
↓
Tokenizer
↓
Token IDs
↓
Embeddings
↓
Transformer Layers
↓
Probability Distribution
↓
Next Token
```

This process repeats until the model generates a complete response.

**Production Uses**
- ChatGPT
- Claude
- Gemini
- Cursor
- GitHub Copilot
- AI Search
- Enterprise Assistants

**Trade-offs**

Advantages:
- General-purpose
- Few-shot learning
- Strong reasoning
- Natural language interface

Disadvantages:
- Hallucinations
- High computational cost
- Context window limitations
- Requires large datasets

**Popular Models**
- GPT
- Claude
- Gemini
- Llama
- Mistral
- Qwen
- DeepSeek

**Interview Notes**

LLM ≠ Chatbot. A chatbot is an application. An LLM is the reasoning engine powering it.

---

# 1.6 Tokenization

**What is it?**

Tokenization converts raw text into smaller units called tokens, which are the basic inputs understood by an LLM.

Tokens may represent: Words, Subwords, Characters, Punctuation, Special symbols.

**Why does it exist?**

Neural networks process numbers — not text. Before text can be processed, it must be converted into a numerical representation.

**How does it work?**

```
Text → Tokenizer → Tokens → Token IDs
```

Example:
```
ChatGPT is amazing!
↓
["Chat","G","PT"," is"," amazing","!"]
↓
[1204, 531, 918, 27, 4102, 6]
```

**Vocabulary**

A tokenizer maintains a fixed vocabulary.
```
"cat" → 102
"dog" → 523
"AI"  → 7001
```

Unknown words are broken into smaller pieces.

**Special Tokens**
```
<BOS>   Beginning of Sequence
<EOS>   End of Sequence
<PAD>   Padding
<UNK>   Unknown
```

**Popular Tokenizers**
- Byte Pair Encoding (BPE)
- SentencePiece
- WordPiece
- TikToken

**Production Uses**

Every modern LLM.

**Trade-offs**

Smaller vocabulary: Smaller model, More tokens per input.
Larger vocabulary: Fewer tokens per input, Larger embedding matrix.

**Interview Notes**

Words ≠ Tokens. One word may become several tokens.

---

# 1.7 Embeddings

**What is it?**

Embeddings convert token IDs into dense numerical vectors that capture semantic meaning.

**Why does it exist?**

Token IDs are merely identifiers.
```
Dog → 104
Cat → 105
```

These numbers contain no semantic information. Embeddings transform IDs into meaningful vectors.

**How does it work?**

```
Token ID → Embedding Matrix → Dense Vector
```

The embedding matrix is **learned during training** — not hardcoded. Each row corresponds to a token in the vocabulary, and each row is a vector of a fixed **embedding dimension** (e.g., 768 for BERT, 4096 for GPT-3, 8192 for Llama 3).

Example:
```
Dog → [0.28, -0.62, 0.41, ...]
```

**Semantic Space**

Words with similar meanings appear close together in embedding space.
```
King -------- Queen
Dog  -------- Puppy
Car  -------- Vehicle
```

The classic demonstration: **King - Man + Woman ≈ Queen**. The embedding space captures semantic relationships as geometric directions — gender, plurality, tense, and other properties become vector offsets.

**Production Uses**
- LLMs
- Vector Databases
- Semantic Search
- Recommendation Systems

**Trade-offs**

Advantages:
- Captures meaning
- Enables semantic search

Disadvantages:
- High dimensional
- Computationally expensive

**Interview Notes**

These are three different concepts:
```
Token → Token ID → Embedding
"Dog" → 104      → [0.28, -0.62, 0.41, ...]
```

---

# 1.8 Positional Encoding

**What is it?**

Positional Encoding gives Transformers information about the order of tokens.

**Why does it exist?**

Attention alone treats tokens as a set. It has no concept of sequence.

Without positional information:
```
"Dog bites man"
"Man bites dog"
```
look identical to the model.

**How does it work?**

```
Embedding + Position → Input Embedding
```

Each token receives a positional representation before entering the Transformer.

**Types of Positional Encoding**

- **Sinusoidal (Original Transformer)** — Fixed mathematical functions. Simple but doesn't generalize well to lengths unseen during training.
- **Learned Absolute** — Positions are learned embeddings. Used in BERT and early GPT models.
- **RoPE (Rotary Position Embeddings)** — Encodes position by rotating the embedding vectors. The current standard used by Llama, Mistral, Qwen, DeepSeek, and most modern LLMs. Generalizes better to longer sequences and preserves relative position information naturally.
- **ALiBi (Attention with Linear Biases)** — Adds position bias directly to attention scores. Used in some models for length extrapolation.

**Production Uses**

Every Transformer.

**Trade-offs**

Advantages:
- Preserves word order

Disadvantages:
- Long contexts become harder

**Interview Notes**

Transformers are position agnostic until positional encoding is added. If asked "what positional encoding do modern LLMs use?" — the answer is RoPE.

---

# 1.9 Self-Attention

**What is it?**

Self-Attention allows every token to determine which other tokens are most relevant when understanding context.

The "self" in self-attention means Q, K, and V all come from the **same sequence**. This distinguishes it from **cross-attention** (used in encoder-decoder models) where Q comes from one sequence and K/V from another.

**Why does it exist?**

Words have different meanings depending on context.
```
"Apple released a phone." → Company
"I ate an apple."         → Fruit
```

**How does it work?**

Each token produces:
- Query (Q) — "What am I looking for?"
- Key (K) — "What do I contain?"
- Value (V) — "What information do I provide?"

**The Attention Formula**

```
Attention(Q, K, V) = softmax(QKᵀ / √dₖ) × V
```

Step by step:
1. Compute attention scores: QKᵀ (dot product of queries and keys)
2. Scale by √dₖ (square root of key dimension) — **prevents softmax saturation**. Without scaling, large dot products push softmax into regions with tiny gradients, making learning difficult.
3. Apply **softmax** — converts raw scores into a probability distribution that sums to 1. Each token gets a weight representing how much attention to pay to every other token.
4. Multiply by V — produce the weighted sum (context vector).

```
Input
↓
Q, K, V
↓
QKᵀ / √dₖ
↓
Softmax
↓
× V
↓
Context Vector
```

**Production Uses**
- GPT
- Claude
- Gemini
- Llama

**Trade-offs**

Advantages:
- Captures long-range dependencies
- Better context understanding

Disadvantages:
- O(n²) complexity
- Expensive for long sequences

**Interview Notes**

Attention answers: "Which words should I pay attention to?"

Common interview follow-ups:
- Why divide by √dₖ? → Prevents softmax saturation for large dimensions.
- What does softmax do here? → Normalizes scores into a probability distribution.
- What's the difference between self-attention and cross-attention? → Self: Q, K, V from same sequence. Cross: Q from one sequence, K/V from another.

---

# 1.10 Attention Complexity

**What is it?**

Attention compares every token with every other token.

**Why does it exist?**

To compute contextual relationships.

**Complexity**
```
n tokens
↓
Attention Matrix: n × n
↓
O(n²)
```

As context increases: Memory ↑, Latency ↑, GPU Cost ↑

**Solutions**
- Flash Attention
- Sparse Attention
- Sliding Window Attention
- Ring Attention
- Linear Attention

**Production Uses**
- GPT-4
- Claude
- Gemini
- Llama

---

# 1.11 Multi-Head Attention

**What is it?**

Instead of one attention mechanism, the Transformer runs multiple attention heads in parallel.

**Why does it exist?**

Different heads learn different relationships: Grammar, Syntax, Coreference, Semantics.

**How does it work?**

```
Input
↓
Head 1, Head 2, Head 3, ... Head N
↓
Concatenate
↓
Output
```

**Production Uses**

All Transformer models.

**Trade-offs**

Advantages:
- Richer representations

Disadvantages:
- More computation

---

# 1.12 Feed Forward Network (FFN)

**What is it?**

A Feed Forward Network is applied independently to every token after attention.

**Why does it exist?**

Attention mixes information across tokens. FFN transforms information within each token.

**Workflow**

```
Attention Output → Linear → Activation (GELU) → Linear → Output
```

**Production Uses**

Every Transformer.

---

# 1.13 Residual Connections

**What is it?**

Residual Connections allow information to bypass layers.

**Why does it exist?**

Deep networks become difficult to train. Residuals help gradients flow during backpropagation.

**Workflow**

```
Input
↓
Transformer Layer
↓
+ Original Input
↓
Output
```

Advantages: Easier optimization, Stable training, Better convergence.

---

# 1.14 Layer Normalization

**What is it?**

Layer Normalization normalizes activations before or after computation.

**Why does it exist?**

Training becomes unstable without normalization. LayerNorm stabilizes learning.

**Workflow**

```
Input → Normalize → Transformer Layer
```

Modern LLMs use **Pre-LN** (normalize before the sublayer) rather than Post-LN (the original Transformer). Pre-LN produces more stable training at scale.

**Production Uses**

Every Transformer architecture.

**Trade-offs**

Advantages:
- Stable gradients
- Faster convergence

Disadvantages:
- Small computational overhead

---

# 1.15 Transformer Variants

**What is it?**

Transformer architectures are categorized based on how they process input and generate output.

**Why does it exist?**

Different NLP tasks require different architectures: Understanding text, Generating text, Translating text.

**Types**

```
Transformer
│
├── Encoder (BERT)
├── Decoder (GPT, Claude, Llama)
└── Encoder-Decoder (T5, BART)
```

**Encoder** — Reads the entire sentence simultaneously. Best for: Classification, Search, Sentiment Analysis. Cannot generate text naturally.

**Decoder** — Generates text one token at a time. Best for: Text Generation, Chatbots, Coding. Weaker for pure classification tasks.

**Encoder-Decoder** — Encoder reads input, Decoder generates output. Best for: Translation, Summarization, Question Answering. Flexible but larger and slower.

**Production Uses**
- BERT (Encoder)
- GPT (Decoder)
- T5, BART (Encoder-Decoder)

---

# 1.16 Decoder-Only Transformer Architecture

**What is it?**

Modern LLMs such as GPT, Claude, Llama, Gemini, and DeepSeek primarily use decoder-only Transformers.

**Why does it exist?**

Decoder-only models excel at autoregressive text generation.

**Architecture**

```
Prompt
↓
Tokenizer
↓
Embeddings
↓
Positional Encoding
↓
Decoder Block
├── Masked Multi-Head Attention
├── Feed Forward Network
├── Residual Connections
└── LayerNorm
↓
Next Token
↓
Repeat
```

**Causal Masking**

The attention in a decoder is **masked (causal)** — each token can only attend to itself and previous tokens, never future tokens. This is what makes generation autoregressive. Without the causal mask, the model could "cheat" by looking at the answer while generating.

```
Token 1 can see: [Token 1]
Token 2 can see: [Token 1, Token 2]
Token 3 can see: [Token 1, Token 2, Token 3]
```

This is a common interview question — the causal mask is what distinguishes a decoder from an encoder.

**Key Components of a Transformer Block**

```
Input
↓
LayerNorm
↓
Masked Multi-Head Attention
↓
Residual Connection
↓
LayerNorm
↓
Feed Forward Network
↓
Residual Connection
↓
Output
```

**Production Uses**
- GPT Series
- Claude
- Gemini
- Llama
- Mistral
- Qwen
- DeepSeek

---

# 1.17 LLM Training Pipeline

**What is it?**

The LLM Training Pipeline is the end-to-end process of converting raw text into a trained language model.

**Why does it exist?**

An LLM cannot understand language without learning statistical relationships from massive amounts of text. Training teaches the model these relationships.

**How does it work?**

```
Raw Data
↓
Collection
↓
Cleaning
↓
Deduplication
↓
Tokenization
↓
Pretraining
↓
Supervised Fine-Tuning (SFT)
↓
Alignment (RLHF / DPO / RLAIF)
↓
Production Model
```

**Training Stages**

**Data Collection** — Sources: Books, Research Papers, Websites, GitHub, Documentation, Public Datasets.

**Data Cleaning** — Removes: Spam, Duplicates, Corrupt data, Low-quality content.

**Pretraining** — Model predicts the next token billions of times using **cross-entropy loss**.
```
"The capital of France is" → Predict "Paris"
```

**Supervised Fine-Tuning (SFT)** — Experts provide high-quality examples.
```
Question → Ideal Answer → Model learns desired behavior
```

**Alignment** — Improves helpfulness and safety.
Methods: RLHF, DPO, RLAIF.

**Production Uses**

Every modern LLM.

**Trade-offs**

Advantages:
- Strong language understanding

Disadvantages:
- Extremely expensive
- Requires GPUs
- Months of training

---

# 1.18 Inference Pipeline

**What is it?**

Inference is the process of generating responses after the model has been trained.

**Workflow**

```
User Prompt
↓
Tokenizer
↓
Token IDs
↓
Embeddings
↓
Transformer
↓
Logits
↓
Sampling
↓
Next Token
↓
Repeat
```

**Production Uses**
- ChatGPT
- Claude
- Cursor
- Gemini

**Trade-offs**

Training → Very expensive (one-time).
Inference → Must be optimized for latency and cost (ongoing).

---

# 1.19 Sampling Strategies

**What is it?**

Sampling determines which token is selected from the model's probability distribution.

**Greedy Search** — Always selects the highest probability token. Deterministic but less creative.

**Temperature** — Controls randomness. Lower → More deterministic. Higher → More creative.

**Top-k Sampling** — Choose from only the top k most probable tokens.

**Top-p (Nucleus Sampling)** — Choose the smallest set of tokens whose cumulative probability exceeds p. Most production LLMs use Top-p.

**Trade-offs**

Lower randomness → Reliable, Less creative.
Higher randomness → Creative, More hallucinations.

---

# 1.20 Context Window

**What is it?**

The context window is the maximum number of tokens an LLM can process at one time.

**Why does it exist?**

Attention complexity increases rapidly with sequence length. Longer contexts require significantly more computation.

**Workflow**

```
Prompt + Conversation History + Retrieved Documents + Memory
↓
Context Window
↓
LLM
```

**Production Challenges**
- Context overflow
- Token cost
- Latency
- Retrieval quality

**Solutions**
- Summarization
- Context Compression
- Memory
- RAG

---

# 1.21 Hallucinations

**What is it?**

A hallucination occurs when an LLM generates information that appears plausible but is incorrect or unsupported.

**Why does it happen?**
- Missing knowledge
- Weak retrieval
- Poor prompting
- Ambiguous questions
- Overconfident generation

**Mitigation**
- RAG
- Better prompting
- Tool calling
- Human verification
- Evaluation

---

# 1.22 Fine-Tuning

**What is it?**

Fine-tuning adapts a pretrained model for a specific domain or task.

**Why?**

General models lack domain-specific expertise.
```
Medical → Medical Assistant
Legal   → Legal Assistant
Finance → Financial Assistant
```

**Types**
- **Full Fine-Tuning** — Updates all model weights. Most expensive, best results.
- **LoRA (Low-Rank Adaptation)** — Freezes original weights, trains small adapter matrices. Much cheaper.
- **QLoRA** — LoRA on a quantized model. Even cheaper, some quality trade-off.

**Trade-offs**

Advantages:
- Better domain performance

Disadvantages:
- Expensive
- Difficult to update
- Can overfit

---

# 1.23 Prompt Engineering

**What is it?**

Prompt Engineering is the process of designing prompts to obtain better responses from an LLM.

**Techniques**
- Zero-shot
- One-shot
- Few-shot
- Chain of Thought
- ReAct
- XML Prompting

**Production Uses**

Every AI application.

**Limitations**

Prompt engineering cannot compensate for missing knowledge.

---

# 1.24 Context Engineering

**What is it?**

Context Engineering is the process of constructing the optimal context before sending a request to an LLM. Unlike prompt engineering, it focuses on everything the model receives — not just the prompt.

This framing was popularized by Andrej Karpathy, who argued that what you put into the context window matters more than how you word the prompt.

**Components**
- System Prompt
- User Prompt
- Memory
- RAG
- MCP
- Tool Results
- Conversation History
- User Preferences

**Workflow**

```
System Prompt + Conversation + Memory + Retrieved Documents + Tool Results
↓
Context Builder
↓
LLM
```

**Why?**

The quality of context often matters more than the wording of the prompt.

---

# 1.25 Retrieval-Augmented Generation (RAG)

**What is it?**

RAG retrieves external information before generation.

**Why?**

LLMs cannot continuously learn new knowledge.

**Workflow**

```
User Query
↓
Embedding
↓
Retriever
↓
Vector Database
↓
Top-K Documents
↓
Prompt Builder
↓
LLM
```

**Components**
- Chunking
- Embeddings
- Retriever
- Vector DB
- Reranker
- Prompt Builder

**Production Uses**
- Enterprise AI
- Internal Search
- Customer Support

**Trade-offs**

Advantages:
- Latest knowledge
- Lower hallucinations

Disadvantages:
- Retrieval latency
- Chunk quality matters

---

# 1.26 Model Context Protocol (MCP)

**What is it?**

MCP is an open protocol created by **Anthropic** that standardizes communication between LLMs and external tools. It uses **JSON-RPC** over stdio, SSE, or streamable HTTP as the transport layer.

**Architecture**

```
User
↓
MCP Client
↓
LLM
↓
MCP Server
↓
Tools
↓
Response
```

**MCP Components**

```
Host → Client → Server → Tools / Resources / Prompts
```

- **Host** — Runs the AI application.
- **Client** — Communicates with MCP Servers. Maintains a 1:1 connection with each server.
- **Server** — Exposes capabilities.
- **Tools** — Executable functions the LLM can call.
- **Resources** — Files, APIs, databases the LLM can read.
- **Prompts** — Reusable prompt templates.

**Production Uses**
- Cursor
- Claude Desktop
- Windsurf
- IDE Assistants

---

# 1.27 AI Agents

**What is it?**

An AI Agent is an LLM capable of planning, reasoning, using tools, and executing tasks autonomously.

**Architecture**

```
Goal
↓
Planner
↓
Memory
↓
Retriever
↓
LLM
↓
Tools
↓
Execution
↓
Reflection
↓
Final Result
```

**Components**
- Planner
- Memory
- Tools
- Reflection
- Reasoning

**Agent Execution Loop**

```
Observe → Plan → Reason → Act → Reflect → Repeat
```

Most modern autonomous agents follow this loop.

**Production Uses**
- Devin
- Cursor
- Claude Code
- AI Research Agents

---

# 1.28 Reasoning Models

**What is it?**

Reasoning models generate intermediate reasoning before producing the final answer.

**Workflow**

```
Question → Reasoning → Intermediate Steps → Final Answer
```

Advantages: Better coding, Better mathematics, Better planning.

Examples: OpenAI o-series, Gemini Thinking, Claude Thinking.

---

# 1.29 Multimodal Models

**What is it?**

Models capable of processing multiple data modalities: Text, Images, Audio, Video, PDFs.

**Workflow**

```
Image + Question → Multimodal LLM → Answer
```

Production Uses: OCR, Visual QA, Document Understanding.

---

# 1.30 Small Language Models (SLMs)

**What is it?**

Compact language models optimized for low latency and lower hardware requirements.

Advantages: Fast inference, Lower cost, Mobile deployment.

Examples: Phi, Gemma, TinyLlama.

---

# 1.31 Knowledge Distillation

**What is it?**

Transfer knowledge from a large Teacher Model to a smaller Student Model.

**Workflow**

```
Teacher → Soft Targets → Student → Smaller Model
```

Advantages: Lower latency, Smaller models, Reduced cost.

---

# 1.32 Quantization

**What is it?**

Reduce the precision of model weights to decrease memory and increase inference speed.

**Precision Levels**
```
FP32 → BF16 → FP16 → INT8 → INT4
```

Advantages: Lower memory, Faster inference.

Trade-offs: Slight accuracy loss.

---

# 1.33 Inference Optimization

Production LLMs use several optimization techniques.

**KV Cache** — Stores previous attention computations. Faster generation, Lower latency.

**Flash Attention** — Optimized attention algorithm. Lower GPU memory, Faster attention.

**Continuous Batching** — Serve multiple requests simultaneously. Higher GPU utilization, Better throughput.

**Speculative Decoding** — A smaller model predicts candidate tokens. The larger model verifies them. Faster generation, Lower latency.

**Production Frameworks**
- vLLM
- TensorRT-LLM
- SGLang
- Ollama
- llama.cpp

---

# 1.34 Model Parameters

**What is it?**

Parameters are the learned weights inside a neural network. These values determine how the model behaves.

```
7B → 13B → 70B → 405B
```

More parameters → Greater capacity → Higher memory → Higher inference cost.

**Trade-offs**

Small Models: Fast, Less capable.
Large Models: Better reasoning, Expensive.

---

# 1.35 Context vs Memory

| Context | Memory |
|---------|--------|
| Temporary | Persistent |
| Current Prompt | Stored Across Sessions |
| Limited by Context Window | External Storage |
| Deleted After Conversation | Retrieved Later |

**Interview Notes**

This is one of the most common interview questions.

---

# 1.36 RAG vs Fine-Tuning

| RAG | Fine-Tuning |
|-----|-------------|
| Dynamic Knowledge | Behavioral Adaptation |
| No Weight Updates | Updates Weights |
| Cheap | Expensive |
| Easy Updates | Requires Retraining |
| Uses External Data | Uses Learned Knowledge |

---

# 1.37 Production Best Practices

- Choose the appropriate model size for the workload.
- Prefer RAG over fine-tuning for frequently changing knowledge.
- Optimize prompts and context to reduce token usage.
- Use memory selectively based on relevance.
- Evaluate every component of the AI system, not just the LLM.
- Monitor latency, cost, token usage, and quality in production.
- Apply inference optimizations such as KV Cache, Flash Attention, and batching.
- Implement observability and regression testing before deployment.
