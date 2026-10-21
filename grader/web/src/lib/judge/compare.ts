// Standard lenient comparison: ignore trailing spaces on each line and
// trailing blank lines at the end, and treat \r\n the same as \n.
export function normalizeOutput(s: string): string {
  const lines = s.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trimEnd());
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
