import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import type { Language } from "@prisma/client";
import type { JudgeEngine, JudgeRequest, JudgeResponse, RunResult } from "./types";

// Each submission gets its own throwaway container from the official gcc
// image: no network, no capabilities, read-only filesystem except a small
// tmpfs, an unprivileged user, and limits on CPU, memory, processes and
// file size. The container is removed as soon as judging finishes.

const IMAGE = process.env.JUDGE_IMAGE ?? "gcc:14";
const LABEL = "grader=sandbox";
const COMPILE_MEMORY = "512m";
const COMPILE_TIMEOUT_SECONDS = 30;
const MAX_OUTPUT_BYTES = 1 << 20;

const SOURCE: Record<Language, string> = { C: "main.c", CPP: "main.cpp" };
const COMPILE: Record<Language, string[]> = {
  C: ["gcc", "-O2", "-std=gnu11", "main.c", "-o", "main", "-lm"],
  CPP: ["g++", "-O2", "-std=gnu++17", "main.cpp", "-o", "main"],
};

// Runs ./main under a time limit and reports its exit code and wall time on
// the last line of stderr, so one `docker exec` per test is enough. When the
// program crashes, bash also writes "Segmentation fault" etc. into .time,
// before the timing, so only its last line is the time.
const RUN_SCRIPT = `TIMEFORMAT=%R
{ time timeout -k 1 "$1" ./main 2>&3; } 3>&2 2>.time
code=$?
printf '\\n@@grader %s %s\\n' "$code" "$(tail -n 1 .time)" >&2`;
const MARKER = /\n@@grader (\d+) ([\d.]+)\n$/;

type DockerResult = { code: number | null; stdout: string; stderr: string; stderrTail: string };

function docker(args: string[], opts: { input?: string; timeoutMs?: number } = {}): Promise<DockerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args);
    const out: Buffer[] = [];
    let outBytes = 0;
    let stderr = "";
    let stderrTail = "";
    const timer = opts.timeoutMs ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs) : undefined;

    child.stdout.on("data", (d: Buffer) => {
      // Keep reading past the cap so the program doesn't block on a full pipe
      if (outBytes < MAX_OUTPUT_BYTES) out.push(d);
      outBytes += d.length;
    });
    child.stderr.on("data", (d: Buffer) => {
      const s = d.toString("utf8");
      if (stderr.length < MAX_OUTPUT_BYTES) stderr += s;
      stderrTail = (stderrTail + s).slice(-256);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout: Buffer.concat(out).toString("utf8"), stderr, stderrTail });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(opts.input ?? "");
  });
}

async function dockerOk(args: string[], opts?: { input?: string; timeoutMs?: number }) {
  const r = await docker(args, opts);
  if (r.code !== 0) throw new Error(`docker ${args[0]} failed: ${r.stderr.trim()}`);
  return r;
}

export class DockerEngine implements JudgeEngine {
  // Pull the compiler image and remove containers left by a crashed worker
  async prepare() {
    if ((await docker(["image", "inspect", IMAGE])).code !== 0) {
      console.log(`[docker] pulling ${IMAGE} (first run only, may take a few minutes)`);
      await dockerOk(["pull", IMAGE]);
    }
    const stale = (await dockerOk(["ps", "-aq", "--filter", `label=${LABEL}`])).stdout.split("\n").filter(Boolean);
    if (stale.length) await docker(["rm", "-f", ...stale]);
  }

  async judge(req: JudgeRequest): Promise<JudgeResponse> {
    const name = `grader-${randomBytes(6).toString("hex")}`;
    await dockerOk([
      "create", "--name", name, "--label", LABEL,
      "--network", "none",
      "--cpus", "1",
      "--memory", COMPILE_MEMORY, "--memory-swap", COMPILE_MEMORY,
      "--pids-limit", "64",
      "--ulimit", "nofile=64",
      "--ulimit", "core=0",
      "--ulimit", `fsize=${16 << 20}`,
      "--cap-drop", "ALL",
      "--security-opt", "no-new-privileges",
      "--read-only",
      "--tmpfs", "/box:rw,exec,nosuid,size=64m,mode=1777",
      "--workdir", "/box",
      "--env", "TMPDIR=/box",
      "--user", "65534:65534",
      IMAGE, "sleep", "infinity",
    ]);

    try {
      await dockerOk(["start", name]);
      await dockerOk(["exec", "-i", name, "sh", "-c", `cat > ${SOURCE[req.language]}`], { input: req.code });

      const compile = await docker(["exec", name, "timeout", String(COMPILE_TIMEOUT_SECONDS), ...COMPILE[req.language]]);
      if (compile.code !== 0) {
        return { compileError: compile.code === 124 ? "Compilation took too long" : compile.stderr || "Compilation failed" };
      }

      // Compiling needs more memory than most programs are allowed, so the
      // problem's limit is applied only now
      const limit = `${req.memoryLimitKb}k`;
      await dockerOk(["update", "--memory", limit, "--memory-swap", limit, name]);

      const seconds = (req.timeLimitMs / 1000).toFixed(3);
      const runs: RunResult[] = [];
      for (const t of req.tests) {
        const r = await docker(["exec", "-i", name, "bash", "-c", RUN_SCRIPT, "_", seconds], {
          input: t.input,
          timeoutMs: req.timeLimitMs * 2 + 10_000,
        });
        const m = r.stderrTail.match(MARKER);
        if (!m) throw new Error(`sandbox run failed: ${r.stderr.trim().slice(-500)}`);

        const code = Number(m[1]);
        const timeMs = Math.round(parseFloat(m[2]) * 1000);
        let verdict: RunResult["verdict"] = null;
        // timeout exits 124; 137 is SIGKILL, from timeout -k or the OOM killer
        if (code === 124 || timeMs > req.timeLimitMs) verdict = "TLE";
        else if (code === 137) verdict = "MLE";
        else if (code !== 0) verdict = "RE";

        runs.push({
          testId: t.id,
          verdict,
          stdout: r.stdout,
          stderr: r.stderr.replace(MARKER, ""),
          timeMs,
          memoryKb: null,
        });
      }
      return { compileError: null, compileOutput: compile.stderr, runs };
    } finally {
      await docker(["rm", "-f", name]);
    }
  }
}
