type ProblemText = { statement: string; inputFormat: string; outputFormat: string };

// Problems written before inputFormat/outputFormat existed keep everything
// in the statement under "## Input" and "## Output" headings. Split those
// out so old and new problems look the same.
export function problemSections(p: ProblemText): ProblemText {
  if (p.inputFormat.trim() || p.outputFormat.trim()) return p;

  const heading = /^#{1,6}\s*(input|output)\b.*$/gim;
  const marks = [...p.statement.matchAll(heading)];
  if (marks.length === 0) return p;

  const parts: ProblemText = { statement: p.statement.slice(0, marks[0].index).trim(), inputFormat: "", outputFormat: "" };
  marks.forEach((m, i) => {
    const start = m.index! + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : p.statement.length;
    const body = p.statement.slice(start, end).trim();
    if (m[1].toLowerCase() === "input") parts.inputFormat = body;
    else parts.outputFormat = body;
  });
  return parts;
}
