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

// Drafts live in this browser only, so a refresh doesn't lose work
const draftKey = (problemId: number, lang: Lang) => `draft:${problemId}:${lang}`;
function loadDraft(problemId: number, lang: Lang) {
  try {
    return localStorage.getItem(draftKey(problemId, lang));
  } catch {
    return null;
  }
}
function saveDraft(problemId: number, lang: Lang, code: string) {
  try {
    localStorage.setItem(draftKey(problemId, lang), code);
  } catch {}
}

// The right side of the problem workspace: editor on top, results below
export function SubmitForm({
  problemId,
  defaultLanguage,
  initialHistory,
}: {
  problemId: number;
  defaultLanguage: Lang;
  initialHistory: HistoryItem[];
}) {
  const [state, action] = useActionState(submitCode, undefined);
  const [history, setHistory] = useState(initialHistory);
  const [shownId, setShownId] = useState<number | null>(initialHistory[0]?.id ?? null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Lang>(defaultLanguage);
  const [code, setCode] = useState(TEMPLATES[defaultLanguage]);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setCode(loadDraft(problemId, language) ?? TEMPLATES[language]);
  }, [problemId, language]);

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
    saveDraft(problemId, language, value);
  };

  const loadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const text = await file.text();
    const lang: Lang = /\.(cpp|cc|cxx)$/i.test(file.name) ? "CPP" : /\.c$/i.test(file.name) ? "C" : language;
    // Save as that language's draft; the language effect then loads it
    saveDraft(problemId, lang, text);
    setCode(text);
    setLanguage(lang);
  };

  return (
    <div className="ws-right">
      <form action={action} className="ws-editor-pane card">
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
