// Messages between the editor and /api/live/[problemId]. Browser-safe.
import type { Lang } from "../templates";

// Where one open editor is: its language and Yjs relative positions
// (JSON) of the selection, so they stay put while the text changes
export type Presence = {
  lang: Lang;
  anchor?: unknown;
  head?: unknown;
  focused: boolean;
};

export type Peer = Presence & { client: string; label: string; slot: number };

// Server → browser, over Server-Sent Events
export type LiveEvent =
  // docId changes when the server rebuilds the document (e.g. after a restart)
  | { type: "init"; docId: string; state: string; peers: Peer[] }
  | { type: "update"; update: string }
  | { type: "presence"; peer: Peer }
  | { type: "leave"; client: string }
  | { type: "submission"; id: number; language: Lang };

// Browser → server
export type LivePost = { client: string; docId: string; update?: string; presence?: Presence };

export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

// The smallest single edit that turns `from` into `to`
export function textDiff(from: string, to: string) {
  let start = 0;
  while (start < from.length && start < to.length && from[start] === to[start]) start++;
  let end = 0;
  while (end < from.length - start && end < to.length - start && from[from.length - 1 - end] === to[to.length - 1 - end]) end++;
  return { index: start, remove: from.length - start - end, insert: to.slice(start, to.length - end) };
}
