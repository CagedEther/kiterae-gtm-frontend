import { useState, useRef, useEffect } from "react";
import { useResearch, ResearchSession } from "@/hooks/use-research";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Search,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  FileText,
  Activity,
  Download,
} from "lucide-react";

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}m ${rem}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function downloadMarkdown(text: string, query: string) {
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const filename = `gtm-report-${slug || "report"}.md`;
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Kiterae wordmark ───────────────────────────────────────────── */

function KiteraeWordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const cls =
    size === "lg"
      ? "text-2xl font-bold tracking-tight"
      : size === "sm"
        ? "text-sm font-bold tracking-tight"
        : "text-base font-bold tracking-tight";
  return (
    <span className={cls}>
      <span className="text-white">kiter</span>
      <span style={{ color: "#FF33BE" }}>ae</span>
    </span>
  );
}

/* ─── Top navigation ─────────────────────────────────────────────── */

function TopNav() {
  return (
    <nav
      className="shrink-0 relative flex items-center h-14 border-b px-6"
      style={{ borderColor: "hsl(240 12% 12%)", background: "hsl(240 20% 3%)" }}
    >
      {/* Logo — absolute left */}
      <a href="https://kiterae.com" target="_blank" rel="noopener noreferrer" className="absolute left-6">
        <KiteraeWordmark />
      </a>

      {/* Center links — truly centered in the full nav */}
      <div className="hidden sm:flex items-center gap-8 mx-auto">
        {["Build", "Process", "About"].map((label) => {
          const isActive = label === "Build";
          return (
            <a
              key={label}
              href={`https://kiterae.com/#${label.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="relative flex flex-col items-center gap-1 text-sm transition-colors pb-1"
              style={isActive ? { color: "white", fontWeight: 600 } : { color: "rgba(255,255,255,0.45)" }}
            >
              {label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                  style={{ background: "#FF33BE" }}
                />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Status badge ───────────────────────────────────────────────── */

function StatusBadge({ status }: { status: ResearchSession["status"] }) {
  if (status === "idle")
    return (
      <span className="text-white/40 text-xs flex items-center gap-1">
        <Clock size={10} /> idle
      </span>
    );
  if (status === "connecting" || status === "running")
    return (
      <span className="text-xs flex items-center gap-1" style={{ color: "#FF33BE" }}>
        <Loader2 size={10} className="animate-spin" /> running
      </span>
    );
  if (status === "done")
    return (
      <span className="text-emerald-400 text-xs flex items-center gap-1">
        <CheckCircle size={10} /> done
      </span>
    );
  return (
    <span className="text-red-400 text-xs flex items-center gap-1">
      <XCircle size={10} /> error
    </span>
  );
}

/* ─── Sidebar session item ───────────────────────────────────────── */

function SessionSidebarItem({
  session,
  isActive,
  onClick,
}: {
  session: ResearchSession;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      data-testid={`session-item-${session.id}`}
      onClick={onClick}
      className="w-full text-left px-3 py-2.5 rounded-md transition-colors group border"
      style={
        isActive
          ? {
              background: "rgba(255,0,128,0.08)",
              borderColor: "rgba(255,0,128,0.25)",
              color: "white",
            }
          : {
              background: "transparent",
              borderColor: "transparent",
              color: "rgba(255,255,255,0.6)",
            }
      }
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium leading-snug line-clamp-2 flex-1">
          {session.query}
        </p>
        {isActive && (
          <ChevronRight size={12} className="mt-0.5 shrink-0 opacity-70" style={{ color: "#FF33BE" }} />
        )}
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        <StatusBadge status={session.status} />
        <span className="text-white/30 text-xs">{formatTime(session.startedAt)}</span>
        {session.finishedAt && (
          <span className="text-white/30 text-xs">
            · {formatDuration(session.finishedAt - session.startedAt)}
          </span>
        )}
      </div>
    </button>
  );
}

/* ─── Progress feed ──────────────────────────────────────────────── */

function ProgressFeed({ session }: { session: ResearchSession }) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.progressLines.length]);

  return (
    <div className="font-mono text-xs space-y-0.5">
      {session.progressLines.map((line) => (
        <div
          key={line.id}
          data-testid="progress-line"
          className="log-line-enter flex items-start gap-2 text-white/50"
        >
          <span className="shrink-0 select-none mt-0.5" style={{ color: "rgba(255,0,128,0.5)" }}>
            &gt;
          </span>
          <span className="leading-relaxed">{line.message}</span>
        </div>
      ))}
      {(session.status === "running" || session.status === "connecting") && (
        <div className="flex items-center gap-2 text-white/40">
          <span className="shrink-0 select-none" style={{ color: "rgba(255,0,128,0.5)" }}>&gt;</span>
          <span className="cursor-blink" style={{ color: "#FF33BE" }}>_</span>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

/* ─── Report view ────────────────────────────────────────────────── */

function ReportView({ text }: { text: string }) {
  if (!text.trim()) return null;
  return (
    <div data-testid="report-output" className="prose prose-sm max-w-none text-white">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}

/* ─── Live stream ────────────────────────────────────────────────── */

function LiveStream({ text }: { text: string }) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [text]);

  if (!text) return null;
  return (
    <div
      data-testid="live-stream"
      className="font-mono text-xs text-white/70 whitespace-pre-wrap leading-relaxed"
    >
      {text}
      <span className="cursor-blink" style={{ color: "#FF33BE" }}>_</span>
      <div ref={bottomRef} />
    </div>
  );
}

/* ─── Elapsed timer ──────────────────────────────────────────────── */

function ElapsedTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span data-testid="elapsed-timer" className="tabular-nums">
      {formatDuration(elapsed)}
    </span>
  );
}

/* ─── Main page ──────────────────────────────────────────────────── */

export default function Home() {
  const { sessions, activeSession, activeSessionId, startResearch, selectSession } =
    useResearch();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"activity" | "report">("activity");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRunning =
    activeSession?.status === "running" ||
    activeSession?.status === "connecting";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed || isRunning) return;
    setQuery("");
    setActiveTab("activity");
    void startResearch(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  useEffect(() => {
    if (activeSession?.status === "done" || activeSession?.status === "error") {
      setActiveTab("report");
    }
  }, [activeSession?.status]);

  const showReport =
    activeSession &&
    (activeSession.report || activeSession.streamText) &&
    activeTab === "report";

  const showActivity = activeSession && activeTab === "activity";

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "hsl(240 20% 4%)", color: "white" }}>

      {/* ── Top navigation ── */}
      <TopNav />

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar */}
        <aside
          className="w-60 shrink-0 flex flex-col border-r"
          style={{ background: "hsl(240 20% 3%)", borderColor: "hsl(240 12% 11%)" }}
        >
          {/* Sidebar header */}
          <div className="px-4 py-3.5 border-b" style={{ borderColor: "hsl(240 12% 11%)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/40">
              GTM Researcher
            </p>
          </div>

          {/* New Research button */}
          <div className="px-3 pt-3 pb-2">
            <button
              data-testid="button-new-research"
              onClick={() => textareaRef.current?.focus()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-opacity hover:opacity-90 active:opacity-75"
              style={{ background: "#FF33BE", color: "white" }}
            >
              <Plus size={12} />
              New Research
            </button>
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {sessions.length === 0 && (
              <p className="text-xs text-white/25 text-center pt-6 px-3 leading-relaxed">
                Your research sessions will appear here
              </p>
            )}
            {sessions.map((session) => (
              <SessionSidebarItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onClick={() => selectSession(session.id)}
              />
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Header bar */}
          <header
            className="shrink-0 border-b px-6 py-3 flex items-center justify-between"
            style={{ borderColor: "hsl(240 12% 11%)" }}
          >
            <div className="flex items-center gap-3">
              {activeSession ? (
                <>
                  <StatusBadge status={activeSession.status} />
                  {(activeSession.status === "running" ||
                    activeSession.status === "connecting") && (
                    <span className="text-xs text-white/40">
                      <ElapsedTimer startedAt={activeSession.startedAt} />
                    </span>
                  )}
                  {activeSession.finishedAt && (
                    <span className="text-xs text-white/40">
                      Completed in{" "}
                      {formatDuration(activeSession.finishedAt - activeSession.startedAt)}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-xs text-white/30">Ready to research</span>
              )}
            </div>

            {/* Tabs */}
            {activeSession && (
              <div
                className="flex items-center gap-0.5 rounded-full p-0.5 border"
                style={{ borderColor: "hsl(240 12% 14%)", background: "hsl(240 18% 7%)" }}
              >
                <button
                  data-testid="tab-activity"
                  onClick={() => setActiveTab("activity")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={
                    activeTab === "activity"
                      ? { background: "#FF33BE", color: "white" }
                      : { color: "rgba(255,255,255,0.45)" }
                  }
                >
                  <Activity size={11} />
                  Activity
                </button>
                <button
                  data-testid="tab-report"
                  onClick={() => setActiveTab("report")}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors"
                  style={
                    activeTab === "report"
                      ? { background: "#FF33BE", color: "white" }
                      : { color: "rgba(255,255,255,0.45)" }
                  }
                >
                  <FileText size={11} />
                  Report
                </button>
              </div>
            )}
          </header>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {!activeSession && (
              <div
                data-testid="empty-state"
                className="flex flex-col justify-center h-full px-8 py-10 max-w-2xl mx-auto w-full"
              >
                {/* Description card */}
                <div
                  className="rounded-xl p-6 mb-8"
                  style={{ background: "hsl(240 18% 8%)" }}
                >
                  <h2 className="text-base font-bold mb-3" style={{ color: "#FF33BE" }}>
                    How The GTM Researcher Agent Works
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                    Kiterae GTM Researcher takes a business idea or market topic and generates a
                    research-backed go-to-market report. It runs deep market analysis, identifies
                    competitors, ICPs, market gaps, and GTM hooks, then adds SEO keyword strategy
                    and messaging recommendations grounded in DataForSEO keyword data.
                  </p>
                </div>

                {/* Start prompt */}
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border"
                    style={{
                      background: "rgba(255,0,128,0.08)",
                      borderColor: "rgba(255,0,128,0.2)",
                    }}
                  >
                    <Search size={20} style={{ color: "#FF33BE" }} />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    Start a research session
                  </h3>
                  <p className="text-sm text-white/35 max-w-sm leading-relaxed">
                    Describe your business idea or market below to get started.
                  </p>
                </div>
              </div>
            )}

            {showActivity && (
              <div className="p-6">
                <div className="mb-5">
                  <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-2">
                    Query
                  </p>
                  <p
                    data-testid="session-query"
                    className="text-sm text-white leading-relaxed"
                  >
                    {activeSession.query}
                  </p>
                </div>
                <div
                  className="border-t pt-5"
                  style={{ borderColor: "hsl(240 12% 12%)" }}
                >
                  <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-3">
                    Activity Log
                  </p>
                  {activeSession.progressLines.length === 0 &&
                  activeSession.status === "connecting" ? (
                    <div className="flex items-center gap-2 text-xs text-white/40 font-mono">
                      <Loader2 size={12} className="animate-spin" style={{ color: "#FF33BE" }} />
                      Establishing connection...
                    </div>
                  ) : (
                    <ProgressFeed session={activeSession} />
                  )}
                </div>
                {activeSession.streamText && (
                  <div
                    className="border-t pt-5 mt-5"
                    style={{ borderColor: "hsl(240 12% 12%)" }}
                  >
                    <p className="text-xs text-white/30 font-semibold uppercase tracking-widest mb-3">
                      Live Output
                    </p>
                    <LiveStream text={activeSession.streamText} />
                  </div>
                )}
                {activeSession.status === "error" && activeSession.error && (
                  <div
                    data-testid="error-message"
                    className="mt-4 p-3 rounded-lg border text-xs"
                    style={{
                      background: "rgba(255,0,0,0.08)",
                      borderColor: "rgba(255,0,0,0.2)",
                      color: "#ff6b6b",
                    }}
                  >
                    {activeSession.error}
                  </div>
                )}
              </div>
            )}

            {showReport && (
              <div className="p-6">
                {activeSession.status === "error" && activeSession.error ? (
                  <div
                    data-testid="error-message"
                    className="p-3 rounded-lg border text-xs"
                    style={{
                      background: "rgba(255,0,0,0.08)",
                      borderColor: "rgba(255,0,0,0.2)",
                      color: "#ff6b6b",
                    }}
                  >
                    {activeSession.error}
                  </div>
                ) : activeSession.report || activeSession.streamText ? (
                  <div
                    className="rounded-xl border p-6"
                    style={{
                      background: "hsl(240 18% 7%)",
                      borderColor: "hsl(240 12% 14%)",
                    }}
                  >
                    <div
                      className="flex items-center justify-between mb-5 pb-4 border-b"
                      style={{ borderColor: "hsl(240 12% 12%)" }}
                    >
                      <p className="text-xs text-white/30 font-semibold uppercase tracking-widest">
                        Research Report
                      </p>
                      <button
                        data-testid="button-download-report"
                        onClick={() =>
                          downloadMarkdown(
                            activeSession.report || activeSession.streamText,
                            activeSession.query,
                          )
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors hover:bg-[#FF33BE]/10"
                        style={{
                          borderColor: "rgba(255,0,128,0.4)",
                          color: "#FF33BE",
                        }}
                      >
                        <Download size={11} />
                        Download .md
                      </button>
                    </div>
                    <ReportView
                      text={activeSession.report || activeSession.streamText}
                    />

                    {/* Next steps banner — shown when session is done */}
                    {activeSession.status === "done" && (
                      <div
                        className="mt-6 rounded-xl p-5 border"
                        style={{
                          background: "rgba(255,51,190,0.06)",
                          borderColor: "rgba(255,51,190,0.25)",
                        }}
                      >
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#FF33BE" }}>
                          What's next
                        </p>
                        <p className="text-sm text-white/70 leading-relaxed mb-4">
                          Download your report — you'll need it in the next phase to build out your content strategy.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            onClick={() =>
                              downloadMarkdown(
                                activeSession.report || activeSession.streamText,
                                activeSession.query,
                              )
                            }
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                            style={{ background: "#FF33BE", color: "white" }}
                          >
                            <Download size={13} />
                            Download report (.md)
                          </button>
                          <a
                            href="https://contentbuild.kiterae.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-full border text-sm font-semibold transition-colors hover:bg-[#FF33BE]/10"
                            style={{ borderColor: "rgba(255,51,190,0.4)", color: "#FF33BE" }}
                          >
                            Go to next phase →
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 size={14} className="animate-spin" style={{ color: "#FF33BE" }} />
                    Waiting for report...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Query input */}
          <div
            className="shrink-0 border-t px-6 py-4"
            style={{
              borderColor: "hsl(240 12% 11%)",
              background: "hsl(240 20% 3%)",
            }}
          >
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                data-testid="input-query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the market, company, or GTM question you want researched..."
                rows={3}
                disabled={isRunning}
                className="w-full resize-none rounded-xl border px-4 py-3 text-sm text-white placeholder:text-white/25 focus:outline-none transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "hsl(240 18% 7%)",
                  borderColor: "hsl(240 12% 16%)",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,0,128,0.5)";
                  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,0,128,0.08)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "hsl(240 12% 16%)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-white/30">
                  {isRunning ? (
                    <span className="flex items-center gap-1.5">
                      <Loader2 size={11} className="animate-spin" style={{ color: "#FF33BE" }} />
                      Research in progress...
                    </span>
                  ) : (
                    <span>
                      Press{" "}
                      <kbd
                        className="px-1.5 py-0.5 rounded border text-xs font-mono"
                        style={{
                          background: "hsl(240 14% 10%)",
                          borderColor: "hsl(240 12% 16%)",
                          color: "rgba(255,255,255,0.5)",
                        }}
                      >
                        ⌘↵
                      </kbd>{" "}
                      to submit
                    </span>
                  )}
                </p>
                <button
                  type="submit"
                  data-testid="button-submit"
                  disabled={!query.trim() || isRunning}
                  className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: "#FF33BE", color: "white" }}
                >
                  {isRunning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Search size={14} />
                  )}
                  {isRunning ? "Researching..." : "Research"}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
