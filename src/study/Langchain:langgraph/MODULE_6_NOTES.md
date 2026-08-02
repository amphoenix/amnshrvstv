# Module 6 — Structured Execution Patterns (IN PROGRESS)

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

### Quiz: PENDING — awaiting answers.

---
