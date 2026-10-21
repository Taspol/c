import Link from "next/link";
import { notFound } from "next/navigation";
import { AddTestCaseForm, EditProblemForm, UploadTestCasesForm } from "@/components/admin/forms";
import { ConfirmButton } from "@/components/ConfirmButton";
import { PageHead } from "@/components/PageHead";
import { deleteAllTestCases, deleteProblem, deleteTestCase, rejudgeProblem, toggleSample } from "@/lib/actions/admin";
import { db } from "@/lib/db";

const preview = (s: string) => (s.length > 48 ? s.slice(0, 48) + "…" : s).replace(/\n/g, "⏎ ");
const TABS = [
  { key: "details", label: "Details" },
  { key: "tests", label: "Test cases" },
  { key: "settings", label: "Settings" },
] as const;

export default async function EditProblemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ id }, { tab: tabParam }] = await Promise.all([params, searchParams]);
  const tab = TABS.some((t) => t.key === tabParam) ? tabParam : "details";
  const problem = await db.problem.findUnique({
    where: { id: Number(id) || 0 },
    include: { testCases: { orderBy: { id: "asc" } }, _count: { select: { submissions: true } } },
  });
  if (!problem) notFound();
  const total = problem.testCases.reduce((s, t) => s + t.points, 0);
  const counts: Record<string, number | null> = { details: null, tests: problem.testCases.length, settings: null };

  return (
    <>
      <PageHead
        title={problem.title}
        sub={
          <>
            <Link href="/admin">Manage</Link> / {problem.slug} · {problem.published ? "Published" : "Draft"}
          </>
        }
      >
        <Link href={`/problems/${problem.slug}`} className="button secondary">View as student</Link>
      </PageHead>

      <div className="page">
        <div className="tabs">
          {TABS.map((t) => (
            <Link key={t.key} href={`/admin/problems/${problem.id}?tab=${t.key}`} className={`tab${tab === t.key ? " active" : ""}`}>
              {t.label}
              {counts[t.key] !== null && <span className="tab-count">{counts[t.key]}</span>}
            </Link>
          ))}
        </div>

        {tab === "details" && <EditProblemForm problem={problem} />}

        {tab === "tests" && (
          <>
            {problem.testCases.length === 0 && (
              <div className="banner warn">No test cases yet. Submissions to this problem can&apos;t be judged until you add some.</div>
            )}
            <section className="card flush">
              <div className="card-head">
                <h2>Test cases</h2>
                <span className="muted">
                  {problem.testCases.length} tests · {total} points
                </span>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name</th>
                      <th>Input</th>
                      <th>Output</th>
                      <th className="num">Points</th>
                      <th>Example</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {problem.testCases.length === 0 && <tr><td colSpan={7} className="empty">Nothing here yet.</td></tr>}
                    {problem.testCases.map((t, i) => (
                      <tr key={t.id}>
                        <td className="muted">{i + 1}</td>
                        <td className="nowrap">{t.name}</td>
                        <td><code>{preview(t.input)}</code></td>
                        <td><code>{preview(t.output)}</code></td>
                        <td className="num">{t.points}</td>
                        <td>
                          <form action={toggleSample}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="link" type="submit" title="Toggle">
                              {t.isSample ? <span className="tag good">Shown</span> : <span className="tag neutral">Hidden</span>}
                            </button>
                          </form>
                        </td>
                        <td>
                          <form action={deleteTestCase}>
                            <input type="hidden" name="id" value={t.id} />
                            <button className="link danger-text" type="submit">Delete</button>
                          </form>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <UploadTestCasesForm problemId={problem.id} />
            <AddTestCaseForm problemId={problem.id} />
          </>
        )}

        {tab === "settings" && (
          <>
            <section className="card">
              <h2>Rejudge</h2>
              <p className="hint" style={{ margin: 0 }}>Run every submission to this problem again, for example after fixing a test case.</p>
              <div className="actions">
                <form action={rejudgeProblem}>
                  <input type="hidden" name="problemId" value={problem.id} />
                  <ConfirmButton className="secondary" message={`Rejudge all ${problem._count.submissions} submissions?`}>
                    Rejudge all submissions ({problem._count.submissions})
                  </ConfirmButton>
                </form>
              </div>
            </section>
            <section className="card">
              <h2>Danger zone</h2>
              <p className="hint" style={{ margin: 0 }}>These can&apos;t be undone.</p>
              <div className="actions">
                <form action={deleteAllTestCases}>
                  <input type="hidden" name="problemId" value={problem.id} />
                  <ConfirmButton className="danger" message="Delete ALL test cases of this problem?">Delete all test cases</ConfirmButton>
                </form>
                <form action={deleteProblem}>
                  <input type="hidden" name="id" value={problem.id} />
                  <ConfirmButton className="danger" message="Delete this problem, its tests and all its submissions?">Delete problem</ConfirmButton>
                </form>
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
