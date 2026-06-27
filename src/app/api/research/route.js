import { investmentGraph } from "@/lib/agent/graph.js";

export const dynamic = "force-dynamic";

const SEQUENCE = ["research_step", "analysis_step", "decision_step"];

export async function POST(request) {
  const { companyName } = await request.json();

  if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
    return new Response(JSON.stringify({ error: "companyName is required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        let idx = 0;
        send({ type: "node_start", node: SEQUENCE[idx] });

        const graphStream = await investmentGraph.stream(
          { companyName: companyName.trim() },
          { streamMode: "updates" }
        );

        for await (const chunk of graphStream) {
          for (const [nodeName, update] of Object.entries(chunk)) {
            send({ type: "node_complete", node: nodeName, data: update });
            idx++;
            if (idx < SEQUENCE.length) {
              send({ type: "node_start", node: SEQUENCE[idx] });
            }
          }
        }

        send({ type: "done" });
      } catch (err) {
        console.error("Agent stream error:", err);
        send({ type: "error", message: "Agent failed during execution." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}