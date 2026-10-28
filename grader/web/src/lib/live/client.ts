// Browser side of live editing: keeps a Yjs document in step with the
// server over Server-Sent Events, and binds it to the Monaco editor.
import type { Monaco, OnMount } from "@monaco-editor/react";
import * as Y from "yjs";
import { LANGS, type Lang } from "../templates";
import { fromBase64, textDiff, toBase64, type LiveEvent, type Peer, type Presence } from "./protocol";

type Editor = Parameters<OnMount>[0];
export type LiveStatus = "connecting" | "live" | "offline";

const REMOTE = "remote"; // origin of changes that came from the server
const SEND_DELAY_MS = 30;
const RETRY_MS = 2000;

// Unix line endings everywhere, so text offsets match between browsers
export const normalizeEol = (s: string) => s.replace(/\r\n?/g, "\n");

export class LiveSession {
  readonly client = crypto.randomUUID();
  doc = new Y.Doc();
  docId: string | null = null; // null until the server's document arrives
  peers = new Map<string, Peer>();

  private source?: EventSource;
  private queue: Uint8Array[] = [];
  private presence: Presence | null = null;
  private presenceDirty = false;
  private dirty = false; // local edits the server hasn't confirmed
  private sending = false;
  private timer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private stopped = false;

  constructor(
    private problemId: number,
    initial: Record<Lang, string>,
    private on: {
      doc: (doc: Y.Doc) => void; // the document was replaced
      status: (s: LiveStatus) => void;
      peers: (peers: Peer[]) => void;
      submission: (id: number, language: Lang) => void;
    },
  ) {
    // Editable right away; merged into the server's copy once connected
    for (const lang of LANGS) this.doc.getText(lang).insert(0, normalizeEol(initial[lang]));
    this.watch(this.doc);
  }

  start() {
    this.on.status("connecting");
    this.connect();
  }

  stop() {
    this.stopped = true;
    this.source?.close();
    clearTimeout(this.timer);
    clearTimeout(this.reconnectTimer);
    this.flush(true);
  }

  // Replace a language's whole text (Reset, Load file) as one small edit
  replaceText(lang: Lang, text: string) {
    const ytext = this.doc.getText(lang);
    const d = textDiff(ytext.toString(), normalizeEol(text));
    this.doc.transact(() => {
      if (d.remove) ytext.delete(d.index, d.remove);
      if (d.insert) ytext.insert(d.index, d.insert);
    });
  }

  setPresence(p: Presence) {
    this.presence = p;
    this.presenceDirty = true;
    this.schedule();
  }

  private watch(doc: Y.Doc) {
    doc.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === REMOTE || doc !== this.doc) return;
      this.dirty = true;
      this.queue.push(update);
      this.schedule();
    });
  }

  private connect() {
    this.source?.close();
    const source = new EventSource(`/api/live/${this.problemId}?client=${this.client}`);
    this.source = source;
    source.onmessage = (e) => {
      try {
        this.handle(JSON.parse(e.data) as LiveEvent);
      } catch (err) {
        console.error("[live] could not apply a message:", err);
      }
    };
    source.onerror = () => {
      this.on.status("offline");
      // The browser retries by itself unless the server refused (e.g. logged out)
      if (source.readyState === EventSource.CLOSED && !this.stopped) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.connect(), RETRY_MS * 3);
      }
    };
  }

  private handle(e: LiveEvent) {
    switch (e.type) {
      case "init":
        this.init(e.docId, fromBase64(e.state));
        this.peers = new Map(e.peers.map((p) => [p.client, p]));
        this.on.peers([...this.peers.values()]);
        this.on.status("live");
        break;
      case "update":
        Y.applyUpdate(this.doc, fromBase64(e.update), REMOTE);
        break;
      case "presence":
        this.peers.set(e.peer.client, e.peer);
        this.on.peers([...this.peers.values()]);
        break;
      case "leave":
        this.peers.delete(e.client);
        this.on.peers([...this.peers.values()]);
        break;
      case "submission":
        this.on.submission(e.id, e.language);
        break;
    }
  }

  private init(docId: string, state: Uint8Array) {
    this.queue = [];
    if (docId === this.docId) {
      // Reconnected to the same document: merge, then send what it's missing
      Y.applyUpdate(this.doc, state, REMOTE);
      const missing = Y.encodeStateAsUpdate(this.doc, Y.encodeStateVectorFromUpdate(state));
      if (this.dirty) this.queue.push(missing);
    } else {
      // A new document (first connect, or the server restarted). Take it, and
      // if this browser has unsent edits, apply them on top as a text change.
      const old = this.doc;
      const doc = new Y.Doc();
      Y.applyUpdate(doc, state, REMOTE);
      this.doc = doc;
      this.docId = docId;
      this.watch(doc);
      if (this.dirty) for (const lang of LANGS) this.replaceText(lang, old.getText(lang).toString());
      old.destroy();
      this.on.doc(doc);
    }
    this.presenceDirty = this.presence !== null;
    this.schedule();
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), SEND_DELAY_MS);
  }

  private flush(closing = false) {
    if (!this.docId || this.sending) return;
    if (this.queue.length === 0 && !this.presenceDirty) {
      this.dirty = false;
      return;
    }
    const updates = this.queue;
    const update = updates.length ? Y.mergeUpdates(updates) : undefined;
    const presence = this.presenceDirty && this.presence ? this.presence : undefined;
    this.queue = [];
    this.presenceDirty = false;
    this.sending = true;
    const docId = this.docId;
    fetch(`/api/live/${this.problemId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: this.client, docId, update: update && toBase64(update), presence }),
      keepalive: closing,
    })
      .then((res) => {
        this.sending = false;
        // 409: the server has a different document now; the next "init" sorts it out
        if (!res.ok && res.status !== 409) throw new Error(`Error ${res.status}`);
        if (res.ok && this.source?.readyState === EventSource.OPEN) this.on.status("live");
        this.flush();
      })
      .catch(() => {
        this.sending = false;
        if (this.stopped || docId !== this.docId) return;
        // Keep the edits and try again
        if (update) this.queue.unshift(update);
        if (presence) this.presenceDirty = true;
        this.on.status("offline");
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.flush(), RETRY_MS);
      });
  }
}

// Keeps a Monaco editor and one language's Y.Text the same, both ways
export function bindEditor(editor: Editor, monaco: Monaco, doc: Y.Doc, lang: Lang, onText: (text: string) => void) {
  const model = editor.getModel();
  if (!model) return () => {};
  const ytext = doc.getText(lang);
  const LOCAL = {}; // origin of edits typed in this editor
  let muted = false;

  model.setEOL(monaco.editor.EndOfLineSequence.LF);
  monaco.editor.setModelLanguage(model, lang === "C" ? "c" : "cpp");
  if (model.getValue() !== ytext.toString()) {
    muted = true;
    model.setValue(ytext.toString());
    muted = false;
  }
  onText(model.getValue());

  const typed = model.onDidChangeContent((e) => {
    onText(model.getValue());
    if (muted) return;
    doc.transact(() => {
      // Apply from the end so earlier offsets stay valid
      for (const c of [...e.changes].sort((a, b) => b.rangeOffset - a.rangeOffset)) {
        if (c.rangeLength) ytext.delete(c.rangeOffset, c.rangeLength);
        if (c.text) ytext.insert(c.rangeOffset, c.text);
      }
    }, LOCAL);
  });

  // Remember this editor's selections as positions in the text, so remote
  // edits don't move the cursor away from where the student was typing
  let saved: { anchor: Y.RelativePosition; head: Y.RelativePosition }[] | null = null;
  const beforeChange = (tr: Y.Transaction) => {
    if (tr.origin === LOCAL) return;
    saved = (editor.getSelections() ?? []).map((s) => ({
      anchor: Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(s.getSelectionStart())),
      head: Y.createRelativePositionFromTypeIndex(ytext, model.getOffsetAt(s.getPosition())),
    }));
  };
  doc.on("beforeTransaction", beforeChange);

  const observer = (event: Y.YTextEvent, tr: Y.Transaction) => {
    if (tr.origin === LOCAL) return;
    muted = true;
    let index = 0;
    for (const op of event.delta) {
      if (op.retain) index += op.retain;
      else if (typeof op.insert === "string") {
        const p = model.getPositionAt(index);
        model.applyEdits([{ range: new monaco.Range(p.lineNumber, p.column, p.lineNumber, p.column), text: op.insert }]);
        index += op.insert.length;
      } else if (op.delete) {
        const a = model.getPositionAt(index);
        const b = model.getPositionAt(index + op.delete);
        model.applyEdits([{ range: new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column), text: "" }]);
      }
    }
    muted = false;
    if (saved) {
      const sel = saved.map(({ anchor, head }) => {
        const a = model.getPositionAt(Y.createAbsolutePositionFromRelativePosition(anchor, doc)?.index ?? 0);
        const h = model.getPositionAt(Y.createAbsolutePositionFromRelativePosition(head, doc)?.index ?? 0);
        return new monaco.Selection(a.lineNumber, a.column, h.lineNumber, h.column);
      });
      if (sel.length) editor.setSelections(sel);
      saved = null;
    }
    onText(model.getValue());
  };
  ytext.observe(observer);

  return () => {
    typed.dispose();
    doc.off("beforeTransaction", beforeChange);
    ytext.unobserve(observer);
  };
}

// This editor's cursor, as a Presence to send to the other browsers
export function cursorPresence(editor: Editor, doc: Y.Doc, lang: Lang, focused: boolean): Presence {
  const model = editor.getModel();
  const sel = editor.getSelection();
  const ytext = doc.getText(lang);
  const rel = (offset: number) => Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(ytext, offset));
  if (!model || !sel) return { lang, focused };
  return {
    lang,
    focused,
    anchor: rel(model.getOffsetAt(sel.getSelectionStart())),
    head: rel(model.getOffsetAt(sel.getPosition())),
  };
}

// Where a peer's cursor is now, as text offsets (null if not in this text)
export function peerRange(doc: Y.Doc, peer: Peer) {
  const abs = (json: unknown) =>
    json == null
      ? null
      : (Y.createAbsolutePositionFromRelativePosition(Y.createRelativePositionFromJSON(json), doc)?.index ?? null);
  const anchor = abs(peer.anchor);
  const head = abs(peer.head);
  return anchor === null || head === null ? null : { anchor, head };
}

// Draws other browsers' cursors and selections in the editor
export function peerDecorations(editor: Editor, monaco: Monaco, doc: Y.Doc, lang: Lang, peers: Peer[]) {
  const model = editor.getModel();
  if (!model) return [];
  const list = [];
  for (const peer of peers) {
    if (peer.lang !== lang) continue;
    const r = peerRange(doc, peer);
    if (!r) continue;
    const cls = `rc-${peer.slot}${peer.focused ? "" : " rc-idle"}`;
    const h = model.getPositionAt(r.head);
    if (r.anchor !== r.head) {
      const a = model.getPositionAt(Math.min(r.anchor, r.head));
      const b = model.getPositionAt(Math.max(r.anchor, r.head));
      list.push({
        range: new monaco.Range(a.lineNumber, a.column, b.lineNumber, b.column),
        options: { className: `rc-sel ${cls}`, hoverMessage: { value: peer.label } },
      });
    }
    list.push({
      range: new monaco.Range(h.lineNumber, h.column, h.lineNumber, h.column),
      options: { beforeContentClassName: `rc-caret ${cls}`, hoverMessage: { value: peer.label }, stickiness: 1 },
    });
  }
  return list;
}
