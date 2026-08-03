# Module 3 — LangGraph Fundamentals

## L1: What is LangGraph & Why It Exists

### Key Concepts:
1. `create_react_agent` = ONE straight loop. Model controls everything.
2. **Real agents need**: branching, human approval, parallel steps, subflows, custom state
3. **LangGraph** = design agent as a directed graph (nodes + edges)
4. `create_react_agent` is actually BUILT ON LangGraph (prebuilt 2-node graph)

### When to use:
- **create_react_agent**: simple chatbot, quick prototype, < 3 tools
- **LangGraph**: production agents with branching, approvals, complex logic

### JS Analogy:
- State ≈ Redux store
- Nodes ≈ Express route handlers
- Edges ≈ Express routing
- Conditional edges ≈ middleware that redirects

### Quiz: PASS (3/3)
**Q1: What's wrong with `create_react_agent` for a production ServiceNow agent?**
My answer: ✅ It's a single loop — model controls everything. No branching, no human approval, no custom routing.

**Q2: LangGraph models agents as a ___. What are the 3 components?**
My answer: ✅ Directed graph. Components: State, Nodes, Edges.

**Q3: What JS pattern is LangGraph State most similar to?**
My answer: ✅ Redux store — shared state that flows through all handlers.

---

## L2: The 5-Step Design Process

### The 5 Steps (ALWAYS follow before coding):
```
1. DEFINE THE STATE  — What data flows through?
2. DRAW THE NODES    — What are the steps? (each does ONE thing)
3. DRAW THE EDGES    — What connects what?
4. IDENTIFY CONDITIONS — Where does it branch?
5. CODE IT           — NOW write Python
```

### Design Template:
```
AGENT: _______________
STATE: messages (always), _____, _____
NODES: 1. ___ 2. ___ 3. ___
EDGES: START → ___ → ___ → END
CONDITIONS: After ___: if ___ → ___, else → ___
```

### #1 Mistake: Jumping to code without designing the graph first.

### Example: ServiceNow Incident Agent
- Nodes: classify, lookup, respond, escalate
- Conditional edge: after classify → if P0 → escalate, else → lookup
- Code: `graph.add_conditional_edges("classify", route_by_priority)`

### Quiz: PASS (retry)
**Q1: Design a refund agent — what are the nodes?**
⚠️ My answer (first): "refund" as one node — ❌ WRONG. Each node does ONE thing.
✅ Correct: 3 nodes — check_eligibility, process_refund, send_apology.

**Q2: What's the FIRST step before writing any LangGraph code?**
My answer: ✅ Design the graph (define state, nodes, edges, conditions) — step 1 of the 5-step process.

**Q3: In a ServiceNow incident agent, what conditional edge would you add after classify?**
My answer: ✅ If P0 → escalate, else → lookup.

---

## L3: State, TypedDict, Annotated Reducers

### Key Concepts:
1. **State = shared data object** flowing between all nodes (like a shared Google Doc every node can read/edit, or like Redux store)
2. **TypedDict** = dictionary with fixed, typed keys (like TS interface for a dict)
   ```python
   from typing import TypedDict
   class AgentState(TypedDict):
       messages: list
       priority: str
       customer_id: str
   ```
3. **Default behavior = REPLACE**: when a node returns a value for a key, it OVERWRITES the previous value
   ```
   Node 1 returns: {"messages": ["Hello"]}
   Node 2 returns: {"messages": ["How can I help?"]}
   State after Node 2: {"messages": ["How can I help?"]}  ← "Hello" is GONE!
   ```
4. **Reducer = APPEND**: `Annotated[list, add_messages]` tells LangGraph to APPEND new messages instead of replacing
   ```python
   from typing import Annotated
   from langgraph.graph.message import add_messages
   
   class AgentState(TypedDict):
       messages: Annotated[list, add_messages]  # REDUCER (append)
       priority: str                             # plain (replace)
       customer_id: str                          # plain (replace)
   ```
5. **`add_messages`**: smart append — new messages appended, same-ID messages updated (replaced in place)

### When to use:
```
Plain str         → latest value only (priority, customer_id, current_step)
Annotated reducer → accumulate over time (messages, errors)

Rule: Use reducer when you want to ACCUMULATE.
      Use plain when you want the LATEST value.
```

### 🔑 KEY: Without reducer on messages, each node REPLACES the history → conversation lost.

### ⚠️ SCOPE CLARIFICATION (confused me later — see project-1):
```
add_messages reducer = messages survive across NODES (within ONE invoke() run)
  classify → retrieve → generate → evaluate
  Each node's messages APPEND to state ✅

Checkpointer (L8) = messages survive across INVOKE() CALLS (between user turns)
  invoke("What's your refund policy?")  → works
  invoke("And for international?")      → ❌ NO CONTEXT without checkpointer

My project-1 has: add_messages ✅ (nodes talk to each other)
My project-1 missing: checkpointer ❌ (no multi-turn memory)
```

### JS Analogy:
```javascript
// Redux reducer — same concept:
function messagesReducer(state = [], action) {
    case 'ADD_MESSAGE': return [...state, action.payload]; // append
}
// Annotated[list, add_messages] = "use this reducer for this key"
```

### Quiz Q&A:
**Q1: What happens if `messages: list` (no reducer) and two nodes each return a message?**
My answer: ✅ Second node's message replaces first → history lost.

**Q2: What does `Annotated[list, add_messages]` mean in plain English?**
My answer: ✅ "This is a list. When nodes return new items, APPEND them to the existing list instead of replacing."

**Q3: When would you use plain `str` vs `Annotated[list, reducer]`?**
My answer: ✅ Plain for latest value (IDs, priority). Annotated for accumulating (messages, conversation history).

---

## L4: Nodes — Functions That Read & Write State

### Key Concepts:
1. **A node = just a Python function**. Nothing special. No class, no interface.
2. **Input**: receives the FULL state as a dict
3. **Output**: returns a dict with ONLY the keys you want to update (partial return — like a git diff)
4. Nodes can be: LLM calls, API calls, database queries, pure logic — anything

```python
def classify_ticket(state: AgentState) -> dict:
    # 1. READ from state
    messages = state["messages"]
    # 2. DO work
    result = model.invoke(messages)
    # 3. RETURN only changed keys
    return {"messages": [result], "priority": "P1"}
```

### The Partial Return Rule:
```
STATE BEFORE classify_ticket:
  messages: [HumanMsg("Server down")]
  priority: ""            ← empty
  customer_id: "C-456"
  resolved: False

classify_ticket returns: {"priority": "P0"}

STATE AFTER:
  messages: [HumanMsg("Server down")]   ← untouched
  priority: "P0"                         ← UPDATED
  customer_id: "C-456"                   ← untouched
  resolved: False                        ← untouched
```

### 3 Types of Nodes:
```python
# Node with LLM call:
def generate_response(state: AgentState) -> dict:
    response = model.invoke(state["messages"])
    return {"messages": [response]}

# Node with API call (no LLM):
def lookup_customer(state: AgentState) -> dict:
    info = db.query(f"SELECT * FROM customers WHERE id='{state['customer_id']}'")
    return {"customer_info": info}

# Node with pure logic (no LLM, no API):
def check_resolved(state: AgentState) -> dict:
    if state["priority"] in ["P2", "P3"]:
        return {"resolved": True}
    return {"resolved": False}
```

### Adding Nodes to Graph:
```python
graph = StateGraph(AgentState)
graph.add_node("classify", classify_ticket)   # string name → function
graph.add_node("lookup", lookup_customer)
graph.add_node("respond", generate_response)
# The STRING name is what edges reference. The FUNCTION is what runs.
```

### Common Mistakes:
```
❌ return state                    → WRONG. Return only changed keys.
❌ classify + lookup in one node   → WRONG. One node per job.
❌ messages: list (no reducer)     → each node replaces history
```

### 🐛 Python Bug: `is` vs `==`
```python
if state["priority"] is "P0"   # ❌ checks identity (same object in memory)
if state["priority"] == "P0"   # ✅ checks value equality
```
`is` might work by accident (Python caches small strings) but is UNDEFINED behavior. Always `==`.

### Quiz Q&A:
**Q1: What does a node receive and return?**
My answer: ✅ Receives full state dict. Returns partial dict with only changed keys.

**Q2: Node only updates priority. Must it also return messages, customer_id, resolved?**
My answer: ✅ No. Return only changed keys. Unchanged keys stay as-is.

**Q3: Write an escalate node that checks priority.**
My answer: ✅
```python
def escalate(state: AgentState) -> dict:
    if state["priority"] == "P0":
        return {"messages": [AIMessage(content="Escalating to human agent.")]}
    return {"messages": [AIMessage(content="Handling normally.")]}
```
Key: return AIMessage in messages list (not a custom field), use `==` not `is`.

---

## L5: Edges, Conditional Edges, Routing

### 3 Types of Edges:
```
1. Fixed Edge     — always goes A → B (no conditions)
   graph.add_edge("classify", "respond")

2. Conditional Edge — routing function decides next node
   graph.add_conditional_edges("classify", route_by_priority)

3. Entry Point    — START → first node (every graph needs one)
   graph.add_edge(START, "classify")
```

### Routing Functions:
```python
# A routing function: receives FULL STATE, returns STRING (node name)
def route_by_priority(state: AgentState) -> str:
    if state["priority"] == "P0":     # READ from state dict
        return "escalate"              # return node NAME as string
    return "respond"

# Wire it up:
graph.add_conditional_edges("classify", route_by_priority)
```

### ⚠️ Key Rule: Routing functions receive the FULL STATE dict (same as nodes).
```python
# ❌ WRONG — treating param as raw value:
def route(age: AgentState) -> str:
    if age >= 18: return "approve"    # age is a DICT, not a number!

# ✅ RIGHT — read from state:
def route(state: AgentState) -> str:
    if state["age"] >= 18: return "approve"
```

### ⚠️ Typo Danger: routing returns strings. If you return `"appprove"` but node is named `"approve"` → runtime crash.

### Quiz Q&A:
**Q1: Name the 3 types of edges in LangGraph.**
My answer: ✅ Fixed, Conditional, Entry Point.

**Q2: Write a routing function that checks age — what's the common mistake?**
My answer: ✅ Read `state["age"]`, not raw param. The function receives full state dict, not individual values.

**Q3: You return `"appprove"` from routing but the node is named `"approve"`. What happens?**
My answer: ✅ Runtime crash — string doesn't match any node name.

---

## L6: Compiling & Running the Graph

### Build-Then-Run Pattern:
```
TypeScript:   Write .ts  →  tsc compile  →  Run .js
LangGraph:    Define graph →  .compile()  →  .invoke()
```

### What compile() Does:
1. **Validates** — edges point to real nodes, all reachable from START, path to END
2. **Freezes** — no more add_node/add_edge after compile
3. **Optimizes** — builds internal execution plan

```python
graph = StateGraph(AgentState)        # builder (mutable)
# ... add nodes and edges ...
agent = graph.compile()               # compiled (frozen, executable)
```

### Key: `graph` = builder (mutable). `agent` = compiled (frozen). TWO different objects.

### invoke() — Running:
```python
result = agent.invoke({"messages": [HumanMessage(content="Server is down")]})
```
- **Input**: dict matching state schema
- **Output**: the **complete FINAL state** (every key, all updates applied) — NOT just last node's output

### Common Mistakes:
```
❌ graph.invoke(...)           → graph is builder, not executable
✅ agent.invoke(...)           → agent is compiled, can run

❌ agent.invoke("Hello")       → expects a DICT
✅ agent.invoke({"messages": [HumanMessage("Hello")]})

❌ Adding nodes after compile   → too late, agent already frozen
```

### Quiz Q&A:
**Q1: What's the difference between `graph` and `agent`?**
My answer: ✅ `graph` = builder (mutable, add nodes/edges). `agent` = compiled (frozen, executable). Can't add nodes after compile.

**Q2: What does `agent.invoke()` return?**
My answer: ✅ Complete final state dict (every key, all updates applied) — not just last node's output.

**Q3: `graph.invoke({...})` — what's wrong?**
My answer: ✅ Must use `agent.invoke()`. `graph` is the builder, not executable.

---

## L7: Functional API

### Two APIs in LangGraph:
```
Graph API:      StateGraph → add_node → add_edge → compile → invoke
Functional API: @task / @entrypoint decorators — lighter, less boilerplate
```

### Decorators:
```python
from langgraph.func import entrypoint, task

@task                        # marks a unit of work (like a node), auto-checkpointed
def classify(text: str) -> str:
    result = model.invoke(f"Classify: {text}")
    return result.content

@entrypoint()                # main orchestrator (what you call to run)
def support_agent(text: str) -> str:
    priority = classify(text).result()    # .result() = get value (like JS await)
    response = respond(priority).result()
    return response
```

### .result() — Getting Task Output:
```python
priority = classify(text)           # ❌ returns Future, not the string
priority = classify(text).result()  # ✅ blocks until done, returns value
# JS analogy: const priority = await classify(text);
```

### @task vs @tool (Important Distinction!):
```
@tool  (LangChain) — LLM decides to call it. Advertised to LLM. No checkpointing.
@task  (LangGraph) — YOUR code calls it. LLM never sees it. Auto-checkpointed.

@tool = "LLM, here's a button you CAN press"
@task = "My code WILL run this step"
```

### When to Use Which:
```
Graph API:      Complex branching, shared state, human-in-the-loop, production agents
Functional API: Simple linear pipelines, no shared state, quick prototypes
```

### Quiz Q&A:
**Q1: What are the two decorators in the Functional API?**
My answer: ✅ `@task` (unit of work, auto-checkpointed) and `@entrypoint` (orchestrator, what you call to run).

**Q2: How do you get the return value of a task?**
My answer: ✅ `.result()` — like JS `await`. `classify(text)` returns Future, `.result()` blocks until done.

**Q3: When would you choose Graph API over Functional API?**
My answer: ✅ Complex branching, shared mutable state, human-in-the-loop.

---

## L8: Persistence & Checkpointers

### Problem: Graphs are stateless by default — each invoke() is a fresh run.

### ⚠️ Don't confuse with L3's `add_messages` reducer:
```
Reducer (L3)      = state survives across NODES within one run
Checkpointer (L8) = state survives across RUNS (between user turns)

Without checkpointer: classify→generate works (reducer connects nodes)
                      but second invoke() has NO memory of the first one
```

### Solution: Compile with checkpointer + pass thread_id:
```python
from langgraph.checkpoint.memory import MemorySaver

agent = graph.compile(checkpointer=MemorySaver())
config = {"configurable": {"thread_id": "session-42"}}
result = agent.invoke({"messages": [HumanMessage("Hi")]}, config)
```

### What Gets Checkpointed: **After EVERY node** (not once at end).
```
START → classify → respond → END
           💾         💾
       checkpoint  checkpoint
```
Each checkpoint stores: full state dict, which node ran, thread_id, checkpoint_id.

### thread_id = Conversation Identity:
- Same thread_id = resume conversation (loads previous state)
- Different thread_id = fresh conversation (no shared history)
- Missing thread_id = error (checkpointer can't look up anything)

### Checkpointer Options:
```
MemorySaver    — RAM only, lost on restart (dev/testing)
SqliteSaver    — local file (single-server apps)
PostgresSaver  — database (production, multi-server)
```

### Example — WITHOUT checkpointer (my project-1 right now):
```python
agent = graph.compile()  # no checkpointer

# Turn 1:
agent.invoke({"messages": [HumanMessage("What's your refund policy?")]})
# → "Our refund policy is 30 days for most items..."

# Turn 2:
agent.invoke({"messages": [HumanMessage("And for international orders?")]})
# → "I'm not sure what you're referring to. Could you clarify?"
#    ❌ No idea what "and" refers to — state was wiped between calls
```

### Example — WITH checkpointer:
```python
from langgraph.checkpoint.memory import MemorySaver

agent = graph.compile(checkpointer=MemorySaver())
config = {"configurable": {"thread_id": "aman-session-1"}}

# Turn 1:
agent.invoke({"messages": [HumanMessage("What's your refund policy?")]}, config)
# → "Our refund policy is 30 days for most items..."
#    💾 checkpointer saves: [HumanMessage, AIMessage] under "aman-session-1"

# Turn 2 (same thread_id):
agent.invoke({"messages": [HumanMessage("And for international orders?")]}, config)
# → "For international orders, the refund window is 45 days..."
#    ✅ Checkpointer loaded Turn 1's messages, appended Turn 2's question
#    LLM sees FULL history: [Human("refund policy?"), AI("30 days..."), Human("international?")]

# Turn 3 (DIFFERENT thread_id = fresh conversation):
new_config = {"configurable": {"thread_id": "different-session"}}
agent.invoke({"messages": [HumanMessage("And for international orders?")]}, new_config)
# → "I'm not sure what you're referring to."
#    ❌ Different thread = no shared history
```

### Quiz Q&A:
**Q1: When does the checkpointer save state?**
My answer: ✅ After every node execution — not once at the end.

**Q2: You compile with checkpointer but forget to pass thread_id in config. What happens?**
My answer: ✅ Raises error — checkpointer can't look up or store without a thread_id.

**Q3: Agent forgets everything after server restart. Using MemorySaver. Fix?**
My answer: ✅ Switch to SqliteSaver or PostgresSaver — persist to disk/DB instead of RAM.

---

## L9: Streaming in LangGraph

### Two Levels of Streaming:
```
stream()          → NODE-level: one event per node completion
astream_events()  → TOKEN-level: every token from every LLM call (async)
```

### Node-Level Streaming:
```python
for event in agent.stream(input, config):
    node_name = list(event.keys())[0]
    print(f"✅ Completed: {node_name}")
# Each event = {node_name: node_output}
```

### Token-Level Streaming:
```python
async for event in agent.astream_events(input, config, version="v2"):
    if event["event"] == "on_chat_model_stream":
        token = event["data"]["chunk"].content
        print(token, end="", flush=True)
```

### stream_mode Options:
```
"updates" (default) → what each node CHANGED (partial)
"values"            → full state AFTER each node (complete)
```

### When to Use:
```
invoke()         → no streaming (background jobs, APIs)
stream()         → show progress per node (step indicators)
astream_events() → token-by-token UI (chatbot typing effect)
```

### ⚠️ Misconception Cleared: Streaming does NOT cost more. Same tokens generated either way. Streaming changes DELIVERY (when you see them), not GENERATION (how many).

### JS Analogy:
```
invoke()         = await fetch() (wait for full response)
stream()         = ReadableStream (get chunks)
astream_events() = SSE / Server-Sent Events (every tiny update)
```

### Quiz Q&A:
**Q1: What's the difference between `stream()` and `astream_events()`?**
My answer: ✅ `stream()` = node-level events (one per node completion). `astream_events()` = async token-by-token (every tiny update).

**Q2: `stream_mode="values"` vs `"updates"` — what's the difference?**
My answer: ✅ `values` = full state after each node. `updates` = only what that node changed.

**Q3: You want a typing effect in your chatbot UI. Which method?**
My answer: ✅ `astream_events()` — gives token-by-token streaming.

---

## L10: Human-in-the-Loop (Interrupts)

### Problem: Some actions are irreversible (delete account, charge card). Need human approval gate.

### interrupt() — Pause the Graph:
```python
from langgraph.types import interrupt

def delete_account(state: AgentState) -> dict:
    approval = interrupt("Agent wants to delete account. Approve?")
    if approval == "yes":
        return {"messages": [AIMessage(content="Account deleted.")]}
    return {"messages": [AIMessage(content="Deletion cancelled.")]}
```

### What Happens When interrupt() is Called:
1. Graph **pauses** — execution stops at this node
2. State is **checkpointed** (saved)
3. Interrupt value returned to your application
4. Human responds
5. You **resume** with `Command(resume=value)`

### ⚠️ Resuming — CRITICAL (missed 3 times on quizzes!):
```python
from langgraph.types import Command

# First call — runs until interrupt:
config = {"configurable": {"thread_id": "session-1"}}
result = agent.invoke({"messages": [HumanMessage("Delete my account")]}, config)

# Resume — pass Command, NOT a new HumanMessage:
result = agent.invoke(Command(resume="yes"), config)   # ✅ CORRECT
result = agent.invoke({"messages": [HumanMessage("yes")]}, config)  # ❌ WRONG — new message, not resume
```

### Key Points:
- **Command(resume=value)** — NOT the original input again. Checkpointer already has full state.
- **Same thread_id** — that's how checkpointer knows which paused graph to resume.
- **Checkpointer required** — interrupt needs to save state somewhere. No checkpointer → error.

### Patterns:
```python
approval = interrupt("Delete user data?")           # approve/reject
email = interrupt("Provide customer email:")         # human provides info
final = interrupt(f"Draft: {draft}\nEdit or approve:") # human edits draft
```

### Quiz Q&A:
**Q1: What does `interrupt()` do when called inside a node?**
My answer: ✅ Pauses graph execution, checkpoints state, returns interrupt value to the application.

**Q2: Why does interrupt require a checkpointer?**
My answer: ✅ State must be saved (survives between invokes), pause point recorded, state loaded on resume.

**Q3: How do you resume after an interrupt?**
⚠️ This was missed 3 TIMES across quizzes and exam.
My answer (first attempts): ❌ `agent.invoke({"messages": [HumanMessage("yes")]}, config)` — WRONG, that's a new message.
✅ Correct: `agent.invoke(Command(resume="yes"), config)` with SAME thread_id. NOT a new HumanMessage.

---

## L11: Time Travel & State Inspection

### Every node = a saved snapshot (when using checkpointer).

### Inspecting State:
```python
config = {"configurable": {"thread_id": "session-1"}}

# Latest state (like git show HEAD):
snapshot = agent.get_state(config)
snapshot.values    # full state dict
snapshot.next      # next node(s) to run

# All checkpoints (like git log):
for snapshot in agent.get_state_history(config):
    print(snapshot.values)
    print(snapshot.config["configurable"]["checkpoint_id"])
```

### Time Travel — Re-run from Past Checkpoint:
```python
# Find old checkpoint, resume from there (like git checkout <commit>):
result = agent.invoke(None, old_config)
```

### update_state() — Edit State in Place:
```python
# Fix one value without re-running (like git commit --amend):
agent.update_state(config, {"priority": "P2"})
result = agent.invoke(None, config)  # continues with corrected value
```

### When to Use:
```
get_state()         → "Where is the agent NOW?"
get_state_history() → "What happened step by step?"
time travel         → "Go back and re-run with fixed code"
update_state()      → "Fix one value, continue from here"
```

### Git Analogy:
```
get_state()         = git show HEAD
get_state_history() = git log
time travel         = git checkout <commit>
update_state()      = git commit --amend
```

### Quiz Q&A:
**Q1: What's the difference between `get_state()` and `get_state_history()`?**
My answer: ✅ `get_state()` = latest state (like `git show HEAD`). `get_state_history()` = all checkpoints in order (like `git log`).

**Q2: Agent classified ticket as P0 but it should be P2. How to fix without re-running the whole graph?**
My answer: ✅ `agent.update_state(config, {"priority": "P2"})` then `agent.invoke(None, config)` to continue.

**Q3: Why is a checkpointer required for time travel?**
My answer: ✅ Can't travel to states that were never saved. No checkpointer = no snapshots.

---

## L12: Fault Tolerance & Retry Policies

### Problem: LLM APIs fail (429 rate limits, timeouts, 500 errors). Graph crashes.

### retry_policy on Nodes:
```python
from langgraph.pregel import RetryPolicy

graph.add_node("call_llm", call_llm_node, retry=RetryPolicy(max_attempts=3))
```

### RetryPolicy Options:
```python
RetryPolicy(
    max_attempts=3,          # try up to 3 times
    initial_interval=0.5,    # wait 0.5s before first retry
    backoff_factor=2.0,      # double wait each retry
    max_interval=10.0,       # cap the wait
    jitter=True              # random offset to avoid thundering herd
)
```

### Exponential Backoff Example:
```
max_attempts=3, initial_interval=1, backoff_factor=2:

Attempt 1: fails → wait 1s
Attempt 2: fails → wait 2s (1 × 2)
Attempt 3: fails → raise error
```

### ⚠️ Checkpointers vs Retry Policies — DIFFERENT PROBLEMS:
```
Checkpointers  → handle SERVER CRASHES (resume from last saved state after restart)
Retry policies → handle TRANSIENT ERRORS (retry within the same run, no restart)
```

### Which Nodes to Retry:
```
✅ RETRY: LLM API calls, external APIs, DB queries (transient failures)
❌ DON'T: Side-effect nodes (might double-charge), pure logic (same input = same error)
```

### Together = Resilience:
- API 429 → retry policy catches it, waits, retries
- Server crashes mid-graph → checkpointer resumes from last good state

### Quiz Q&A:
**Q1: What's the difference between checkpointers and retry policies?**
My answer: ✅ Checkpointers = server crashes (durability, resume from last saved state). Retry policies = transient errors (retry within same run, no restart).

**Q2: Should you add retry_policy to a credit card charge node?**
My answer: ✅ No — side effect node, might double-charge the customer.

**Q3: `RetryPolicy(max_attempts=3, initial_interval=1, backoff_factor=2)` — what are the wait times?**
My answer: ✅ 1s after first failure, then 2s (1 × 2) after second. Third failure raises error.

---

## L13: Subgraphs — Graphs Inside Graphs

### Problem: Giant graphs (12+ nodes) are hard to read, test, maintain.

### Solution: Compiled graph as a node in parent graph:
```python
# Build sub-workflow:
refund_graph = StateGraph(RefundState)
# ... add nodes and edges ...
refund_subgraph = refund_graph.compile()

# Use as node in parent:
parent_graph.add_node("refund", refund_subgraph)   # compiled graph IS a valid node
```

### How It Works:
- Parent sees `"refund"` as ONE node
- Internally runs 3+ nodes
- Like calling a function — caller doesn't see internals

### State Sharing:
- **Same schema**: messages flow seamlessly between parent and subgraph
- **Different schema**: subgraph has own TypedDict. LangGraph maps overlapping keys automatically.

### When to Use:
```
✅ USE: reusable workflows, complex graphs, different teams own different parts, independent testing
❌ DON'T: simple graphs (5-6 nodes), all nodes share state intimately
```

### Mental Model:
```
Node      = one function (one task)
Subgraph  = group of nodes packaged as one unit (module)
Graph     = full workflow (application = modules wired together)
```

### JS Analogy: Extracting functions into modules. When a file gets too big, you split it.

### Quiz Q&A:
**Q1: How do you add a subgraph to a parent graph?**
My answer: ✅ `parent_graph.add_node("name", compiled_subgraph)` — pass the compiled graph to `add_node`, it acts as a single node.

**Q2: You have 15 nodes (5 refund, 5 return, 5 general). Should you use subgraphs?**
My answer: ✅ Yes — 3 reusable subgraphs, each handling one workflow. Easier to test, maintain, and reuse.

**Q3: Can a subgraph have a different state schema from the parent?**
My answer: ✅ Yes — subgraph can have its own TypedDict or share the parent's. LangGraph maps overlapping keys automatically.

---

## Module 3 Exam — 86% PASS (Retry)

### Initial Attempt: 64% (9/14) — FAIL

### Section A (Concept Questions):

**A1: What are the 3 components of a LangGraph graph?**
My answer: ✅ State, Nodes, Edges.

**A2: What's the difference between `messages: list` and `messages: Annotated[list, add_messages]`?**
⚠️ My answer (1st attempt): ❌ Said "carries memory" — vague and wrong.
✅ Correct: Plain `list` = each node REPLACES the list. `Annotated[list, add_messages]` = APPEND reducer, new messages are added to existing list.
✅ Retry: Got it right — replace vs append.

**A3: What does a node receive and what does it return?**
⚠️ My answer (1st attempt): ❌ Said "returns results of func" — wrong framing.
✅ Correct: Receives FULL state (all keys). Returns PARTIAL state (only changed keys).
✅ Retry: Got it right — full state in, partial state out.

**A4: What's the difference between a checkpointer and a retry policy?**
My answer: ✅ Checkpointers = server crash recovery (durability, resume from last saved state). Retry policies = transient error retry (within same run, no restart).

**A5: When does the checkpointer save state?**
My answer: ✅ After every node execution — not once at the end.

### Section B (Code/Scenario Questions):

**B1: Write a routing function that routes based on priority.**
My answer: ✅ Correct routing function.

**B2: Write a conditional edge with `elif` for 3 intents.**
⚠️ My answer (1st attempt): ❌ Used `else if` (JavaScript syntax) instead of `elif` (Python). Also had typos (`retrun`).
✅ Retry: Fixed syntax — `elif`, `return`.

**B3: Agent hits `interrupt("Approve deletion?")`. Write the code to resume with user's approval.**
⚠️ My answer (1st attempt): ❌ `agent.invoke({"messages": [HumanMessage("Yes")]}, config)` — WRONG. That's a new message, not a resume. **3rd time making this mistake.**
⚠️ My answer (retry): 🔄 `graph.invoke(Command(resume="approved"), config)` — Fixed the Command part ✅ but used `graph.invoke` instead of `agent.invoke` ❌.
✅ Correct: `agent.invoke(Command(resume="approved"), config)` — compiled graph (`agent`), not builder (`graph`).

### Retry: 86% (12/14) — PASS

### Key Takeaways for Revision:
1. **`elif`** not `else if` (Python ≠ JavaScript)
2. **`agent.invoke()`** (compiled) not `graph.invoke()` (builder) — ALWAYS
3. **`Command(resume=value)`** to resume after interrupt — NOT a new HumanMessage — **missed 3 TIMES**
4. **Annotated[list, add_messages]** = APPEND reducer. Plain list = REPLACE.
5. Node receives **FULL state**, returns **PARTIAL state** (only changed keys)
6. **Checkpointers** = server crash recovery. **Retry policies** = transient error retry.
