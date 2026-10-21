"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANGUAGE_LABEL, VERDICT_LABEL } from "@/lib/format";
import type { HistoryItem, SubmissionView } from "@/lib/submission-types";
import { VERDICT_TONE, VerdictBadge } from "./VerdictBadge";

const POLL_MS = 1000;
const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Fetches one submission and keeps polling it until judging is done
function useSubmission(id: number | null, onChange: (v: SubmissionView) => void) {
  const [view, setView] = useState<SubmissionView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setView(null);
    setError(null);
    if (id === null) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      try {
        const res = await fetch(`/api/submissions/${id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(res.status === 404 ? "Submission not found" : `Error ${res.status}`);
        const v: SubmissionView = await res.json();
        if (stopped) return;
        setView(v);
        onChange(v);
        if (v.status !== "DONE") timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (stopped) return;
        setError(err instanceof Error ? err.message : String(err));
        timer = setTimeout(load, POLL_MS * 3);
      }
    };
    load();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
    // onChange only reports upward; re-subscribing on every render isn't wanted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return { view, error };
}

export function ResultPanel({
  shownId,
  history,
  onSelect,
  onUpdate,
}: {
  shownId: number | null;
  history: HistoryItem[];
  onSelect: (id: number) => void;
  onUpdate: (v: SubmissionView) => void;
}) {
  const [tab, setTab] = useState<"result" | "history">("result");
  const { view, error } = useSubmission(shownId, onUpdate);

  return (
    <section className="ws-results card">
      <div className="tabs ws-tabs">
        <button type="button" className={`tab${tab === "result" ? " active" : ""}`} onClick={() => setTab("result")}>
          Result
          {view && view.status !== "DONE" && <span className="spinner" aria-hidden style={{ marginLeft: 8, width: 11, height: 11 }} />}
        </button>
        <button type="button" className={`tab${tab === "history" ? " active" : ""}`} onClick={() => setTab("history")}>
          History<span className="tab-count">{history.length}</span>
        </button>
        <span className="spacer" />
        {shownId !== null && tab === "result" && (
          <Link href={`/submissions/${shownId}`} className="hint ws-full">
            Submission #{shownId} ↗
          </Link>
        )}
      </div>

      <div className="ws-results-body">
        {tab === "history" ? (
          <History history={history} shownId={shownId} onSelect={(id) => (onSelect(id), setTab("result"))} />
        ) : shownId === null ? (
          <p className="ws-empty">Submit your code to run it against the tests. The results show up here.</p>
        ) : error && !view ? (
          <div className="banner error">{error}</div>
        ) : !view ? (
          <div className="waiting"><span className="spinner" aria-hidden />Loading…</div>
        ) : view.status !== "DONE" ? (
          <div className="waiting">
            <span className="spinner" aria-hidden />
            {view.status === "JUDGING"
              ? "Compiling and running your code against the tests…"
              : view.queueAhead > 0
                ? `In the queue: ${view.queueAhead} submission(s) ahead of yours…`
                : "Waiting for the judge…"}
          </div>
        ) : (
          <Result view={view} />
        )}
      </div>
    </section>
  );
}

function Result({ view }: { view: SubmissionView }) {
  const passed = view.tests.filter((t) => t.verdict === "AC").length;
  const failed = view.tests.filter((t) => t.detail);
  const hidden = view.tests.some((t) => t.verdict !== "AC" && !t.detail);

  return (
    <>
      <div className="rp-summary">
        <span className="rp-score">
          {view.score}
          <small>/ {view.maxScore}</small>
        </span>
        {view.verdict && (
          <span className={`verdict-grade ${VERDICT_TONE[view.verdict]}`}>
            <b>{view.verdict}</b> {VERDICT_LABEL[view.verdict]}
          </span>
        )}
        <span className="spacer" />
        {view.tests.length > 0 && (
          <span className="meter" title={`${passed} / ${view.tests.length} tests passed`}>
            {view.tests.map((t) => (
              <i key={t.n} className={t.verdict === "AC" ? "on" : ""} />
            ))}
            <b>{passed} / {view.tests.length}</b>
          </span>
        )}
      </div>

      {view.verdict === "CE" || (view.verdict === "IE" && view.compileOutput) ? (
        <>
          <div className="io-label">{view.verdict === "CE" ? "Compiler output" : "Details"}</div>
          <pre className="log wrap">{view.compileOutput}</pre>
        </>
      ) : (
        <>
          <table className="rp-tests">
            <thead>
              <tr>
                <th>Test</th>
                <th>Result</th>
                <th className="num">Time</th>
                <th className="num">Points</th>
              </tr>
            </thead>
            <tbody>
              {view.tests.map((t) => (
                <tr key={t.n}>
                  <td className="nowrap">
                    {t.n}
                    {t.isSample && <span className="muted"> · example</span>}
                  </td>
                  <td><VerdictBadge verdict={t.verdict} long /></td>
                  <td className="num">{t.timeMs !== null ? `${t.timeMs} ms` : "—"}</td>
                  <td className="num">{t.verdict === "AC" ? t.points : 0} <span className="muted">/ {t.points}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          {failed.map((t) => (
            <div key={t.n} className="rp-fail">
              <div className="rp-fail-head">
                Test {t.n} <VerdictBadge verdict={t.verdict} long />
              </div>
              <div className="rp-cols">
                <div>
                  <div className="pane-head in">Input</div>
                  <pre>{t.detail!.input}</pre>
                </div>
                <div>
                  <div className="pane-head out">Expected</div>
                  <pre>{t.detail!.expected}</pre>
                </div>
                <div>
                  <div className="pane-head err">Your output</div>
                  <pre>{t.detail!.stdout || " "}</pre>
                </div>
              </div>
              {t.detail!.stderr && (
                <div className="rp-stderr">
                  <div className="pane-head">Error output</div>
                  <pre>{t.detail!.stderr}</pre>
                </div>
              )}
            </div>
          ))}
          {hidden && <p className="note">Hidden tests only show their result. Details appear for failed example tests.</p>}
        </>
      )}
    </>
  );
}

function History({ history, shownId, onSelect }: { history: HistoryItem[]; shownId: number | null; onSelect: (id: number) => void }) {
  if (history.length === 0) return <p className="ws-empty">No submissions for this problem yet.</p>;
  return (
    <table className="rp-tests rp-history">
      <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>Lang</th>
          <th>Result</th>
          <th className="num">Score</th>
        </tr>
      </thead>
      <tbody>
        {history.map((h) => (
          <tr key={h.id} className={h.id === shownId ? "current" : ""} onClick={() => onSelect(h.id)}>
            <td>{h.id}</td>
            <td className="muted nowrap">{time(h.createdAt)}</td>
            <td>{LANGUAGE_LABEL[h.language]}</td>
            <td><VerdictBadge status={h.status} verdict={h.verdict} long /></td>
            <td className="num">{h.status === "DONE" ? <>{h.score} <span className="muted">/ {h.maxScore}</span></> : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
