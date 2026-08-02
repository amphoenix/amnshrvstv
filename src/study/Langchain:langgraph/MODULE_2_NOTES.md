# Module 2 — LangChain Core

## L1: What is LangChain & Why It Exists

### Key Concepts:

**1. Without LangChain** you manage everything manually:
- Write JSON tool schemas by hand
- Make raw API calls to OpenAI/Anthropic
- Build tool routing logic
- Manage message lists manually
- Handle multi-turn conversations yourself
- Hundreds of lines of boilerplate per agent

**2. LangChain = building blocks for LLM apps:**
Models, Messages, Tools, Agents, Memory, Tracing — all modular. Pick what you need.

**3. Provider abstraction (key value):**
Write your agent ONCE, swap models by changing ONE string:
```python
model = init_chat_model("gpt-4o-mini", model_provider="openai")
# Change to Anthropic? Just:
model = init_chat_model("claude-sonnet", model_provider="anthropic")
# All your agent code stays exactly the same
```

**4. Three packages:**
- `langchain-core`: foundation (messages, tools, base interfaces)
- `langchain-<provider>`: model wrappers (`langchain-openai`, `langchain-anthropic`)
- `langgraph`: agent framework (`create_react_agent`, workflows, memory)

**5. What LangChain is NOT:**
- NOT an LLM (it wraps them)
- NOT a model provider (it connects to them)
- NOT magic (you still write business logic)
- Does NOT execute tools (your code does)

**6. Analogy:** LangChain is to LLM apps what Express.js is to web apps — handles plumbing (routing, middleware, request/response), you write business logic.

### Quiz Q&A:
**Q1: In one sentence, what problem does LangChain solve?**
A: Eliminates manual boilerplate for building LLM agents — provider abstraction, tool schemas, message management, agent loops.

**Q2: What does LangChain NOT handle?**
A: Business logic. Like Express.js — it handles plumbing, you write the actual application logic.

---

## L2: Models — init_chat_model & Provider Strings

### Key Concepts:

**1. `init_chat_model` = factory function:**
```python
from langchain.chat_models import init_chat_model
model = init_chat_model("gpt-4o-mini", model_provider="openai")
```
Give model name + provider string → get a universal model object that works with all LangChain tools.

**2. `invoke()` = universal method to call any model:**
```python
response = model.invoke("What is Python?")
# or with message list:
response = model.invoke([SystemMessage("Be brief"), HumanMessage("What is Python?")])
```

**3. 🔑 Return type is `AIMessage` — NOT a string:**
```python
response = model.invoke("Hello")
type(response)      # AIMessage
response.content     # "Hello! How can I help?" ← the text
response.tool_calls  # [] ← tool call requests (empty if none)
response.usage_metadata  # {'input_tokens': 5, 'output_tokens': 12, ...}
```

**4. ❌ `.text` does NOT exist. It's `.content`:**
```python
response.text     # ❌ AttributeError!
response.content  # ✅ "Hello! How can I help?"
```

**5. Configuration:**
```python
# At init:
model = init_chat_model("gpt-4o-mini", model_provider="openai", temperature=0)
# Per-call override:
model.bind(temperature=0.9).invoke("Write a poem")
```

**6. API keys** via environment variables, NEVER hardcode:
```python
import os
os.environ["OPENAI_API_KEY"] = "sk-..."  # or set in .env
```

### Quiz Q&A:
**Q1: What does `model.invoke("Hello")` return?**
A: An `AIMessage` object. NOT a string. Access text via `.content`.

**Q2: `response = model.invoke("Hi"); print(response.text)` — what's the bug?**
A: `.text` doesn't exist on `AIMessage`. Should be `response.content`.

**Q3: How does `init_chat_model` provide provider abstraction?**
A: Factory pattern — give model name + provider string, get universal object. Change ONE string to switch providers, all code stays the same.

---

## L3: Messages — The Language of LLM Conversations

### Key Concepts:

**1. Four message types:**
```python
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage, ToolMessage

SystemMessage("You are a helpful assistant")  # developer sets rules/persona
HumanMessage("What's the weather?")           # user's input
AIMessage(content="Let me check...")          # model's response OR tool call
ToolMessage(content="72°F", tool_call_id="abc")  # tool result (YOU create this)
```

**2. Conversation = ordered list of messages:**
```python
messages = [
    SystemMessage("You are a weather bot"),
    HumanMessage("What's the weather in Tokyo?"),
    AIMessage(content="", tool_calls=[{"name": "get_weather", "args": {"city": "Tokyo"}, "id": "call_abc"}]),
    ToolMessage(content="72°F, sunny", tool_call_id="call_abc"),
    AIMessage(content="It's 72°F and sunny in Tokyo!")
]
```
That's 5 messages for ONE question. The model sees ALL of them on the second call.

**3. Tool-calling flow in messages:**
```
SystemMessage → HumanMessage → AIMessage(tool_calls) → ToolMessage(result) → AIMessage(content)
     1               2                  3                      4                    5
```

**4. `tool_call_id`:** links a ToolMessage to its corresponding AIMessage tool call. MUST match. Without it, the model doesn't know which tool result goes with which request.

**5. Critical bug — model has NO memory between calls:**
```python
# ❌ BUG: fresh list each call = model forgets everything
response1 = model.invoke([HumanMessage("My name is Aman")])
response2 = model.invoke([HumanMessage("What's my name?")])  # "I don't know your name"

# ✅ FIX: append to ONE list
messages = []
messages.append(HumanMessage("My name is Aman"))
response1 = model.invoke(messages)
messages.append(response1)
messages.append(HumanMessage("What's my name?"))
response2 = model.invoke(messages)  # "Your name is Aman"
```

### Quiz Q&A:
**Q1: List all 5 message types in the correct order for a tool-calling interaction.**
A: SystemMessage → HumanMessage → AIMessage (with tool_calls) → ToolMessage (with tool_call_id) → AIMessage (with content).

**Q2: What does `tool_call_id` do?**
A: Links the ToolMessage result to the specific AIMessage tool call it belongs to. Must match.

**Q3: A dev calls `invoke()` with a fresh message list each time and the model "forgets." What's wrong?**
A: Model has NO memory between `invoke()` calls. Each call only sees what you pass. Must append to ONE list and pass the entire conversation each time.

---

## L4: Tools — The @tool Decorator

### Key Concepts:

**1. `@tool` decorator reads 3 things → auto-generates JSON schema:**
```python
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:       # ← type hints = parameter schema
    """Get current weather for a city."""  # ← docstring = description for LLM
    return f"72°F in {city}"              # ← function name = tool name
```
The decorator reads: **name** (`get_weather`), **docstring** (`"Get current weather..."`), **type hints** (`city: str`) → creates a JSON schema that's sent to the LLM.

**2. Docstring = instructions to the LLM:**
The LLM reads the docstring to decide WHEN to use this tool and WHAT arguments to pass. Bad docstring → LLM picks wrong tool or passes wrong args.
```python
# ❌ Bad: "Does stuff" → LLM has no idea when to use this
# ✅ Good: "Get current weather for a city. Use when user asks about weather conditions."
```

**3. `bind_tools()` = tells model what tools exist:**
```python
model_with_tools = model.bind_tools([get_weather, search_orders])
```
This sends the tool schemas to the model. It does NOT execute anything — just makes the model aware of available tools.

**4. Tool invocation — YOUR code executes:**
```python
# After model returns tool_calls:
result = get_weather.invoke({"city": "Tokyo"})  # YOUR code calls this
```

**5. Schema costs tokens:**
The JSON schema for each tool is sent in the context every call. More tools = more tokens = more cost.

### 🔑 KEY: LLM picks wrong tool? Fix the DOCSTRING, not the tool_id.

### Quiz Q&A:
**Q1: What 3 things does `@tool` read from your function?**
A: Function name, docstring, type hints.

**Q2: The LLM keeps calling `search_orders` when the user asks about weather. What's the fix?**
A: Fix the DOCSTRING. The LLM reads tool descriptions to decide which tool to use. The description is ambiguous or too generic.

**Q3: Does `bind_tools()` execute the tools?**
A: No. It only sends tool schemas to the model. Execution happens when YOUR code calls `tool.invoke(args)` after the model requests it.

---

## L5: Agents — create_react_agent & The Agent Loop

### Key Concepts:

**1. ReAct = Reason + Act:**
Agent reasons about what to do → acts (calls a tool) → observes the result → reasons again → repeats until done.

**2. `create_react_agent(model, tools)` handles the ENTIRE loop:**
```python
from langgraph.prebuilt import create_react_agent

agent = create_react_agent(model, [get_weather, search_orders])
result = agent.invoke({"messages": [HumanMessage("What's the weather in Tokyo?")]})
```
You provide: model, tools, optional prompt. Agent handles: binding tools, executing them, managing messages, deciding when to stop.

**3. Termination condition:**
The loop stops when the model responds with an `AIMessage` that has NO `tool_calls` — just `.content`. That's the signal that the model is done reasoning and has a final answer.

**4. System prompt:**
```python
agent = create_react_agent(model, tools, prompt="You are a helpful weather assistant.")
```

**5. Multi-turn with memory:**
```python
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
agent = create_react_agent(model, tools, checkpointer=memory)
# Must pass thread_id:
agent.invoke({"messages": [HumanMessage("Hi")]}, config={"configurable": {"thread_id": "user-123"}})
```

**6. What YOU write vs what agent handles:**
```
YOU write:           Agent handles:
- model              - binding tools to model
- tools              - the reason-act loop
- prompt             - executing tool calls
- invoke()           - managing message list
                     - deciding when to stop
```

### Quiz Q&A:
**Q1: What does ReAct stand for? What are the steps?**
A: Reason + Act. Steps: Reason (decide what to do) → Act (call tool) → Observe (read result) → Repeat until done.

**Q2: How does the agent know when to stop looping?**
A: When the model returns an AIMessage with NO tool_calls (just .content). That means it has a final answer.

**Q3: Who executes the tools — the LLM or the agent code?**
A: The agent code (your code). The LLM only outputs a tool call REQUEST. The agent reads the request and calls the actual function.

---

## L6: Structured Output — .with_structured_output()

### Key Concepts:

**1. Problem:** Sometimes you need structured DATA back, not free text. "Classify this ticket" should return `{"priority": "P1", "category": "billing"}`, not a paragraph.

**2. Pydantic models = schema definition:**
```python
from pydantic import BaseModel, Field

class TicketClassification(BaseModel):
    priority: str = Field(description="P0, P1, P2, or P3")
    category: str = Field(description="billing, technical, or general")
```
Like TypeScript interface but **runtime-enforced**. `Field(description=...)` guides the LLM on what to put in each field.

**3. `.with_structured_output(Schema)` forces model to match your schema:**
```python
structured_model = model.with_structured_output(TicketClassification)
result = structured_model.invoke("Server is completely down for all users")
```

**4. 🔑 Return type = Pydantic object, NOT AIMessage:**
```python
result = structured_model.invoke("Server is down")
type(result)       # TicketClassification (Pydantic object)
result.priority    # "P0" ← access via field name
result.category    # "technical" ← access via field name
result.content     # ❌ AttributeError! Pydantic objects have NO .content
```

**5. When to use @tool vs .with_structured_output():**
```
@tool                        → LLM needs to DO something (search, send, query)
                               LLM requests action, your code executes

.with_structured_output()    → LLM needs to GIVE YOU structured data
                               (classify, extract, parse)
                               Forced to return your schema
```

### 10-year-old version:
- `@tool` = "here's a button you can ask me to press"
- `.with_structured_output()` = "fill out this form for me"

### Quiz Q&A:
**Q1: What does `.with_structured_output()` return — AIMessage or Pydantic object?**
A: Pydantic object. Access fields directly (`.priority`, `.category`). NO `.content`.

**Q2: When would you use `@tool` vs `.with_structured_output()`?**
A: `@tool` when the LLM needs to DO something (action/side effect). `.with_structured_output()` when the LLM needs to RETURN structured data (classification/extraction).

---

## L7: Streaming — Real-Time Responses

### Key Concepts:

**1. Why streaming works — autoregressive generation:**
The model generates ONE token at a time. Each token is a separate prediction step. So each token can be delivered to the user IMMEDIATELY instead of waiting for the entire response.

This is NOT about the input pipeline (tokenization → embedding → attention). That's input processing. Streaming is about OUTPUT delivery.

**2. Three streaming methods:**

```python
# Token-by-token (model level):
for chunk in model.stream("Tell me a story"):
    print(chunk.content, end="")  # each chunk = AIMessageChunk with a few tokens

# Step-by-step (agent level):
for event in agent.stream({"messages": [HumanMessage("...")]}):
    print(event)  # each event = one agent step (tool call, tool result, final answer)

# Everything (agent level, async):
async for event in agent.astream_events({"messages": [HumanMessage("...")]}, version="v2"):
    print(event)  # token-level + tool events + everything
```

**3. When to use which:**
```
invoke()           → background tasks, no UI needed
stream()           → chatbot UI, show progress step by step
astream_events()   → full control, token-level streaming in UI
```

### 🔑 KEY: Streaming works because autoregressive generation = one token at a time.

### Quiz Q&A:
**Q1: WHY can LLMs stream their output? What makes it technically possible?**
A: Autoregressive generation — the model produces ONE token at a time, each as a separate prediction step. Each token can be sent immediately as it's generated. NOT about the input pipeline.

**Q2: What's the difference between `model.stream()` and `agent.stream()`?**
A: `model.stream()` gives token-by-token chunks (AIMessageChunk). `agent.stream()` gives step-level events (full tool calls, tool results, final answer).

---

## L8: Short-Term Memory — Checkpointers & thread_id

### Key Concepts:

**1. Problem:** Model has NO memory between `invoke()` calls. If you don't pass conversation history, every call is a fresh start.

**2. Checkpointers** automatically persist message history after every agent step. No manual message list management.

**3. `MemorySaver()` = in-memory checkpointer (dev/testing ONLY):**
```python
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
agent = create_react_agent(model, tools, checkpointer=memory)
```
⚠️ Data lives in RAM — lost when server restarts. NEVER use in production.

**4. `thread_id` = conversation identifier:**
```python
config = {"configurable": {"thread_id": "user-123-session-1"}}
agent.invoke({"messages": [HumanMessage("Hi")]}, config=config)
# Same thread_id = continues conversation
# Different thread_id = fresh conversation
```

**5. Production checkpointers:**
```python
from langgraph.checkpoint.postgres import PostgresSaver  # survives restarts
from langgraph.checkpoint.sqlite import SqliteSaver      # lightweight persistent
```

**6. Short-term vs Long-term memory:**
```
Short-term = conversation history in ONE thread (checkpointers handle this)
Long-term  = knowledge across ALL conversations (vector DBs, user profiles — Module 5)
```

### 🔑 KEY: `thread_id` alone does NOTHING. You need checkpointer + thread_id together.

### Quiz Q&A:
**Q1: What happens with same thread_id? Different thread_id?**
A: Same = agent has full conversation history, continues where it left off. Different = fresh start, no memory of previous conversation.

**Q2: Why is MemorySaver not suitable for production? What would you use?**
A: Data is in RAM — lost on server restart. Use `PostgresSaver` or `SqliteSaver` for persistence.

**Q3: A developer's agent "forgets" after server restart. They're using MemorySaver. Fix?**
A: Switch to a persistent checkpointer (`PostgresSaver`, `SqliteSaver`). MemorySaver is RAM-only.

---

## L9: Middleware — Prebuilt & Custom

### Key Concepts:

**1. Middleware = Express middleware for agents:**
Intercepts every agent step — before model runs, after model runs, before tool executes, after tool executes.

**2. `prompt` parameter can be static or dynamic:**
```python
# Static:
agent = create_react_agent(model, tools, prompt="You are a helpful assistant.")

# Dynamic (function):
def dynamic_prompt(state):
    user = get_current_user(state)
    return f"You are helping {user.name}. Their account is {user.tier} tier."
agent = create_react_agent(model, tools, prompt=dynamic_prompt)
```

**3. Common middleware patterns:**
- **Logging**: record every agent step for debugging
- **Rate limiting**: prevent too many LLM calls
- **Input guardrails**: check user input for blocked topics, return canned response
- **Output filtering**: redact PII from responses
- **Token counting**: track usage per user
- **Auth injection**: add user credentials to tool calls
- **Retry wrappers**: retry failed LLM/tool calls with backoff

**4. Guardrail example:**
```python
def guardrail(state):
    last_msg = state["messages"][-1].content
    if "hack" in last_msg.lower():
        return {"messages": [AIMessage("I can't help with that.")]}
    return None  # continue normal flow
```

### Quiz Q&A:
**Q1: In one sentence, what is middleware in the agent context?**
A: Middleware intercepts every agent step (before/after model calls, before/after tool calls) — like Express middleware for HTTP requests.

**Q2: Name two production use cases for middleware.**
A: Retry wrappers (retry failed LLM calls), input guardrails (block dangerous/off-topic inputs). Others: logging, rate limiting, PII redaction, token counting.

---

## L10: Observability & Tracing — LangSmith

### Key Concepts:

**1. The problem — code errors vs decision errors:**
```
Code error  = crash, stack trace, exception → console.log/debugger works
Decision error = wrong output but no crash → console.log is USELESS
```
LLM bugs are DECISION errors. The agent called the wrong tool, gave wrong info, hallucinated — but the code ran fine. You can't debug a decision with `console.log`.

**2. LangSmith records every step:**
LLM calls, tool executions, inputs, outputs, tokens used, latency, cost — every decision point in the agent is traced.

**3. Setup — 3 environment variables, zero code changes:**
```python
os.environ["LANGSMITH_API_KEY"] = "ls-..."
os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_PROJECT"] = "my-project"
# That's it. No code changes. LangChain auto-sends traces.
```

**4. Diagnosis workflow:**
```
Agent called wrong tool? →
  1. Open LangSmith trace
  2. See what LLM received as input (messages + tool schemas)
  3. Read the tool descriptions the LLM saw
  4. Find the ambiguity — fix the docstring/description
```

**5. Traces vs Logs — use BOTH:**
```
Logs   → app logic errors (crashes, API failures, auth issues)
Traces → LLM/agent behavior (wrong tool, hallucination, bad reasoning)
```

### Quiz Q&A:
**Q1: Why can't you debug an LLM agent like a REST API?**
A: LLM bugs are DECISION errors (wrong output, no crash) not CODE errors (crash with stack trace). You can't console.log a decision — you need to trace the LLM's inputs, tool schemas, and reasoning to find why it made the wrong choice.

**Q2: Agent keeps calling the wrong tool. How do you use LangSmith to diagnose?**
A: Open the trace → see what LLM received as input → read the tool descriptions/schemas it saw → find the ambiguity in descriptions → fix the docstring.

---

## MODULE 2 EXAM: 72% PASS

### What went wrong:
- Initial 19% — skipped 4 questions, refused to write code
- Said "can't use structured.invoke" (you CAN — bug is `.content` on Pydantic)
- Said "need thread_id" when they already HAD it (missing checkpointer)
- Wrote motivational sentences instead of a system prompt

### What went right:
- Fixed checkpointer bug in own code
- Wrote EXCELLENT production-quality system prompt (6 rules, 3 tools, P0 examples)
- Architecture Q: classify → structured output, lookup → @tool, workflow → agent ✅

### Exam code that passed (R1):
```python
from langchain.chat_models import init_chat_model
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

model = init_chat_model("gpt-4o-mini", model_provider="openai")

@tool
def lookup_order(order_id: str) -> str:
    """Search orders."""
    return f"Search results for {order_id}"

@tool
def cancel_order(order_id: str) -> str:
    """Cancel order"""
    return f"Your order has been canceled for {order_id}"

memory = MemorySaver()
agent = create_react_agent(model, [lookup_order, cancel_order], checkpointer=memory)
```

### System prompt that passed (R2):
```
You are a customer support assistant responsible for helping customers with
orders, returns, refunds, and general account questions.

Tools:
- lookup_order: Retrieve order details. Use BEFORE any order-related action.
- cancel_order: Cancel an order. Only after customer explicitly confirms.
- escalate_to_human: Transfer P0/urgent cases immediately.

Guardrails:
1. Always use lookup_order before discussing order status/cancellations.
2. Before cancel_order, ask "Are you sure?" and wait for confirmation.
3. If critical (P0) — security, fraud, outage — use escalate_to_human immediately.
4. Never guess order info or claim actions completed without tool confirmation.
5. If missing info (e.g., order ID), ask for it before using any tool.
6. Keep responses clear, courteous, and focused.
```

---

## REVIEW: The Big 3 Decision

```
@tool                       → LLM needs to DO something (action)
.with_structured_output()   → LLM needs to GIVE structured data (extraction)
create_react_agent()        → LLM handles MULTI-STEP workflow (orchestration)
```

10-year-old version:
- Structured output = "fill out this form for me"
- @tool = "here's a button you can ask me to press"
- Agent = "handle the whole job, press as many buttons as you need"
