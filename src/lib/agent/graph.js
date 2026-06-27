import { StateGraph, START, END } from "@langchain/langgraph";
import { InvestmentState } from "./state.js";
import { researchNode, analysisNode, decisionNode } from "./nodes.js";

const builder = new StateGraph(InvestmentState)
  .addNode("research_step", researchNode)
  .addNode("analysis_step", analysisNode)
  .addNode("decision_step", decisionNode)
  .addEdge(START, "research_step")
  .addEdge("research_step", "analysis_step")
  .addEdge("analysis_step", "decision_step")
  .addEdge("decision_step", END);

export const investmentGraph = builder.compile();