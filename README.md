# AI Investment Research Agent

An AI agent that takes a company name, researches it using live web data, 
reasons through the fundamentals, and renders an INVEST/PASS decision — 
with the entire research → analysis → decision pipeline streamed live to 
the UI as it happens.

**Live demo:** https://ai-investment-agent-eight.vercel.app/

---

## Overview

Given a company name, the agent:
1. **Researches** — queries Tavily Search for live news, earnings, and 
   financial context on the company
2. **Analyzes** — an LLM (via Groq) digests the raw research into 
   structured fundamentals, sentiment, risks, and strengths
3. **Decides** — a second LLM call renders a final INVEST/PASS verdict 
   with a confidence level and reasoning

The UI ("Analyst's Ledger") shows this pipeline running in real time — 
each step streams to the browser as it completes, rather than showing a 
single loading spinner until everything finishes.

---

## How to run

```bash
git clone https://github.com/bprasad03/ai-investment-agent.git
cd ai-investment-agent
npm install
```

Create `.env.local` in the project root:
GROQ_API_KEY=your_groq_key

TAVILY_API_KEY=your_tavily_key

- Groq key: console.groq.com (free tier, no card required)
- Tavily key: tavily.com (free tier, no card required)

```bash
npm run dev
```

Open `http://localhost:3000`.

---

## How it works

**Stack:** Next.js (App Router) for both frontend and API · LangGraph.js 
for the agent orchestration · Groq (`openai/gpt-oss-120b`) for reasoning · 
Tavily for live web research.

**Agent graph** (`src/lib/agent/graph.js`): a linear 3-node LangGraph 
pipeline:
START → research_step → analysis_step → decision_step → END

- `research_step` queries Tavily and stores raw search results in state
- `analysis_step` prompts the LLM to extract fundamentals, sentiment, 
  risks, and strengths from that raw research — without yet committing 
  to a verdict
- `decision_step` takes the structured analysis and renders a final 
  INVEST/PASS call with confidence and reasoning, as JSON

**Streaming**: the API route (`src/app/api/research/route.js`) uses 
LangGraph's `.stream()` with `streamMode: "updates"`, piping each node's 
output to the client as newline-delimited JSON over a `ReadableStream`, 
rather than waiting for `.invoke()` to resolve everything before 
responding. The frontend reads this with `response.body.getReader()` and 
renders each step as it arrives.

---

## Key decisions & trade-offs

- **Two separate LLM calls (analysis, then decision) instead of one.** 
  Forcing the model to articulate fundamentals/risks before committing to 
  a verdict produced more grounded reasoning than asking for everything 
  in a single prompt, at the cost of an extra API call.
- **Raw JSON output instead of LangChain's `withStructuredOutput()`.** 
  Simpler to debug under time pressure; less reliable long-term. With 
  more time I'd switch to structured output for guaranteed schema 
  compliance.
- **Linear graph instead of a branching/looping one.** The agent always 
  runs research → analysis → decision exactly once. A more sophisticated 
  version would let the analysis node trigger another research pass if 
  it judges the initial data insufficient — turning this into a true 
  agentic loop rather than a fixed pipeline.
- **Tavily query scoping caught a real bug.** An early version queried 
  Tavily with just the company name, which for conglomerate-adjacent 
  companies (e.g. "Tata Motors") pulled in irrelevant news about sibling 
  companies under the same parent group (Tata Electronics, TCS), polluting 
  the research input. Fixed by wrapping the company name in an exact-phrase 
  query. Worth flagging as a known limitation: very obscure companies 
  with limited news coverage may still get noisy or empty results.
- **Manual `node_start` events instead of LangGraph's `astream_events`.** 
  Since the graph's node sequence is fixed and known in advance, I 
  synthesized "step started" events on the server rather than using the 
  heavier full-event-stream API — simpler, but wouldn't scale to a 
  dynamic/branching graph.

---

## Example runs

### Tata Motors
- **Decision:** INVEST (Medium confidence)
- Reasoning noted solid earnings growth, strong cash flow, and 
  first-mover EV positioning, weighed against raw-material volatility 
  and supply-chain risk.

### Zomato
- **Decision:** PASS (Medium confidence)
- Reasoning flagged EBITDA-negative status and high cash burn despite 
  strong top-line growth, with no clear near-term catalyst.

### Amazon
- **Decision:** INVEST (Medium confidence)
- Reasoning cited the durable moat from Prime/AWS/advertising, balanced 
  against membership saturation and competitive pressure.

---

## What I'd improve with more time

- Switch to `withStructuredOutput()` for guaranteed schema-valid 
  decisions instead of manual JSON parsing with a fallback
- Add a conditional edge allowing the agent to loop back to research if 
  the analysis step judges the data insufficient
- Add a small evaluation set (5-10 known companies) to sanity-check 
  decision consistency across repeated runs at the same temperature
- Surface source URLs directly in the UI's decision card, not just in 
  the expandable raw research panel, for easier verification
- Add response caching (by company name + day) to avoid redundant Tavily 
  calls on repeated lookups
