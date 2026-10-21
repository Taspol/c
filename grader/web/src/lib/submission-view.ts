import type { CurrentUser } from "./auth";
import { db } from "./db";
import type { SubmissionView } from "./submission-types";

const DETAIL_CHARS = 2000;

// A submission as the result panel shows it, or null if the user may not see it
export async function viewSubmission(id: number, user: CurrentUser): Promise<SubmissionView | null> {
  const isAdmin = user.role === "ADMIN";
  const sub = await db.submission.findUnique({
    where: { id },
    include: { results: { orderBy: { testCaseId: "asc" }, include: { testCase: true } } },
  });
  if (!sub || (sub.userId !== user.id && !isAdmin)) return null;

  const queueAhead = sub.status === "PENDING" ? await db.submission.count({ where: { status: "PENDING", id: { lt: sub.id } } }) : 0;
  const clip = (s: string) => (s.length > DETAIL_CHARS ? s.slice(0, DETAIL_CHARS) + "\n…" : s);

  return {
    id: sub.id,
    status: sub.status,
    verdict: sub.verdict,
    score: sub.score,
    maxScore: sub.maxScore,
    timeMs: sub.timeMs,
    language: sub.language,
    createdAt: sub.createdAt.toISOString(),
    compileOutput: sub.compileOutput,
    queueAhead,
    tests: sub.results.map((r, i) => ({
      n: i + 1,
      verdict: r.verdict,
      timeMs: r.timeMs,
      points: r.testCase.points,
      isSample: r.testCase.isSample,
      detail:
        r.verdict !== "AC" && (r.testCase.isSample || isAdmin)
          ? { input: clip(r.testCase.input), expected: clip(r.testCase.output), stdout: r.stdout ?? "", stderr: r.stderr ?? "" }
          : null,
    })),
  };
}
