import { useState, useRef, useCallback } from "react";
import { TaskClient } from "@blocks-network/sdk";

export type ResearchStatus =
  | "idle"
  | "connecting"
  | "running"
  | "done"
  | "error";

export interface ProgressLine {
  id: string;
  message: string;
  timestamp: number;
}

export interface ResearchSession {
  id: string;
  query: string;
  startedAt: number;
  finishedAt?: number;
  status: ResearchStatus;
  progressLines: ProgressLine[];
  streamText: string;
  report: string;
  error?: string;
}

let sessionCounter = 0;

export function useResearch() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const clientRef = useRef<TaskClient | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateSession = useCallback(
    (id: string, patch: Partial<ResearchSession>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      );
    },
    [],
  );

  const appendProgress = useCallback((id: string, message: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? {
              ...s,
              progressLines: [
                ...s.progressLines,
                { id: crypto.randomUUID(), message, timestamp: Date.now() },
              ],
            }
          : s,
      ),
    );
  }, []);

  const appendStream = useCallback((id: string, chunk: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, streamText: s.streamText + chunk } : s,
      ),
    );
  }, []);

  const startResearch = useCallback(
    async (query: string) => {
      sessionCounter += 1;
      const id = `session-${sessionCounter}`;
      const newSession: ResearchSession = {
        id,
        query,
        startedAt: Date.now(),
        status: "connecting",
        progressLines: [],
        streamText: "",
        report: "",
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(id);

      try {
        const client = await TaskClient.create({
          billingMode: "free",
          tokenEndpoint: "/api/blocks-token",
        });
        clientRef.current = client;

        updateSession(id, { status: "running" });
        appendProgress(id, "Connecting to research agent...");

        const session = await client.sendMessage({
          agentName: "kiterae_gtm_researcher",
          requestParts: [{ partId: "request", text: query }],
        });

        appendProgress(id, "Session established. Research in progress.");

        session.onProgress((event) => {
          if (event.message) {
            appendProgress(id, event.message);
          }
        });

        session.onStream((streamRef) => {
          const stream = streamRef.open();
          void (async () => {
            const decoder = new TextDecoder();
            for await (const chunk of stream.bytes()) {
              appendStream(id, decoder.decode(chunk, { stream: true }));
            }
          })();
        });

        await session.waitForTerminal(300_000);

        const artifacts = session.listArtifacts();
        let report = "";
        for (const ref of artifacts) {
          try {
            const downloaded = await session.downloadArtifact(ref);
            const text = new TextDecoder().decode(downloaded.data);
            report += text + "\n\n";
          } catch {
            // skip undownloadable artifacts
          }
        }

        session.close();
        client.destroy();
        clientRef.current = null;

        setSessions((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "done",
                  finishedAt: Date.now(),
                  report: report || s.streamText,
                }
              : s,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An unexpected error occurred";
        setSessions((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: "error",
                  finishedAt: Date.now(),
                  error: message,
                }
              : s,
          ),
        );
        if (clientRef.current) {
          clientRef.current.destroy();
          clientRef.current = null;
        }
      }

      if (elapsedRef.current) {
        clearInterval(elapsedRef.current);
        elapsedRef.current = null;
      }
    },
    [updateSession, appendProgress, appendStream],
  );

  const selectSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;

  return {
    sessions,
    activeSession,
    activeSessionId,
    startResearch,
    selectSession,
  };
}
