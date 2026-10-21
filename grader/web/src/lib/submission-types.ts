import type { Language, SubmissionStatus, Verdict } from "@prisma/client";

// Shapes shared by the server and the result panel in the browser; keep this
// file free of server-only imports such as the database client.

export type TestView = {
  n: number;
  verdict: Verdict;
  timeMs: number | null;
  points: number;
  isSample: boolean;
  // Only for failed tests the viewer may see: examples, or any test for admins
  detail: { input: string; expected: string; stdout: string; stderr: string } | null;
};

export type SubmissionView = {
  id: number;
  status: SubmissionStatus;
  verdict: Verdict | null;
  score: number;
  maxScore: number;
  timeMs: number | null;
  language: Language;
  createdAt: string;
  compileOutput: string | null;
  queueAhead: number;
  tests: TestView[];
};

export type HistoryItem = Pick<SubmissionView, "id" | "status" | "verdict" | "score" | "maxScore" | "language" | "createdAt">;

export function toHistoryItem(s: { id: number; status: SubmissionStatus; verdict: Verdict | null; score: number; maxScore: number; language: Language; createdAt: Date | string }): HistoryItem {
  return {
    id: s.id,
    status: s.status,
    verdict: s.verdict,
    score: s.score,
    maxScore: s.maxScore,
    language: s.language,
    createdAt: typeof s.createdAt === "string" ? s.createdAt : s.createdAt.toISOString(),
  };
}
