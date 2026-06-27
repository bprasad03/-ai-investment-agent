"use client";

import { useState, useRef, useEffect } from "react";

const NODE_LABELS = {
  research_step: "RESEARCH",
  analysis_step: "ANALYSIS",
  decision_step: "VERDICT",
};

function timestamp() {
  return new Date().toLocaleTimeString("en-IN", { hour12: false });
}

function summarize(node, data) {
  if (node === "research_step") {
    const count = (data.researchData?.match(/^\[\d+\]/gm) || []).length;
    return `${count} live sources retrieved and indexed.`;
  }
  if (node === "analysis_step") {
  const clean = data.analysis?.replace(/[#*_`]/g, "").trim();
  return clean?.slice(0, 140) + "...";
  }
  if (node === "decision_step") {
    return data.decision?.reasoning || "";
  }
  return "";
}

export default function Home() {
  const [companyName, setCompanyName] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [log, setLog] = useState([]);
  const [decision, setDecision] = useState(null);
  const [error, setError] = useState(null);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!companyName.trim() || isRunning) return;

    setIsRunning(true);
    setError(null);
    setDecision(null);
    setLog([
      {
        id: "start",
        kind: "meta",
        text: `New entry opened for "${companyName.trim()}"`,
        time: timestamp(),
      },
    ]);

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });

      if (!res.ok || !res.body) throw new Error("stream failed to open");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "node_start") {
            setLog((prev) => [
              ...prev,
              {
                id: event.node + "_start",
                kind: "running",
                node: event.node,
                text: `${NODE_LABELS[event.node]} — in progress...`,
                time: timestamp(),
              },
            ]);
          }

          if (event.type === "node_complete") {
            setLog((prev) =>
              prev
                .filter((l) => l.id !== event.node + "_start")
                .concat({
                  id: event.node + "_done",
                  kind: event.node === "decision_step" ? "verdict" : "complete",
                  node: event.node,
                  text: summarize(event.node, event.data),
                  full:
                    event.node === "research_step"
                      ? event.data.researchData
                      : event.node === "analysis_step"
                      ? event.data.analysis
                      : null,
                  time: timestamp(),
                })
            );
            if (event.node === "decision_step") {
              setDecision(event.data.decision);
            }
          }

          if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch (err) {
      setError("Connection lost — is the server running?");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-10 sm:py-16"
      style={{ background: "#0B0E0F", color: "#EDE6D6" }}
    >
      <div className="max-w-2xl mx-auto">
        <div
          className="text-xs tracking-[0.2em] uppercase mb-3 opacity-60"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          Analyst's Ledger · Live Agent
        </div>
        <h1
          className="text-4xl sm:text-5xl font-semibold mb-3 leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          AI Investment
          <br />
          Research Agent
        </h1>
        <p className="opacity-70 mb-8 max-w-md">
          Name a company. The agent opens a ledger entry, researches it live,
          reasons through the fundamentals, and stamps a verdict — in view, the
          whole way through.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Tata Motors, Zomato, Nykaa..."
            disabled={isRunning}
            className="flex-1 px-4 py-3 rounded-md outline-none border"
            style={{
              background: "#14181A",
              borderColor: "#3A3F38",
              fontFamily: "var(--font-mono)",
            }}
          />
          <button
            type="submit"
            disabled={isRunning || !companyName.trim()}
            className="px-5 py-3 rounded-md font-medium uppercase text-sm tracking-wide transition disabled:opacity-40"
            style={{
              background: "#D98E2B",
              color: "#0B0E0F",
              fontFamily: "var(--font-sans)",
            }}
          >
            {isRunning ? "Running" : "Open Entry"}
          </button>
        </form>

        {error && (
          <div
            className="rounded-md p-4 mb-6 border text-sm"
            style={{ borderColor: "#B6452C", color: "#E2A78F" }}
          >
            {error}
          </div>
        )}

        {log.length > 0 && (
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: "#3A3F38", background: "#101314" }}
          >
            <div
              className="px-4 py-2 text-xs uppercase tracking-widest opacity-50 border-b"
              style={{ borderColor: "#3A3F38", fontFamily: "var(--font-mono)" }}
            >
              Ledger Log
            </div>
            <div className="p-4 space-y-3 max-h-[28rem] overflow-y-auto">
              {log.map((entry) => (
                <LedgerEntry key={entry.id} entry={entry} />
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {decision && (
          <div
            className="mt-6 rounded-lg border-2 p-6"
            style={{
              borderColor: decision.decision === "INVEST" ? "#D98E2B" : "#B6452C",
              background: "#101314",
            }}
          >
            <div className="flex items-center justify-between">
              <div
                className="text-2xl font-bold tracking-wide"
                style={{
                  fontFamily: "var(--font-mono)",
                  color: decision.decision === "INVEST" ? "#D98E2B" : "#B6452C",
                }}
              >
                {decision.decision === "INVEST" ? "▣ INVEST" : "▢ PASS"}
              </div>
              <div
                className="text-xs uppercase opacity-60"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                Confidence: {decision.confidence}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function LedgerEntry({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const colorByKind = {
    meta: "#8A8F89",
    running: "#D9C08E",
    complete: "#EDE6D6",
    verdict:
      entry.node === "decision_step" ? "#D98E2B" : "#EDE6D6",
  };

  return (
    <div className="text-sm" style={{ fontFamily: "var(--font-mono)" }}>
      <div className="flex gap-3">
        <span className="opacity-40 shrink-0">{entry.time}</span>
        <span style={{ color: colorByKind[entry.kind] || "#EDE6D6" }}>
          {entry.node && (
            <span className="opacity-60 mr-2">[{NODE_LABELS[entry.node]}]</span>
          )}
          {entry.kind === "running" ? (
            <span className="animate-pulse">{entry.text}</span>
          ) : (
            entry.text
          )}
        </span>
      </div>
      {entry.full && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-12 text-xs opacity-50 hover:opacity-80 mt-1"
        >
          {expanded ? "▾ collapse" : "▸ view full"}
        </button>
      )}
      {expanded && entry.full && (
        <div className="ml-12 mt-2 p-3 rounded bg-black/30 text-xs whitespace-pre-wrap opacity-80 max-h-48 overflow-y-auto">
          {entry.full}
        </div>
      )}
    </div>
  );
}