import Link from "next/link";
import { PageHead } from "@/components/PageHead";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ProblemsPage() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  const [problems, points, best] = await Promise.all([
    db.problem.findMany({ where: isAdmin ? {} : { published: true }, orderBy: [{ position: "asc" }, { id: "asc" }] }),
    db.testCase.groupBy({ by: ["problemId"], _sum: { points: true } }),
    db.submission.groupBy({ by: ["problemId"], where: { userId: user.id, status: "DONE" }, _max: { score: true } }),
  ]);
  const maxScore = new Map(points.map((p) => [p.problemId, p._sum.points ?? 0]));
  const bestScore = new Map(best.map((b) => [b.problemId, b._max.score ?? 0]));
  const solved = problems.filter((p) => {
    const max = maxScore.get(p.id) ?? 0;
    return max > 0 && (bestScore.get(p.id) ?? -1) >= max;
  }).length;

  return (
    <>
      <PageHead title="Problems" sub="Read a problem, write your solution in C or C++, and submit it. Programs read standard input and write standard output." />
      <div className="page">
        <section className="card flush">
          <div className="card-head">
            <h2>All problems</h2>
            <span className="muted">
              Solved {solved} of {problems.length}
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th style={{ width: "100%" }}>Problem</th>
                  <th className="num">Time limit</th>
                  <th>Status</th>
                  <th className="num">Your best</th>
                </tr>
              </thead>
              <tbody>
                {problems.length === 0 && (
                  <tr><td colSpan={5} className="empty">No problems yet.</td></tr>
                )}
                {problems.map((p, i) => {
                  const max = maxScore.get(p.id) ?? 0;
                  const mine = bestScore.get(p.id);
                  const done = mine !== undefined && max > 0 && mine >= max;
                  return (
                    <tr key={p.id}>
                      <td className="muted">{i + 1}</td>
                      <td>
                        <Link href={`/problems/${p.slug}`}>{p.title}</Link>
                        {!p.published && <span className="tag neutral" style={{ marginLeft: 10 }}>Draft</span>}
                      </td>
                      <td className="num muted">{p.timeLimitMs / 1000} s</td>
                      <td>
                        {mine === undefined ? (
                          <span className="tag neutral">Not started</span>
                        ) : done ? (
                          <span className="tag good">Solved</span>
                        ) : (
                          <span className="tag warning">Attempted</span>
                        )}
                      </td>
                      <td className="num">{mine === undefined ? <span className="muted">—</span> : <>{mine} <span className="muted">/ {max}</span></>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
