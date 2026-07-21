# RAG + Elasticsearch Internals — Master Document
## How retrieval actually works, layer by layer, and WHY every piece exists

This is the depth under your RAG project — for "okay, but how does the retrieval actually work?"

**Format:** MECHANISM (what happens) → WHY (the design reason) → INTERVIEW LINE (say it verbatim). Learn the WHYs hardest.

**Honesty rule carried over:** this doc covers more than your pipeline used. Bright line in interviews: "the technique works like X; in our system we did Y." `[VERIFY against your build]` markers throughout.

---

# PART A — RAG INTERNALS

# A1. Why RAG exists — the parametric/non-parametric split

An LLM has two possible knowledge stores:
- **Parametric** — baked into weights at training. Frozen, uncitable, unforgetteable, expensive to change.
- **Non-parametric** — text placed in the context window at inference. Fresh, citable, deletable, per-user.

RAG is just the engineering discipline of filling the context window with the *right* non-parametric knowledge, cheaply, at query time.

**WHY not fine-tuning for knowledge?** Fine-tuning changes *behavior and form*, and injects knowledge unreliably — models trained on new facts still hallucinate around them, can't cite a source, can't respect ACLs (weights have no permission model), and "deleting" a revoked document from weights is an open research problem. Your enterprise requirements — freshness, citations, per-user permissions, right-to-delete — are each individually fatal to fine-tuning. That four-point list IS the interview answer.

**WHY not just long context (dump everything in)?** Four costs: (1) money — you pay per token, every query; (2) latency — prefill scales with input length; (3) accuracy — "lost in the middle": models attend best to the start and end of context, retrieval quality degrades as haystacks grow; (4) most corpora don't fit anyway. Retrieval is the *index* that makes long context affordable — same reason databases have indexes instead of full table scans.

**INTERVIEW LINE:** "RAG isn't an AI technique, it's a database technique applied to LLMs — treat the context window as an expensive cache and retrieval as the query planner deciding what deserves to be in it."

---

# A2. Embeddings — the machinery under vector search

**MECHANISM.** An embedding model (a transformer, typically a *bi-encoder*) maps a text to a fixed-length vector (384–3072 dims) such that semantic similarity ≈ geometric proximity. Trained by **contrastive learning**: show the model (query, relevant doc, irrelevant docs) triplets; the loss pulls positive pairs together and pushes negatives apart. That's it — proximity means "these tended to be relevant to each other in training data."

**Similarity functions — know the difference:**
- **Cosine** — angle between vectors, ignores magnitude.
- **Dot product** — angle AND magnitude.
- **Euclidean (L2)** — straight-line distance.
- Practical rule: **normalize vectors to unit length, then cosine ≡ dot product**, and dot product is the cheapest to compute (no sqrt, SIMD-friendly). This is why every serious system stores normalized vectors and uses dot product. Saying this one sentence signals you've touched the metal.

**WHY fixed dimensions?** ANN indexes and SIMD hardware need uniform-length arrays. The dimension count is a quality/cost dial: more dims = more expressive = more RAM and slower search. (Matryoshka embeddings — training so the first N dims are usable alone — let you truncate one model to multiple sizes; a good "what's modern" mention.)

**The traps to know:**
1. **Different models' vectors are incompatible.** Not "slightly off" — meaningless to compare. Different training = different spaces. Hence: model change → full re-embed → reindex (aliases, §B8).
2. **Asymmetric texts.** Queries are short questions; chunks are long prose. Good retrieval models are trained on (query, passage) pairs specifically; some use prefixes ("query: …" / "passage: …"). Using a symmetric-similarity model for QA retrieval quietly costs you recall.
3. **Embeddings compress.** A 500-token chunk becomes ~1500 floats. Multiple topics in one chunk = averaged, diluted vector that matches nothing well. This single fact is the root cause of most chunking rules (§A3).
4. **Out-of-domain vocabulary.** Your internal service names, ticket IDs, acronyms weren't in the embedding model's training data — they embed near-randomly. This is the deep WHY behind hybrid search (§A4): BM25 covers exactly the vocabulary embeddings are blind to.

**Your choices to `[VERIFY]`:** which model, which dimension, hosted vs self-hosted (data boundary vs ops), and the content-hash cache so unchanged docs aren't re-embedded (real money on re-crawls).

---

# A3. Chunking — why it exists and what actually matters

**WHY chunk at all?** Three independent forces:
1. **Embedding dilution** (§A2 trap 3) — one vector per too-much-text matches nothing precisely.
2. **Retrieval granularity** — you want to *return* the paragraph that answers, not a 40-page doc.
3. **Context budget** — top-K chunks must fit alongside the prompt, cheaply.

**MECHANISM — the strategy ladder, worst to best:**
- **Fixed-size character splitting** — baseline; splits mid-sentence, mid-table. Never defend this.
- **Recursive splitting** — try to split on paragraphs, then sentences, then words; respects natural boundaries at a target size (e.g. 300–500 tokens, 10–15% overlap). WHY overlap: an answer straddling a boundary must exist intact in at least one chunk; overlap is insurance priced in storage.
- **Structure-aware** — split on the document's own skeleton (headings, sections, Jira ticket = ticket+comments as one unit). WHY: authors already segmented by topic; use their work.
- **Contextual enrichment** — prepend doc title + heading path (or an LLM-written one-line summary of where this chunk sits) to every chunk before embedding. WHY: a chunk saying "restart the service after applying it" is meaningless alone; "Payments-Service Runbook > Config Changes: restart the service…" embeds where it should. This is the highest-ROI cheap trick in chunking — say it.
- **Parent-document / small-to-big retrieval** — embed and match on *small* chunks (precise vectors), but hand the LLM the *parent* section (full context). WHY: matching wants precision, generation wants context — they're different requirements, so decouple them. If you didn't ship this, name it as your known next upgrade.
- **Semantic chunking** — split where consecutive-sentence embedding similarity drops. Elegant, costly, rarely beats structure-aware on structured corpora — a fine "we evaluated and rejected because" answer.

**INTERVIEW LINE:** "Chunk size isn't a number, it's a resolution tradeoff: small chunks give precise matching but starved context; big chunks give rich context but diluted vectors. We split on document structure, enriched every chunk with its heading path, and validated the choice against recall@K on our golden set — not vibes."

---

# A4. Retrieval — bi-encoders, BM25, hybrid, and the RRF math

## A4.1 The bi-encoder / cross-encoder split (the single most important concept in this doc)

- **Bi-encoder:** embed query and document *separately*; similarity = one dot product. Documents embedded **offline, once**. Query time = embed one query + ANN lookup. Fast, scales to millions, but the model never sees query and document *together* — it's comparing two lossy summaries.
- **Cross-encoder:** feed (query + document) through the model **together**; full token-level attention between them; outputs one relevance score. Far more accurate — and requires one full model forward pass *per candidate per query*. Cannot pre-compute anything. Unusable on a corpus; perfect on 50 candidates.

**WHY this split dictates the whole architecture:** retrieval is a funnel *because* accuracy and scalability live in different model shapes. Cheap-and-recall-oriented first (bi-encoder + BM25 over millions), expensive-and-precision-oriented last (cross-encoder over 50). Every production RAG stack is some version of this funnel. If you explain only one thing about retrieval, explain this.

## A4.2 BM25 — know the actual formula behavior

Score of doc D for query terms q₁..qₙ: Σ IDF(qᵢ) · TF-component, where the TF-component is `tf·(k1+1) / (tf + k1·(1 − b + b·|D|/avgdl))`.

Don't memorize it — know what each knob DOES:
- **IDF** — rare terms score high, common terms near zero. WHY: "PROJ-4521" is nearly a primary key; "the" is noise.
- **k1 (~1.2) — term-frequency saturation.** The 10th occurrence of a term adds far less than the 2nd. WHY this beats raw TF-IDF: keyword-stuffed docs stop winning; relevance isn't linear in repetition.
- **b (~0.75) — length normalization.** Long docs get their TF discounted toward the corpus average length. WHY: long docs match everything a little; b corrects the bias.

**Where BM25 wins vectors:** exact identifiers, codes, names, acronyms, negations — precisely the out-of-vocabulary things embeddings garble (§A2 trap 4). Enterprise queries are FULL of these. **Where it loses:** paraphrase ("affordable places to stay" vs "budget hotels") — zero term overlap, zero score.

## A4.3 Hybrid + Reciprocal Rank Fusion

Run BM25 and kNN **in parallel**, fuse the ranked lists:

**RRF: fused(d) = Σ over retrievers 1/(k + rankᵣ(d))**, k ≈ 60.

**WHY rank-based fusion instead of adding/weighting the scores?** BM25 scores are unbounded and corpus-dependent; cosine scores live in [−1,1]. They're **different units** — adding them is adding meters to kelvin. Any normalization you invent (min-max, z-score) is unstable per-query. Ranks are the only common currency. **WHY k=60-ish:** damping — without k, rank 1 (score 1.0) crushes rank 2 (0.5); with k=60, rank 1 (1/61) vs rank 2 (1/62) — consensus across retrievers matters more than winning one list. A document ranked #3 by both retrievers beats one ranked #1 by only one. That sentence is the whole intuition.

**INTERVIEW LINE:** "Hybrid isn't hedging — the two retrievers have provably disjoint failure modes: BM25 is blind to paraphrase, vectors are blind to out-of-vocabulary identifiers. RRF fuses them on ranks because their scores are in incommensurable units."

## A4.4 Query understanding (before retrieval even starts)

- **Rewriting/expansion** — LLM cleans the query, expands acronyms, adds synonyms. Cheap recall win.
- **Multi-turn condensing** — "does it also work for EE?" is unanswerable standalone; condense conversation + follow-up into one standalone query *before* embedding. Mandatory for chat UIs. `[VERIFY if you shipped this]`
- **Decomposition** — multi-part questions → sub-queries → merged retrieval.
- **HyDE** — have the LLM hallucinate a *hypothetical answer*, embed THAT, search with it. WHY it works: an answer-shaped text lands nearer to answer-shaped chunks than a question does (the asymmetry problem from §A2). Great "depth of field" mention even if unused.
- **Structured extraction** — pull filters out of the query ("last quarter" → date range filter; "in the payments repo" → source filter). This is where retrieval meets your metadata design.

---

# A5. Reranking

**MECHANISM:** retrieve generously (top 50–100 via RRF), score each candidate with a cross-encoder (or LLM-as-reranker), keep top 5–8 for the prompt.

**WHY the numbers:** first stage is tuned for **recall** (is the right chunk *anywhere* in the 100?), reranker restores **precision** (is it in the top 5?). Costs: a cross-encoder pass per candidate — 50 forward passes of a small model, tens of ms on decent hardware; LLM rerankers are better and slower/pricier. The reranker is usually the best relevance-per-dollar upgrade in the whole pipeline because it's the only component that reads query and chunk *together*.

**WHY top 5–8 into the prompt and not 50:** lost-in-the-middle (§A1), token cost, and — subtle — irrelevant chunks aren't neutral, they're *distractors* the model may quote. More context is not more accuracy past a small K.

`[VERIFY: did you rerank? If not: "RRF top-K went straight to the prompt; reranking was the next planned upgrade — cross-encoder over the top 50, because it's the only stage that attends across query and document." Honest + shows you know exactly what you'd do.]`

---

# A6. Generation — grounding, citations, refusal

- **Grounded prompt contract:** answer ONLY from the provided chunks; cite the chunk ID for every claim; if the answer isn't there, say so and point where to look. WHY the citation requirement isn't cosmetic: (1) it lets users verify — trust; (2) it *changes model behavior* — a model forced to attach a source per claim hallucinates measurably less; (3) it gives you an automatic faithfulness check (does the cited chunk actually support the claim?).
- **Refusal threshold:** if no candidate clears a similarity/rerank score floor, don't generate — return "not found, here's where to look." WHY: a wrong-but-confident documentation answer is negative value; it silently propagates errors into production changes. "We optimized for calibrated usefulness, not answer rate" is a senior sentence.
- **Context ordering:** put the strongest chunks first and last (lost-in-the-middle again). Free accuracy.
- **Injection surface:** retrieved chunks are *data*, but the model reads them as text — a doc containing "ignore previous instructions" is a prompt-injection vector *through the index*. Same class of threat as MCP tool results; same answer: treat retrieved content as untrusted, never let it override the system contract. Connecting this to your MCP security story is a cross-doc senior move.

---

# A7. Evaluation — the section that separates seniors

**The cardinal rule: evaluate retrieval and generation SEPARATELY.** Most "the LLM is hallucinating" bugs are retrieval bugs — the right chunk never arrived. Debug the funnel stage by stage or you'll tune the wrong component.

**Retrieval metrics (needs a golden set: real questions → known correct source chunks/docs):**
- **recall@K** — is a correct chunk in the top K? The metric that matches how RAG consumes retrieval (the LLM sees K chunks; order within K barely matters). Your headline metric.
- **MRR** — 1/rank of the first correct hit, averaged. Cares about being at the top; right metric when K is tiny.
- **nDCG@K** — graded relevance (perfect/partial/none), position-discounted. The IR-standard metric; use when relevance isn't binary.

**Generation metrics:**
- **Faithfulness** — is every claim in the answer supported by the retrieved chunks? Scored by LLM-as-judge (decompose answer into claims, verify each against context). This is THE hallucination metric.
- **Answer relevance** — does it address the question?
- (RAGAS is the standard framework bundling these — name it.)

**LLM-as-judge caveats to volunteer:** judges have biases (verbosity, position, self-preference); calibrate against a sample of human labels before trusting; pin the judge model + prompt or your metric drifts under you. Volunteering the caveats is the credibility move.

**Online:** thumbs up/down + "wrong source" flag → weekly review → hard failures become new golden-set entries. The golden set *grows from production*, it isn't written once.

**INTERVIEW LINE:** "Our debugging rule was retrieval-first: recall@5 on the golden set before touching a prompt. And the golden set was fed by production failures, so evaluation got harder over time, not easier."

---

# A8. Advanced patterns — know when each is the wrong answer too

| Pattern | What | When it wins | When it's wrong |
|---|---|---|---|
| Parent-document retrieval | match small, return big | precise matching + context-hungry generation | tiny docs; storage doubling for nothing |
| Late interaction (ColBERT) | per-*token* vectors, MaxSim at query time | accuracy between bi- and cross-encoder at scale | storage blows up ~100×/doc; ops complexity |
| GraphRAG | extract entity graph, retrieve via relationships | multi-hop questions ("what depends on X's config?") | plain factual QA; expensive graph construction |
| Agentic RAG | LLM loops: retrieve → assess → re-query | complex research tasks | latency-sensitive QA; cost multiplies per hop |
| Fine-tuned embeddings | tune the embedding model on your domain pairs | heavy internal jargon, mature pipeline | before you've fixed chunking/hybrid — wrong order |

**WHY have this table:** "would you use GraphRAG?" is a screener for whether you chase fashions. The senior answer names the query class each pattern serves and picks by failure analysis of the current system, not novelty.

---

# PART B — ELASTICSEARCH INTERNALS

# B1. The mental model — what ES actually is

Elasticsearch = a **distributed coordination layer wrapped around Apache Lucene**. Lucene does the actual searching (inverted indexes, vectors, scoring) inside a single **shard**; ES adds sharding, replication, routing, a REST API, and cluster management on top. Almost every ES behavior that surprises people — near-real-time visibility, immutable segments, deletes-that-aren't — is a Lucene property leaking through. Frame it this way and the rest of this doc becomes derivable instead of memorized.

**The hierarchy:**
```
Cluster → Nodes → Index (logical) → Shards (each = one Lucene index)
                                       → Segments (immutable mini-indexes)
                                          → inverted index, doc values,
                                            stored fields, HNSW graph(s)
```
- **Primary shards:** fixed at index creation. WHY fixed: routing is `hash(_id) % primary_count` — change the count and every existing doc is on the wrong shard. Changing it = reindex (or shrink/split APIs, which are still segment-level rebuilds).
- **Replicas:** copies of primaries; changeable anytime. WHY: durability (node dies → replica promoted) AND read throughput (searches hit primaries *or* replicas).

# B2. The inverted index — the core data structure

**MECHANISM.** At index time, text goes through an **analyzer** (tokenizer + filters: lowercase, stemming, stopwords…) producing terms. The inverted index maps **term → postings list** (sorted doc IDs containing it, + term frequencies + positions). A query analyzes the query text the same way, looks up each term's postings — already sorted, so intersections/unions are cheap merges — and scores matches with BM25.

**WHY it's fast:** search cost scales with the number of *query terms* and their postings lengths, not corpus size. It's the same reason a book index beats reading the book.

**The trap everyone gets asked:** `text` vs `keyword` fields. `text` is analyzed (tokenized, stemmed) → full-text search; `keyword` is stored as one exact token → filters, aggregations, sorting, IDs. Query-time symptom of getting it wrong: "why doesn't my exact-match filter on a text field work?" — because the indexed terms are analyzed fragments, not your original string. Also know: **doc values** — the columnar, per-field forward index (doc → value) used for sorting/aggregations, i.e. the inverted index turned sideways. Inverted = "which docs contain X"; doc values = "what's X for doc N."

# B3. The write path — translog, refresh, flush, merge (guaranteed question territory)

A document is indexed. What actually happens:

1. Doc is written to an **in-memory indexing buffer** AND appended to the **translog** (transaction log, on disk, fsynced by default per request).
2. **Refresh** (default every 1s): the in-memory buffer becomes a new **segment** — written to the filesystem cache, NOT yet fsynced — and opens for search. **This is why ES is "near-real-time": a doc is searchable after the next refresh, not the moment you index it.**
3. **Flush** (periodic / translog-size-triggered): a Lucene commit — segments are fsynced to durable disk, translog truncated.
4. **Merge** (background, continuous): small segments merged into bigger ones.

**WHY the translog exists:** refresh writes to the FS cache for speed; a crash before flush would lose those docs — except the translog replays them on recovery. Durability without paying fsync-per-segment.

**WHY segments are immutable:** no locks (readers never block writers), OS page cache stays valid forever, compression is better on frozen data, crash recovery is trivial (a segment either fully exists or doesn't). The price of immutability:
- **A delete doesn't delete** — it marks the doc in a per-segment tombstone bitmap; the doc is still on disk and still costs scoring exclusion until…
- **An update is delete + reinsert** of the whole doc.
- **Merges** are where deletes physically die: merging rewrites live docs into a new segment and drops tombstoned ones.

**WHY this matters to YOUR pipeline specifically:** re-ingesting a doc corpus = mass updates = tombstones piling up + merge storms of I/O. This is the mechanical reason the alias-swap reindex pattern (§B8) beats updating in place for full re-embeds — you write pristine segments into a fresh index and drop the old one wholesale. Connecting write-path internals to your ingestion design is a top-tier senior answer.

**Refresh tuning you should mention:** during bulk ingestion, set `refresh_interval: -1` and `replicas: 0`, then restore after — no point building searchable segments and replica copies mid-firehose. One sentence, big "has operated this" signal.

# B4. The read path — query-then-fetch

A search on an N-shard index:
1. **Coordinating node** (whichever node got the request) fans out to one copy of every shard.
2. **Query phase:** each shard runs the query locally, returns only its top-K **(doc ID, score)** pairs — not documents.
3. Coordinator merges N sorted lists → global top K.
4. **Fetch phase:** fetch full documents for just those K winners from their shards.

**WHY two phases:** shipping full documents from every shard for results that will be discarded is wasted I/O; ship cheap (id, score) tuples first, hydrate winners only.

**Two consequences to volunteer:**
- **Deep pagination is pathological:** page 100 × size 10 → every shard returns 1000 candidates, coordinator sorts N×1000. Hence `search_after` (cursor on sort values, constant cost) for deep paging — the same opaque-cursor argument you make in the MCP doc (§6 there). PIT (point-in-time) keeps a consistent snapshot across pages.
- **Scores are per-shard by default:** IDF is computed from each shard's local statistics. On small/skewed indexes, identical docs can score differently per shard. Usually washes out at scale; `dfs_query_then_fetch` fixes it by pre-collecting global stats at extra cost. Knowing this exists = you've debugged relevance for real.

# B5. dense_vector + HNSW — how ANN actually works

**The problem:** exact kNN = compare the query vector to every doc vector. O(n·d) per query. Fine at 10k docs, dead at 10M. ANN trades a little recall for orders-of-magnitude speed.

**HNSW (Hierarchical Navigable Small World) — the mechanism, explainable in 60 seconds:**
- Build a graph where each vector is a node linked to its ~M nearest neighbors. Stack layers like a **skip list**: top layers are sparse (few nodes, long-range links), bottom layer contains everyone (short-range links).
- Search: start at the top layer, greedily walk toward the query (always move to the neighbor closest to it), drop a layer, repeat; on the bottom layer keep a beam of the best candidates.
- **WHY layers:** greedy search in a flat proximity graph gets stuck in local minima and takes long walks. The sparse top layers are express lanes — coarse jumps land you in the right region cheaply; the dense bottom layer finishes precisely. Same logarithmic trick as a skip list. That analogy IS the interview answer.

**The three knobs and what they trade:**
- **`m`** (default 16) — links per node. ↑m = better recall, more memory, slower build.
- **`ef_construction`** (default 100) — beam width at *build* time. ↑ = better graph quality, slower indexing.
- **`num_candidates`** (query-time, per shard) — beam width at *search* time; top `num_candidates` are found per shard, best k returned. **The live recall↔latency dial.** ↑ = better recall, slower query. You tune this one in production; the other two require reindex.

**Memory math — do this out loud in interviews:** float32, 1024 dims → 4KB/vector. 10M chunks → ~40GB *of vectors alone*, plus graph links — and HNSW wants to live in RAM (off-heap page cache), because graph traversal is random access; hitting disk per hop murders latency. This math is WHY quantization exists:
- **int8 scalar quantization:** 4× smaller, ~1KB/vector, negligible recall loss. Long the ES default.
- **BBQ (Better Binary Quantization):** ~1 bit/dim — ~95% memory reduction; ES pairs it with **rescoring** (rough binary-space ranking → re-score the small candidate set with true float vectors, kept on disk). BBQ became the *default* for ≥384-dim vectors in ES 9.1; DiskBBQ (GA 9.2) makes disk-resident vectors practical. WHY rescoring makes aggressive quantization safe: the lossy index only has to get candidates *approximately* right; exact math runs on the shortlist. Funnel thinking again — same shape as retrieve-then-rerank.

**Filtered kNN — the differentiator question:** "how do filters interact with vector search?"
- **Post-filtering** (naive): kNN first, filter after → you asked for k=10, filter kills 7, you return 3. Broken.
- **Pre-filtering during traversal** (what ES/Lucene does): compute the filter's doc bitmap first, then traverse HNSW *only accepting candidates that pass*, until k survivors are found. Correct top-K, costlier on very restrictive filters (the graph wanders through mostly-excluded nodes; engines fall back toward exact search on tiny filtered sets).
- **WHY this was a real reason to pick ES:** your queries ALWAYS carry an ACL filter (§A6/your platform). An engine that post-filters breaks ACL'd retrieval correctness, not just performance. This is your strongest "why Elasticsearch" point — security-correct filtered ANN.

# B6. Sparse learned vectors — ELSER / sparse_vector (the third retrieval family)

Between classic BM25 and dense vectors sits **learned sparse retrieval**: a model (ELSER in ES) expands a text into weighted terms — including related terms that don't appear in it ("docker" might activate "container", "kubernetes"). Stored in `sparse_vector` fields, searched through the inverted index machinery.
- WHY it's interesting: semantic-ish matching with inverted-index efficiency and *explainability* (you can see which terms matched — auditors like this).
- Tradeoffs: ELSER is English-only, ~512-token fields, runs on ES ML nodes (capacity planning).
- `semantic_text` field type = the managed on-ramp: automatic chunking + embedding at index time.
- `[VERIFY: you almost certainly used dense vectors + BM25, not ELSER — then say exactly that, and name ELSER as the alternative you'd evaluate. Knowing the third family exists is the point.]`

# B7. Hybrid in ES — retrievers and RRF

Modern ES (8.14+) has a **retriever tree** in the search API: a `standard` retriever (BM25) and a `knn` retriever composed under an `rrf` retriever — the fusion from §A4.3 runs *inside* ES, one request, no client-side merging. `rank_window_size` controls how deep each child list goes before fusion; a `text_similarity_reranker` retriever can wrap the whole thing to run a rerank model as the final stage — the entire A4/A5 funnel expressible as one declarative query. If your build predates retrievers and you fused client-side or used the older `rrf` in `sub_searches`: say that, then say the modern shape. `[VERIFY which you used]`

# B8. Operations — the section that says "I ran this in production"

- **Aliases + blue/green reindex (your zero-downtime story):** apps query the alias `docs-search`; embedding model change or mapping change → build `docs-v7` in the background, validate recall on the golden set, atomically swap the alias, delete `docs-v6`. WHY mandatory: mappings are largely immutable and vector spaces are incompatible across models (§A2) — in-place is not an option, so the swap pattern isn't a nicety, it's the only correct move.
- **Shard sizing rules of thumb:** target ~10–50GB per shard; avoid thousands of tiny shards (each has fixed heap/file-handle overhead and its own HNSW graph to search — fan-out cost) and avoid monster shards (slow recovery/rebalance). Oversharding is the #1 rookie cluster disease — saying that phrase lands.
- **Memory model:** JVM heap ≤ ~30GB (compressed oops), remainder of RAM deliberately *left to the OS page cache* — that's where segments and HNSW graphs actually live. "Half memory to heap, half to Lucene" is the classic sizing line.
- **ILM (index lifecycle management)** for time-based data; less relevant to your doc corpus, one sentence of awareness suffices.
- **Consistency model to state plainly:** near-real-time search (refresh), durable via translog, primary-then-replica write replication; ES is not your transactional source of truth — it's a *derived index* over sources-of-truth, rebuildable at any time. That last framing also neatly explains why your ingestion pipeline being idempotent + hash-based (your failure story) is the real durability strategy.

# B9. Staying current — ES in 2025–26 (your "I track this" section)

- ES 9.x is the current line (9.4 as of mid-2026). Vector economics moved fast: BBQ default (9.1), DiskBBQ GA (9.2), GPU-accelerated indexing via NVIDIA cuVS (9.3, claimed ~12× indexing speedup), plus big filtered-kNN performance work. Practical upshot: the RAM-math objection to large vector corpora (§B5) is shrinking release by release.
- `semantic_text` + inference endpoints = ES will now call the embedding model for you at index/query time — the build-vs-buy line for ingestion pipelines moved. Your hand-rolled embedding service is still the right call when you need model control and data-boundary guarantees; say both sides.
- ES|QL matured into the production query language for analytics.
- Know the OpenSearch fork exists (2021 licensing split; AWS's fork) — "which would you pick" is a real question: same Lucene core; ES currently leads on quantization/vector tooling maturity, OpenSearch on licensing/cost posture. One balanced sentence, no tribalism.

---

# B10. Rapid-fire internals Q&A (drill AI-off, 60–90s each)

1. **"Why is ES 'near-real-time'?"** → refresh cycle: in-memory buffer → searchable segment every ~1s; durability is the translog's job, searchability is refresh's job — two different clocks. §B3.
2. **"What happens when you delete a document?"** → tombstone bit; physically removed only at merge; updates are delete+reinsert. Then connect: why re-ingestion churn → merge pressure → alias-swap reindex. §B3.
3. **"Walk me through a search request."** → coordinator → query phase (ids+scores per shard) → merge → fetch phase. Then volunteer deep-pagination and per-shard IDF. §B4.
4. **"How does HNSW work?"** → skip-list-of-proximity-graphs answer; then m / ef_construction / num_candidates and which one you tune live. §B5.
5. **"1024-dim floats, 50M chunks — what breaks?"** → do the math aloud (~200GB vectors), RAM residency, then quantization ladder int8 → BBQ+rescore, and shard fan-out costs. §B5.
6. **"How do filters interact with kNN?"** → pre-filter during traversal vs broken post-filtering; ACL correctness argument; cost on restrictive filters. §B5.
7. **"Why Elasticsearch over a dedicated vector DB?"** → hybrid first-class, *correct* filtered ANN (ACLs), one operational system, in-house ops maturity; honest con: HNSW tuning + memory is on you. §B5/§A4.
8. **"Why RRF instead of weighted score sums?"** → incommensurable score units; ranks are the common currency; k≈60 damping → consensus wins. §A4.3.
9. **"BM25 vs TF-IDF?"** → saturation (k1) and length normalization (b) — the two fixes, and what abuse each prevents. §A4.2.
10. **"How do you change embedding models with zero downtime?"** → spaces incompatible → full re-embed → build new index → golden-set gate → alias swap. §A2 + §B8.
11. **"text vs keyword?"** → analyzed terms vs exact token; the failed-exact-filter symptom; doc values for the columnar side. §B2.
12. **"How do you evaluate retrieval?"** → recall@K headline (matches how the LLM consumes results), MRR/nDCG when order matters, golden set grown from production failures, retrieval-first debugging. §A7.
13. **"How do you stop the LLM hallucinating?"** → layered: recall first, grounding contract + citations, refusal threshold, faithfulness eval, feedback loop. Never claim zero. §A6/§A7.
14. **"RAG vs fine-tuning?"** → the four fatal requirements: freshness, citations, ACLs, deletion. §A1.
15. **"What's new in this space?"** → BBQ/DiskBBQ economics, semantic_text managed pipelines, GPU indexing — then one opinion of your own about what it changes for pipelines like yours. §B9.

---

# C. Honesty guardrails

- Bright line, every answer: "the mechanism is X; in *our* system we did Y." You very likely did NOT use: ELSER, ColBERT, GraphRAG, semantic chunking, maybe reranking `[VERIFY each]`. Naming what you didn't use and why is a senior move; claiming it is a collapse waiting for one follow-up.
- Numbers discipline: corpus size, dims, recall@5, p95 — real values or honest "roughly, measured via…". The memory math in §B5 you can always do live from your real dims/doc-count — practice it with YOUR numbers.
- If pushed past this doc: "I haven't gone below that layer — my working model is X, and I'd verify in the Lucene docs." Reasoning + honesty over recall, every time.
