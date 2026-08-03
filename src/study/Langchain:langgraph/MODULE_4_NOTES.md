# Module 4 — RAG (Retrieval-Augmented Generation)

## L1: What is RAG & Why It Exists

### The Problem:
LLMs have a knowledge cutoff. Ask about internal docs, recent policies, or private data → hallucination or "I don't know."

### Two Bad Solutions:
```
Fine-tuning  → expensive, slow, stale immediately when data changes
Stuff in prompt → context window limits, costs scale linearly, mostly noise
```

### RAG = The Smart Solution:
**Retrieve** relevant pieces at query time → inject into prompt → LLM answers grounded in real data.

### The 3-Stage Pipeline:
```
1. RETRIEVE  — Search knowledge base → return top-K relevant chunks
2. AUGMENT   — Build prompt: system msg + retrieved chunks + user question
3. GENERATE  — LLM reads context, produces grounded response
```

### The Indexing Pipeline (happens BEFORE queries):
```
Raw Documents → Load → Chunk → Embed → Store in Vector DB
     📄           📥      ✂️       🔢          💾
```

| Step | What it does | Example |
|---|---|---|
| Load | Read raw files | PDF, HTML, Markdown, CSV |
| Chunk | Split into small pieces | 500 tokens per chunk |
| Embed | Convert text → vector | OpenAI text-embedding-3-small |
| Store | Save in searchable DB | Chroma, FAISS, Pinecone |

### Why Chunks, Not Whole Documents:
```
❌ Whole doc (50 pages) → too big, mostly irrelevant
✅ Small chunk (1 para) → fits easily, high signal-to-noise
```

### Semantic Search:
Matches by MEANING, not keywords. "refund policy" matches "return and reimbursement guidelines."

### RAG vs Fine-Tuning vs Long Context:
```
RAG          → cheap, instant updates, scales to millions of docs
Fine-Tuning  → expensive, stale, good for style/behavior changes
Long Context → medium cost, needle-in-haystack problem at scale
```

### Knowledge Graphs vs RAG (student question):
Not competitors — complementary. RAG finds paragraphs by meaning (unstructured). KGs find entities and relationships (structured). Best systems combine both. KGs covered in Module 5.

### Quiz: PASS (3/3)
**Q1: What are the 3 stages of RAG? What happens in each?**
My answer: ✅ Retrieve (search knowledge base → top-K chunks), Augment (build prompt with chunks + question), Generate (LLM produces grounded response).

**Q2: Why chunk documents instead of embedding them whole?**
My answer: ✅ Whole doc = too big, mostly irrelevant noise. Chunks = fit easily, high signal-to-noise ratio.

**Q3: RAG vs fine-tuning — when to use each?**
My answer: ✅ RAG = cheap, instant updates, scales to millions of docs. Fine-tuning = expensive, stale, good for style/behavior changes.

---

## L2: Document Loading & Chunking Strategies

### Document Loading:
LangChain provides one loader per format:
```python
from langchain_community.document_loaders import (
    PyPDFLoader,           # PDFs
    TextLoader,            # .txt files
    CSVLoader,             # CSV → one doc per row
    WebBaseLoader,         # scrape a webpage
    UnstructuredMarkdownLoader,  # .md files
)

loader = PyPDFLoader("handbook.pdf")
documents = loader.load()   # returns list of Document objects
```

### Document Object — Two Fields:
```python
doc.page_content   # the actual text (string)
doc.metadata       # dict: {"source": "handbook.pdf", "page": 3}
```
Metadata = essential for citations ("Answer from handbook.pdf, page 3").

### Why Chunking Matters (Goldilocks Problem):
```
❌ Too big   → exceeds window, wastes tokens on irrelevant parts
❌ Too small → loses context ("the policy states that..." — states WHAT?)
✅ Just right → captures one complete idea per chunk
```

### Chunking Strategies:

**1. Fixed-Size (most common):**
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=500,      # max characters per chunk
    chunk_overlap=50,    # overlap between chunks
)
chunks = splitter.split_documents(documents)
```

**2. RecursiveCharacterTextSplitter (LangChain default):**
```
Tries to split on natural boundaries, in order:
  1. "\n\n" (paragraphs)  ← best
  2. "\n"   (lines)       ← good
  3. " "    (words)       ← okay
  4. ""     (characters)  ← last resort
```

**3. Semantic Chunking:**
Split by meaning (topic shifts), not character count. Uses embeddings. More expensive, higher quality.

**4. Document-Specific:**
```python
# Markdown: split on headers
from langchain.text_splitter import MarkdownHeaderTextSplitter

# Code: split on functions/classes
from langchain.text_splitter import Language, RecursiveCharacterTextSplitter
splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON, chunk_size=500
)
```

### chunk_overlap — Why It Matters:
```
Without overlap:
  Chunk 1: "...the refund policy for enterprise clients"
  Chunk 2: "requires manager approval within 30 days."
  → Search finds Chunk 1, misses the rule in Chunk 2!

With overlap (50 chars):
  Chunk 1: "...the refund policy for enterprise clients requires manager"
  Chunk 2: "enterprise clients requires manager approval within 30 days."
  → Both chunks have the connection.
```

### Chunk Size Guidelines:
```
100-200   → precise facts, Q&A
300-500   → general RAG (START HERE) ← recommended
500-1000  → summarization, analysis
1000+     → risk of retrieving irrelevant text
```
**Rule of thumb**: 500 chars, 50 overlap. Measure. Adjust.

### Full Pipeline:
```python
# 1. LOAD
loader = PyPDFLoader("handbook.pdf")
documents = loader.load()

# 2. CHUNK
splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
chunks = splitter.split_documents(documents)
# "Loaded 42 pages → 287 chunks"
```

### Metadata Preservation:
Chunks inherit parent metadata + you can add custom:
```python
for chunk in chunks:
    chunk.metadata["department"] = "HR"
    chunk.metadata["version"] = "2024-Q3"
```
Later: filter retrieval by metadata ("only HR docs from Q3").

### Common Mistakes:
```
❌ No overlap           → split sentences, missed context
❌ Chunks too big       → noisy retrieval
❌ Chunks too small     → lost context
❌ Ignoring structure   → splitting Markdown on chars instead of headers
❌ Throwing away metadata → can't cite sources, can't filter
```

### JS Analogy:
```
Loading  = fs.readFile / fetch
Chunking = sliding window over an array with overlap
Overlap  = like Array.slice() with step < window size
```

### Quiz: PASS (2/3)
**Q1: What are the two fields on a Document object?**
My answer: ✅ `page_content` (the text string) and `metadata` (dict with source info for citations/filtering).

**Q2: You set chunk_overlap=0 and a key sentence gets split across two chunks. What happened?**
My answer: ✅ No overlap = context lost at chunk boundaries. Fix: add overlap (~50 chars) as a context bridge.

**Q3: Building RAG over a Python codebase — which chunking strategy?**
⚠️ My answer: ❌ Said semantic chunking — WRONG. Semantic chunking = prose (uses text embeddings, not suited for code structure).
✅ Correct: `RecursiveCharacterTextSplitter.from_language(language=Language.PYTHON)` — language-aware, splits on functions/classes.

---

## L3: Embeddings

### What Are Embeddings:
Text → vector (list of numbers) that captures MEANING.
```
"refund policy"     → [0.12, -0.45, 0.78, ...]
"return guidelines" → [0.11, -0.44, 0.77, ...]  ← SIMILAR (close vectors)
"pizza recipe"      → [-0.82, 0.15, -0.33, ...] ← DIFFERENT (far apart)
```

### Two Methods:
```python
from langchain_openai import OpenAIEmbeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

embed_query()      → embed ONE text (user's search query)
embed_documents()  → embed MANY texts (chunks, during indexing)
```

### Popular Models:
```
text-embedding-3-small  → 1536 dims, OpenAI, cheap (best default)
text-embedding-3-large  → 3072 dims, OpenAI, better accuracy, 2x cost
all-MiniLM-L6-v2        → 384 dims, HuggingFace, FREE (runs locally)
voyage-code-3           → good for code search
```

### Dimensions = Vector Size:
More dims → more nuance (better accuracy), more storage, slower search.
Fewer dims → faster, smaller, slightly less accurate.

### ⚠️ CRITICAL RULE: Same model for indexing AND querying. ALWAYS.
```
❌ Index with model A, query with model B → vectors incompatible, retrieval FAILS
✅ Index with model A, query with model A → correct matches
```
If you upgrade the model → must RE-INDEX everything.

### Choosing a Model:
```
Prototype/learning?     → text-embedding-3-small (cheap, good enough)
Production accuracy?    → text-embedding-3-large
No API budget/offline?  → all-MiniLM-L6-v2 (FREE, local, HuggingFace)
Code search?            → voyage-code-3
```

### Quiz: PASS (1/3)
**Q1: What's the difference between `embed_query()` and `embed_documents()`?**
My answer: ✅ `embed_query()` = one text (user's search query). `embed_documents()` = many texts (chunks, during indexing).

**Q2: You indexed with text-embedding-3-small but query with text-embedding-3-large. What happens?**
⚠️ My answer: ❌ Said "better accuracy" — WRONG. Different dimensions (1536 vs 3072), vectors incompatible, retrieval FAILS.
✅ Correct: Must use SAME model for indexing AND querying. If upgrading → must RE-INDEX everything.

**Q3: 500 internal docs, no API budget. Which embedding model?**
⚠️ My answer: ❌ Picked OpenAI model (costs money).
✅ Correct: `all-MiniLM-L6-v2` — free, runs locally via HuggingFace, no API calls needed.

---

## L4: Vector Stores

### What Is a Vector Store:
Database optimized for storing and searching vectors by SIMILARITY (not exact match).
```
Regular DB:   WHERE title = "refund policy"    ← exact match
Vector Store: Find top-4 closest vectors        ← similarity match
```

### Popular Vector Stores:
```
FAISS      → in-memory library, fast, prototyping (no server needed)
Chroma     → lightweight DB, SQLite file, local dev, metadata filtering
Pinecone   → managed cloud, zero-ops, production
pgvector   → Postgres extension, no new infra if already on Postgres
Qdrant     → self-hosted/cloud, high performance
```

### Common API (all stores share same interface):
```python
# Create:
vectorstore = AnyStore.from_documents(chunks, embeddings)

# Search:
docs = vectorstore.similarity_search(query, k=4)

# Convert to retriever (for chains):
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
```

### as_retriever():
Wraps vector store into standard LangChain retriever interface → pluggable into any RAG chain.

### Decision Tree:
```
Prototype/hackathon?        → FAISS (zero setup) or Chroma (with filters)
Already using Postgres?     → pgvector (no new infra)
Production, no DevOps?      → Pinecone (managed cloud)
Large scale, self-hosting?  → Qdrant or Weaviate
```

### Quiz: PASS (3/3)
**Q1: You're at a hackathon. Which vector store?**
My answer: ✅ Chroma or FAISS — both lightweight, zero setup.

**Q2: What does `as_retriever()` do?**
My answer: ✅ Wraps vector store into standard LangChain retriever interface — pluggable into any RAG chain.

**Q3: Company already on Postgres, needs vector search. What do you use?**
My answer: ✅ pgvector — Postgres extension, no new infrastructure, one DB for everything.

---

## L5: Retrieval Strategies

### 5 Strategies:
```
1. Similarity Search (default) → top-K by cosine similarity. Simple. Can be redundant.
2. MMR (Max Marginal Relevance) → balances relevance + diversity. lambda_mult controls balance.
3. Score Threshold → only return chunks above minimum similarity score.
4. Hybrid (Semantic + BM25) → combines vector search with keyword search.
5. BM25 (pure keyword) → traditional keyword ranking, no embeddings.
```

### MMR — When results are redundant:
```python
docs = vectorstore.max_marginal_relevance_search(
    query, k=4, fetch_k=20, lambda_mult=0.5  # 0=diversity, 1=relevance
)
```

### Hybrid — When queries mix language + specific terms:
```python
from langchain.retrievers import EnsembleRetriever
hybrid = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.3, 0.7]
)
```

### Score Threshold — When wrong answer is worse than no answer:
```python
retriever = vectorstore.as_retriever(
    search_type="similarity_score_threshold",
    search_kwargs={"score_threshold": 0.7}
)
```

### Choosing k:
```
k=1-2  → precise facts    |  k=3-5  → good default    |  k=8-10 → comprehensive
```

### Quiz: PASS (2.5/3)
**Q1: Your retrieval returns 4 nearly identical chunks. How to fix?**
My answer: ✅ MMR (Max Marginal Relevance) — `lambda_mult` controls relevance-diversity balance.

**Q2: User searches for ticket ID "INC00123456" but semantic search returns nothing useful. Fix?**
My answer: ✅ Hybrid search — semantic + keyword (BM25) catches exact terms like ticket IDs.

**Q3: When would you use score_threshold retrieval?**
🔄 My answer: Described mechanism correctly but missed concrete scenario.
✅ Better answer: When wrong answer is worse than no answer (e.g., medical chatbot — wrong drug info is dangerous, better to say "I don't know").

---

## L6: Rerankers & Metadata Filtering

### Rerankers — A Second Pass:
```
Vector search:  embeds query and docs SEPARATELY, compares vectors (fast, approximate)
Reranker:       reads query AND document TOGETHER as one input (slow, accurate)
```

### Pattern: Retrieve many → Rerank → Keep best few:
```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_cohere import CohereRerank

base_retriever = vectorstore.as_retriever(search_kwargs={"k": 20})  # fetch wide
reranker = CohereRerank(model="rerank-v3.5", top_n=4)               # pick best 4
retriever = ContextualCompressionRetriever(
    base_compressor=reranker, base_retriever=base_retriever
)
```

### ⚠️ Key Mistake: Fetch k=4 then rerank to 4 = pointless. Must fetch MORE than you keep.

### Metadata Filtering — BEFORE search:
```python
docs = vectorstore.similarity_search("refund", k=4, filter={"department": "HR"})
```

### Filtering vs Reranking:
```
Filtering:  BEFORE search — removes docs from search space (scope narrowing)
Reranking:  AFTER search — re-scores retrieved results (quality improvement)
Best: Use BOTH → filter scope → search → rerank → top-K
```

### Multi-tenant Security: Metadata filtering, NOT reranking. Reranking re-orders but doesn't EXCLUDE. Filtering REMOVES from search space entirely.

### Quiz: PASS (3/3)
**Q1: Why do rerankers produce better results than vector search alone?**
My answer: ✅ Reranker reads query AND document TOGETHER as one input (cross-encoder). Vector search embeds them separately and compares vectors.

**Q2: You set `top_n=4` on the reranker but `k=4` on the base retriever. What's wrong?**
My answer: ✅ Pointless — reranking 4 docs down to 4. Must fetch wide (`k=20`), rerank narrow (`top_n=4`).

**Q3: Multi-tenant app — Company A must never see Company B's docs. Reranker or metadata filter?**
My answer: ✅ Metadata filtering — security boundary. Reranking re-orders but doesn't EXCLUDE docs from search space.

---

## L7: Query Rewriting & Context Optimization

### 5 Techniques:

**1. Query Rewriting** — LLM rewrites vague query into precise search query.
```
"it's not working" → "SSO login authentication failure troubleshooting"
```

**2. HyDE (Hypothetical Document Embeddings)** — Generate hypothetical answer, search with THAT.
```
Why: hypothetical answer is closer in embedding space to actual docs.
Questions and answers use different vocabulary.
```

**3. Multi-Query** — Generate 3+ search queries from different angles, merge results.
```python
retriever = MultiQueryRetriever.from_llm(retriever=base, llm=llm)
```

**4. Contextual Compression** — After retrieval, extract only relevant parts from chunks.

**5. Step-Back Prompting** — For specific questions, ask broader question first for background.

### ⚠️ Don't stack ALL techniques:
```
Each adds 1+ LLM calls. Stacking all = 8-10 LLM calls per query.
Result: latency nightmare + high cost.
Rule: Start with plain retrieval. Add techniques ONLY when you measure a specific problem.
```

### Quiz: PASS (2/3)
**Q1: User types "it doesn't work" and retrieval returns garbage. Fix?**
My answer: ✅ Query rewriting — LLM transforms vague query into precise search query (e.g., "SSO login authentication failure troubleshooting").

**Q2: What is HyDE and why does it work?**
My answer: ✅ Generate hypothetical answer, search with THAT. Works because hypothetical answer is closer in embedding space to actual docs than the original question (different vocabulary).

**Q3: You stack query rewriting + HyDE + multi-query + compression on every query. What's the problem?**
⚠️ My answer: ❌ Answered multi-query benefit instead of the actual problem.
✅ Correct: Each technique adds 1+ LLM calls. Stacking all = 8-10 LLM calls per query → latency nightmare + high cost. Start with plain retrieval, add techniques only when you measure a specific problem.

---

## L8: RAG Evaluation

### The RAG Triad — 3 Core Metrics:
```
RETRIEVAL:
  1. Context Relevance — are retrieved chunks relevant to query?

GENERATION:
  2. Faithfulness      — is answer grounded in context? (no hallucination)
  3. Answer Relevance  — does answer address the user's question?
```

### ⚠️ Key Distinction (missed on quiz):
```
Context says "30 days", LLM answers "90 days":
  → NOT a context relevance problem (chunks were right!)
  → IS a faithfulness problem (LLM ignored/hallucinated)
```

### Diagnosing Problems:
```
Low context relevance    → retrieval problem: better chunking, embeddings, reranker
Low faithfulness         → generation problem: better prompt, lower temp, better model
Low answer relevance     → context may not contain the answer (retrieval), or LLM is vague (generation)

High faithfulness + low answer relevance:
  → LLM faithfully summarizes WRONG chunks
  → Retrieved context doesn't contain the actual answer
  → Fix: improve RETRIEVAL
```

### Evaluation Tool — RAGAS:
```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision
result = evaluate(dataset, metrics=[faithfulness, answer_relevancy, context_precision])
```

### Rules:
- 50-100 diverse test cases minimum
- Cover edge cases, not just happy paths
- Evaluate regularly (quality drifts as docs change)
- Use a different/stronger model to evaluate (not the same LLM)

### Quiz: PASS (0.5/3) — RAG Triad needs revision.
**Q1: Context says "30 days", LLM answers "90 days". Which RAG Triad metric failed?**
⚠️ My answer: ❌ Said "context relevance" — WRONG. The chunks WERE relevant (they contained "30 days").
✅ Correct: **Faithfulness** — LLM ignored/hallucinated instead of staying grounded in the retrieved context.

**Q2: Name the 3 metrics of the RAG Triad and which stage each measures.**
🔄 My answer: Listed them but mixed up which stage each belongs to.
✅ Correct: Context Relevance (RETRIEVAL), Faithfulness (GENERATION), Answer Relevance (GENERATION).

**Q3: High faithfulness but low answer relevance. What's happening and how to fix?**
⚠️ My answer: ❌ Said "no idea."
✅ Correct: LLM is faithfully summarizing the WRONG chunks. Retrieved context doesn't contain the actual answer. Fix: improve RETRIEVAL (better chunking, embeddings, reranker).

**Key distinction**: faithfulness = grounded in context, context relevance = right chunks found.

---

## MODULE 4 EXAM — 100% PASS (14/14) — First attempt, best exam yet.

### Section A (5/5):

**A1: What are the 3 stages of RAG?**
My answer: ✅ Retrieve, Augment, Generate.

**A2: What are the two fields on a Document object?**
My answer: ✅ `page_content` and `metadata`.

**A3: You index with model A and query with model B. What happens?**
My answer: ✅ Vectors incompatible, retrieval fails. Must use same model.

**A4: Context says "30 days", LLM says "90 days". Which RAG Triad metric?**
My answer: ✅ Faithfulness — LLM not grounded in context.
🎉 **Got this RIGHT on exam after getting it WRONG on L8 quiz.**

**A5: What does chunk_overlap prevent?**
My answer: ✅ Prevents losing context at chunk boundaries — sentences split across chunks.

### Section B (6/6):

**B1: Debug this RAG pipeline — find the bugs.**
My answer: ✅ Found both bugs: (1) mismatched embedding models for index vs query, (2) reranker defined but never used. Also improved k=4→10 (fetch wide, rerank narrow).

**B2: User asks a follow-up question but retrieval returns irrelevant results. Fix.**
My answer: ✅ Query rewriting — use conversation history to rewrite vague follow-up into standalone search query.

**B3: Multi-tenant app — Company A sees Company B's docs after reranking. Fix.**
My answer: ✅ Reranker doesn't enforce access control (it re-orders, doesn't exclude). Need metadata filtering as security boundary.

### Section C (4/4):

**C1: Design a RAG system for 10k internal docs with monthly updates.**
My answer: ✅ text-embedding-3-small + Chroma + reranker + incremental re-indexing for monthly updates.

**C2: RAGAS scores: context_relevance=0.45, faithfulness=0.92, answer_relevance=0.88. Diagnose and fix.**
My answer: ✅ Low context_relevance = retrieval problem. Faithfulness + answer_relevance high = LLM is fine. Both fixes should target retrieval (better chunking, embeddings, reranker).

### Key Improvement: RAG Triad confusion from L8 quiz (0.5/3) fully resolved in exam (A4 ✅).
