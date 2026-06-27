import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

console.log("Keys loaded:", {
  xai: process.env.XAI_API_KEY ? "✓ found" : "✗ MISSING",
  tavily: process.env.TAVILY_API_KEY ? "✓ found" : "✗ MISSING",
});

// Dynamic import so dotenv finishes loading FIRST
const { investmentGraph } = await import("./src/lib/agent/graph.js");

console.log("Starting agent run...");

try {
  const result = await investmentGraph.invoke({
    companyName: "Tata Motors",
  });

  console.log("\n=== RESEARCH ===\n", result.researchData);
  console.log("\n=== ANALYSIS ===\n", result.analysis);
  console.log("\n=== DECISION ===\n", JSON.stringify(result.decision, null, 2));
} catch (err) {
  console.error("AGENT FAILED:", err);
}