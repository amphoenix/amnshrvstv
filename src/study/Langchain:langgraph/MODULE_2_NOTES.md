# Module 2 — LangChain Core

## L1: What is LangChain & Why It Exists

### Key Concepts:

**1. The Problem LangChain Solves — without it, you manage everything manually:**
```
User question
   → LLM decides tool
      → Your code executes tool
         → Result goes back to LLM
            → LLM responds (or calls another tool)
```
Without LangChain: write JSON schemas by hand, make raw API calls, build tool routing, manage message lists, handle multi-turn — hundreds of lines of boilerplate per agent.

**2. LangChain = Lego blocks for LLM apps:**
```
┌────────────────────────────────────────────────────┐
│  LangChain = Lego blocks for LLM applications      │
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Models  │ │ Messages │ │  Tools   │           │
│  │ Any LLM  │ │ Standard │ │ Define   │           │
│  │ provider │ │ format   │ │ once,    │           │
│  │ same API │ │ across   │ │ use      │           │
│  │          │ │ providers│ │ anywhere │           │
│  └──────────┘ └──────────┘ └──────────┘           │
│                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Agents  │ │ Memory   │ │ Tracing  │           │
│  │ The loop,│ │ Persist  │ │ Debug &  │           │
│  │ built-in │ │ context  │ │ observe  │           │
│  └──────────┘ └──────────┘ └──────────┘           │
└────────────────────────────────────────────────────┘
```

**3. Provider abstraction (key value):**
Write your agent ONCE, swap models by changing ONE string:
```python
model = init_chat_model("gpt-4o-mini", model_provider="openai")
# model = init_chat_model("claude-sonnet-4-20250514", model_provider="anthropic")
# model = init_chat_model("gemini-1.5-pro", model_provider="google-genai")
# Same code works for all three ↑
```

**📌 My project-1 uses the provider-specific class directly instead:**
```python
# project-1/src/agents.py — direct provider class (no factory)
from langchain_google_genai import ChatGoogleGenerativeAI
model = ChatGoogleGenerativeAI(model="gemma-4-31b-it", include_thoughts=False)
```
Both work. `init_chat_model` = swap providers with one string change.
`ChatGoogleGenerativeAI` = direct instantiation, need to rewrite import + constructor to switch.

**4. Three packages:**
```
┌──────────────────────────────────────────────────────────┐
│  PACKAGE 1: langchain-core                               │
│  The foundation. Messages, tools, base interfaces.       │
│  You ALWAYS use this.                                    │
├──────────────────────────────────────────────────────────┤
│  PACKAGE 2: langchain-<provider>                         │
│  Provider-specific model wrappers.                       │
│  Install only what you need.                             │
├──────────────────────────────────────────────────────────┤
│  PACKAGE 3: langgraph                                    │
│  The agent framework. Agents, memory, workflows.         │
└──────────────────────────────────────────────────────────┘
```

**5. What LangChain is NOT:**
```
❌ LangChain is NOT an LLM. It doesn't generate text.
❌ LangChain is NOT a model provider. You still need API keys.
❌ LangChain is NOT magic. It's a framework — you still write the logic.
❌ LangChain does NOT execute tools. YOUR code does.
   LangChain just automates the loop of: LLM decides → you execute → result back.
```

**6. Analogy:** LangChain is to LLM apps what Express.js is to web apps — handles plumbing (routing, middleware, request/response), you write business logic.

### Quiz Q&A:
**Q1: What problem does LangChain solve?**
My answer: "WITHOUT LANGCHAIN, I'll manage everything manually" — ✅ PASS

**Q2: If LangChain is like Express.js, what does that tell you about what it does NOT do?**
My answer: "It doesn't handle my business logic, I write that. It gives you model abstraction, tool routing, message handling" — ✅ PASS

---

## L2: Models — init_chat_model & Provider Strings

### Key Concepts:

**1. `init_chat_model` = factory function:**
```python
from langchain.chat_models import init_chat_model

# Switch provider by changing ONE string:
model = init_chat_model("gpt-4o-mini", model_provider="openai")
# model = init_chat_model("claude-sonnet-4-20250514", model_provider="anthropic")
# model = init_chat_model("gemini-1.5-pro", model_provider="google-genai")

# ALL THREE have the exact same interface:
response = model.invoke("What is 2 + 2?")
```

**2. `invoke()` = universal method to call any model:**
```python
# Way 1: Simple string (auto-wrapped in HumanMessage)
response = model.invoke("What is the capital of France?")

# Way 2: List of messages (production pattern)
response = model.invoke([
    SystemMessage("You are a helpful assistant. Be concise."),
    HumanMessage("What is the capital of France?"),
])
```

**3. 🔑 Return type is `AIMessage` — NOT a string:**
```python
response = model.invoke([HumanMessage("What is 2+2?")])

# response is an AIMessage:
# AIMessage(
#   content='4',
#   response_metadata={
#     'token_usage': {'prompt_tokens': 12, 'completion_tokens': 1, 'total_tokens': 13},
#     'model_name': 'gpt-4o-mini',
#     'finish_reason': 'stop'
#   },
#   id='run-abc123',
#   tool_calls=[],
#   usage_metadata={'input_tokens': 12, 'output_tokens': 1}
# )
```
Key properties:
```python
response.content          # The text response ("4")
response.response_metadata  # Token usage, model info, etc.
response.tool_calls       # If the model called tools (empty here)
response.usage_metadata   # Token counts for monitoring
```

**4. ❌ `.text` does NOT exist. It's `.content`:**
```python
response.text     # ❌ AttributeError! CRASHES
response.content  # ✅ "Hello! How can I help?"
```

**5. Configuration:**
```python
# Method 1: At init time
model = init_chat_model("gpt-4o-mini", model_provider="openai", temperature=0, max_tokens=500)

# Method 2: Override per-call with .bind()
creative_model = model.bind(temperature=0.9)
response = creative_model.invoke("Write a haiku about Python")
```
```
┌──────────────┬──────────────────────────────────┐
│ Parameter    │ What it does                     │
├──────────────┼──────────────────────────────────┤
│ temperature  │ Randomness (0=deterministic)     │
│ max_tokens   │ Max output tokens                │
│ stop         │ Stop sequences                   │
│ model        │ Model name string                │
└──────────────┴──────────────────────────────────┘
```

**6. Provider packages & API keys:**
```
┌──────────────┬─────────────────────┬──────────────────────┐
│ Provider     │ pip install          │ API Key env var      │
├──────────────┼─────────────────────┼──────────────────────┤
│ OpenAI       │ langchain-openai    │ OPENAI_API_KEY       │
│ Anthropic    │ langchain-anthropic │ ANTHROPIC_API_KEY    │
│ Google       │ langchain-google    │ GOOGLE_API_KEY       │
│ AWS Bedrock  │ langchain-aws       │ AWS credentials      │
└──────────────┴─────────────────────┴──────────────────────┘
```
NEVER hardcode API keys. Use environment variables or `.env` files.

### Quiz Q&A:
**Q1: What is the return type of `model.invoke()`? What property for the text?**
⚠️ My answer: "invoke() is the universal method to call any model" — ❌ WRONG
That's what it IS, not what it RETURNS.
✅ Correct: Returns an `AIMessage` object. Access text via `.content`.

**Q2: `print(model.invoke("Hello").text)` — what's the bug?**
⚠️ My answer: "Looks correct, no?" — ❌ WRONG
✅ Correct: `.text` doesn't exist on `AIMessage`. Should be `.content`.

**Q3: Why `init_chat_model` with provider param instead of separate classes?**
My answer: "Factory function, agent code doesn't change when you switch models. Only the init line changes." — ✅ PASS

**Check question (had to pass before continuing):**
```python
response = model.invoke("Say hello")
print(type(response).__name__)  # → AIMessage
print(response.content)         # → the text
```
My answer: "AIMessage" and "text" — ✅ PASS (also noted: Python uses `#` not `//` for comments)

---

## L3: Messages — The Language of LLM Conversations

### Key Concepts:

**1. Four message types:**
```python
from langchain_core.messages import (
    SystemMessage,    # Your instructions to the model
    HumanMessage,     # User's input
    AIMessage,        # Model's response
    ToolMessage,      # Result of a tool execution
)
```
```
┌──────────────────────────────────────────────────────────┐
│  TYPE           │ WHO CREATES IT    │ PURPOSE             │
├──────────────────┼───────────────────┼─────────────────────┤
│  SystemMessage   │ You (developer)   │ Rules, persona       │
│  HumanMessage    │ User              │ User's input         │
│  AIMessage       │ Model (LLM)       │ Model's response     │
│                  │                   │ OR tool call request │
│  ToolMessage     │ You (developer)   │ Tool execution result│
└──────────────────┴───────────────────┴─────────────────────┘
```

**2. Conversation = ordered list of messages:**
```python
messages = [
    SystemMessage("You are a weather bot"),
    HumanMessage("What's the weather in Tokyo?"),
    AIMessage(content="", tool_calls=[{"name": "get_weather", "args": {"city": "Tokyo"}, "id": "call_abc"}]),
    ToolMessage(content='{"temp": 28, "condition": "sunny"}', tool_call_id="call_abc"),
    AIMessage(content="It's 28°C and sunny in Tokyo!")
]
```
That's **5 messages for ONE question**. This is why agents eat context windows fast (Lesson 4).

**3. Tool-calling message flow:**
```
SystemMessage → HumanMessage → AIMessage(tool_calls) → ToolMessage(result) → AIMessage(content)
     1               2                  3                      4                    5
```

**4. `tool_call_id`:** links a ToolMessage to its corresponding AIMessage tool call. MUST match. Without it, the model doesn't know which tool result goes with which request.

**5. Critical bug — model has NO memory between calls:**
```python
# ❌ BUG: fresh list each call = model forgets everything
response = model.invoke([HumanMessage("What's the capital of Japan?")])
response2 = model.invoke([HumanMessage("And its population?")])  # doesn't know "its" = Japan

# ✅ FIX: build and maintain ONE message list
messages = [HumanMessage("What's the capital of Japan?")]
response = model.invoke(messages)
messages.append(response)
messages.append(HumanMessage("And its population?"))
response2 = model.invoke(messages)  # NOW model sees full history
```
The model has ZERO memory between calls. YOU manage the conversation by maintaining the message list.

**6. JS Analogy:**
```typescript
// JS/TS equivalent (conceptual)
interface Message {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];     // only on assistant messages
  tool_call_id?: string;       // only on tool messages
}
```
LangChain's message classes are typed wrappers around this structure. `HumanMessage("Hello")` ≈ `{ role: "user", content: "Hello" }`.

### Quiz Q&A:
**Q1: After a complete tool-calling cycle, how many messages? Name each type in order.**
My answer: "SystemMessage, HumanMessage, AIMessage, ToolMessage, AIMessage" — ✅ PASS

**Q2: What is `tool_call_id` and why is it required on ToolMessage?**
My answer: "ToolMessage has a tool_call_id that must match the id from the AIMessage's tool call. This is how the model knows which result goes with which call." — ✅ PASS

**Q3: Developer's model keeps forgetting context. Their code sends fresh message list each time. What's wrong?**
⚠️ My answer: "unsure" — ❌ MISSED
✅ Correct: Each `invoke()` sends a standalone message list. The second call has NO history — the model doesn't know what "its" refers to. Fix: build ONE message list, append responses, pass the full list every time. This is the **#1 beginner bug** in LLM apps.

---

## L4: Tools — The @tool Decorator

### Key Concepts:

**1. `@tool` decorator reads 3 things → auto-generates JSON schema:**
```python
from langchain_core.tools import tool

@tool
def get_weather(city: str) -> str:       # ← type hints = parameter schema
    """Get current weather for a city.    # ← docstring = description for LLM
    
    Args:
        city: The name of the city to get weather for.
    """
    return f"72°F in {city}"              # ← function name = tool name
```
```
┌───────────────────────────────────────────────────────────┐
│  FROM YOUR FUNCTION    │  BECOMES IN SCHEMA               │
├────────────────────────┼──────────────────────────────────┤
│  Function name         │  Tool name ("get_weather")       │
│  Docstring             │  Tool description (what the LLM  │
│                        │  reads to decide WHEN to use it) │
│  Type hints            │  Parameter types & schema         │
│  Args in docstring     │  Parameter descriptions           │
└────────────────────────┴──────────────────────────────────┘
```
Type hints and docstrings are NOT just documentation — they're **instructions to the LLM**.

**2. Bad tool vs Good tool:**
```python
# ❌ BAD — LLM has no idea what this does or what to pass
@tool
def fetch(x):
    return do_stuff(x)

# ✅ GOOD — LLM knows exactly what this does and what to pass
@tool
def search_knowledge_base(query: str, max_results: int = 5) -> str:
    """Search the internal knowledge base for relevant articles.
    
    Args:
        query: The search query describing what information is needed.
        max_results: Maximum number of results to return. Defaults to 5.
    """
    results = kb.search(query, limit=max_results)
    return format_results(results)
```

**3. `bind_tools()` = tells model what tools exist:**
```python
model_with_tools = model.bind_tools([get_weather, search_docs])
```
Does NOT execute anything. Just sends the tool schemas to the model so it knows they're available.

**4. Tool invocation — YOUR code executes:**
```python
# After model returns tool_calls:
tool_call = response.tool_calls[0]
# tool_call = {"name": "get_weather", "args": {"city": "Tokyo"}, "id": "call_xyz"}
result = get_weather.invoke(tool_call["args"])  # YOUR code calls this
```

**5. The schema (what gets sent to the LLM):**
```json
{
  "type": "function",
  "function": {
    "name": "get_weather",
    "description": "Get current weather for a city.",
    "parameters": {
      "type": "object",
      "properties": {
        "city": {"type": "string", "description": "The name of the city"}
      },
      "required": ["city"]
    }
  }
}
```
Each tool definition costs tokens (~200 tokens each). 10 tools = 2,000 tokens before the user even asks anything.

### 🔑 KEY: LLM picks wrong tool? Fix the DOCSTRING, not the tool_id.

### Quiz Q&A:
**Q1: What 3 things does `@tool` read from your function?**
My answer: "Function name, Docstring, Type hints" — ✅ PASS

**Q2: Why would an LLM call the wrong tool? What part is most likely the cause?**
⚠️ My answer: "tool_id" — ❌ WRONG
`tool_id` is just a unique ID for matching call↔result. The LLM doesn't even see it when deciding.
✅ Correct: A **bad docstring** (description). If it's vague or misleading, the LLM picks the wrong tool.

**Q3: Does `model.bind_tools([...])` execute any tools?**
My answer: "No, it doesn't execute anything" — 🔄 PARTIAL (correct that it doesn't execute, but didn't say what it DOES do)
✅ Full answer: It sends the tool schemas (name, description, parameters) to the model as part of the context, so the model knows what tools it can request.

---

## L5: Agents — create_react_agent & The Agent Loop

### Key Concepts:

**1. ReAct = Reason + Act:**
```
┌─────────────────────────────────────────────────┐
│               THE ReAct LOOP                    │
│                                                 │
│  User: "What's the weather in Tokyo?"           │
│                                                 │
│  ┌─ ITERATION 1 ─────────────────────────────┐  │
│  │ REASON: I need weather data. I'll use     │  │
│  │         the get_weather tool.              │  │
│  │ ACT:    get_weather(city="Tokyo")          │  │
│  │ OBSERVE: {"temp": 28, "condition":"sunny"} │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  ┌─ ITERATION 2 ─────────────────────────────┐  │
│  │ REASON: I have the weather data now.       │  │
│  │         I can answer the user.             │  │
│  │ ACT:    Respond to user.                   │  │
│  └────────────────────────────────────────────┘  │
│                                                 │
│  Agent: "It's 28°C and sunny in Tokyo!"         │
└─────────────────────────────────────────────────┘
```

**2. `create_react_agent(model, tools)` — the complete agent:**
```python
from langchain.chat_models import init_chat_model
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

model = init_chat_model("gpt-4o-mini", model_provider="openai")

@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return f"28°C and sunny in {city}"

agent = create_react_agent(model, [get_weather])
result = agent.invoke({"messages": [{"role": "user", "content": "Weather in Tokyo?"}]})
print(result["messages"][-1].content)  # → "It's 28°C and sunny in Tokyo!"
```

**3. What it does under the hood:**
```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌──────────┐     ┌─────────────┐     ┌──────────────────┐ │
│  │          │     │             │     │                  │ │
│  │  MODEL   │────→│  Has tool   │─YES→│  Execute tool    │ │
│  │  (LLM)   │     │  calls?     │     │  (YOUR function) │ │
│  │          │     │             │     │                  │ │
│  └──────────┘     └──────┬──────┘     └────────┬─────────┘ │
│       ↑                  │                     │           │
│       │                  NO                    │           │
│       │                  │                     │           │
│       │                  ↓                     │           │
│       │           ┌──────────────┐             │           │
│       │           │   RETURN     │             │           │
│       │           │   response   │             │           │
│       │           │   to user    │             │           │
│       │           └──────────────┘             │           │
│       │                                        │           │
│       └────────────────────────────────────────┘           │
│              (result goes back to model)                    │
└─────────────────────────────────────────────────────────────┘
```
Loop stops when: AIMessage has no tool_calls — just `.content` = model has a final answer.

**📌 `bind_tools()` vs `create_react_agent()` — my project-1 uses bind_tools:**
```
┌────────────────────────────────────────────────────────────────┐
│  bind_tools()                 │  create_react_agent()          │
├───────────────────────────────┼────────────────────────────────┤
│  Model KNOWS about tools      │  Model KNOWS about tools       │
│  YOU handle the loop          │  AGENT handles the loop        │
│  YOU execute tool calls       │  Agent executes tool calls     │
│  YOU route, evaluate, decide  │  Simple reason→act→observe     │
│  Full control over workflow   │  One-liner, but less flexible  │
└───────────────────────────────┴────────────────────────────────┘
```
```python
# MY PROJECT-1 — bind_tools + custom StateGraph (full control)
model_with_tools = model.bind_tools(tools)  # → model with tool schemas attached (doesn't execute)

def look_up(state):
    ai_message = model_with_tools.invoke(state["messages"])  # → AIMessage (may have tool_calls)
    if not ai_message.tool_calls:                             # → True if model just responded with text
        return {"messages": [ai_message]}                     # → return text response, no tools needed
    result = [ai_message]                                     # → start list with the AIMessage (has tool_calls)
    for tool_call in ai_message.tool_calls:                   # → e.g. {"name": "order_lookup", "args": {"order_id": "123"}, "id": "call_abc"}
        tool = tools_by_name[tool_call["name"]]               # → gets the actual function (e.g. order_lookup)
        observation = tool.invoke(tool_call["args"])           # → executes it → "Order 123: shipped, arriving May 5"
        result.append(ToolMessage(                             # → builds ToolMessage with result
            content=observation,                               # → "Order 123: shipped, arriving May 5"
            tool_call_id=tool_call["id"]                       # → "call_abc" (must match AIMessage's tool call id)
        ))
    return {"messages": result}                               # → [AIMessage(tool_calls), ToolMessage(result), ...]

# PREBUILT — create_react_agent (all-in-one)
agent = create_react_agent(model, tools)  # → binds + loops + executes + stops (all automatic)
result = agent.invoke({"messages": [...]})  # → {"messages": [...all messages including final answer...]}
```
I used `bind_tools()` because my project-1 has custom routing (classify → retrieve/lookup → respond → evaluate → escalate) — `create_react_agent` can't do that.

**4. System prompt:**
```python
agent = create_react_agent(model, tools,
    prompt="You are a helpful assistant. Always use tools to verify facts.")
```

**5. Multi-turn with memory:**
```python
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
agent = create_react_agent(model, tools, checkpointer=memory)
config = {"configurable": {"thread_id": "user-123"}}
result = agent.invoke({"messages": [HumanMessage("Weather in Tokyo?")]}, config=config)
```

**6. What YOU write vs what agent handles:**
```
YOU WRITE:                         create_react_agent HANDLES:
─────────                          ──────────────────────────
1. Pick a model                    1. Binds tools to model
2. Define tools (@tool)            2. Runs the ReAct loop
3. Write system prompt             3. Executes YOUR tools
4. Call agent.invoke()             4. Manages message list
                                   5. Stops when model is done
                                   6. Returns final messages
```

**7. Other patterns besides ReAct:**
```
┌──────────────────┬────────────────────────────────────────┬───────────┐
│ Pattern          │ How it works                           │ Module    │
├──────────────────┼────────────────────────────────────────┼───────────┤
│ ReAct            │ Reason → Act → Observe → Repeat       │ M2 (here) │
│ Plan-and-Execute │ Plan all steps first, then execute     │ M6        │
│ Multi-agent      │ Multiple agents collaborate            │ M8        │
│ Human-in-loop    │ Agent pauses for human approval        │ M7        │
└──────────────────┴────────────────────────────────────────┴───────────┘
```

### Quiz Q&A:
**Q1: What does ReAct stand for? What are the steps?**
My answer: "Reason + Act → user ask, it looks for the tool, gets the response, answer to user" — ✅ PASS

**Q2: How does `create_react_agent` know when to stop?**
My answer: "The model responds with an AIMessage that has no tool calls, just .content." — ✅ PASS

**Q3: Who executes `get_weather` — the LLM, LangChain, or your code?**
My answer: "code" — ✅ PASS (3/3 clean pass 🎉)

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

### Quiz Q&A (covered in exam, not standalone quiz):
**Q1: What does `.with_structured_output()` return — AIMessage or Pydantic object?**
Correct answer: Pydantic object. Access fields directly (`.priority`, `.category`). NO `.content`.
⚠️ I got this WRONG on the exam (B2) — said "you can't use structured.invoke" when you can. The bug is using `.content` on the Pydantic result.

**Q2: When would you use `@tool` vs `.with_structured_output()`?**
Correct answer: `@tool` when the LLM needs to DO something (action/side effect). `.with_structured_output()` when the LLM needs to RETURN structured data (classification/extraction).

---

## L7: Streaming — Real-Time Responses

### Key Concepts:

**1. Why streaming works — autoregressive generation:**
The model generates ONE token at a time. Each token is a separate prediction step. So each token can be delivered to the user IMMEDIATELY instead of waiting for the entire response.

This is NOT about the input pipeline (tokenization → embedding → attention). That's input processing. Streaming is about OUTPUT delivery.

**2. Three streaming methods with example output:**

```python
# 1. Token-by-token (model level):
for chunk in model.stream("Tell me a story"):
    print(chunk.content, end="")

# Output appears like typing:
# "Once"  →  "Once upon"  →  "Once upon a"  →  "Once upon a time"  → ...
# Each chunk is an AIMessageChunk with a few tokens
```

```python
# 2. Step-by-step (agent level):
for event in agent.stream({"messages": [HumanMessage("Weather in Tokyo?")]}):
    print(event)

# Output — one dict per STEP:
# {'agent': {'messages': [AIMessage(content='', tool_calls=[{name: 'get_weather', ...}])]}}
# {'tools': {'messages': [ToolMessage(content='28°C and sunny')]}}
# {'agent': {'messages': [AIMessage(content='It is 28°C and sunny in Tokyo!')]}}
```

```python
# 3. Everything (agent level, async):
async for event in agent.astream_events({"messages": [HumanMessage("...")]}, version="v2"):
    print(event["event"], event.get("data", {}).get("chunk", ""))

# Output — every single thing that happens:
# on_chat_model_start  ...
# on_chat_model_stream  AIMessageChunk(content='It')
# on_chat_model_stream  AIMessageChunk(content=' is')
# on_chat_model_stream  AIMessageChunk(content=' 28')
# on_tool_start         ...
# on_tool_end           ...
# on_chat_model_stream  AIMessageChunk(content='sunny')
# on_chat_model_end     ...
```

**3. When to use which:**
```
invoke()           → background tasks, no UI needed
stream()           → chatbot UI, show progress step by step
astream_events()   → full control, token-level streaming in UI
```

### 🔑 KEY: Streaming works because autoregressive generation = one token at a time.

### Quiz Q&A (covered in exam, not standalone quiz):
**Q1: WHY can LLMs stream their output? What makes it technically possible?**
Correct answer: Autoregressive generation — the model produces ONE token at a time, each as a separate prediction step. Each token can be sent immediately as it's generated. NOT about the input pipeline.

**Q2: What's the difference between `model.stream()` and `agent.stream()`?**
Correct answer: `model.stream()` gives token-by-token chunks (AIMessageChunk). `agent.stream()` gives step-level events (full tool calls, tool results, final answer).

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

### Quiz Q&A (covered in exam, not standalone quiz):
**Q1: What happens with same thread_id? Different thread_id?**
Correct answer: Same = agent has full conversation history, continues where it left off. Different = fresh start, no memory of previous conversation.

**Q2: Why is MemorySaver not suitable for production? What would you use?**
Correct answer: Data is in RAM — lost on server restart. Use `PostgresSaver` or `SqliteSaver` for persistence.

**Q3: A developer's agent "forgets" after server restart. They're using MemorySaver. Fix?**
Correct answer: Switch to a persistent checkpointer (`PostgresSaver`, `SqliteSaver`). MemorySaver is RAM-only.
⚠️ On exam (C1): I said "need thread_id" but they already HAD thread_id — the missing piece was the `checkpointer=memory` param.

---

## L9: Middleware — Prebuilt & Custom

### Key Concepts:

**1. Middleware = Express middleware for agents:**
```
┌─────────────────────────────────────────────────────┐
│                   AGENT PIPELINE                    │
│                                                     │
│  User input                                         │
│      ↓                                              │
│  ┌──────────────┐                                   │
│  │ MIDDLEWARE 1  │ ← log the input                  │
│  │ (logging)     │                                   │
│  └──────┬───────┘                                   │
│         ↓                                           │
│  ┌──────────────┐                                   │
│  │ MIDDLEWARE 2  │ ← check for banned words         │
│  │ (guardrails) │                                   │
│  └──────┬───────┘                                   │
│         ↓                                           │
│  ┌──────────────┐                                   │
│  │    MODEL      │ ← actual LLM call                │
│  └──────┬───────┘                                   │
│         ↓                                           │
│  ┌──────────────┐                                   │
│  │ MIDDLEWARE 3  │ ← redact PII from response       │
│  │ (security)   │                                   │
│  └──────┬───────┘                                   │
│         ↓                                           │
│  Response to user                                   │
└─────────────────────────────────────────────────────┘
```

**2. `prompt` parameter can be static or dynamic:**
```python
# Static:
agent = create_react_agent(model, tools, prompt="You are a helpful assistant.")

# Dynamic (function — runs before EVERY LLM call):
def add_user_context(state):
    user_info = get_user_from_db(state["configurable"]["user_id"])
    system_msg = f"Current user: {user_info.name}, plan: {user_info.plan}"
    return [{"role": "system", "content": system_msg}] + state["messages"]

agent = create_react_agent(model, tools, prompt=add_user_context)
```

**3. Common middleware patterns:**
```
┌──────────────────┬────────────────────────────────────────┐
│ Pattern          │ What it does                           │
├──────────────────┼────────────────────────────────────────┤
│ Logging          │ Log every input/output for debugging   │
│ Rate limiting    │ Block users who send too many requests │
│ Input guardrails │ Block banned/dangerous content         │
│ Output filtering │ Redact PII (emails, SSNs) from output │
│ Token counting   │ Track token usage per user/session     │
│ Auth injection   │ Add user context to every request      │
│ Retry wrapper    │ Retry failed LLM calls with backoff   │
└──────────────────┴────────────────────────────────────────┘
```
Same patterns as Express middleware — logging, auth, rate limiting, input validation. Same concept, agent context.

**4. Guardrail example:**
```python
BLOCKED_TOPICS = ["politics", "religion", "illegal"]

def input_guardrail(state):
    last_msg = state["messages"][-1]
    if isinstance(last_msg, HumanMessage):
        for topic in BLOCKED_TOPICS:
            if topic in last_msg.content.lower():
                return {"messages": [AIMessage(
                    content="I can't help with that topic. Please ask something else."
                )]}
    return None  # continue normal flow
```

### Quiz Q&A:
**Q1: In one sentence, what is middleware in the agent context?**
My answer: "In LangGraph, middleware intercepts every agent step — before the model runs, after the model runs, before a tool executes, etc." — ✅ PASS

**Q2: Name two production use cases for agent middleware.**
My answer: "Retry wrapper, Input guardrails" — ✅ PASS

---

## L10: Observability & Tracing — LangSmith

### Key Concepts:

**1. The problem — code errors vs decision errors:**
```
REST API bug  = crash, 500 status, stack trace → console.log / debugger works
LLM agent bug = wrong output but NO crash      → console.log is USELESS
```
LLM bugs are DECISION errors. The agent called the wrong tool, gave wrong info, hallucinated — but the code ran fine. You can't `console.log` a decision.

**2. What LangSmith traces:**
```
┌─ TRACE: "Weather in Tokyo?" ─────────────────────────────┐
│                                                           │
│  ┌─ Agent Run (3.2s total) ──────────────────────────┐   │
│  │                                                    │   │
│  │  ┌─ LLM Call #1 (0.8s) ───────────────────────┐  │   │
│  │  │ Input: [SystemMsg, HumanMsg("Weather...")]  │  │   │
│  │  │ Output: AIMsg(tool_calls=[get_weather])     │  │   │
│  │  │ Tokens: 142 in, 28 out                      │  │   │
│  │  │ Cost: $0.0003                                │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                    │   │
│  │  ┌─ Tool: get_weather (0.4s) ─────────────────┐  │   │
│  │  │ Input: {"city": "Tokyo"}                    │  │   │
│  │  │ Output: "28°C and sunny"                    │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                    │   │
│  │  ┌─ LLM Call #2 (0.6s) ───────────────────────┐  │   │
│  │  │ Input: [SystemMsg, HumanMsg, AIMsg,         │  │   │
│  │  │         ToolMsg("28°C...")]                  │  │   │
│  │  │ Output: AIMsg("It's 28°C and sunny!")       │  │   │
│  │  │ Tokens: 198 in, 12 out                      │  │   │
│  │  │ Cost: $0.0004                                │  │   │
│  │  └────────────────────────────────────────────┘  │   │
│  │                                                    │   │
│  │  Total cost: $0.0007                               │   │
│  └────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────┘
```

**3. Setup — 3 environment variables, zero code changes:**
```python
os.environ["LANGSMITH_API_KEY"] = "ls-..."
os.environ["LANGSMITH_TRACING"] = "true"
os.environ["LANGSMITH_PROJECT"] = "my-agent-project"
# That's it. No code changes. LangChain auto-sends traces via hooks in invoke(), stream(), etc.
```

**4. What you debug with traces:**
```
┌──────────────────────┬────────────────────────────────────┐
│ Problem              │ What trace shows you               │
├──────────────────────┼────────────────────────────────────┤
│ Wrong tool called    │ LLM input → tool descriptions      │
│ Bad response         │ Full message history → missing ctx │
│ Slow agent           │ Latency per step → bottleneck      │
│ High cost            │ Token usage per call                │
│ Infinite loops       │ Step count → repeated tool calls    │
└──────────────────────┴────────────────────────────────────┘
```

**5. Traces vs Logs — use BOTH:**
```
LOGGING (console.log / print):           TRACING (LangSmith):
─────────────────────────                 ───────────────────
✓ Free                                    ✓ Full agent state at every step
✓ Simple                                  ✓ Token counts, costs, latency
✗ You see what YOU log                    ✓ Input/output of every LLM call
✗ No structure                            ✓ Tool call details
✗ Hard to correlate steps                 ✓ Nested parent/child relationships
✗ No token/cost tracking                  ✓ Dashboard, search, filtering

Use BOTH in production.
Logs for your application logic.
Traces for your LLM/agent behavior.
```

### Quiz Q&A:
**Q1: Why can't you debug an LLM agent the same way you debug a REST API?**
⚠️ My answer: "not sure" — ❌ MISSED
✅ Correct: REST API bugs are **code errors** (crashes with stack traces). LLM bugs are **decision errors** (wrong but no crash). You can't console.log a decision — you need to see what the model received, what it was thinking, and what it chose.

**Q2: Agent calling wrong tool. How to use LangSmith to diagnose?**
⚠️ My answer: "invoke etc has baked hooks, setup langsmith it will trace everything" — 🔄 PARTIAL (described setup, not diagnosis)
✅ Correct diagnosis steps: Open the trace → look at LLM Call #1's input → see which tool schemas were sent → read the tool descriptions → are they ambiguous? → fix the docstring.

---

## MODULE 2 EXAM: 72% PASS (after retries)

### Initial attempt: 19/100 ❌ FAIL

**A1: What does `init_chat_model` return? (5/10)**
🔄 My answer: Partial — described it but imprecise.

**A2: What is the return type of `model.invoke()`? (5/10)**
🔄 My answer: Partial.

**B1: Write a `@tool` function for order lookup with proper docstring and type hints. (SKIPPED)**
⚠️ My answer: ❌ Skipped entirely.

**B2: Debug this code — `result = structured.invoke(...); print(result.content)` (0/10)**
⚠️ My answer: ❌ Said "you can't use structured.invoke" — WRONG. You CAN. The bug is using `.content` on a Pydantic object (it has `.name`, `.email`, etc., NOT `.content`).

**B3: Write a system prompt with tool usage rules. (SKIPPED)**
⚠️ My answer: ❌ Skipped entirely.

**C1: Agent forgets conversation after each message. Code has `thread_id` but no checkpointer. Fix. (10/10)**
⚠️ My answer (1st): ❌ Said "need thread_id" — they already HAD thread_id. Missing piece was `checkpointer=MemorySaver()`.
✅ Fixed on retry.

**C2: LLM keeps calling the wrong tool. How to fix? (10/10)**
My answer: ✅ Fix the tool's docstring/description — that's what the LLM reads to decide.

**D1: Design a support agent architecture — classify, lookup, workflow. Which LangChain pattern for each? (10/10)**
My answer: ✅ classify → `.with_structured_output()`, lookup → `@tool`, workflow → `create_react_agent()`.

**D2: Write the system prompt for that agent. (5/10)**
🔄 My answer: Partial on first attempt.

- Skipped 4 of 9 questions (B1, B3, D1, D2)
- ⚠️ R2 first attempt: Wrote 6 motivational poster sentences instead of actionable rules

### Retry corrections:
**B2 — `.content` on Pydantic object:**
```python
result = structured.invoke("Extract: John, john@test.com, billing issue")
print(result.content)  # ❌ CRASHES — result is TicketInfo, NOT AIMessage
print(result.name)      # ✅ "John" — it's a Pydantic object, use field names
```

**C1 — Missing checkpointer (NOT thread_id):**
```python
# Their code — has thread_id but NO checkpointer
agent = create_react_agent(model, tools)  # ← no checkpointer!

# Fix:
from langgraph.checkpoint.memory import MemorySaver
memory = MemorySaver()
agent = create_react_agent(model, tools, checkpointer=memory)  # ← added
```
⚠️ Irony: I correctly said "checkpointer" in R3, then forgot to pass it in my OWN R1 code.

### What passed:
- **C2**: Tool descriptions — ✅ 
- **D1**: Architecture — classify → `.with_structured_output()`, lookup → `@tool`, workflow → `create_react_agent()` — ✅✅✅

### Final code (R1 — with checkpointer fix):
```python
from langchain.chat_models import init_chat_model
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver

model = init_chat_model("gpt-4o-mini", model_provider="openai")

@tool
def lookup_order(order_id: str) -> str:
    """Look up the current status of a customer order by order ID."""
    return f"Search results for {order_id}"

@tool
def cancel_order(order_id: str) -> str:
    """Cancel a customer's order by order ID."""
    return f"Your order has been canceled for {order_id}"

memory = MemorySaver()
agent = create_react_agent(model, [lookup_order, cancel_order], checkpointer=memory)
```

### System prompt (R2 — 6th attempt, passed with full marks 15/15 🔥):
```
You are a customer support assistant responsible for helping customers with
orders, returns, refunds, and general account questions. Respond in a polite,
professional, and concise manner.

You have access to the following tools:
- lookup_order: Retrieve the latest order details and status.
  Use this before performing any order-related action.
- cancel_order: Cancel a customer's order.
  Only use this after the customer has explicitly confirmed they want to proceed.
- escalate_to_human: Transfer urgent or high-priority cases to a human
  support representative without delay.

Guardrails:
1. Always verify the customer's order by using lookup_order before discussing
   order status, cancellations, or modifications.
2. Before calling cancel_order, ask the customer, "Are you sure you want to
   cancel your order?" and wait for a clear confirmation.
3. If the issue is critical (P0), such as a security concern, payment fraud,
   or a major service outage, immediately use escalate_to_human instead of
   attempting to resolve it yourself.
4. Never guess order information or claim an action has been completed unless
   it has been confirmed by the appropriate tool.
5. If required information, such as an order ID, is missing, ask the customer
   for it before using any tool.
6. Keep responses clear, courteous, and focused on resolving the customer's
   request efficiently.
```

### Final score breakdown:
```
A1:  5/10  | A2:  5/10
B1: 12/15  | B2:  0/10  | B3: 15/15
C1: 10/10  | C2: 10/10
D1: 10/10  | D2:  5/10
TOTAL: 72/100 — ✅ PASS
```

---

## POST-EXAM REVIEW: 5 Concept Deep-Dives (requested after exam)

### 1. @tool vs .with_structured_output() vs create_react_agent()
```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  "I need the LLM to DO something in the real world"            │
│   → @tool                                                       │
│   Examples: search the web, send an email, query a database     │
│   The LLM REQUESTS the action, YOUR CODE executes it            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "I need the LLM to GIVE ME structured data back"              │
│   → .with_structured_output()                                   │
│   Examples: classify a ticket, extract name/email, parse a log  │
│   The LLM is FORCED to return data in YOUR schema               │
│   No action happens. Just data extraction.                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  "I need the LLM to handle a MULTI-STEP workflow"              │
│   → create_react_agent()                                        │
│   Examples: full customer support flow, incident handling        │
│   The agent REASONS about what to do, CALLS tools, REPEATS      │
│   until the job is done. It USES @tools internally.             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
Real example — ServiceNow incident agent:
```
1. Classify ticket as P0-P3     → .with_structured_output()  (just data)
2. Look up customer account     → @tool                      (action)
3. Handle full incident workflow → create_react_agent()       (orchestrates 1+2+more)
```

### 2. Pydantic Objects vs AIMessage
```python
# REGULAR invoke() → returns AIMessage
response = model.invoke("What is 2+2?")
type(response)      # AIMessage
response.content     # "4"  ← the text

# STRUCTURED invoke() → returns YOUR Pydantic object
class Ticket(BaseModel):
    priority: str
    category: str

structured = model.with_structured_output(Ticket)
result = structured.invoke("Server is completely down")
type(result)       # Ticket  ← NOT AIMessage!
result.priority    # "P0"    ← access via field name
result.content     # ❌ AttributeError! Pydantic objects have NO .content
```
```
┌─────────────────────────┬──────────────────────────────┐
│      AIMessage           │     Pydantic Object          │
├─────────────────────────┼──────────────────────────────┤
│ From: model.invoke()     │ From: .with_structured_output│
│ Access: .content         │ Access: .priority, .category │
│ Type: always AIMessage   │ Type: whatever YOU defined   │
│ Format: free text        │ Format: your exact schema    │
│ Has: .tool_calls         │ Has: only YOUR fields        │
└─────────────────────────┴──────────────────────────────┘
```
The #1 bug: Using `.content` on a Pydantic object. It doesn't exist. Use your field names.

### 3. Tracing Message Flows
Every conversation is a list of messages. After any interaction, you should be able to list them in order.

Example: "Cancel my order #123":
```
STEP 1: Your system prompt is always first
┌─ 1. SystemMessage ─────────────────────────────────────────┐
│ "You are a customer support agent. You have access to..."  │
└────────────────────────────────────────────────────────────┘

STEP 2: User asks something
┌─ 2. HumanMessage ─────────────────────────────────────────┐
│ "Cancel my order #123"                                     │
└────────────────────────────────────────────────────────────┘

STEP 3: Model decides to call a tool (NOT a text response)
┌─ 3. AIMessage ─────────────────────────────────────────────┐
│ content = ""          ← empty! no text                     │
│ tool_calls = [{name: "lookup_order", args: {id: "123"}}]  │
└────────────────────────────────────────────────────────────┘

STEP 4: YOUR CODE executes the tool, result goes back
┌─ 4. ToolMessage ───────────────────────────────────────────┐
│ content = '{"status": "shipped"}'                          │
│ tool_call_id = "call_abc123"   ← matches AIMessage's ID   │
└────────────────────────────────────────────────────────────┘

STEP 5: Model reads the result and responds to user
┌─ 5. AIMessage ─────────────────────────────────────────────┐
│ content = "Sorry, order #123 has already shipped and       │
│            can't be cancelled."                            │
│ tool_calls = []       ← empty = no more tools = DONE       │
└────────────────────────────────────────────────────────────┘
```
Rules to remember:
- **SystemMessage** → always first
- **HumanMessage** → user's input
- **AIMessage with tool_calls** → model wants to use a tool (empty `.content`)
- **ToolMessage** → your code's result (must have matching `tool_call_id`)
- **AIMessage with .content** → model's final answer (empty `tool_calls` = loop stops)

### 4. Autoregressive Generation
```
"Auto" = self     "Regressive" = feeding back

The model generates ONE token, then feeds it back to itself
to generate the NEXT token.

Input: "The capital of France is"

Step 1: Model sees "The capital of France is"
        → probability distribution → sample → "Paris"

Step 2: Model sees "The capital of France is Paris"  ← "Paris" added
        → probability distribution → sample → "."

Step 3: Model sees "The capital of France is Paris." ← "." added
        → probability distribution → sample → [STOP]

Output: "Paris."
```
```
                    ┌──────────┐
    "The capital    │          │
     of France  ──→│  MODEL   │──→ "Paris"
     is"            │          │        │
                    └──────────┘        │
                         ↑              │
                         └──────────────┘
                      feeds output back as input
```
THIS is why:
- **Streaming works** (each token produced separately)
- **Longer outputs cost more** (more steps)
- **The model can "change its mind"** mid-sentence

### 5. When to Use What — Explained to a 10-Year-Old 🧒
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  📋 .with_structured_output()                        │
│                                                      │
│  You slide a form under the door:                    │
│  "Fill this out: Name ___, Age ___, Favorite Color___│
│                                                      │
│  Friend fills it out and slides it back.             │
│  They didn't DO anything. Just gave you data.        │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🔧 @tool                                            │
│                                                      │
│  You give your friend a MENU of buttons they can     │
│  press: [Search Google] [Send Email] [Check Weather] │
│                                                      │
│  Friend says: "Press the Check Weather button        │
│  for Tokyo please!"                                  │
│                                                      │
│  YOU press the button. YOU read the result.           │
│  You slide the result back under the door.           │
│  Friend ASKED. You DID.                              │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│  🤖 create_react_agent()                             │
│                                                      │
│  You give your friend the menu of buttons AND        │
│  say "handle this customer's problem start to        │
│  finish."                                            │
│                                                      │
│  Friend asks for buttons to be pressed MULTIPLE      │
│  times, THINKS between each one, and eventually      │
│  gives the final answer.                             │
│                                                      │
│  → The whole workflow, not just one step.            │
│                                                      │
└──────────────────────────────────────────────────────┘
```
One-liner for each:
- **Structured output** = "Fill out this form for me"
- **@tool** = "Here's a button you can ask me to press"
- **create_react_agent** = "Handle the whole job, press as many buttons as you need"
