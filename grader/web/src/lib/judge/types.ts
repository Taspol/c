import type { Language, Verdict } from "@prisma/client";

export type JudgeTest = {
  id: number;
  input: string;
};

export type JudgeRequest = {
  language: Language;
  code: string;
  timeLimitMs: number;
  memoryLimitKb: number;
  tests: JudgeTest[];
};

// Raw run result of one test, before comparing with the expected output.
// verdict is null when the program ran to completion and needs comparing.
export type RunResult = {
  testId: number;
  verdict: Exclude<Verdict, "AC" | "WA"> | null;
  stdout: string;
  stderr: string;
  timeMs: number | null;
  memoryKb: number | null;
};

export type JudgeResponse =
  | { compileError: string }
  | { compileError: null; compileOutput: string; runs: RunResult[] };

export interface JudgeEngine {
  // One-time setup when the worker starts
  prepare?(): Promise<void>;
  judge(req: JudgeRequest): Promise<JudgeResponse>;
}
