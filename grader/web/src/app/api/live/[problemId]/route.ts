import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { LiveEvent } from "@/lib/live/protocol";
import { deviceLabel, join, receive } from "@/lib/live/rooms";

export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 20_000; // below nginx's default 60 s read timeout
const MAX_POST_BYTES = 512 * 1024;

async function access(params: Promise<{ problemId: string }>) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) };
  const problemId = Number((await params).problemId) || 0;
  const problem = await db.problem.findUnique({ where: { id: problemId }, select: { published: true } });
  if (!problem || (!problem.published && user.role !== "ADMIN")) {
    return { error: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { user, problemId };
}

// Server-Sent Events: the shared document, then every change from the
// user's other browsers on this problem
export async function GET(req: Request, { params }: { params: Promise<{ problemId: string }> }) {
  const a = await access(params);
  if (a.error) return a.error;
  const client = new URL(req.url).searchParams.get("client") ?? "";
  if (!/^[\w-]{8,64}$/.test(client)) return NextResponse.json({ error: "Bad client id" }, { status: 400 });

  const encoder = new TextEncoder();
  let leave: (() => void) | undefined;
  let heartbeat: NodeJS.Timeout | undefined;
  const stop = () => {
    clearInterval(heartbeat);
    leave?.();
    leave = undefined;
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop(); // the browser went away
        }
      };
      const send = (e: LiveEvent) => write(`data: ${JSON.stringify(e)}\n\n`);
      const close = () => {
        stop();
        try {
          controller.close();
        } catch {}
      };
      write("retry: 2000\n\n");
      leave = await join(a.user.id, a.problemId, { client, send, close }, deviceLabel(req.headers.get("user-agent")));
      heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);
      req.signal.addEventListener("abort", close);
    },
    cancel: stop,
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // tell nginx not to buffer the stream
    },
  });
}

const postSchema = z.object({
  client: z.string().regex(/^[\w-]{8,64}$/),
  docId: z.string().max(64),
  update: z.string().optional(),
  presence: z
    .object({
      lang: z.enum(["C", "CPP"]),
      anchor: z.unknown(),
      head: z.unknown(),
      focused: z.boolean(),
    })
    .optional(),
});

// An edit and/or a cursor move from one browser
export async function POST(req: Request, { params }: { params: Promise<{ problemId: string }> }) {
  const a = await access(params);
  if (a.error) return a.error;
  const body = await req.text();
  if (body.length > MAX_POST_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(body);
  } catch {}
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const result = await receive(a.user.id, a.problemId, parsed.data);
  if (result === "bad") return NextResponse.json({ error: "Bad update" }, { status: 400 });
  // stale/gone: the browser should wait for a fresh "init" on its stream
  if (result !== "ok") return NextResponse.json({ error: result }, { status: 409 });
  return NextResponse.json({ ok: true });
}
