"use client";

import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import type * as Y from "yjs";
import { submitCode } from "@/lib/actions/submit";
import { bindEditor, cursorPresence, LiveSession, normalizeEol, peerDecorations, peerRange, type LiveStatus } from "@/lib/live/client";
import type { Peer } from "@/lib/live/protocol";
import { toHistoryItem, type HistoryItem, type SubmissionView } from "@/lib/submission-types";
import { LANGS, TEMPLATES, type Lang } from "@/lib/templates";
import { ResultPanel } from "./ResultPanel";
import { SubmitButton } from "./SubmitButton";

type EditorInstance = Parameters<OnMount>[0];

// The server's draft (or last submission) per language, with when it was saved
export type SavedCode = Partial<Record<Lang, { code: string; savedAt: number }>>;

const LANG_LABEL: Record<Lang, string> = { C: "C", CPP: "C++17" };
const STATUS_LABEL: Record<LiveStatus, string> = {
  connecting: "Connecting…",
  live: "Live",
  offline: "Offline, will sync when reconnected",
};
const PRESENCE_DELAY_MS = 60;

// The right side of the problem workspace: editor on top, results below.
// The code is shared live with the same account's other open browsers.
export function SubmitForm({
  problemId,
  defaultLanguage,
  initialHistory,
  savedCode,
}: {
  problemId: number;
  defaultLanguage: Lang;
  initialHistory: HistoryItem[];
  savedCode: SavedCode;
}) {
  const [state, action] = useActionState(submitCode, undefined);
  const [history, setHistory] = useState(initialHistory);
  const [shownId, setShownId] = useState<number | null>(initialHistory[0]?.id ?? null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useState<Lang>(defaultLanguage);
  const [code, setCode] = useState(savedCode[defaultLanguage]?.code ?? TEMPLATES[defaultLanguage]);
  const [dark, setDark] = useState(false);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [doc, setDoc] = useState<Y.Doc | null>(null);
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [peers, setPeers] = useState<Peer[]>([]);
  const [editor, setEditor] = useState<{ editor: EditorInstance; monaco: Monaco } | null>(null);
  const [, setTick] = useState(0); // re-render when peers' lines move

  // Add a submission to the history and show it (ours, or from another browser)
  const showSubmission = useCallback((id: number, lang: Lang) => {
    setShownId(id);
    setHistory((h) =>
      h.some((x) => x.id === id)
        ? h
        : [toHistoryItem({ id, status: "PENDING", verdict: null, score: 0, maxScore: 0, language: lang, createdAt: new Date() }), ...h],
    );
  }, []);

  useEffect(() => {
    const initial = Object.fromEntries(LANGS.map((l) => [l, savedCode[l]?.code ?? TEMPLATES[l]])) as Record<Lang, string>;
    const s = new LiveSession(problemId, initial, {
      doc: setDoc,
      status: setStatus,
      peers: setPeers,
      submission: showSubmission,
    });
    setSession(s);
    setDoc(s.doc);
    s.start();
    return () => s.stop();
    // savedCode is only the starting text; the live document takes over
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, showSubmission]);

  // Bind the editor to the shared text of the chosen language
  useEffect(() => {
    if (!editor || !doc) return;
    return bindEditor(editor.editor, editor.monaco, doc, language, setCode);
  }, [editor, doc, language]);

  // Tell the other browsers where this cursor is
  useEffect(() => {
    if (!editor || !doc || !session) return;
    const ed = editor.editor;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        // "away" also when this tab is hidden, e.g. the student switched tabs
        const focused = ed.hasTextFocus() && document.visibilityState === "visible";
        session.setPresence(cursorPresence(ed, doc, language, focused));
      }, PRESENCE_DELAY_MS);
    };
    report();
    const subs = [ed.onDidChangeCursorSelection(report), ed.onDidFocusEditorText(report), ed.onDidBlurEditorText(report)];
    document.addEventListener("visibilitychange", report);
    return () => {
      clearTimeout(timer);
      subs.forEach((d) => d.dispose());
      document.removeEventListener("visibilitychange", report);
    };
  }, [editor, doc, session, language]);

  // Draw the other browsers' cursors, and redraw as the text changes
  useEffect(() => {
    if (!editor || !doc) return;
    const decorations = editor.editor.createDecorationsCollection();
    let frame = 0;
    const draw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        decorations.set(peerDecorations(editor.editor, editor.monaco, doc, language, peers));
        setTick((t) => t + 1);
      });
    };
    draw();
    doc.on("update", draw);
    return () => {
      cancelAnimationFrame(frame);
      doc.off("update", draw);
      decorations.clear();
    };
  }, [editor, doc, language, peers]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // A new submission from this browser: show it, and on a phone (where the
  // panel sits below the editor) bring it into view
  useEffect(() => {
    const id = state?.submissionId;
    if (!id) return;
    showSubmission(id, language);
    if (window.matchMedia("(max-width: 1000px)").matches) resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    // language is read once, when the submission is created
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Keep the history row in step with what the panel fetched
  const onUpdate = useCallback((v: SubmissionView) => {
    setHistory((h) => h.map((x) => (x.id === v.id ? toHistoryItem(v) : x)));
  }, []);
  const judging = history.some((h) => h.status !== "DONE");

  const loadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    e.target.value = "";
    const text = await file.text();
    const lang: Lang = /\.(cpp|cc|cxx)$/i.test(file.name) ? "CPP" : /\.c$/i.test(file.name) ? "C" : language;
    session.replaceText(lang, text);
    setLanguage(lang);
  };

  // Jump to where another browser is working
  const goToPeer = (peer: Peer) => {
    if (!editor || !doc) return;
    if (peer.lang !== language) setLanguage(peer.lang);
    // After a language switch the editor is rebound on the next render
    requestAnimationFrame(() => {
      const r = peerRange(doc, peer);
      const model = editor.editor.getModel();
      if (!r || !model) return;
      const p = model.getPositionAt(r.head);
      editor.editor.revealLineInCenter(p.lineNumber);
      editor.editor.setPosition(p);
      editor.editor.focus();
    });
  };

  return (
    <div className="ws-right">
      <form action={action} className="ws-editor-pane card">
        <input type="hidden" name="problemId" value={problemId} />
        <input type="hidden" name="code" value={normalizeEol(code)} />
        <input type="hidden" name="language" value={language} />

        <div className="ws-toolbar">
          <div className="chip-list" role="radiogroup" aria-label="Language">
            {LANGS.map((l) => (
              <label key={l} className={`chip${language === l ? " on" : ""}`}>
                <input type="radio" name="language-choice" checked={language === l} onChange={() => setLanguage(l)} />
                {LANG_LABEL[l]}
              </label>
            ))}
          </div>
          <span
            className={`ws-sync ${status}`}
            role="status"
            title={status === "live" ? "Your code is saved and shared with your other open browsers" : undefined}
          >
            {STATUS_LABEL[status]}
          </span>
          <span className="spacer" />
          <label className="button secondary">
            Load file…
            <input type="file" accept=".c,.cpp,.cc,.cxx,.h" onChange={loadFile} hidden />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              if (session && window.confirm("Replace your code with the starter template?")) session.replaceText(language, TEMPLATES[language]);
            }}
          >
            Reset
          </button>
          <SubmitButton pendingText="Submitting…" disabled={judging}>
            {judging ? "Judging…" : "Submit"}
          </SubmitButton>
        </div>

        {peers.length > 0 && (
          <div className="ws-peers">
            <span className="muted">Also open on</span>
            {peers.map((p) => (
              <button key={p.client} type="button" className={`peer rc-${p.slot}`} onClick={() => goToPeer(p)} title="Go to their cursor">
                <i aria-hidden />
                <b>{p.label}</b>
                <span>{peerActivity(p, language, doc, editor?.editor)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="ws-editor">
          <Editor
            height="100%"
            defaultLanguage={language === "C" ? "c" : "cpp"}
            defaultValue={code}
            theme={dark ? "vs-dark" : "light"}
            onMount={(ed, monaco) => setEditor({ editor: ed, monaco })}
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

// "editing · line 12", "away · line 3" or "in C++17"
function peerActivity(peer: Peer, language: Lang, doc: Y.Doc | null, editor?: EditorInstance) {
  if (peer.lang !== language) return `in ${LANG_LABEL[peer.lang]}`;
  const r = doc && peerRange(doc, peer);
  const model = editor?.getModel();
  const line = r && model ? ` · line ${model.getPositionAt(r.head).lineNumber}` : "";
  return `${peer.focused ? "editing" : "away"}${line}`;
}
