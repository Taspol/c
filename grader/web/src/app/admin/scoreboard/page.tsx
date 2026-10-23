import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { db } from "@/lib/db";

export default async function ScoreboardPage() {
  const [problems, users, best, points] = await Promise.all([
    db.problem.findMany({ where: { published: true }, orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true, slug: true, title: true } }),
    db.user.findMany({ where: { role: "STUDENT" }, orderBy: { username: "asc" }, select: { id: true, username: true } }),
    db.submission.groupBy({ by: ["userId", "problemId"], where: { status: "DONE" }, _max: { score: true } }),
    db.testCase.groupBy({ by: ["problemId"], _sum: { points: true } }),
  ]);
  const score = new Map(best.map((b) => [`${b.userId}:${b.problemId}`, b._max.score ?? 0]));
  const max = new Map(points.map((p) => [p.problemId, p._sum.points ?? 0]));
  const maxTotal = problems.reduce((s, p) => s + (max.get(p.id) ?? 0), 0);

  const rows = users
    .map((u) => {
      const cells = problems.map((p) => score.get(`${u.id}:${p.id}`));
      return { user: u, cells, total: cells.reduce<number>((s, c) => s + (c ?? 0), 0) };
    })
    .sort((a, b) => b.total - a.total || a.user.username.localeCompare(b.user.username));

  return (
    <>
      <PageHead title="Scoreboard" sub="Best score per student on each published problem." />
      <div className="page">
        <section className="card flush">
          <div className="card-head">
            <h2>Students</h2>
            <span className="muted">{users.length} students · {problems.length} problems</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  {problems.map((p) => (
                    <th key={p.id} className="num" title={p.title}>
                      <Link href={`/problems/${p.slug}`}>{p.slug}</Link>
                    </th>
                  ))}
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={problems.length + 3} className="empty">No students yet.</td></tr>}
                {rows.map((r, i) => (
                  <tr key={r.user.id}>
                    <td className="muted">{i + 1}</td>
                    <td style={{ width: "100%" }}>{r.user.username}</td>
                    {r.cells.map((c, j) => {
                      const m = max.get(problems[j].id) ?? 0;
                      return (
                        <td key={problems[j].id} className="num">
                          {c === undefined ? (
                            <span className="muted">—</span>
                          ) : (
                            <span className={`tag ${m > 0 && c >= m ? "good" : "warning"}`}>{c}</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="num">
                      <strong>{r.total}</strong> <span className="muted">/ {maxTotal}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
