import type { SubmissionStatus, Verdict } from "@prisma/client";
import { VERDICT_LABEL } from "@/lib/format";

// Verdict tone, from the reserved status palette
export const VERDICT_TONE: Record<Verdict, string> = {
  AC: "good",
  WA: "critical",
  RE: "critical",
  TLE: "warning",
  MLE: "serious",
  CE: "neutral",
  IE: "neutral",
};

export function VerdictBadge({ status, verdict, long }: { status?: SubmissionStatus; verdict: Verdict | null; long?: boolean }) {
  if (status === "PENDING") return <span className="tag pending">In queue</span>;
  if (status === "JUDGING") return <span className="tag pending">Judging…</span>;
  if (!verdict) return null;
  return (
    <span className={`tag ${VERDICT_TONE[verdict]}`} title={VERDICT_LABEL[verdict]}>
      {long ? VERDICT_LABEL[verdict] : verdict}
    </span>
  );
}
