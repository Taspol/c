// Live editing: every browser a user has open on one problem shares a Yjs
// document (one Y.Text per language). Rooms live in this process's memory;
// the text is saved to the Draft table, so a restart only rebuilds the room.
import { randomUUID } from "node:crypto";
import * as Y from "yjs";
import { db } from "../db";
import { LANGS, TEMPLATES, type Lang } from "../templates";
import { fromBase64, toBase64, type LiveEvent, type Peer, type Presence } from "./protocol";

const SAVE_DELAY_MS = 1000;
const CLOSE_AFTER_MS = 60_000; // keep an empty room a while, for quick reconnects
const SLOTS = 6; // cursor colours

type Subscriber = { client: string; send: (e: LiveEvent) => void; close: () => void };

type Room = {
  key: string;
  userId: number;
  problemId: number;
  docId: string;
  doc: Y.Doc;
  subscribers: Map<string, Subscriber>;
  labels: Map<string, string>; // device label per open browser
  peers: Map<string, Peer>; // browsers that have reported a cursor
  saved: Record<Lang, string>;
  saveTimer?: NodeJS.Timeout;
  closeTimer?: NodeJS.Timeout;
};

// On globalThis so every route and server action in this process shares them
const g = globalThis as unknown as { liveRooms?: Map<string, Promise<Room>>; liveShutdown?: boolean };
const rooms = (g.liveRooms ??= new Map());

// On shutdown, save every draft and end the open streams. Otherwise the
// server waits for them to finish (they never do), and browsers only notice
// the restart once Docker kills the old container.
if (!g.liveShutdown) {
  g.liveShutdown = true;
  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.once(signal, async () => {
      for (const p of rooms.values()) {
        const room = await p.catch(() => null);
        if (!room) continue;
        await save(room);
        for (const s of room.subscribers.values()) s.close();
      }
    });
  }
}

const roomKey = (userId: number, problemId: number) => `${userId}:${problemId}`;

async function createRoom(userId: number, problemId: number): Promise<Room> {
  const [drafts, subs] = await Promise.all([
    db.draft.findMany({ where: { userId, problemId } }),
    db.submission.findMany({
      where: { userId, problemId },
      orderBy: { id: "desc" },
      take: 20,
      select: { language: true, code: true, createdAt: true },
    }),
  ]);
  const doc = new Y.Doc();
  const saved = {} as Record<Lang, string>;
  for (const lang of LANGS) {
    // The newer of the saved draft and the last submission, else the template
    const draft = drafts.find((d) => d.language === lang);
    const sub = subs.find((s) => s.language === lang);
    const text =
      draft && (!sub || draft.updatedAt >= sub.createdAt) ? draft.code : sub ? sub.code : TEMPLATES[lang];
    doc.getText(lang).insert(0, text.replace(/\r\n?/g, "\n"));
    saved[lang] = draft?.code ?? "";
  }
  const room: Room = {
    key: roomKey(userId, problemId),
    userId,
    problemId,
    docId: randomUUID(),
    doc,
    subscribers: new Map(),
    labels: new Map(),
    peers: new Map(),
    saved,
  };
  doc.on("update", () => scheduleSave(room));
  return room;
}

function getRoom(userId: number, problemId: number): Promise<Room> {
  const key = roomKey(userId, problemId);
  let room = rooms.get(key);
  if (!room) {
    room = createRoom(userId, problemId);
    rooms.set(key, room);
    room.catch(() => rooms.delete(key));
  }
  return room;
}

function scheduleSave(room: Room) {
  clearTimeout(room.saveTimer);
  room.saveTimer = setTimeout(() => void save(room), SAVE_DELAY_MS);
}

async function save(room: Room) {
  clearTimeout(room.saveTimer);
  for (const lang of LANGS) {
    const code = room.doc.getText(lang).toString();
    if (code === room.saved[lang]) continue;
    room.saved[lang] = code;
    const where = { userId_problemId_language: { userId: room.userId, problemId: room.problemId, language: lang } };
    await db.draft
      .upsert({ where, create: { userId: room.userId, problemId: room.problemId, language: lang, code }, update: { code } })
      .catch((err) => console.error("[live] saving draft failed:", err));
  }
}

function broadcast(room: Room, event: LiveEvent, except?: string) {
  for (const s of room.subscribers.values()) if (s.client !== except) s.send(event);
}

function freeSlot(room: Room) {
  const used = new Set([...room.peers.values()].map((p) => p.slot));
  for (let i = 0; i < SLOTS; i++) if (!used.has(i)) return i;
  return room.peers.size % SLOTS;
}

// "Chrome · Windows" from a User-Agent header, to tell computers apart
export function deviceLabel(ua: string | null): string {
  const s = ua ?? "";
  const browser = /Edg\//.test(s) ? "Edge" : /Firefox\//.test(s) ? "Firefox" : /Chrome\//.test(s) ? "Chrome" : /Safari\//.test(s) ? "Safari" : "Browser";
  const os = /Windows/.test(s)
    ? "Windows"
    : /iPhone|iPad/.test(s)
      ? "iOS"
      : /Android/.test(s)
        ? "Android"
        : /Mac OS X|Macintosh/.test(s)
          ? "Mac"
          : /Linux|CrOS/.test(s)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

// A browser opened the live stream. Returns a function to call when it closes.
export async function join(userId: number, problemId: number, sub: Subscriber, label: string) {
  const room = await getRoom(userId, problemId);
  clearTimeout(room.closeTimer);
  room.subscribers.set(sub.client, sub);
  room.labels.set(sub.client, label);
  sub.send({
    type: "init",
    docId: room.docId,
    state: toBase64(Y.encodeStateAsUpdate(room.doc)),
    peers: [...room.peers.values()].filter((p) => p.client !== sub.client),
  });

  return () => {
    if (room.subscribers.get(sub.client) !== sub) return; // replaced by a reconnect
    room.subscribers.delete(sub.client);
    room.labels.delete(sub.client);
    if (room.peers.delete(sub.client)) broadcast(room, { type: "leave", client: sub.client });
    if (room.subscribers.size === 0) {
      room.closeTimer = setTimeout(async () => {
        if (room.subscribers.size > 0) return;
        await save(room);
        rooms.delete(room.key);
        room.doc.destroy();
      }, CLOSE_AFTER_MS);
    }
  };
}
export type PostResult = "ok" | "stale" | "gone" | "bad";

// An edit and/or cursor move from one browser
export async function receive(
  userId: number,
  problemId: number,
  msg: { client: string; docId: string; update?: string; presence?: Presence },
): Promise<PostResult> {
  const room = await rooms.get(roomKey(userId, problemId));
  if (!room) return "gone";
  if (room.docId !== msg.docId) return "stale";

  if (msg.update) {
    try {
      Y.applyUpdate(room.doc, fromBase64(msg.update), msg.client);
    } catch {
      return "bad";
    }
    broadcast(room, { type: "update", update: msg.update }, msg.client);
  }
  if (msg.presence) {
    const prev = room.peers.get(msg.client);
    const peer: Peer = {
      ...msg.presence,
      client: msg.client,
      label: room.labels.get(msg.client) ?? prev?.label ?? "Browser",
      slot: prev?.slot ?? freeSlot(room),
    };
    room.peers.set(msg.client, peer);
    broadcast(room, { type: "presence", peer }, msg.client);
  }
  return "ok";
}

// Tell every open editor of this user on this problem about a new submission
export async function announceSubmission(userId: number, problemId: number, id: number, language: Lang) {
  const room = await rooms.get(roomKey(userId, problemId));
  if (room) broadcast(room, { type: "submission", id, language });
}
