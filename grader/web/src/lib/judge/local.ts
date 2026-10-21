import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { JudgeEngine, JudgeRequest, JudgeResponse, RunResult } from "./types";

// DEVELOPMENT ONLY: compiles and runs code directly on this machine with
// no sandbox and no memory limit. Never use it on a server that accepts
// code from other people; use the docker engine there.

const MAX_OUTPUT_BYTES = 1 << 20;

type ProcResult = { code: number | null; signal: NodeJS.Signals | null; stdout: string; stderr: string; timedOut: boolean; ms: number };

function run(cmd: string, args: string[], opts: { cwd: string; input?: string; timeoutMs: number }): Promise<ProcResult> {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(cmd, args, { cwd: opts.cwd });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, opts.timeoutMs);
    child.stdout.on("data", (d) => {
      if (stdout.length < MAX_OUTPUT_BYTES) stdout += d;
    });
    child.stderr.on("data", (d) => {
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += d;
    });
    child.on("error", reject);
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut, ms: Date.now() - started });
    });
    // The program may exit without reading all of stdin
    child.stdin.on("error", () => {});
    child.stdin.end(opts.input ?? "");
  });
}

export class LocalEngine implements JudgeEngine {
  async judge(req: JudgeRequest): Promise<JudgeResponse> {
    const dir = await mkdtemp(path.join(tmpdir(), "grader-"));
    try {
      const src = req.language === "C" ? "main.c" : "main.cpp";
      await writeFile(path.join(dir, src), req.code);
      const compile =
        req.language === "C"
          ? run("gcc", ["-O2", src, "-o", "main", "-lm"], { cwd: dir, timeoutMs: 30_000 })
          : run("g++", ["-O2", "-std=c++17", src, "-o", "main"], { cwd: dir, timeoutMs: 30_000 });
      const c = await compile;
      if (c.code !== 0) return { compileError: c.stderr || c.stdout || "Compilation failed" };

      const runs: RunResult[] = [];
      for (const t of req.tests) {
        // Wall clock only, so allow some slack over the CPU limit
        const r = await run(path.join(dir, "main"), [], { cwd: dir, input: t.input, timeoutMs: req.timeLimitMs * 2 });
        let verdict: RunResult["verdict"] = null;
        if (r.timedOut || r.ms > req.timeLimitMs) verdict = "TLE";
        else if (r.code !== 0) verdict = "RE";
        runs.push({ testId: t.id, verdict, stdout: r.stdout, stderr: r.stderr, timeMs: r.ms, memoryKb: null });
      }
      return { compileError: null, compileOutput: c.stderr, runs };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}
