import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { MAX_CODE_BYTES } from "@/lib/code-limits";
import { db } from "@/lib/db";

const draftSchema = z.object({
  problemId: z.number().int().positive(),
  language: z.enum(["C", "CPP"]),
  code: z.string().refine((c) => Buffer.byteLength(c) <= MAX_CODE_BYTES, "Code is larger than 64 KB"),
});

// The editor's autosave: keeps one draft per user, problem and language
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const parsed = draftSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { problemId, language, code } = parsed.data;

  const problem = await db.problem.findUnique({ where: { id: problemId }, select: { published: true } });
  if (!problem || (!problem.published && user.role !== "ADMIN")) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const draft = await db.draft.upsert({
    where: { userId_problemId_language: { userId: user.id, problemId, language } },
    create: { userId: user.id, problemId, language, code },
    update: { code },
  });
  return NextResponse.json({ savedAt: draft.updatedAt.getTime() });
}
