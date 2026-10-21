import Link from "next/link";
import { CreateProblemForm } from "@/components/admin/forms";
import { PageHead } from "@/components/PageHead";
import { db } from "@/lib/db";

export default async function AdminPage() {
  const [problems, queue, users, submissions] = await Promise.all([
    db.problem.findMany({
      orderBy: { id: "asc" },
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
                </tr>
              </thead>
              <tbody>
                {problems.length === 0 && <tr><td colSpan={5} className="empty">No problems yet. Create one below.</td></tr>}
                {problems.map((p) => (
                  <tr key={p.id}>
                    <td className="muted">{p.id}</td>
                    <td>
                      <Link href={`/admin/problems/${p.id}`}>{p.title}</Link> <span className="muted">/{p.slug}</span>
                    </td>
                    <td>{p.published ? <span className="tag good">Published</span> : <span className="tag neutral">Draft</span>}</td>
                    <td className="num">{p._count.testCases === 0 ? <span className="tag warning">0</span> : p._count.testCases}</td>
                    <td className="num">{p._count.submissions}</td>
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
