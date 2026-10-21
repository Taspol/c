import bcrypt from "bcryptjs";
import { db } from "../lib/db";

// Safe to run on every start: only creates what is missing.
async function main() {
  // WAL lets the web app read while the worker writes. The setting is stored
  // in the database file, so setting it once on start is enough.
  await db.$queryRawUnsafe("PRAGMA journal_mode = WAL");

  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_PASSWORD;
  if (username && password) {
    const existing = await db.user.findUnique({ where: { username } });
    if (!existing) {
      await db.user.create({ data: { username, passwordHash: await bcrypt.hash(password, 10), role: "ADMIN" } });
      console.log(`[seed] created admin "${username}"`);
    }
  } else {
    console.log("[seed] ADMIN_USERNAME/ADMIN_PASSWORD not set, skipping admin");
  }

  if ((await db.problem.count()) === 0) {
    await db.problem.create({
      data: {
        slug: "a-plus-b",
        title: "A + B",
        published: true,
        statement: "Read two integers **A** and **B** and print their sum.\n\n_Hint: the sum may not fit in an `int`._",
        inputFormat: "One line with two integers `A` and `B`.\n\n- −2·10⁹ ≤ A, B ≤ 2·10⁹",
        outputFormat: "Print `A + B` on one line.",
        testCases: {
          create: [
            { name: "sample1", input: "1 2\n", output: "3\n", isSample: true },
            { name: "sample2", input: "-5 5\n", output: "0\n", isSample: true },
            { name: "big", input: "2000000000 2000000000\n", output: "4000000000\n" },
            { name: "negative", input: "-2000000000 -1999999999\n", output: "-3999999999\n" },
          ],
        },
      },
    });
    console.log('[seed] created sample problem "a-plus-b"');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
