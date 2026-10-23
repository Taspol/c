import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { CopyButton } from "@/components/CopyButton";
import { SectionIcon } from "@/components/SectionIcon";
import { SubmitForm, type SavedCode } from "@/components/SubmitForm";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { problemSections } from "@/lib/problem";
import { toHistoryItem } from "@/lib/submission-types";

export default async function ProblemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser();
  const problem = await db.problem.findUnique({
    where: { slug },
    include: { testCases: { where: { isSample: true }, orderBy: { id: "asc" } } },
  });
  if (!problem || (!problem.published && user.role !== "ADMIN")) notFound();

  const [recent, lastSubmission, totals, drafts] = await Promise.all([
    db.submission.findMany({ where: { userId: user.id, problemId: problem.id }, orderBy: { id: "desc" }, take: 20 }),
    db.submission.findFirst({ where: { userId: user.id }, orderBy: { id: "desc" }, select: { language: true } }),
    db.testCase.aggregate({ where: { problemId: problem.id }, _count: true, _sum: { points: true } }),
    db.draft.findMany({ where: { userId: user.id, problemId: problem.id } }),
  ]);
  // Open in the language the student last worked in on this problem
  const latestDraft = drafts.toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
  // Per language, the newer of the saved draft and the last submission
  const savedCode: SavedCode = {};
  for (const lang of ["C", "CPP"] as const) {
    const draft = drafts.find((d) => d.language === lang);
    const sub = recent.find((s) => s.language === lang);
    const options = [
      draft && { code: draft.code, savedAt: draft.updatedAt.getTime() },
      sub && { code: sub.code, savedAt: sub.createdAt.getTime() },
    ].filter((x) => x !== undefined);
    if (options.length) savedCode[lang] = options.sort((a, b) => b.savedAt - a.savedAt)[0];
  }
  const text = problemSections(problem);

  return (
    <div className="ws">
      <div className="ws-left">
        <div className="ws-title">
          <Link href="/" className="hint">← Problems</Link>
          <h1>{problem.title}</h1>
          {user.role === "ADMIN" && (
            <Link href={`/admin/problems/${problem.id}`} className="button secondary ws-edit">Edit problem</Link>
          )}
        </div>
        {!problem.published && <div className="banner warn">Draft: only admins can see this problem.</div>}

        <section className="card problem-card">
          <dl className="problem-facts">
            <div>
              <dt>Time limit</dt>
              <dd>{problem.timeLimitMs / 1000} <small>s</small></dd>
            </div>
            <div>
              <dt>Memory limit</dt>
              <dd>{Math.round(problem.memoryLimitKb / 1024)} <small>MB</small></dd>
            </div>
            <div>
              <dt>Tests</dt>
              <dd>{totals._count} <small>({problem.testCases.length} shown)</small></dd>
            </div>
            <div>
              <dt>Points</dt>
              <dd>{totals._sum.points ?? 0}</dd>
            </div>
          </dl>

          <div className="psec">
            <div className="psec-head">
              <SectionIcon name="statement" />
              <span className="psec-title">Statement</span>
            </div>
            <div className="statement">
              <Markdown>{text.statement || "_No statement yet._"}</Markdown>
            </div>
          </div>

          {(text.inputFormat || text.outputFormat) && (
            <div className="psec">
              <div className="spec-grid">
                <div className="spec in">
                  <div className="psec-head">
                    <SectionIcon name="input" />
                    <span className="psec-title">Input</span>
                    <span className="psec-sub">what your program reads</span>
                  </div>
                  <div className="statement">
                    <Markdown>{text.inputFormat || "_Not specified._"}</Markdown>
                  </div>
                </div>
                <div className="spec out">
                  <div className="psec-head">
                    <SectionIcon name="output" />
                    <span className="psec-title">Output</span>
                    <span className="psec-sub">what it must print</span>
                  </div>
                  <div className="statement">
                    <Markdown>{text.outputFormat || "_Not specified._"}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          )}

          {problem.testCases.length > 0 && (
            <div className="psec">
              <div className="psec-head">
                <SectionIcon name="examples" />
                <span className="psec-title">Examples</span>
              </div>
              {problem.testCases.map((t, i) => (
                <div className="example" key={t.id}>
                  <div className="example-head">Example {i + 1}</div>
                  <div className="example-panes">
                    <div>
                      <div className="pane-head in">
                        Input <CopyButton text={t.input} />
                      </div>
                      <pre>{t.input}</pre>
                    </div>
                    <div>
                      <div className="pane-head out">
                        Output <CopyButton text={t.output} />
                      </div>
                      <pre>{t.output}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <SubmitForm
        problemId={problem.id}
        defaultLanguage={latestDraft?.language ?? lastSubmission?.language ?? "C"}
        initialHistory={recent.map(toHistoryItem)}
        savedCode={savedCode}
      />
    </div>
  );
}
