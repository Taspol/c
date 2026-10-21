import type { Verdict } from "@prisma/client";
import { db } from "../lib/db";
import { outputsMatch } from "../lib/judge/compare";
import { DockerEngine } from "../lib/judge/docker";
import { LocalEngine } from "../lib/judge/local";
import type { JudgeEngine } from "../lib/judge/types";

const IDLE_POLL_MS = 1000;
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 1);
const STORED_OUTPUT_CHARS = 2000;

function createEngine(): JudgeEngine {
  const engine = process.env.JUDGE_ENGINE ?? "docker";
  if (engine === "local") {
    if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_JUDGE !== "1") {
      throw new Error("JUDGE_ENGINE=local runs code unsandboxed; refusing in production");
    }
    console.warn("[worker] using LOCAL engine: no sandbox, development only");
    return new LocalEngine();
  }
  if (engine !== "docker") throw new Error(`Unknown JUDGE_ENGINE "${engine}" (use "docker" or "local")`);
  return new DockerEngine();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clip = (s: string) => (s.length > STORED_OUTPUT_CHARS ? s.slice(0, STORED_OUTPUT_CHARS) + "\n…(truncated)" : s);

// Atomically move the oldest PENDING submission to JUDGING so that
// several workers never pick up the same one.
async function claimNext(): Promise<number | null> {
  const next = await db.submission.findFirst({ where: { status: "PENDING" }, orderBy: { id: "asc" }, select: { id: true } });
  if (!next) return null;
  const { count } = await db.submission.updateMany({
    where: { id: next.id, status: "PENDING" },
    data: { status: "JUDGING" },
  });
  return count === 1 ? next.id : null;
}

async function finish(submissionId: number, data: {
  verdict: Verdict;
  score: number;
  maxScore: number;
  compileOutput?: string | null;
  timeMs?: number | null;
  memoryKb?: number | null;
  results?: { testCaseId: number; verdict: Verdict; timeMs: number | null; memoryKb: number | null; stdout: string; stderr: string }[];
}) {
  await db.$transaction([
    db.testResult.deleteMany({ where: { submissionId } }),
    db.testResult.createMany({ data: (data.results ?? []).map((r) => ({ ...r, submissionId })) }),
    db.submission.update({
      where: { id: submissionId },
      data: {
        status: "DONE",
        verdict: data.verdict,
        score: data.score,
        maxScore: data.maxScore,
        compileOutput: data.compileOutput ?? null,
        timeMs: data.timeMs ?? null,
        memoryKb: data.memoryKb ?? null,
      },
    }),
  ]);
}

async function judgeSubmission(engine: JudgeEngine, submissionId: number) {
  const sub = await db.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: { problem: { include: { testCases: { orderBy: { id: "asc" } } } } },
  });
  const tests = sub.problem.testCases;
  const maxScore = tests.reduce((sum, t) => sum + t.points, 0);

  if (tests.length === 0) {
    await finish(sub.id, { verdict: "IE", score: 0, maxScore, compileOutput: "This problem has no test cases yet." });
    return;
  }

  const res = await engine.judge({
    language: sub.language,
    code: sub.code,
    timeLimitMs: sub.problem.timeLimitMs,
    memoryLimitKb: sub.problem.memoryLimitKb,
    tests: tests.map((t) => ({ id: t.id, input: t.input })),
  });

  if (res.compileError !== null) {
    await finish(sub.id, { verdict: "CE", score: 0, maxScore, compileOutput: clip(res.compileError) });
    return;
  }

  let score = 0;
  let overall: Verdict = "AC";
  const results = tests.map((t, i) => {
    const run = res.runs[i];
    const verdict: Verdict = run.verdict ?? (outputsMatch(run.stdout, t.output) ? "AC" : "WA");
    if (verdict === "AC") score += t.points;
    // The overall verdict is the first failing test's verdict
    else if (overall === "AC") overall = verdict;
    return {
      testCaseId: t.id,
      verdict,
      timeMs: run.timeMs,
      memoryKb: run.memoryKb,
      stdout: clip(run.stdout),
      stderr: clip(run.stderr),
    };
  });

  const max = (xs: (number | null)[]) => xs.reduce<number | null>((m, x) => (x === null ? m : Math.max(m ?? 0, x)), null);
  await finish(sub.id, {
    verdict: overall,
    score,
    maxScore,
    compileOutput: res.compileOutput ? clip(res.compileOutput) : null,
    timeMs: max(results.map((r) => r.timeMs)),
    memoryKb: max(results.map((r) => r.memoryKb)),
    results,
  });
}

async function loop(engine: JudgeEngine, n: number) {
  for (;;) {
    let id: number | null = null;
    try {
      id = await claimNext();
      if (id === null) {
        await sleep(IDLE_POLL_MS);
        continue;
      }
      const started = Date.now();
      await judgeSubmission(engine, id);
      console.log(`[worker ${n}] submission ${id} judged in ${Date.now() - started}ms`);
    } catch (err) {
      console.error(`[worker ${n}] submission ${id ?? "-"} failed:`, err);
      if (id !== null) {
        await finish(id, { verdict: "IE", score: 0, maxScore: 0, compileOutput: "Judge error, please ask an admin to rejudge." }).catch(() => {});
      }
      await sleep(IDLE_POLL_MS);
    }
  }
}

async function main() {
  const engine = createEngine();
  await engine.prepare?.();
  // Submissions left JUDGING by a crashed worker go back in the queue
  const { count } = await db.submission.updateMany({ where: { status: "JUDGING" }, data: { status: "PENDING" } });
  if (count) console.log(`[worker] requeued ${count} interrupted submission(s)`);
  console.log(`[worker] started with concurrency ${CONCURRENCY}`);
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => loop(engine, i + 1)));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
