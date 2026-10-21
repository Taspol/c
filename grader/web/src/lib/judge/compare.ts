// Lenient comparison for beginners: ignore trailing spaces on each line and
// blank lines anywhere (e.g. a leading "\n" in printf), and treat \r\n the
// same as \n. Spaces inside a line still have to match.
export function normalizeOutput(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l !== "")
    .join("\n");
}

export function outputsMatch(actual: string, expected: string): boolean {
  return normalizeOutput(actual) === normalizeOutput(expected);
}
