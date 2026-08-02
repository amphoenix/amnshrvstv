# Module 3 — LangGraph Fundamentals (DONE — 86% PASS)

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

### Quiz: PASS (retry) | Key fix: each node does ONE thing. "Refund" is 3 nodes: check, process, apologize.

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
A: Second node's message replaces first → history lost.

**Q2: What does `Annotated[list, add_messages]` mean in plain English?**
A: "This is a list. When nodes return new items, APPEND them to the existing list instead of replacing."

**Q3: When would you use plain `str` vs `Annotated[list, reducer]`?**
A: Plain for latest value (IDs, priority). Annotated for accumulating (messages, conversation history).

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
A: Receives full state dict. Returns partial dict with only changed keys.

**Q2: Node only updates priority. Must it also return messages, customer_id, resolved?**
A: No. Return only changed keys. Unchanged keys stay as-is.

**Q3: Write an escalate node that checks priority.**
A:
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
**Q1: 3 types of edges?** Fixed, Conditional, Entry Point.
**Q2: Routing function for age check?** Read `state["age"]`, not raw param.
**Q3: Typo in routing return?** Crashes — string doesn't match any node name.

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
**Q1: graph vs agent?** Builder (mutable) vs compiled (frozen, executable). Can't add nodes to agent.
**Q2: What does invoke() return?** Complete final state dict, not just last node's output.
**Q3: graph.invoke(...) — what's wrong?** Must use agent.invoke(), not graph.invoke().

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
**Q1: Two decorators?** @task (unit of work, checkpointed) and @entrypoint (orchestrator, what you call).
**Q2: How to get task return value?** .result() — like JS await.
**Q3: Graph API over Functional?** Complex branching, shared mutable state, human-in-the-loop.

---

## L8: Persistence & Checkpointers

### Problem: Graphs are stateless by default — each invoke() is a fresh run.

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

### Quiz Q&A:
**Q1: When does checkpointer save?** After every node execution.
**Q2: Compile with checkpointer but forget thread_id?** Raises error — can't look up or store.
**Q3: MemorySaver forgets after restart?** Switch to SqliteSaver or PostgresSaver (persist to disk/DB).

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
**Q1: stream() vs astream_events()?** stream = node-level events. astream_events = async token-by-token.
**Q2: stream_mode="values" vs "updates"?** values = full state after each node. updates = only what changed.
**Q3: Typing effect in chatbot UI?** astream_events().

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
**Q1: What does interrupt() do?** Pauses graph, checkpoints state, returns interrupt value to app.
**Q2: Why requires checkpointer?** State must be saved (survives between invokes), pause point recorded, state loaded on resume.
**Q3: How to resume?** `agent.invoke(Command(resume="yes"), config)` with SAME thread_id. NOT a new HumanMessage.

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
**Q1: get_state() vs get_state_history()?** Latest state vs all checkpoints in order.
**Q2: Fix P0 → P2 without re-running?** `agent.update_state(config, {"priority": "P2"})` then resume.
**Q3: Why checkpointer needed?** Can't travel to states that were never saved.

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
**Q1: Checkpointers vs retry policies?** Checkpointers = server crashes (durability). Retries = transient errors (within same run).
**Q2: Retry on credit card charge node?** No — side effect, might double-charge.
**Q3: RetryPolicy(max_attempts=3, initial_interval=1, backoff_factor=2) wait times?** 1s, then 2s.

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
**Q1: How to add subgraph?** `parent_graph.add_node("name", compiled_subgraph)` — pass compiled graph to add_node.
**Q2: 15 nodes (5 refund, 5 return, 5 general) — use subgraphs?** Yes, 3 reusable subgraphs.
**Q3: Different state schema?** Yes, subgraph can have own state or share parent's state.

---

## Module 3 Exam — 86% PASS (Retry)

### Initial Attempt: 64% (9/14) — FAIL

### Mistakes Made:
- **A2**: Said "carries memory" — should be: `Annotated` = APPEND (reducer), plain `list` = REPLACE
- **A3**: Said "returns results of func" — should be: receives FULL state, returns PARTIAL state
- **B2**: Used `else if` (JS) instead of `elif` (Python), typos (`retrun`)
- **B3**: Used `HumanMessage("Yes")` instead of `Command(resume="yes")` — 3rd time making this error

### Retry: 86% (12/14) — PASS
- Fixed A2: replace vs append — correct
- Fixed A3: full state in, partial state out — correct
- Fixed B3: `Command(resume="approved")` with import — correct (but used `graph.invoke` instead of `agent.invoke`)

### Key Takeaways for Revision:
1. **`elif`** not `else if` (Python ≠ JavaScript)
2. **`agent.invoke()`** (compiled) not `graph.invoke()` (builder) — ALWAYS
3. **`Command(resume=value)`** to resume after interrupt — NOT a new HumanMessage
4. **Annotated[list, add_messages]** = APPEND reducer. Plain list = REPLACE.
5. Node receives **FULL state**, returns **PARTIAL state** (only changed keys)
6. **Checkpointers** = server crash recovery. **Retry policies** = transient error retry.
