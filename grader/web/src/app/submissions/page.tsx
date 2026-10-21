import Link from "next/link";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHead } from "@/components/PageHead";
import { VerdictBadge } from "@/components/VerdictBadge";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, LANGUAGE_LABEL } from "@/lib/format";

const PAGE_SIZE = 50;

export default async function SubmissionsPage({ searchParams }: { searchParams: Promise<{ page?: string; all?: string }> }) {
  const user = await requireUser();
  const { page: pageParam, all } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  // Admins can switch between their own submissions and everyone's
  const isAdmin = user.role === "ADMIN";
  const showAll = isAdmin && all === "1";

  const [submissions, mineCount, allCount] = await Promise.all([
    db.submission.findMany({
      where: showAll ? {} : { userId: user.id },
      orderBy: { id: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE + 1,
      include: { problem: { select: { title: true, slug: true } }, user: { select: { username: true } } },
    }),
    db.submission.count({ where: { userId: user.id } }),
    isAdmin ? db.submission.count() : Promise.resolve(0),
  ]);
  const hasMore = submissions.length > PAGE_SIZE;
  const rows = submissions.slice(0, PAGE_SIZE);
  const judging = rows.some((s) => s.status !== "DONE");
  const query = (p: number) => `/submissions?page=${p}${showAll ? "&all=1" : ""}`;

  return (
    <>
      <AutoRefresh active={judging} intervalMs={2000} />
      <PageHead title="Submissions" sub="Newest first. Click a submission to see its test results." />
      <div className="page">
        {isAdmin && (
          <div className="tabs">
            <Link href="/submissions" className={`tab${showAll ? "" : " active"}`}>
              Mine<span className="tab-count">{mineCount}</span>
            </Link>
            <Link href="/submissions?all=1" className={`tab${showAll ? " active" : ""}`}>
              Everyone<span className="tab-count">{allCount}</span>
            </Link>
          </div>
        )}

        <section className="card flush">
          <div className="card-head">
            <h2>
              {showAll ? "All submissions" : "My submissions"}
              {judging && <span className="spinner" aria-hidden />}
            </h2>
            <span className="muted">Page {page}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Submitted</th>
                  {showAll && <th>User</th>}
                  <th style={{ width: "100%" }}>Problem</th>
                  <th>Language</th>
                  <th>Result</th>
                  <th className="num">Score</th>
                  <th className="num">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={8} className="empty">No submissions yet.</td></tr>}
                {rows.map((s) => (
                  <tr key={s.id}>
                    <td><Link href={`/submissions/${s.id}`}>{s.id}</Link></td>
                    <td className="nowrap muted">{formatDate(s.createdAt)}</td>
                    {showAll && <td>{s.user.username}</td>}
                    <td><Link href={`/problems/${s.problem.slug}`}>{s.problem.title}</Link></td>
                    <td>{LANGUAGE_LABEL[s.language]}</td>
                    <td><VerdictBadge status={s.status} verdict={s.verdict} long /></td>
                    <td className="num">{s.status === "DONE" ? <>{s.score} <span className="muted">/ {s.maxScore}</span></> : "—"}</td>
                    <td className="num muted">{s.timeMs !== null ? `${s.timeMs} ms` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {(page > 1 || hasMore) && (
          <div className="actions" style={{ borderTop: 0, marginTop: 0, paddingTop: 0 }}>
            {page > 1 && <Link href={query(page - 1)} className="button secondary">← Newer</Link>}
            <span className="spacer" />
            {hasMore && <Link href={query(page + 1)} className="button secondary">Older →</Link>}
          </div>
        )}
      </div>
    </>
  );
}
