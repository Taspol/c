import { mkdirSync } from "node:fs";
import path from "node:path";
import { db } from "../lib/db";

// Writes a consistent copy of the live database, safe while the site is running.
// Usage: pnpm backup [output file]
async function main() {
  const stamp = new Date().toISOString().replace(/[:T]/g, "-").slice(0, 19);
  const out = path.resolve(process.argv[2] ?? `backups/grader-${stamp}.db`);
  mkdirSync(path.dirname(out), { recursive: true });
  await db.$executeRawUnsafe(`VACUUM INTO '${out.replace(/'/g, "''")}'`);
  console.log(`Backup written to ${out}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
