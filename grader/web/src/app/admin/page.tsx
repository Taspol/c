import Link from "next/link";
import { CreateProblemForm } from "@/components/admin/forms";
import { PageHead } from "@/components/PageHead";
import { moveProblem } from "@/lib/actions/admin";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const [problems, queue, users, submissions] = await Promise.all([
    db.problem.findMany({
      orderBy: [{ position: "asc" }, { id: "asc" }],
      include: { _count: { select: { testCases: true, submissions: true } } },
    }),
    db.submission.count({ where: { status: { in: ["PENDING", "JUDGING"] } } }),
    db.user.count({ where: { role: "STUDENT" } }),
    db.submission.count(),
  ]);

  return (
    <>
      <PageHead title="Manage" sub="Create problems, add test cases and publish them to students." />
      <div className="page">
        <section className="card">
          <dl className="profile">
            <div><dt>Problems</dt><dd>{problems.length} ({problems.filter((p) => p.published).length} published)</dd></div>
            <div><dt>Students</dt><dd>{users}</dd></div>
            <div><dt>Submissions</dt><dd>{submissions}</dd></div>
            <div>
              <dt>Judge queue</dt>
              <dd>{queue > 0 ? <span className="tag pending">{queue} waiting</span> : <span className="tag good">Idle</span>}</dd>
            </div>
          </dl>
        </section>

        <section className="card flush">
          <div className="card-head">
            <h2>Problems</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th style={{ width: "100%" }}>Problem</th>
                  <th>Status</th>
                  <th className="num">Tests</th>
                  <th className="num">Submissions</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {problems.length === 0 && <tr><td colSpan={6} className="empty">No problems yet. Create one below.</td></tr>}
                {problems.map((p, i) => (
                  <tr key={p.id}>
                    <td className="muted">{i + 1}</td>
                    <td>
                      <Link href={`/admin/problems/${p.id}`}>{p.title}</Link> <span className="muted">/{p.slug}</span>
                    </td>
                    <td>{p.published ? <span className="tag good">Published</span> : <span className="tag neutral">Draft</span>}</td>
                    <td className="num">{p._count.testCases === 0 ? <span className="tag warning">0</span> : p._count.testCases}</td>
                    <td className="num">{p._count.submissions}</td>
                    <td className="order-actions">
                      {(["up", "down"] as const).map((dir) => (
                        <form key={dir} action={moveProblem}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="direction" value={dir} />
                          <button
                            className="secondary"
                            disabled={dir === "up" ? i === 0 : i === problems.length - 1}
                            title={dir === "up" ? "Move up" : "Move down"}
                            aria-label={`Move ${p.title} ${dir}`}
                          >
                            {dir === "up" ? "↑" : "↓"}
                          </button>
                        </form>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <CreateProblemForm />
      </div>
    </>
  );
}
