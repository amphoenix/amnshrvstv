# Module 6 — Structured Execution Patterns

## L1: ReAct (Reasoning + Acting)

### What It Is:
Interleave THINKING and DOING in a loop: Thought → Action → Observation → repeat.

### The ReAct Loop:
```
Thought → Action → Observation → Thought → Action → Observation → ... → Answer

Step 1: THOUGHT   "I need to find the current weather in Tokyo"
Step 2: ACTION    call weather_tool(city="Tokyo")
Step 3: OBSERVE   "Tokyo: 28°C, partly cloudy"
Step 4: THOUGHT   "Now I need to convert to Fahrenheit"
Step 5: ACTION    call calculator(28 * 9/5 + 32)
Step 6: OBSERVE   "82.4°F"
Step 7: THOUGHT   "I have both pieces. I can answer."
Step 8: ANSWER    "It's 82.4°F (28°C) and partly cloudy in Tokyo."
```

### ReAct vs Simple Tool Calling:
```
Simple tool calling (Module 3):
  User asks → LLM decides tool → tool runs → LLM responds
  No visible reasoning. Black box.

ReAct:
  User asks → LLM THINKS why → acts → OBSERVES → THINKS next step → ...
  Explicit reasoning at every step. Debuggable.
```

### In LangGraph:
ReAct IS the agent loop from Module 3: agent node → conditional edge → tool node → back to agent.
```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(
    model=llm,
    tools=[search_tool, calculator_tool],
    prompt="You are a helpful research assistant."
)
```

### When ReAct Shines:
- Multi-step research (compare X vs Y)
- Self-correcting (tool error → try different approach)
- Explainable (full reasoning trace)
- Dynamic tool selection based on intermediate results

### When ReAct Fails:
- Simple queries (overkill for "what's 2+2?")
- Infinite loops (keeps calling tools without converging)
- Too many tools (>10 → agent confused)

### Infinite Loop Fix:
```python
result = agent.invoke(
    {"messages": [("user", query)]},
    config={"recursion_limit": 10}    # Max 10 cycles
)
```

### Tool Count Guideline:
```
1-5 tools:   ✅ Best performance
5-15 tools:  ✅ Good with clear descriptions
15-30 tools: ⚠️ Agent starts confusing similar tools
30+ tools:   ❌ Use router/supervisor pattern instead
```

### Router Pattern (too many tools fix):
Instead of giving ONE agent 30 tools, split into specialized agents:
```
                    ┌─→ Order Agent (3 tools: lookup, cancel, track)
User → Router LLM ─┼─→ Billing Agent (4 tools: invoice, refund, charge, balance)
                    └─→ Account Agent (3 tools: profile, password, settings)
```
- **Router** = lightweight LLM call that classifies intent and routes to the right agent
- Each sub-agent has 3-5 tools → stays focused, picks correctly
- Your project-1 `classifier` node is already a router!

### Supervisor Pattern:
Like a manager — doesn't just route once, it **orchestrates** multiple agents:
```
User → Supervisor ─→ "Research Agent, find AWS GPU pricing"
                  ←─ result
                  ─→ "Research Agent, find GCP GPU pricing"
                  ←─ result
                  ─→ "Analysis Agent, compare these two"
                  ←─ final answer
```
- Supervisor decides WHICH agent to call NEXT based on results so far
- More flexible than router (which routes once), but more expensive (multiple LLM calls)
- Covered in depth in Module 7 (Multi-Agent Systems)

### Router vs Supervisor:
```
Router:     routes ONCE → one agent handles entire request
Supervisor: orchestrates MULTIPLE agents → sequences/parallels work
```

### Fixing Infinite Loops (convergence strategies):

**1. `recursion_limit` — hard safety cap:**
```python
result = agent.invoke(
    {"messages": [("user", query)]},
    config={"recursion_limit": 10}    # Max 10 node transitions, then crash
)
```
⚠️ This is a **safety net**, not a fix. If hit, it raises `GraphRecursionError`.

**2. System prompt instruction — soft convergence:**
```python
prompt = """You are a research assistant.
RULES:
- If you don't find the answer after 2 search attempts, say "I couldn't find this information."
- Never call the same tool more than 3 times total.
- After gathering enough context, STOP searching and answer."""
```
This is the ROOT fix — tells the LLM WHEN to stop.

**3. State counter — programmatic convergence:**
```python
class State(TypedDict):
    messages: Annotated[list, add_messages]
    tool_call_count: int   # ← track how many times tools have been called

def should_continue(state):
    if state["tool_call_count"] >= 3:
        return "force_answer"     # skip tools, go straight to answering
    if state["messages"][-1].tool_calls:
        return "tools"
    return END
```
Hardcoded logic — doesn't rely on LLM following instructions.

### Best Practice — Layer All Three:
```
1. System prompt: "Stop after 2 failed searches"    ← soft (LLM follows most of the time)
2. State counter: force_answer after 3 tool calls   ← hard (code enforces)
3. recursion_limit=15: crash safely if both fail     ← safety net (last resort)
```

### Quiz: PASS (1.5/3)
**Q1: What's the difference between ReAct and simple tool calling (like project-1's `look_up` node)?**
My answer: ✅ Simple tool calling = single-pass (LLM picks tool → runs → responds, black box). ReAct = loop with explicit reasoning at every step (Think → Act → Observe → repeat). Debuggable.

**Q2: ReAct agent has 25 tools and keeps calling the wrong one. Two fixes — one quick, one architectural?**
🔄 My answer: Got architectural fix (router/supervisor) but missed the quick fix.
✅ Quick fix: **Improve tool docstrings** — with 25 tools, the LLM picks based on descriptions. If 5 sound similar, sharpen descriptions to make them distinct.
✅ Architectural: Router/supervisor pattern — split tools into groups, route to specialized sub-agents.

**Q3: ReAct agent stuck in a loop — calling same search tool with slightly different queries. What's happening and how to fix?**
🔄 My answer: Said `recursion_limit` and "converging" — correct safety net but missed root cause.
✅ `recursion_limit=10` — hard cap, prevents infinite loops (safety net).
✅ Root fix: LLM isn't finding what it needs, so it retries. Fix with better tool descriptions or system prompt: "If you don't find the answer after 2 searches, say you don't know." `recursion_limit` is a safety net, not the fix.

---

## L2: Chain-of-Thought (CoT) & Plan-and-Solve

### Chain-of-Thought — What It Is:
Force the LLM to **reason step-by-step** before giving the final answer.
```
WITHOUT CoT:
  "What's 15% tip on $85?" → "$12.75"  (might be wrong, can't verify)

WITH CoT:
  → "Step 1: 10% of 85 = 8.50"
  → "Step 2: 5% = half of 10% = 4.25"
  → "Step 3: 15% = 8.50 + 4.25 = 12.75"
  → "The tip is $12.75"
```

### 3 Ways to Trigger CoT:

**1. Zero-shot CoT** — Just add "think step by step":
```python
response = model.invoke("What's 15% tip on $85? Think step by step.")
```

**2. Few-shot CoT** — Show examples WITH reasoning:
```python
prompt = """
Q: Roger has 5 tennis balls. He buys 2 cans of 3. How many now?
A: Started with 5. 2 cans × 3 = 6. 5 + 6 = 11. Answer: 11.

Q: {user_question}
A: Let's work through this step by step.
"""
```

**3. Structured CoT with Pydantic** — PRODUCTION pattern:
```python
class ReasonedAnswer(BaseModel):
    thinking: str = Field(description="Step-by-step reasoning")
    answer: str = Field(description="Final answer only")
    confidence: float = Field(description="0-1 confidence score")

result = model.with_structured_output(ReasonedAnswer).invoke(question)
# result.thinking = "Step 1: ... Step 2: ..."
# result.answer = "$12.75"
# result.confidence = 0.95
```
You get reasoning AND a clean answer programmatically.

### When CoT Helps vs Hurts:
```
✅ HELPS: math, logic, multi-step reasoning, classification with justification
❌ HURTS: simple lookups ("Capital of France?"), wastes tokens
❌ HURTS: latency-sensitive apps (more tokens = slower)
```

### CoT vs ReAct — KEY DISTINCTION:
```
CoT   = reasoning WITHIN one LLM call (no tools, no actions)
        "Think through the problem, then answer"

ReAct = reasoning + ACTIONS across multiple LLM calls
        "Think, then DO something (call tool), observe, think again"

CoT   = internal monologue
ReAct = internal monologue + external actions
```

---

### Plan-and-Solve — What It Is:
Instead of reasoning one step at a time (CoT), **plan ALL steps first**, then execute in order.
```
CoT (step-by-step):
  "Hmm, first I'll do X... ok. Now what? I'll try Y... ok. Now Z."
  → Can lose track, forget the goal, get sidetracked

Plan-and-Solve:
  "Plan: 1) do X, 2) do Y, 3) do Z"
  "Executing step 1... done."
  "Executing step 2... done."
  → Stays on track, doesn't forget steps
```

### In Code:
```python
class Plan(BaseModel):
    steps: list[str] = Field(description="Ordered list of steps to solve this")

# Phase 1: PLAN
plan = model.with_structured_output(Plan).invoke(
    f"Break this problem into steps: {question}"
)
# plan.steps = ["Find revenue data", "Calculate growth rate", "Compare to industry avg"]

# Phase 2: SOLVE (execute each step)
results = []
for step in plan.steps:
    result = model.invoke(f"Context so far: {results}\nExecute this step: {step}")
    results.append(result)
```

### Plan-and-Solve vs CoT vs ReAct:
```
CoT            → think step by step WITHIN one call (simple reasoning)
Plan-and-Solve → plan ALL steps first, then execute one by one (complex tasks)
ReAct          → think + ACT + observe in a loop (needs external tools)

Complexity:  CoT < Plan-and-Solve < ReAct
LLM calls:   1        N+1              variable
Tools:       No       Optional          Yes (core feature)
```

### When to Use Plan-and-Solve:
```
✅ Multi-step tasks where order matters (research report, data analysis)
✅ Tasks where you might forget a step (complex workflows)
✅ When you want to show the user a progress bar ("Step 2/5...")

❌ Simple questions (overkill)
❌ Tasks where steps aren't known upfront (use ReAct instead)
❌ Tasks needing LIVE DATA (needs tools → ReAct or Plan-and-Solve + tools)
```

### Project-1 Connection:
Your project-1 is closest to **Plan-and-Solve in spirit** — you designed the plan (classify → route → retrieve/lookup → generate → evaluate) at BUILD TIME. Difference: your plan is hardcoded in the graph, not generated by the LLM at runtime.

### Quiz: PASS (2/3)
**Q1: Building a ticket classifier that needs to explain WHY it chose a priority. Which pattern? Show the Pydantic model.**
My answer: ✅ CoT — correct pattern.
⚠️ Didn't show the Pydantic model.
✅ Full answer:
```python
class TicketClassification(BaseModel):
    thinking: str    # step-by-step reasoning for priority
    priority: str    # P0-P3
    category: str    # billing, technical, etc.
    confidence: float
```

**Q2: CoT says "think step by step" and ReAct also "thinks." What's the actual difference?**
My answer: ✅ CoT = internal monologue within ONE call. ReAct = monologue + external actions across MULTIPLE calls.

**Q3: "Compare AWS vs GCP pricing for GPU instances, including spot pricing." Which pattern and why?**
🔄 My answer: Said Plan-and-Solve — valid direction but missed that this needs LIVE DATA.
✅ Better: **ReAct** (or Plan-and-Solve + tools) — needs to SEARCH current pricing from websites. Pure Plan-and-Solve without tools would hallucinate the numbers.

---

## L3: Self-Reflection & Reflexion

### Self-Reflection — What It Is:
Agent **checks its own output** and tries to improve it. Like proofreading your own essay.
```
WITHOUT Self-Reflection:
  User asks → LLM answers → done (hope it's right)

WITH Self-Reflection:
  User asks → LLM answers → LLM critiques → LLM improves → done
```

### In LangGraph — Self-Reflection as a Loop:
```
generate ──→ evaluate ──→ good? ──→ END
    ↑                       │
    └───── not good ←───────┘
```

```python
class State(TypedDict):
    messages: Annotated[list, add_messages]
    draft: str
    critique: str
    revision_count: int

def generate(state):
    response = model.invoke(state["messages"])
    return {"draft": response.content}

def evaluate(state):
    critique = model.with_structured_output(Evaluation).invoke(
        f"Critique this: {state['draft']}"
    )
    return {"critique": critique.feedback, "revision_count": state["revision_count"] + 1}

def route_after_eval(state):
    if state["revision_count"] >= 3:    # max 3 revisions (convergence!)
        return END
    if "no issues found" in state["critique"].lower():
        return END
    return "generate"                    # loop back to improve
```

### 🔑 Project-1 already does this:
```
generator → evaluator → route_after_evaluator
                           ├─ "pass"     → END
                           ├─ "retry"    → generator (loop back!)
                           └─ "escalate" → escalate
```

### Problem with Simple Self-Reflection:
```
Attempt 1: "Use recursion"
Critique:  "Might stack overflow"
Attempt 2: "Use iteration"
Critique:  "But recursion was more elegant"
Attempt 3: "Use recursion with tail optimization"
Critique:  "Python doesn't support tail optimization"
→ GOING IN CIRCLES. No memory of what went wrong before.
```

### Reflexion — Self-Reflection WITH Memory:
Stores **what went wrong** so the agent doesn't repeat mistakes.
```
Self-Reflection:  generate → critique → retry (forgets previous critiques)
Reflexion:        generate → critique → STORE lesson → retry (remembers ALL)
```

### Reflexion Flow:
```
generate ──→ evaluate ──→ pass? ──→ END
    ↑                      │
    │                     fail
    │                      ↓
    │              store_reflection
    │              "Lesson: recursion causes stack overflow
    │               in Python for large inputs."
    └──────────────────────┘

Reflection Memory: [lesson1, lesson2, lesson3, ...]
```

### In Code:
```python
class State(TypedDict):
    messages: Annotated[list, add_messages]
    draft: str
    reflections: list[str]     # ← accumulated lessons from failures
    attempt: int

def generate(state):
    reflection_context = "\n".join(
        f"- Lesson {i+1}: {r}" for i, r in enumerate(state.get("reflections", []))
    )
    prompt = f"""Answer: {state['messages'][-1].content}

IMPORTANT — Learn from past mistakes:
{reflection_context if reflection_context else "No past mistakes yet."}
"""
    response = model.invoke(prompt)
    return {"draft": response.content, "attempt": state.get("attempt", 0) + 1}

def reflect(state):
    lesson = model.invoke(
        f"Answer '{state['draft']}' was wrong. "
        f"In ONE sentence, what to avoid next time?"
    )
    return {"reflections": [lesson.content]}  # reducer appends
```

### Self-Reflection vs Reflexion:
```
Self-Reflection = "Try again, here's what's wrong"         (short-term)
Reflexion       = "Try again, AND here's EVERYTHING        (long-term)
                   that went wrong in ALL attempts"
```

### When to Use Which:
```
Simple factual correction     → Self-Reflection
Code generation with tests    → Reflexion (learn from failed test cases)
Research with fact-checking   → Self-Reflection
Complex multi-step reasoning  → Reflexion (accumulate what doesn't work)
```

### JS Analogy:
```
Self-Reflection = try/catch → fix → retry
Reflexion       = try/catch → fix → ADD TO ERROR LOG → retry (reads full log)
```

### ⚠️ Over-Reflection Risk:
```
Draft:     "Australia's capital is Canberra"  ← CORRECT
Critique:  "Are you sure? Sydney is the largest city..."
Revision:  "Australia's capital is Sydney"     ← NOW WRONG
```
Critique model isn't perfect — can "correct" right answers into wrong ones.

### ⚠️ Cost Warning:
3 attempts × (generate + evaluate + reflect) = 9 LLM calls for ONE answer. Use only when quality > cost/latency.

### Quiz: PASS (2.5/3)
**Q1: Project-1 has generator → evaluator → route_after_evaluator. Self-reflection or reflexion? Why?**
My answer: ✅ Self-reflection — evaluator critiques and retries, but no saving of lessons, no accumulated learning between attempts.

**Q2: Agent writes code, runs tests, fails, rewrites, fails with SAME error. Which pattern? What to store?**
My answer: ✅ Reflexion — save error and how it occurred.
✅ Better: Store error AND what code caused it — "Attempt 2 used recursive approach → RecursionError for input > 1000. Use iteration instead." Error alone isn't enough, LLM needs to know what TO AVOID.

**Q3: When would self-reflection make things WORSE?**
🔄 My answer: Said "goes in loop, loses context" — loop risk is correct.
⚠️ Missed the bigger risk: **over-reflection** — LLM "corrects" a RIGHT answer into a WRONG one. Critique model isn't perfect. Also: cost/latency waste on simple lookups that were right first time.

---

## L4: Tree of Thoughts (ToT) & Graph of Thoughts (GoT)

### Problem with CoT:
CoT thinks in a **single line**. If step 2 is wrong, everything after is wrong. No backtracking.
```
CoT (linear):
  Step 1 → Step 2 → Step 3 → Answer
                ↑
           wrong here = everything after is garbage
```

### Tree of Thoughts — Explore Multiple Paths:
```
                        Problem
                       /   |   \
                    Path A  Path B  Path C
                    /    \    |      |
                  A1    A2   B1    C1
                  ✅    ❌   ✅    ❌

CoT:    one path, hope it's right
ToT:    explore multiple paths, CHOOSE the best
```

### How ToT Works — 3 Steps:
```
1. GENERATE:  Create multiple candidate next-steps (branches)
2. EVALUATE:  Score each branch ("promising" / "dead end")
3. SEARCH:    Pick best branch, expand further (BFS or DFS)
```

### In Code (simplified):
```python
class ThoughtBranch(BaseModel):
    thought: str
    score: float = Field(description="0-1, how promising is this path")

def generate_branches(problem, current_path, n=3):
    return model.with_structured_output(list[ThoughtBranch]).invoke(
        f"Problem: {problem}\nProgress: {current_path}\n"
        f"Generate {n} different next steps. Score each 0-1."
    )

def tree_of_thoughts(problem, max_depth=3):
    best_path = ""
    for depth in range(max_depth):
        branches = generate_branches(problem, best_path)
        best = max(branches, key=lambda b: b.score)
        if best.score < 0.3:
            break  # all dead ends
        best_path += f"\nStep {depth+1}: {best.thought}"
    return model.invoke(f"Problem: {problem}\nSolution: {best_path}\nFinal answer.")
```

### BFS vs DFS Search:
```
BFS: Explore ALL branches at depth 1, keep top K, then depth 2 → better quality, MORE expensive
DFS: Pick best branch, go deep. Dead end? BACKTRACK → faster, might miss better paths
```

### When ToT Shines:
```
✅ Puzzles, math (multiple approaches needed)
✅ Creative writing (explore plot directions)
✅ Strategic planning (evaluate options before committing)
❌ Simple questions (massive overkill)
❌ Latency-sensitive (9+ LLM calls minimum)
❌ Customer support (straightforward lookup, not exploration)
```

### Graph of Thoughts (GoT) — ToT + Merging:
ToT picks ONE winner. GoT **merges the best parts** of multiple branches.
```
Tree of Thoughts:          Graph of Thoughts:
       A                          A
      / \                        / \
     B   C                      B   C
    pick ONE                     \ /
                              Merge B+C → best of both
```

### Why Merge Matters:
```
Branch A: "Best flights and hotels"    → good logistics
Branch C: "Must-see attractions"       → good activities

ToT:   pick A OR C (one wins, other lost)
GoT:   MERGE A + C → complete itinerary with flights AND attractions
```

### GoT Key Operations:
```
1. GENERATE:   create branches (same as ToT)
2. EVALUATE:   score branches (same as ToT)
3. AGGREGATE:  MERGE multiple branches (NEW — ToT can't do this)
4. REFINE:     improve merged result
```

### Full Pattern Comparison:
```
CoT            → one path, linear           (1 LLM call)
Plan-and-Solve → plan first, then execute   (N+1 calls)
Self-Reflection→ generate, critique, retry  (2-6 calls)
ReAct          → think + act in loop        (variable)
ToT            → explore multiple paths     (3N+ calls)
GoT            → explore + merge paths      (most expensive, best quality)
```

### Practical Reality:
```
⚠️ ToT and GoT are mostly RESEARCH patterns.
Production: CoT (95%), ReAct (tool agents), Self-Reflection (quality-critical)
ToT/GoT: competitive coding, research, creative generation
          where quality >>> cost/latency
```

### JS Analogy:
```
CoT  = single Promise chain:  step1().then(step2).then(step3)
ToT  = Promise.race():        race 3 approaches, pick best
GoT  = Promise.all():         run 3 approaches, MERGE all results
```

### Quiz: PASS (2.5/3)
**Q1: CoT gets a math problem wrong on step 2 of 5. What does ToT do differently?**
My answer: ✅ ToT explores multiple branches. If one path goes wrong at step 2, another branch may get it right. CoT can't backtrack.

**Q2: ToT has 3 branches — A (great budget), B (mediocre), C (great audience). ToT picks A or C. What does GoT do?**
My answer: ✅ GoT merges A + C — combines best budget analysis with best audience targeting into one comprehensive plan.

**Q3: Building a customer support agent. Would you use ToT?**
🔄 My answer: Said "depends on factors" — correct instinct but the answer is almost always NO.
✅ Why not: Latency (9+ LLM calls = 15-30s, customer waiting), cost (10x at scale), overkill (most queries have ONE clear path). Use simple tool calling or ReAct instead.
Rule: ToT = problems where first attempt is often WRONG and you need to explore. Support queries are straightforward lookups.

---

## L5: Task Decomposition & Hierarchical Planning

### The Problem:
Complex tasks are too big for a single LLM call. Even with CoT, the model loses track.

### Task Decomposition — Break Big Into Small:
Split a complex task into **independent subtasks**, solve each separately, combine.
```
"Competitor analysis report"
        ├─→ Subtask 1: "List top 5 competitors"
        ├─→ Subtask 2: "Compare pricing models"
        ├─→ Subtask 3: "Compare feature sets"
        ├─→ Subtask 4: "Analyze market positioning"
        └─→ Subtask 5: "Write executive summary" (depends on 1-4)
```

### Key Difference from Plan-and-Solve:
```
Plan-and-Solve:  steps → execute SEQUENTIALLY (step 2 needs step 1)
Task Decomp:     subtasks → run INDEPENDENTLY in PARALLEL, combine at end

Plan-and-Solve = cooking recipe (step-by-step, order matters)
Task Decomp    = shopping list (buy items in any order, combine)
```

### In Code:
```python
class TaskDecomposition(BaseModel):
    subtasks: list[str]
    dependencies: dict[int, list[int]]  # subtask_idx → depends on [indices]

decomp = model.with_structured_output(TaskDecomposition).invoke(
    f"Break into independent subtasks: {big_task}"
)
# dependencies = {4: [0, 1, 2, 3]}  # summary depends on all others
```

### Parallel Execution — The Real Win:
```
Sequential: Task 1 (3s) → Task 2 (3s) → Task 3 (3s) → Task 4 (3s) = 12 seconds
Parallel:   Task 1-4 (3s each, all at once) → Combine (2s) = 5 seconds total
```

```python
import asyncio

results = await asyncio.gather(
    run_subtask("List competitors"),
    run_subtask("Compare pricing"),
    run_subtask("Compare features"),
)
# THEN run dependent tasks
summary = await run_subtask(f"Write summary from: {results}")
```

### JS Analogy:
```javascript
// Task Decomp = Promise.all → then dependent step
const [competitors, pricing, features] = await Promise.all([
    listCompetitors(),
    comparePricing(),
    compareFeatures(),
]);
const report = await writeSummary(competitors, pricing, features);
```

### Hierarchical Planning — Decompose Recursively:
Some subtasks are STILL too complex. Decompose them too → creates a **hierarchy**.
```
"Build competitor analysis"
├─→ "List competitors"
│    ├─→ "Search industry databases"
│    ├─→ "Check review sites"
│    └─→ "Analyze social media"
├─→ "Compare pricing"
│    ├─→ "Get our pricing tiers"
│    ├─→ "Get competitor A pricing"
│    └─→ "Get competitor B pricing"
└─→ "Write summary" (depends on all above)
```

### In Code — Recursive:
```python
def solve(task, depth=0, max_depth=3):
    complexity = model.with_structured_output(Complexity).invoke(
        f"Simple enough to answer directly? Task: {task}"
    )
    if complexity.is_simple or depth >= max_depth:
        return model.invoke(f"Solve directly: {task}").content
    
    subtasks = model.with_structured_output(TaskDecomposition).invoke(
        f"Break into subtasks: {task}"
    )
    results = [solve(sub, depth + 1) for sub in subtasks.subtasks]
    return model.invoke(f"Combine: {results}").content
```

### Task Decomp vs Plan-and-Solve vs ToT:
```
Plan-and-Solve → sequential, dependent steps
Task Decomp    → parallel, independent subtasks, combined at end
ToT            → parallel, competitive (pick ONE best)
GoT            → parallel, collaborative (MERGE best parts)
```

### When to Use:
```
✅ Reports, analyses (naturally decomposable)
✅ Multi-step workflows with independent parts
✅ When latency matters (parallel execution)
❌ Highly sequential tasks (each step depends on previous)
❌ Simple tasks (decomposition overhead > benefit)
❌ Real-time conversations
```

### Project-1 Connection:
Your classifier already does task decomposition:
```
classify → independent paths:
  ├─ retrieve_from_KB (RAG)
  ├─ look_up (tools)
  └─ respond_direct (chitchat)
```
Router = task decomposition applied to incoming requests at runtime.

### Quiz: 1.5/3
**Q1: "Analyze 3 competitors' pricing, features, and reviews." Plan-and-Solve or Task Decomp?**
My answer: ✅ Task Decomposition — subtasks are independent (3 competitors × 3 dimensions), can run in parallel. No need for sequential execution.

**Q2: 5 subtasks, subtask 5 ("write summary") needs results from 1-4. Run all 5 in parallel?**
⚠️ My answer: ❌ Said "it can handle on its own" — didn't answer.
✅ Correct: Run 1-4 in parallel (independent), then run 5 AFTER 1-4 complete (dependency). Not all-parallel, not all-sequential — it's a **dependency graph**.
```javascript
// JS: Promise.all([1,2,3,4]).then(results => writeSummary(results))
```

**Q3: Relationship between Task Decomposition and Router pattern?**
🔄 My answer: Both split work across specialists — correct direction.
✅ Better: Router = task decomposition applied to **incoming requests** (classify → route). Task Decomp = applied to a **single complex task** (break → solve each). Router is a runtime form of task decomposition.

---

## L6: DAG Execution & Workflow Orchestration

### What's a DAG?
**Directed Acyclic Graph** — nodes with directed edges, **no cycles**.
```
DAG:                    NOT a DAG (has cycle):
  A → B → D              A → B → C
  A → C → D                  ↑   ↓
      ↓                       └───┘
      E
```

### Why DAGs Matter:
DAGs guarantee **termination** — no infinite loops, every node runs exactly once.
```
ReAct/Self-Reflection = has CYCLES (loops back) → might not terminate
DAG workflow          = NO cycles → always terminates, predictable
```

### Project-1 is NOT a DAG:
```
generator → evaluator → route_after_evaluator
                            ├─ "pass"     → END
                            ├─ "retry"    → generator  ← CYCLE!
                            └─ "escalate" → escalate
```
The "retry" edge points backward → cycle.

### DAG in LangGraph:
```python
graph = StateGraph(State)
graph.add_edge(START, "extract")
graph.add_edge("extract", "transform")
graph.add_edge("transform", "load")
graph.add_edge("load", "notify")
graph.add_edge("notify", END)
```

### Parallel Branches (Fan-out / Fan-in):
```
          ┌─→ resize_image ──┐
parse_doc ─┼─→ extract_text ─┼─→ store → END
          └─→ extract_meta ──┘
```
LangGraph waits for ALL incoming edges before running next node (implicit `Promise.all`).

### Conditional DAGs — Dynamic Routing Without Cycles:
```python
def route_by_format(state):
    if state["format"] == "pdf": return "process_pdf"
    elif state["format"] == "csv": return "process_csv"
    return "process_json"

graph.add_conditional_edges("route", route_by_format)
```
Still a DAG — each path goes forward, no loops.

### Workflow Orchestration Concerns:
```
├─ Execution order    → graph edges
├─ Parallelism        → fan-out/fan-in
├─ Error handling     → try/except in nodes
├─ Retries            → RetryPolicy (inside node, keeps DAG structure)
├─ Checkpointing      → checkpointer (resume from any state)
└─ Monitoring         → LangSmith traces
```

### DAGs vs Cycles — Decision:
```
"Will output ever go BACK to a previous node?"
YES → cycles (ReAct, self-reflection, conversation)
NO  → DAG (pipelines, ETL, document processing)
```

### Hybrid — DAG outer shell + cycle inside:
```
DAG: ingest → preprocess → agent_loop → postprocess → deliver
                              │
                          CYCLE inside:
                          agent → tool → agent → answer
```

### JS Analogy:
```
DAG    = Express middleware:  req → auth → validate → handle → res
Cycles = while loop:         while(!done) { attempt(); check(); }
Hybrid = middleware calling a while loop internally
```

### Quiz: 2/3
**Q1: Your project-1 graph — is it a DAG?**
⚠️ My answer: ❌ Said "Yes, it's a DAG" and described a generic pipeline.
✅ Correct: Project-1 is **NOT a DAG** — the `"retry" → generator` edge points backward, creating a cycle. Know YOUR OWN code.

**Q2: Document pipeline: upload → parse → chunk → embed → store. DAG or cyclic? What if chunking fails?**
My answer: ✅ DAG for normal flow. If chunking fails: Option 1 (preferred) = RetryPolicy inside node (graph stays DAG). Option 2 = explicit retry edge (creates cycle, no longer DAG).

**Q3: Fan-out: parse_doc feeds 3 parallel nodes, all feed into store. What guarantees store waits?**
My answer: ✅ LangGraph's execution model — implicit synchronization barrier. `store` scheduled only after ALL predecessor nodes complete and state updates merge. Like `Promise.all()`.

---

## L7: Finite State Machines & Rule/Policy Engines

### FSM — System in ONE state at a time, transitions by defined rules.
```
Order FSM:
  pending → paid → shipped → delivered → returned
    │                                      
    └→ cancelled                           
```

### FSM Components:
```
1. STATES       — finite set (pending, paid, shipped...)
2. TRANSITIONS  — rules for moving between states
3. EVENTS       — what triggers a transition
4. INITIAL STATE— where you start
5. FINAL STATES — where you end
```

### FSM = GUARDRAILS for Agent Behavior:
```python
valid_transitions = {
    "pending":   ["paid", "cancelled"],
    "paid":      ["shipped", "refunded"],
    "shipped":   ["delivered", "returned"],
}
# Agent can ONLY move to allowed next state
# LLM says "deliver a pending order" → BLOCKED
```

### Project-1 as FSM:
```
classifying → {retrieving, looking_up, responding} → generating → evaluating
Invalid: classifying → evaluating (BLOCKED, must generate first)
```

### Rule Engines — LLM Extracts, Rules Decide:
```
User message → LLM (extract facts) → Rule Engine (apply policies) → Action

LLM extracts: {customer_tier: "gold", order_value: 5000}
Rule engine:   IF gold AND order > 1000 THEN 20% discount
Action:        "Your new total is $4,000"
```

```python
class ExtractedFacts(BaseModel):
    customer_tier: str
    order_value: float
    request_type: str

def apply_rules(state):
    facts = state["facts"]
    actions = []
    if facts.customer_tier == "gold" and facts.order_value > 1000:
        actions.append("apply_20_percent_discount")
    if facts.request_type == "refund" and facts.order_value > 5000:
        actions.append("escalate_to_supervisor")
    return {"actions": actions}
```

### Policy Engines — Rules with Priority & Conflict Resolution:
```
Rule 1: Gold → 20% off. Rule 2: >$10k → 15% off. Rule 3: Max 25%.
Gold + $12k → both fire → policy caps at 25% (not 35%)
```

### Production Pattern — Combine All Three:
```
FSM controls   WHAT the agent can do (valid states)
Rules control  HOW decisions are made (business logic)
LLM handles    UNDERSTANDING (parsing intent, generating responses)
```

### JS Analogy:
```
FSM          = Redux (defined states + actions + reducers)
Rule Engine  = Express middleware (if condition → do action)
Policy Engine= RBAC (check permissions before action)
```

### Quiz: 3/3 🎉
**Q1: Project-1 evaluator "retry" → generator creates a cycle. FSM problem + fix?**
My answer: ✅ Cycle = unbounded loop risk. Fix: bounded retries with counter + max_retries. Graph still has cycle but workflow has a well-defined stopping condition. FSM purist would add explicit states (retry_1, retry_2, retry_3).

**Q2: Agent gives full refund without checking rules. Fix + responsibility split?**
My answer: ✅ LLM extracts intent (action: "refund", order_id: 456) → Rule Engine checks (order exists? within 30 days? already refunded? amount allowed?) → Decision (approved/denied/escalate) → LLM explains outcome in natural language. "LLM should not invent or override business rules."

**Q3: Key difference between FSM and Rule Engine? Can you have both?**
My answer: ✅ FSM = workflow (what happens NEXT, controls flow). Rule Engine = decisions (what SHOULD happen, business logic). Yes — FSM orchestrates steps, Rule Engine determines outcomes, LLM handles language. Production systems combine all three.

---

## L8: LLM Compiler Pattern

### The Problem:
All patterns so far: YOU decide what's parallel. What if the LLM itself figures it out?
```
Plan-and-Solve:  plan → execute sequentially (slow)
Task Decomp:     YOU decide what's parallel (manual)
LLM Compiler:    LLM analyzes dependencies → auto-parallelizes (automatic)
```

### Why "Compiler"?
```
Source code → Compiler → optimized machine code (reorders, parallelizes)
Task desc   → LLM      → optimized execution plan (auto-parallel)
```

### 3 Phases:
```
Phase 1: PLAN      — LLM breaks task into steps + dependency graph
Phase 2: SCHEDULE  — Identify parallel batches (topological sort)
Phase 3: EXECUTE   — Run parallel groups, feed results forward
```

### Example:
```
"Compare AWS, GCP, Azure for ML workload"

Plan:
  Task 1: Get AWS pricing     (no deps)
  Task 2: Get GCP pricing     (no deps)
  Task 3: Get Azure pricing   (no deps)
  Task 4: Compare all three   (deps: 1, 2, 3)
  Task 5: Recommend           (deps: 4)

Schedule:
  Batch 1: [1, 2, 3]  ← parallel
  Batch 2: [4]         ← after batch 1
  Batch 3: [5]         ← after batch 2

Total: ~9s instead of ~15s sequential
```

### In Code:
```python
class Task(BaseModel):
    id: int
    description: str
    dependencies: list[int] = []

class ExecutionPlan(BaseModel):
    tasks: list[Task]

# Phase 1: LLM generates plan
plan = model.with_structured_output(ExecutionPlan).invoke(
    f"Break into tasks with dependencies: {goal}"
)

# Phase 2: Schedule (topological sort)
def schedule(tasks):
    completed, batches, remaining = set(), [], list(tasks)
    while remaining:
        ready = [t for t in remaining
                 if all(d in completed for d in t.dependencies)]
        if not ready: raise ValueError("Circular dependency!")
        batches.append(ready)
        for t in ready:
            completed.add(t.id)
            remaining.remove(t)
    return batches

# Phase 3: Execute
results = {}
for batch in schedule(plan.tasks):
    batch_results = await asyncio.gather(
        *[execute_task(t, results) for t in batch]
    )
    for task, result in zip(batch, batch_results):
        results[task.id] = result
```

### LLM Compiler vs Other Patterns:
```
Pattern          Who decides parallelism?    Who decides steps?
CoT              N/A (single call)           LLM (inline)
Plan-and-Solve   None (all sequential)       LLM (upfront)
Task Decomp      YOU (manual)                YOU or LLM
LLM Compiler     LLM (automatic!)            LLM (with dep graph)
```

### ⚠️ Risk — Bad Dependency Analysis:
LLM might miss dependencies → task runs with no data → garbage. For critical workflows, validate the graph or define dependencies manually.

### Production Hybrid — safest approach:
```
LLM:     suggests tasks, extracts intent (proposals)
Rules:   constructs + validates dependency graph (deterministic)
Executor: runs only a verified DAG
```
"Treat the LLM as an assistant that proposes plans, not the final authority on execution order."

### Full Module 6 Pattern Summary:
```
Pattern              When to Use                    LLM Calls  Project-1?
ReAct                Tool-using, multi-step         Variable   No (single-pass)
CoT                  Reasoning, classification      1          Yes (evaluator)
Plan-and-Solve       Sequential multi-step          N+1        Yes (hardcoded plan)
Self-Reflection      Quality checking               2-6        Yes (eval→retry)
Reflexion            Learning from failures         3-9        No
Tree of Thoughts     Explore multiple approaches    3N+        No (overkill)
Graph of Thoughts    Explore + merge approaches     Most       No (overkill)
Task Decomposition   Independent parallel tasks     N+1        Yes (classifier)
DAG                  Pipeline, guaranteed end        N          Partial (has cycle)
FSM                  Controlled state transitions   N          Yes
Rule Engine          Deterministic business logic   1+rules    Partial
LLM Compiler         Auto-parallel scheduling       N+1        No
```

### Quiz: 3/3 🎉
**Q1: Task Decomp and LLM Compiler both parallelize. Key difference?**
My answer: ✅ Task Decomp = YOU decide what's parallel (manual, hardcoded). LLM Compiler = LLM discovers parallelism from its own generated dependency graph (automatic).

**Q2: Task A (no deps), Task B (deps: A), Task C (no deps), Task D (deps: B, C). Draw batches.**
My answer: ✅ Batch 1: [A, C] parallel. Batch 2: [B] (waits for A). Batch 3: [D] (waits for B and C).
```
A ──→ B ──┐
          ├──→ D
C ────────┘
```

**Q3: Financial system — use LLM Compiler as-is?**
My answer: ✅ No. LLM could omit/invent dependencies → financial errors. Safer: LLM proposes tasks → deterministic planner/rule engine constructs + validates DAG → executor runs verified plan. "LLM as assistant that proposes, not final authority on execution order."

---

## MODULE 6 EXAM — 100% PASS (10/10) 🎉 — Third perfect exam.

### Section A (4/4):

**A1: "What's the capital of France?" — which patterns are overkill, which is appropriate?**
My answer: ✅ Overkill: ToT (no complex search), LLM Compiler (no dependency graph). Appropriate: single LLM call — no orchestration needed for simple factual lookup.

**A2: "LLM generates → critiques → stores lesson → retries with accumulated lessons." Name the pattern.**
My answer: ✅ Reflexion — defining feature is stored lessons across retries.

**A3: Agent has 35 tools, keeps picking wrong one. Two fixes?**
My answer: ✅ Quick: better tool descriptions/selection instructions. Architectural: Tool RAG — retrieve relevant 3-5 tools per query instead of exposing all 35. (Also valid: Router/Supervisor pattern from L1.)

**A4: Fill in the blanks.**
My answer: ✅ CoT = 1 call. Plan-and-Solve = sequential. Task Decomp = parallel. LLM Compiler = LLM decides parallelism.

### Section B (4/4):

**B1: Design refund processing system with 3+ patterns from this module.**
My answer: ✅ Architecture:
- Single LLM → intent extraction (action: refund, order_id, reason)
- Plan-and-Solve → workflow planning (lookup → check policy → decide → respond)
- Rule Engine → policy enforcement (deterministic: refund window, previous refunds, approval rules)
- Self-Reflection → optional response polishing
- LLM vs deterministic split: LLM understands + explains, deterministic logic enforces + executes.

**B2: 6 tasks with dependencies. Draw graph, compute batches, calculate time.**
My answer: ✅
```
T1 ──→ T3 ──→ T5 ──┐
│                   │
└────→ T4 ──────────┼──→ T6
                    │
T2 ────→ T4 ───────┘
```
Batches: [T1,T2] → [T3,T4] → [T5] → [T6]
Parallel: 4 × 2s = 8s. Sequential: 6 × 2s = 12s. Savings: 33% faster.

### Section C (2/2):

**C1: Should project-1 upgrade to Reflexion or Tree of Thoughts?**
My answer: ✅
- **Reflexion**: Selectively worth it for complex troubleshooting (multi-step reasoning with repeated mistakes). Not as default — most support queries are straightforward, extra LLM calls waste cost/latency.
- **ToT**: Not worth it. Support has one correct workflow, not competing reasoning paths. Business rules dominate, not open-ended exploration. High token/latency cost for no benefit.
- Better fit: Plan-and-Solve + deterministic rules + optional Self-Reflection for hard cases.
