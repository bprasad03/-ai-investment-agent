import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { grok } from "./llm.js";
import { tavilySearch } from "./tools.js";

// Node 1: Research — pull real, recent info on the company
export async function researchNode(state) {
  const query = `"${state.companyName}" stock price earnings financial results -site:reddit.com`;
  const results = await tavilySearch.invoke({ query });

  // Tavily returns an object with a `results` array of {title, url, content}
  const formatted = (results.results || [])
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.content}\nSource: ${r.url}`)
    .join("\n\n");

  return { researchData: formatted };
}

// Node 2: Analysis — have Grok digest the raw research into structured signal
export async function analysisNode(state) {
  const systemPrompt = `You are a financial analyst. You'll be given raw research snippets about a company. 
Summarize: (1) business fundamentals, (2) recent news/sentiment, (3) key risks, (4) key strengths.
Be concise and factual. Do not give an investment recommendation yet — that comes later.`;

  const response = await grok.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      `Company: ${state.companyName}\n\nResearch data:\n${state.researchData}`
    ),
  ]);

  return { analysis: response.content };
}

// Node 3: Decision — the actual invest/pass call with reasoning
export async function decisionNode(state) {
  const systemPrompt = `You are an investment decision agent. Based on the analysis given, 
decide INVEST or PASS on this company. Respond ONLY in this exact JSON shape, no markdown fences:
{"decision": "INVEST" or "PASS", "confidence": "High"|"Medium"|"Low", "reasoning": "2-4 sentences explaining the call"}`;

  const response = await grok.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      `Company: ${state.companyName}\n\nAnalysis:\n${state.analysis}`
    ),
  ]);

  let parsed;
  try {
    parsed = JSON.parse(response.content);
  } catch {
    parsed = { decision: "UNKNOWN", confidence: "Low", reasoning: response.content };
  }

  return { decision: parsed };
}
