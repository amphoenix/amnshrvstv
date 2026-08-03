# Module 7 — Multi-Agent Systems

## L1: Why Multi-Agent? (Problem Decomposition & Specialization)

### The Problem with Single-Agent:
One agent doing everything = one developer doing frontend, backend, DevOps, QA, and design.
```
Single Agent: 30+ tools, massive prompt, all responsibilities → confused, slow
Multi-Agent:  Billing Agent (4 tools) | Tech Support (5 tools) | Account (3 tools) → focused
```

### When to Go Multi-Agent:
```
✅ Too many tools (>15) for one agent
✅ Different tasks need different system prompts/personas
✅ Tasks need different models (cheap for routing, powerful for reasoning)
✅ Independent subtasks → parallel execution
✅ Clear responsibility boundaries (debugging, testing)
❌ Simple tasks, overhead > benefit, tight coupling
```

### 3 Core Architectures:
```
1. ROUTER     — classify once → hand off to ONE specialist
2. SUPERVISOR — orchestrate multiple agents, decide who goes next
3. PEER/SWARM — agents collaborate as equals, no boss
```

### Project-1 Connection:
```
classifier (router) → specialist paths:
  ├─ retrieve_from_KB (RAG specialist)
  ├─ look_up (tool specialist)
  └─ respond_direct (chitchat specialist)
  → generator (response specialist) → evaluator (QA specialist)
```
Multi-node graph approaching multi-agent — each node has different behavior but shares state.

### Design Principles:
```
1. SINGLE RESPONSIBILITY — each agent does ONE thing well
2. CLEAR INTERFACES     — structured state communication
3. MINIMAL COUPLING     — agents don't know each other's internals
4. FAIL INDEPENDENTLY   — one failure doesn't crash the system
```

### Cost:
```
⚠️ More agents = more LLM calls = more cost + latency
⚠️ Communication overhead, harder debugging, state complexity
Rule: start single agent, split ONLY when you hit a real problem
```

### JS Analogy:
```
Single Agent = Monolith (one codebase does everything)
Multi-Agent  = Microservices (billing-service, auth-service, notification-service)
```

### Quiz: 3/3 🎉
**Q1: Project-1 — multi-agent or multi-node graph?**
My answer: ✅ Multi-node graph. Nodes are pipeline stages within ONE workflow with shared state. Multi-agent = autonomous agents with own reasoning, prompts, tools, memory. Project-1 approaches multi-agent but nodes don't have independent reasoning loops.

**Q2: Customer support: billing, tech support, account mgmt — each 10+ tools, different prompts. Single or multi-agent?**
My answer: ✅ Multi-agent. 3 domains × 10+ tools = 30+ for single agent → confusion. Isolating tools/prompts per domain reduces incorrect tool selection, enables independent optimization.

**Q3: Agent C needs outputs from both Agent A and Agent B. Orchestration?**
My answer: ✅ Fan-out A+B in parallel (independent), fan-in to C. LangGraph handles via synchronization barrier — C runs only after both A and B complete and merge state.

---

## L2: Supervisor / Worker Pattern

### Architecture:
Supervisor (LLM) orchestrates multiple worker agents. Decides WHO works next and WHEN task is done.
```
User → Supervisor → Worker A → Supervisor → Worker B → Supervisor → FINISH
```

### Supervisor Decision:
```python
class SupervisorDecision(BaseModel):
    next_worker: Literal["billing", "tech_support", "account", "FINISH"]
    reason: str
```

### In LangGraph:
```python
graph.add_node("supervisor", supervisor)
graph.add_node("billing", billing_agent)
graph.add_node("tech_support", tech_agent)

graph.add_conditional_edges("supervisor", lambda s: s["next"], {
    "billing": "billing", "tech_support": "tech_support", "FINISH": END,
})
# Every worker reports back to supervisor
graph.add_edge("billing", "supervisor")
graph.add_edge("tech_support", "supervisor")
```

### Supervisor vs Router:
```
Router:      ONE handoff → done. Single agent handles everything.
Supervisor:  MULTIPLE handoffs. Orchestrate several agents in sequence.

Router:     query maps to EXACTLY ONE domain
Supervisor: query spans MULTIPLE domains
```

### Worker Factory:
```python
def create_worker(name, system_prompt, tools):
    model_with_tools = ChatOpenAI(model="gpt-4o-mini").bind_tools(tools)
    def worker(state):
        response = model_with_tools.invoke(
            [SystemMessage(content=system_prompt)] + state["messages"]
        )
        return {"messages": [response]}
    return worker
```

### Sequential vs Parallel Workers:
```
Sequential: Supervisor → A → Supervisor → B → FINISH (one at a time)
Parallel:   Supervisor → A + B (fan-out) → Supervisor → FINISH (simultaneous)
```

### Hierarchical Supervisors (for many workers):
```
      Top Supervisor
     /       |       \
Customer  Technical  Sales
Supervisor Supervisor Supervisor
 /    \    /    \    /    \
```

### Pitfalls:
```
1. SUPERVISOR BOTTLENECK → let workers handle follow-ups internally
2. INFINITE LOOPS → max_iterations counter, explicit FINISH
3. CONTEXT BLOAT → summarize worker results before passing to supervisor
```

### Quiz: 3/3 🎉
**Q1: "Cancel subscription" — router or supervisor? "Cancel subscription and refund" — ?**
My answer: ✅ Cancel = one domain → router. Cancel + refund = two domains → supervisor coordinates both agents.

**Q2: Supervisor loops 10+ rounds between billing and tech_support. Two fixes?**
My answer: ✅ 1) Max handoffs with escalation/partial result. 2) Deterministic routing — only supervisor delegates to workers, workers return results (no ping-pong between peers).

**Q3: 12 workers, supervisor confused picking right one. Module 6 fix?**
My answer: ✅ Agent retrieval (like tool RAG) — retrieve top 2-3 relevant agents, then supervisor picks from small set. Also valid: hierarchical supervisors — group 12 agents under 3 sub-supervisors (4 each).

---

## L3: Router Agents

### Router = classify ONCE → hand off to ONE specialist → done.
```
              ┌─→ Billing Agent ──→ Response
User → Router ┼─→ Tech Agent    ──→ Response
              └─→ Account Agent ──→ Response
```
Project-1 classifier IS a router.

### 4 Router Strategies:
```
1. LLM Router      — flexible, handles nuance, costs an LLM call
2. Keyword/Rule    — fast, free, predictable, but brittle
3. Embedding       — semantic matching, no LLM cost, handles synonyms
4. Hybrid (prod)   — Rules (free) → Embeddings (cheap) → LLM (expensive)
```

### Hybrid Router:
```python
def hybrid_router(query):
    rule_result = rule_router(query)          # fast, free
    if rule_result != "general": return rule_result
    
    emb_result, conf = embedding_router(query) # semantic, cheap
    if conf > 0.85: return emb_result
    
    return llm_router(query)                   # flexible, expensive
```

### Multi-Level Routing:
```
User → Router L1 → "billing" → Router L2 → "refund" → Refund Agent
```

### Router with Fallback:
```python
if route.destination == "unknown" or route.confidence < 0.7:
    return {"next": "human_handoff"}  # don't guess!
```

### Router vs Classifier:
```
Classifier = input → label (pure function)
Router     = input → label → action (classifier + dispatch)
```

### Quiz: 3/3 🎉
**Q1: Hybrid router — "refund" handled by which layer? "the thing I bought yesterday isn't working right"?**
My answer: ✅ "refund" → rules (keyword match, instant, free). "thing isn't working right" → embeddings (semantic match, no keywords) with LLM fallback if low confidence.

**Q2: Router misroutes billing query to tech agent. Tech agent tries to help. Fix?**
My answer: ✅ Each worker validates domain before acting ("verify before acting"). Out-of-scope → return `{"status": "wrong_agent"}` instead of attempting to answer. Guardrail against router mistakes.

**Q3: "Reset my password" vs "Reset password, update email, check last payment" — router or supervisor?**
My answer: ✅ Password reset = single domain → router. Multi-task spanning account + billing = supervisor coordinates both agents and combines results.

---

## L4: Planner / Critic / Evaluator Agents

### Separation of Concerns — split into specialized roles:
```
Planner   → "Here's the plan: step 1, 2, 3"
Executor  → "Executing step 1... done."
Critic    → "Step 2's output looks wrong, fix X" (specific feedback)
Evaluator → "Final answer: PASS/FAIL" (verdict)
```

### Critic vs Evaluator:
```
Critic    = reviews EACH STEP during execution → gives FEEDBACK (what to fix)
Evaluator = reviews FINAL OUTPUT at the end    → gives VERDICT (pass/fail)

Critic    = code reviewer (reviews each PR)
Evaluator = QA tester (tests the final build)
```

### Project-1 has generator (executor) + evaluator. Missing: planner + critic.
- Planner: graph edges do planning instead (hardcoded flow)
- Critic: evaluator says pass/retry but doesn't give specific improvement feedback

### Different Models for Different Roles:
```
Planner/Critic/Evaluator → smart model (gpt-4o), temp=0
Executor                 → cheap model (gpt-4o-mini), temp=0.3
```

### Full Pipeline:
```
Task → Planner → Executor → Critic → acceptable?
                    ↑          │         YES → next step or Evaluator
                    └── NO ────┘                    │
                                            PASS → END
                                            FAIL → Re-plan
```

### When to Use:
```
✅ Complex tasks (research, reports, code generation)
✅ Quality-critical (customer-facing, compliance)
✅ Need audit trail
❌ Simple queries, real-time chat, cost-sensitive
```

### Quiz: 3/3 🎉
**Q1: Project-1 missing what vs full Planner/Critic/Evaluator? Would adding it help?**
My answer: ✅ Missing: Planner (graph edges do it instead) and distinct Critic (evaluator just says pass/retry, doesn't give specific feedback). Adding planner helps for complex multi-step requests, not for simple ones (latency overhead).

**Q2: Critic says "not acceptable" 8 times. Two safeguards?**
My answer: ✅ 1) Max retry limit (e.g., 3). 2) Escalation/fallback — human review or return best available answer when limit reached.

**Q3: Code gen agent — critic and evaluator same or different?**
My answer: ✅ Separate. Critic = qualitative LLM feedback ("off-by-one error"). Evaluator = objective verdict (compilation, tests pass → accept). Evaluator can be partially deterministic (rule engine), critic uses LLM judgment. Separation gives better feedback quality and more auditable decisions.

---

## L5: Communication Protocols & Shared State

### Two Approaches:
```
1. SHARED STATE    — all agents read/write ONE shared object (blackboard)
2. MESSAGE PASSING — agents send targeted messages to each other
```

### Shared State (LangGraph's approach):
```python
class State(TypedDict):
    messages: Annotated[list, add_messages]   # APPEND reducer
    current_agent: str                         # REPLACE (last writer wins)
    results: Annotated[dict, merge_dicts]     # CUSTOM reducer
```
Project-1 uses this: classifier writes `category` → generator reads `category`. State IS the communication channel.

### Message Passing:
```python
class AgentMessage(BaseModel):
    sender: str
    recipient: str
    content: str
    message_type: Literal["request", "response", "info"]
```
Agents send targeted messages — like microservices with APIs.

### When to Use Which:
```
Shared State:    same process, few agents, simple coordination
Message Passing: distributed, many agents, cross-server, need privacy
Production:      hybrid (shared state for common context + messages for handoffs)
```

### State Reducers — Handling Write Conflicts:
```
No reducer:     parallel writes to same key → conflict/error
add_messages:   appends (messages accumulate)
merge_dicts:    merges (combine independent results)
Replace:        last writer wins (default for plain fields)
```

### State Channels — Least Privilege:
Scope what each agent can see:
```python
class BillingState(TypedDict):   # billing agent only sees billing data
class TechState(TypedDict):      # tech agent only sees tech data
class SupervisorState(TypedDict): # supervisor sees combined results
```

### JS Analogy:
```
Shared State   = Redux store
Message Passing = Event emitter / pub-sub
Reducers       = Redux reducers
State Channels = React Context scoping
```

### Quiz: 3/3 🎉
**Q1: Two parallel nodes write to `tool_output`. What happens?**
My answer: ✅ Without reducer = conflict (can't determine winner). With reducer = merge. Practical fix: use `tool_outputs: dict` so each node writes its own key, avoiding conflicts entirely.

**Q2: Shared state vs message passing: (a) 3 agents, one process. (b) 20 agents, 5 servers.**
My answer: ✅ (a) Shared state — same runtime, simple, low overhead. (b) Message passing — scales across servers, loose coupling, fault isolation.

**Q3: `results: dict` — Agent A writes `{"refund": "done"}`, Agent B writes `{"diagnosis": "fixed"}`. Without/with reducer?**
My answer: ✅ Without = conflict. With merge = `{"refund": "done", "diagnosis": "fixed"}`. Edge case: if both write same key, reducer needs a conflict policy (last wins, first wins, or error).

---

## L6: Conflict Resolution & Coordination

### Problem: Multiple agents disagree. Who wins?

### 5 Resolution Strategies:
```
1. HIERARCHY      — supervisor has final say
2. VOTING         — majority rules
3. PRIORITY/RANK  — higher-authority agent wins (compliance > billing)
4. NEGOTIATION    — agents debate until convergence (expensive)
5. RULE-BASED     — deterministic rules, no LLM (compliance, legal, safety)
```

### Priority Example:
```python
AGENT_PRIORITY = {"compliance": 1, "policy": 2, "customer": 3, "billing": 4}
# Compliance ALWAYS wins ties
```

### Coordination Patterns:
```
Sequential:      A → B → C (simple, slow)
Parallel + Merge: A + B + C → resolve conflicts → final decision (fast)
Token-Based:     one agent writes at a time (mutex, prevents conflicts)
```

### Decision Guide:
```
Legal/regulatory?         → Rule-based or Priority
Democratic consensus?     → Voting
One authority?            → Hierarchy
Complex nuanced decision? → Negotiation (expensive)
Speed matters?            → Priority (instant, deterministic)
Need audit trail?         → Rule-based (reproducible)
```

### Quiz: 3/3 🎉
**Q1: Billing says "refund $500", compliance says "block — fraud." Resolution?**
My answer: ✅ Priority/authority — compliance overrides billing. Fraud block prevents refund until resolved. Can't let LLM vote on ignoring fraud.

**Q2: A says "tech", B says "billing", C says "tech". Equal authority? B is domain expert?**
My answer: ✅ Equal → majority vote (2-1, tech). B is expert → weighted/priority voting (expertise overrides majority).

**Q3: 2 agents debate 8 rounds, no agreement. Two problems + fixes?**
My answer: ✅ 1) Excessive looping → max rounds (3-5) + escalation. 2) No convergence mechanism → deterministic fallback (judge, hierarchy, or rules).

---

## L7: Multi-Agent Debate & Self-Consistency

### Self-Consistency:
Same model, same question, multiple samples (temperature > 0), majority vote.
```python
answers = [model.invoke(question) for _ in range(5)]  # temp=0.7
result = Counter(parsed_answers).most_common(1)[0][0]  # majority
```
Temperature MUST be > 0 — temperature=0 gives identical answers every time → useless.

### Multi-Agent Debate:
Different agents with different perspectives argue, see each other's arguments, update positions across rounds until convergence.
```
Round 1: Optimist=+20%, Pessimist=-5%, Neutral=0%
Round 2: Optimist=+12%, Pessimist=-2%, Neutral=+5%  (revised after seeing arguments)
Round 3: All converge ~5% → consensus
```

### Self-Consistency vs Debate:
```
Self-Consistency: same model, independent, vote → factual Qs ("Is this spam?")
Debate:           different perspectives, interact, converge → analytical Qs ("Enter Japan market?")
```

### Debate vs Negotiation (from L6):
```
Negotiation = competing INTERESTS (billing vs policy)
Debate      = competing PERSPECTIVES (optimist vs pessimist, shared goal of truth)
```

### Practical Patterns:
```
Devil's Advocate — one agent deliberately argues against
Red Team / Blue Team — propose vs break (security, code review)
Panel of Experts — domain + cost + UX experts + judge
```

### Module 7 Pattern Summary:
```
Router           → ONE specialist (single-domain)
Supervisor       → orchestrate multiple agents (multi-domain)
Planner/Critic   → plan → execute → review → evaluate
Shared State     → agents read/write one object (same process)
Message Passing  → targeted comms (distributed)
Priority/Voting  → conflict resolution
Self-Consistency → same model × N, majority vote (factual)
Debate           → different perspectives, multi-round (analytical)
```

### Quiz: 3/3 🎉
**Q1: "Is this email spam?" vs "Should we enter the Japanese market?" — self-consistency or debate?**
My answer: ✅ Spam = self-consistency (classification, correct answer exists, vote). Japan market = debate (strategic, open-ended, diverse perspectives).

**Q2: Self-consistency with temperature=0. What happens?**
My answer: ✅ Deterministic → same answer every time → voting on identical answers = useless. "One answer repeated multiple times."

**Q3: 3 agents, 5-round debate. All agree after round 3. Continue or stop?**
My answer: ✅ Stop early. Convergence achieved — continuing wastes tokens/latency, risks reopening settled issues. Good system has max rounds AND convergence detection.

---

## Module 7 Exam — 10/10 (100% PASS) 🎉

**Q1: Name the 3 core multi-agent architectures and give a ONE-line description of each.**
My answer: ✅
1. Router Architecture — classifies the request and sends it to the single most appropriate specialized agent.
2. Supervisor Architecture — coordinates multiple worker agents, delegates tasks, and combines their outputs.
3. Peer-to-Peer / Collaborative Architecture — multiple agents communicate directly and cooperate without a central controller.

**Q2: Customer support system. Queries are billing, tech, or account — never more than one. Which architecture and why?**
My answer: ✅ Router architecture. Each query maps to exactly one domain. No coordination between agents needed. Router is simpler, faster, and cheaper than a supervisor.

**Q3: Same system, but users say "Refund my charge, reset my password, and check my last invoice." Which architecture and why?**
My answer: ✅ Supervisor architecture. The request contains multiple tasks spanning different domains. Multiple agents must execute and return results. The supervisor coordinates execution and combines the final response.
```
Supervisor → Billing Agent (refund + invoice) + Account Agent (password reset) → combine → response
```

**Q4: Supervisor has 15 worker agents and frequently picks the wrong one. Give TWO architectural fixes.**
My answer: ✅
1. Agent Retrieval / Agent Router — don't expose all 15 agents every time. Retrieve the most relevant candidates first using embeddings, metadata, descriptions, routing rules. Then supervisor picks from small set.
2. Improve agent boundaries and descriptions — give each agent clear capabilities, explicit limitations, structured tool descriptions, and rejection rules. Reduces routing ambiguity.

**Q5: Write the LangGraph code structure (pseudocode) for a supervisor with 3 workers where every worker reports back to the supervisor, and the supervisor can route to any worker or FINISH.**
My answer: ✅
```python
graph = StateGraph(State)

graph.add_node("supervisor", supervisor)
graph.add_node("billing", billing_agent)
graph.add_node("tech", tech_agent)
graph.add_node("account", account_agent)

graph.add_edge("billing", "supervisor")
graph.add_edge("tech", "supervisor")
graph.add_edge("account", "supervisor")

graph.add_conditional_edges(
    "supervisor",
    lambda state: state["next_agent"],
    {
        "billing": "billing",
        "tech": "tech",
        "account": "account",
        "FINISH": END
    }
)

graph.set_entry_point("supervisor")
```

**Q6: You have `results: dict` in shared state. Three agents run in parallel and write: `{"a": 1}`, `{"b": 2}`, `{"a": 3}`. What happens without a reducer? With a `merge_dicts` reducer, what's the final value of key "a"?**
My answer: ✅
- Without reducer: concurrent update conflict. LangGraph cannot know how to combine multiple writes to the same state key. The update is ambiguous.
- With merge_dicts reducer: dictionaries are merged → `{"a": 3, "b": 2}`. Final value of "a" is **3** because normal dictionary merging uses last write wins (`dict.update`).

**Q7: Critic vs Evaluator — what does each do, when does each run, and what does each output?**
My answer: ✅
| | Critic | Evaluator |
|---|---|---|
| Purpose | Analyze quality and find problems | Make final decision |
| Runs | After generation/execution (each step) | After critic / after final output |
| Output | Feedback, suggestions, errors | Accept / retry / escalate |

**Q8: Your hybrid router has 3 layers: rules → embeddings → LLM. Query: "my computer keeps crashing". Which layer handles it and why?**
My answer: ✅ Embeddings layer. No exact rule keyword matches. Semantic meaning matches tech support concepts (computer failure, crashes, errors). The LLM layer is only needed if embeddings cannot confidently classify the request.

**Q9: Two agents debate for 6 rounds. They agreed in round 2 but the system ran all 6 rounds. What TWO design flaws caused this?**
My answer: ✅
1. No convergence detection — the system did not check whether agents had already reached agreement. Fix: check for consensus after each round.
2. Fixed round execution without adaptive stopping — the system forced all rounds regardless of progress. Fix: add early stopping with `if consensus: break`. Keep maximum round limit as safety fallback.

**Q10: "Is 847 a prime number?" — self-consistency or debate? "Should we hire 5 more engineers or invest in automation?" — self-consistency or debate? Explain both.**
My answer: ✅
- "Is 847 a prime number?" → **Self-consistency**. There is a factual answer. Multiple independent reasoning attempts can verify the result via majority vote.
- "Should we hire 5 more engineers or invest in automation?" → **Debate**. It is a strategic decision. Multiple perspectives are valuable (growth agent, efficiency agent, finance agent). There is no single objectively correct answer.

