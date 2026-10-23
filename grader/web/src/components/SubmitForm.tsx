"use client";

import Editor from "@monaco-editor/react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { submitCode } from "@/lib/actions/submit";
import { toHistoryItem, type HistoryItem, type SubmissionView } from "@/lib/submission-types";
import { ResultPanel } from "./ResultPanel";
import { SubmitButton } from "./SubmitButton";

type Lang = "C" | "CPP";

const TEMPLATES: Record<Lang, string> = {
  C: `#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a + b);
    return 0;
}
`,
  CPP: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, b;
    cin >> a >> b;
    cout << a + b << "\\n";
    return 0;
}
`,
};

// Code with the time it was saved (ms), so the newest copy wins
type Saved = { code: string; savedAt: number };
export type SavedCode = Partial<Record<Lang, Saved>>;

const SYNC_DELAY_MS = 1500;
const RETRY_MS = 5000;

// Drafts are kept in this browser right away and on the server shortly
// after, so a refresh or another computer doesn't lose work
const draftKey = (problemId: number, lang: Lang) => `draft:${problemId}:${lang}`;
function loadLocal(problemId: number, lang: Lang): Saved | null {
  try {
    const raw = localStorage.getItem(draftKey(problemId, lang));
    if (raw === null) return null;
    try {
      const v = JSON.parse(raw);
      if (typeof v?.code === "string" && typeof v.savedAt === "number") return v;
    } catch {}
    return { code: raw, savedAt: 0 }; // plain-text drafts from before server sync
  } catch {
    return null;
  }
}
function saveLocal(problemId: number, lang: Lang, code: string) {
  try {
    localStorage.setItem(draftKey(problemId, lang), JSON.stringify({ code, savedAt: Date.now() }));
  } catch {}
}
const newest = (...items: (Saved | null | undefined)[]) =>
  items.reduce<Saved | null>((best, x) => (x && (!best || x.savedAt > best.savedAt) ? x : best), null);

type SyncState = "idle" | "saving" | "saved" | "error";
const SYNC_LABEL: Record<SyncState, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved to server, retrying…",
};

// The right side of the problem workspace: editor on top, results below
export function SubmitForm({
  problemId,
  defaultLanguage,
  initialHistory,
  savedCode,
}: {
  problemId: number;
  defaultLanguage: Lang;
  initialHistory: HistoryItem[];
  // The server's draft (or last submission) per language
  savedCode: SavedCode;
}) {
  const [state, action] = useActionState(submitCode, undefined);
  const [history, setHistory] = useState(initialHistory);
  const [shownId, setShownId] = useState<number | null>(initialHistory[0]?.id ?? null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Lang>(defaultLanguage);
  const [code, setCode] = useState(savedCode[defaultLanguage]?.code ?? TEMPLATES[defaultLanguage]);
  const [dark, setDark] = useState(false);
  const [sync, setSync] = useState<SyncState>("idle");
  const pending = useRef<{ language: Lang; code: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setCode(newest(loadLocal(problemId, language), savedCode[language])?.code ?? TEMPLATES[language]);
    // savedCode is only the starting point; later edits are newer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, language]);

  // Send the latest unsaved draft to the server now
  const flush = useCallback(
    (keepalive = false) => {
      clearTimeout(timer.current);
      const draft = pending.current;
      if (!draft) return;
      pending.current = null;
      setSync("saving");
      const body = JSON.stringify({ problemId, ...draft });
      fetch("/api/drafts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        // keepalive lets the save finish while the page closes (browsers cap it at 64 KB)
        keepalive: keepalive && body.length < 60_000,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Error ${res.status}`);
          if (!pending.current) setSync("saved");
        })
        .catch(() => {
          setSync("error");
          if (!pending.current) pending.current = draft;
          clearTimeout(timer.current);
          timer.current = setTimeout(() => flush(), RETRY_MS);
        });
    },
    [problemId],
  );

  const schedule = (lang: Lang, value: string) => {
    pending.current = { language: lang, code: value };
    setSync("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(), SYNC_DELAY_MS);
  };

  // Don't lose the last keystrokes when the tab is hidden or closed
  useEffect(() => {
    const onHide = () => flush(true);
    const onVisibility = () => document.visibilityState === "hidden" && onHide();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
      onHide();
    };
  }, [flush]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // A new submission: show it, add it to the history, and on a phone
  // (where the panel sits below the editor) bring it into view
  useEffect(() => {
    const id = state?.submissionId;
    if (!id) return;
    setShownId(id);
    setHistory((h) =>
      h.some((x) => x.id === id)
        ? h
        : [toHistoryItem({ id, status: "PENDING", verdict: null, score: 0, maxScore: 0, language, createdAt: new Date() }), ...h],
    );
    if (window.matchMedia("(max-width: 1000px)").matches) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // language is read once, when the submission is created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Keep the history row in step with what the panel fetched
  const onUpdate = useCallback((v: SubmissionView) => {
    setHistory((h) => h.map((x) => (x.id === v.id ? toHistoryItem(v) : x)));
  }, []);
  const judging = history.some((h) => h.status !== "DONE");

  const update = (value: string) => {
    setCode(value);
    saveLocal(problemId, language, value);
    schedule(language, value);
  };

  const loadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const text = await file.text();
    const lang: Lang = /\.(cpp|cc|cxx)$/i.test(file.name) ? "CPP" : /\.c$/i.test(file.name) ? "C" : language;
    // Save as that language's draft; the language effect then loads it
    saveLocal(problemId, lang, text);
    schedule(lang, text);
    setCode(text);
    setLanguage(lang);
  };

  return (
    <div className="ws-right">
      <form action={action} onSubmit={() => flush()} className="ws-editor-pane card">
        <input type="hidden" name="problemId" value={problemId} />
        <input type="hidden" name="code" value={code} />
        <input type="hidden" name="language" value={language} />

        <div className="ws-toolbar">
          <div className="chip-list" role="radiogroup" aria-label="Language">
            {(["C", "CPP"] as const).map((l) => (
              <label key={l} className={`chip${language === l ? " on" : ""}`}>
                <input type="radio" name="language-choice" checked={language === l} onChange={() => setLanguage(l)} />
                {l === "C" ? "C" : "C++17"}
              </label>
            ))}
          </div>
          <span className={`ws-sync ${sync}`} role="status">{SYNC_LABEL[sync]}</span>
          <span className="spacer" />
          <label className="button secondary">
            Load file…
            <input type="file" accept=".c,.cpp,.cc,.cxx,.h" onChange={loadFile} hidden />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (window.confirm("Replace your code with the starter template?")) update(TEMPLATES[language]);
            }}
          >
            Reset
          </button>
          <SubmitButton pendingText="Submitting…" disabled={judging}>
            {judging ? "Judging…" : "Submit"}
          </SubmitButton>
        </div>

        <div className="ws-editor">
          <Editor
            height="100%"
            language={language === "C" ? "c" : "cpp"}
            theme={dark ? "vs-dark" : "light"}
            value={code}
            onChange={(v) => update(v ?? "")}
            options={{ fontSize: 13, minimap: { enabled: false }, scrollBeyondLastLine: false, tabSize: 4, automaticLayout: true }}
          />
        </div>

        {state?.error && <div className="banner error ws-error">{state.error}</div>}
      </form>

      <div ref={resultsRef} className="ws-results-wrap">
        <ResultPanel shownId={shownId} history={history} onSelect={setShownId} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
