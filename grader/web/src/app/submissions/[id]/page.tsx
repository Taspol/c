import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHead } from "@/components/PageHead";
import { Steps } from "@/components/Steps";
import { VERDICT_TONE, VerdictBadge } from "@/components/VerdictBadge";
import { rejudgeSubmission } from "@/lib/actions/admin";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, LANGUAGE_LABEL, VERDICT_LABEL } from "@/lib/format";

const mb = (kb: number) => `${Math.round((kb / 1024) * 10) / 10} MB`;

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const sub = await db.submission.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      problem: { select: { title: true, slug: true, timeLimitMs: true } },
      user: { select: { username: true } },
      results: { orderBy: { testCaseId: "asc" }, include: { testCase: true } },
    },
  });
  if (!sub || (sub.userId !== user.id && !isAdmin)) notFound();

  const done = sub.status === "DONE";
  const waiting = sub.status === "PENDING" ? await db.submission.count({ where: { status: "PENDING", id: { lt: sub.id } } }) : 0;
  const passed = sub.results.filter((r) => r.verdict === "AC").length;
  const failures = sub.results.filter((r) => r.verdict !== "AC" && (r.testCase.isSample || isAdmin));
  // The Docker sandbox doesn't measure memory, so only show the column when there's data
  const showMemory = sub.results.some((r) => r.memoryKb !== null);

  return (
    <>
      <AutoRefresh active={!done} />
      <PageHead
        title={`Submission #${sub.id}`}
        sub={
          <>
            <Link href={`/problems/${sub.problem.slug}`}>{sub.problem.title}</Link> · {LANGUAGE_LABEL[sub.language]} · {sub.user.username} · {formatDate(sub.createdAt)}
          </>
        }
      >
        {isAdmin && done && (
          <form action={rejudgeSubmission}>
            <input type="hidden" name="id" value={sub.id} />
            <button className="secondary" type="submit">Rejudge</button>
          </form>
        )}
        <Link href={`/problems/${sub.problem.slug}`} className="button">Back to problem</Link>
      </PageHead>

      <div className="page">
        <Steps
          steps={[
            { label: "Submitted", state: "done" },
            { label: "In queue", state: sub.status === "PENDING" ? "active" : "done" },
            { label: "Compile & run tests", state: sub.status === "JUDGING" ? "active" : done ? "done" : "todo" },
            { label: "Result", state: done ? "done" : "todo" },
          ]}
        />

        {!done ? (
          <section className="card waiting">
            <span className="spinner" aria-hidden />
            {sub.status === "PENDING"
              ? waiting > 0
                ? `Waiting in the queue: ${waiting} submission(s) ahead of yours…`
                : "Waiting for the judge to pick up your submission…"
              : "Compiling and running your code against the tests…"}
          </section>
        ) : (
          <section className="card">
            <div className="card-head">
              <h2>Result</h2>
              <span className="muted">{sub.results.length > 0 ? `${passed} of ${sub.results.length} tests passed` : ""}</span>
            </div>
            <div className="verdict-body">
              <div className="verdict-overall">
                <span className="verdict-score">
                  {sub.score}
                  <small>/ {sub.maxScore}</small>
                </span>
                {sub.verdict && (
                  <span className={`verdict-grade ${VERDICT_TONE[sub.verdict]}`}>
                    <b>{sub.verdict}</b> {VERDICT_LABEL[sub.verdict]}
                  </span>
                )}
              </div>
              <ul className="verdict-groups">
                <li>
                  <span className="g-label">Tests passed</span>
                  <span className="g-value">
                    {passed}
                    <small> / {sub.results.length}</small>
                  </span>
                  <span className="g-bar">
                    <i style={{ width: `${sub.results.length ? (passed / sub.results.length) * 100 : 0}%` }} />
                  </span>
                </li>
                <li>
                  <span className="g-label">Slowest test</span>
                  <span className="g-value">
                    {sub.timeMs ?? "—"}
                    <small> ms / {sub.problem.timeLimitMs} ms limit</small>
                  </span>
                  <span className="g-bar">
                    <i style={{ width: `${Math.min(100, ((sub.timeMs ?? 0) / sub.problem.timeLimitMs) * 100)}%` }} />
                  </span>
                </li>
              </ul>
            </div>
          </section>
        )}

        {(sub.verdict === "CE" || sub.verdict === "IE") && sub.compileOutput && (
          <section className="card">
            <h2>{sub.verdict === "CE" ? "Compiler output" : "Details"}</h2>
            <pre className="log wrap">{sub.compileOutput}</pre>
          </section>
        )}

        {sub.results.length > 0 && (
          <section className="card flush">
            <div className="card-head">
              <h2>Tests</h2>
              <span className="meter" title={`${passed} / ${sub.results.length} passed`}>
                {sub.results.map((r) => (
                  <i key={r.id} className={r.verdict === "AC" ? "on" : ""} />
                ))}
                <b>{passed} / {sub.results.length}</b>
              </span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Test</th>
                    <th style={{ width: "100%" }}>Result</th>
                    <th className="num">Time</th>
                    {showMemory && <th className="num">Memory</th>}
                    <th className="num">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {sub.results.map((r, i) => (
                    <tr key={r.id}>
                      <td className="nowrap">
                        {i + 1}
                        {r.testCase.isSample && <span className="muted"> · example</span>}
                      </td>
                      <td><VerdictBadge verdict={r.verdict} long /></td>
                      <td className="num">{r.timeMs !== null ? `${r.timeMs} ms` : "—"}</td>
                      {showMemory && <td className="num">{r.memoryKb !== null ? mb(r.memoryKb) : "—"}</td>}
                      <td className="num">{r.verdict === "AC" ? r.testCase.points : 0} <span className="muted">/ {r.testCase.points}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!isAdmin && sub.results.some((r) => r.verdict !== "AC" && !r.testCase.isSample) && (
              <p className="note" style={{ paddingTop: 12 }}>Hidden tests only show their result. Details are shown for failed example tests.</p>
            )}
          </section>
        )}

        {/* Students see details for example tests only; admins see every failing test */}
        {failures.map((r) => (
          <section key={r.id} className="card">
            <h2>
              Test {sub.results.indexOf(r) + 1} <VerdictBadge verdict={r.verdict} long />
            </h2>
            <div className="io">
              <div>
                <div className="io-label">Input</div>
                <pre className="log">{r.testCase.input.slice(0, 2000)}</pre>
              </div>
              <div>
                <div className="io-label">Expected output</div>
                <pre className="log">{r.testCase.output.slice(0, 2000)}</pre>
              </div>
            </div>
            <div className="io">
              <div>
                <div className="io-label">Your output</div>
                <pre className="log">{r.stdout || " "}</pre>
              </div>
              {r.stderr && (
                <div>
                  <div className="io-label">Error output</div>
                  <pre className="log">{r.stderr}</pre>
                </div>
              )}
            </div>
          </section>
        ))}

        <section className="card">
          <h2>Code</h2>
          <pre className="log">{sub.code}</pre>
        </section>
      </div>
    </>
  );
}
