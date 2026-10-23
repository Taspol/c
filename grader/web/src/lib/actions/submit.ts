"use server";

import { requireUser } from "../auth";
import { MAX_CODE_BYTES } from "../code-limits";
import { db } from "../db";

export type SubmitState = { error?: string; submissionId?: number } | undefined;

// Returns the new submission's id; the problem page shows its result in place
export async function submitCode(_: SubmitState, form: FormData): Promise<SubmitState> {
  const user = await requireUser();
  const problemId = Number(form.get("problemId"));
  const language = form.get("language");
  const code = String(form.get("code") ?? "");

  if (language !== "C" && language !== "CPP") return { error: "Choose C or C++" };
  if (!code.trim()) return { error: "Your code is empty" };
  if (Buffer.byteLength(code) > MAX_CODE_BYTES) return { error: "Code is larger than 64 KB" };

  const problem = await db.problem.findUnique({ where: { id: problemId } });
  if (!problem || (!problem.published && user.role !== "ADMIN")) return { error: "Problem not found" };

  // One submission in the queue per user keeps the judge fair under load
  const waiting = await db.submission.count({ where: { userId: user.id, status: { in: ["PENDING", "JUDGING"] } } });
  if (waiting > 0) return { error: "Please wait for your previous submission to finish" };

  const sub = await db.submission.create({ data: { userId: user.id, problemId, language, code } });
  return { submissionId: sub.id };
}
