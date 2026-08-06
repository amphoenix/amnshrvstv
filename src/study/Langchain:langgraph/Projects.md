Project 1 — Customer Support Deflection Agent with Agentic RAG

Problem: A customer sends a message, and the agent classifies its intent, retrieves relevant docs, attempts a resolution, and escalates when it can't resolve things on its own. The agent decides for itself whether retrieval is even needed — not every message warrants a KB lookup ("hi" doesn't).

State Schema:

TypedDict:
  messages: Annotated[list, add_messages]
  intent: str | None          # classified intent
  confidence: float           # how sure the agent is
  retrieval_needed: bool      # does this need KB lookup
  escalate: bool              # hand off to human
  ticket_context: dict | None # order/account data from tool calls

Graph Architecture:

                    START
                      │
                ┌─────▼──────┐
                │  classifier │  ← LLM classifies intent + confidence
                └─────┬──────┘
                      │
              ┌───────┼────────┐
              │       │        │
         (retrieval) (tool)  (chitchat)
              │       │        │
        ┌─────▼───┐ ┌─▼─────┐ ┌▼─────────┐
        │ retrieve │ │ lookup │ │ respond   │
        │ from KB  │ │ order/ │ │ (no RAG)  │
        └─────┬───┘ │ account│ └─────┬─────┘
              │     └──┬────┘       │
              │        │            │
              ▼        ▼            │
        ┌─────────────────┐        │
        │    generator     │◄───────┘
        │  (draft answer)  │
        └────────┬────────┘
                 │
           ┌─────▼──────┐
           │  evaluator  │  ← checks: is answer grounded? confident enough?
           └─────┬──────┘
                 │
          ┌──────┴──────┐
       (pass)        (fail)
          │              │
    ┌─────▼───┐   ┌─────▼──────┐
    │ respond  │   │  escalate  │  ← HITL interrupt
    │ to user  │   │  to human  │
    └─────┬───┘   └─────┬──────┘
          │             │
          ▼             ▼
         END           END

Nodes (7):

classifier — An LLM call with structured output that returns an intent enum (billing/technical/order_status/general/chitchat), a confidence float, and a retrieval_needed bool
retrieve — Embeds the query, searches the vector store, and returns the top-k chunks with metadata
lookup — A tool-call node that calls the order-lookup / account-lookup APIs (mock these with the @tool decorator)
respond_direct — Handles chitchat and greetings with a plain conversational response, no retrieval involved
generator — Takes the retrieved context, ticket_context, and messages, and drafts an answer with citations
evaluator — Acts as an LLM-as-judge, checking groundedness (is every claim backed by the retrieved docs?) and confidence, and returns a pass/fail
escalate — Formats the handoff context for a human agent, using interrupt() for the HITL step

Edges:

classifier → conditional edge based on intent and retrieval_needed
evaluator → conditional edge based on pass/fail
All terminal nodes → END

Key Design Decisions:

The classifier is a separate node rather than something embedded in the system prompt — this gives you explicit routing control, so you can trace exactly why the agent took a given path
The evaluator opens the door to a self-correction loop. Right now it's single-pass (fail → escalate); once you're comfortable, add a retry edge — fail → rewrite query → retrieve again → generator (max 2 retries) — and that becomes your first ReAct cycle
Use a checkpointer with thread_id for conversation memory across turns — MemorySaver for dev, PostgresSaver if you want persistence
The escalate node uses LangGraph's interrupt(), which is where the HITL patterns from Project 3 and Project 4 begin

What You'll Learn:

StateGraph, START/END, compile
Conditional edges (the routing logic)
Tool calling with @tool
Structured output for classification
Checkpointer for multi-turn memory
Streaming (stream the generator's response)
interrupt() basics

Suggested Stack:

LangGraph + LangChain
Any LLM (OpenAI/Anthropic/local)
FAISS or Chroma for vector store
A fake KB dataset (grab any product FAQ or support docs)
LangSmith for tracing (see exactly what each node did)

Stretch goals when you're done:

Add streaming for the generator node
Add a rewrite → re-retrieve → re-generate retry loop (turns this into a ReAct agent)
Add long-term memory — store resolved tickets and use them as few-shot examples for similar future queries
