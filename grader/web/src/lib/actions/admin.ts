"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword, requireAdmin } from "../auth";
import { db } from "../db";

export type AdminFormState = { error?: string; message?: string } | undefined;

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "Slug must be lowercase letters, digits and '-'");

export async function createProblem(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const slug = slugSchema.safeParse(form.get("slug"));
  if (!slug.success) return { error: slug.error.issues[0].message };
  const title = String(form.get("title") ?? "").trim();
  if (!title) return { error: "Title is required" };
  if (await db.problem.findUnique({ where: { slug: slug.data } })) return { error: "That slug is taken" };

  const last = await db.problem.aggregate({ _max: { position: true } });
  const problem = await db.problem.create({ data: { slug: slug.data, title, position: (last._max.position ?? 0) + 1 } });
  redirect(`/admin/problems/${problem.id}`);
}

const problemSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1, "Title is required").max(200),
  statement: z.string().max(100_000),
  inputFormat: z.string().max(20_000),
  outputFormat: z.string().max(20_000),
  timeLimitMs: z.coerce.number().int().min(100, "Time limit must be at least 100 ms").max(15_000, "Time limit can be at most 15 s"),
  memoryLimitMb: z.coerce.number().int().min(16, "Memory limit must be at least 16 MB").max(512, "Memory limit can be at most 512 MB"),
  published: z.boolean(),
});

export async function updateProblem(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = Number(form.get("id"));
  const parsed = problemSchema.safeParse({
    slug: form.get("slug"),
    title: form.get("title"),
    statement: form.get("statement") ?? "",
    inputFormat: form.get("inputFormat") ?? "",
    outputFormat: form.get("outputFormat") ?? "",
    timeLimitMs: form.get("timeLimitMs"),
    memoryLimitMb: form.get("memoryLimitMb"),
    published: form.get("published") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { memoryLimitMb, ...data } = parsed.data;

  const clash = await db.problem.findFirst({ where: { slug: data.slug, NOT: { id } } });
  if (clash) return { error: "That slug is taken" };

  await db.problem.update({ where: { id }, data: { ...data, memoryLimitKb: memoryLimitMb * 1024 } });
  revalidatePath("/", "layout");
  return { message: "Saved" };
}

export async function deleteProblem(form: FormData) {
  await requireAdmin();
  await db.problem.delete({ where: { id: Number(form.get("id")) } });
  redirect("/admin");
}

// Swaps a problem with its neighbour in the list. Positions are renumbered
// 1..n first, so ties from older data can't make a move do nothing.
export async function moveProblem(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const step = form.get("direction") === "up" ? -1 : 1;
  await db.$transaction(async (tx) => {
    const ids = (await tx.problem.findMany({ orderBy: [{ position: "asc" }, { id: "asc" }], select: { id: true } })).map((p) => p.id);
    const from = ids.indexOf(id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    for (const [i, pid] of ids.entries()) await tx.problem.update({ where: { id: pid }, data: { position: i + 1 } });
  });
  revalidatePath("/", "layout");
}

export async function addTestCase(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const problemId = Number(form.get("problemId"));
  const count = await db.testCase.count({ where: { problemId } });
  await db.testCase.create({
    data: {
      problemId,
      name: String(form.get("name") || "").trim() || `test ${count + 1}`,
      input: String(form.get("input") ?? ""),
      output: String(form.get("output") ?? ""),
      isSample: form.get("isSample") === "on",
      points: Math.max(0, Number(form.get("points") ?? 1) || 0),
    },
  });
  revalidatePath(`/admin/problems/${problemId}`);
  return { message: "Test case added" };
}

export async function updateTestCase(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const id = Number(form.get("id"));
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Name is required" };
  const tc = await db.testCase.update({
    where: { id },
    data: {
      name,
      input: String(form.get("input") ?? ""),
      output: String(form.get("output") ?? ""),
      isSample: form.get("isSample") === "on",
      points: Math.max(0, Number(form.get("points") ?? 1) || 0),
    },
  });
  revalidatePath(`/admin/problems/${tc.problemId}`);
  redirect(`/admin/problems/${tc.problemId}?tab=tests&saved=${tc.id}`);
}

// Pairs uploaded files by name: 1.in + 1.out (or .ans), sample1.in + sample1.out, ...
export async function uploadTestCases(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const problemId = Number(form.get("problemId"));
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Choose some .in and .out files" };

  const inputs = new Map<string, string>();
  const outputs = new Map<string, string>();
  for (const f of files) {
    const m = f.name.match(/^(.+)\.(in|out|ans)$/);
    if (!m) return { error: `${f.name}: expected a .in, .out or .ans file` };
    (m[2] === "in" ? inputs : outputs).set(m[1], await f.text());
  }

  const names = [...inputs.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const missing = names.filter((n) => !outputs.has(n));
  if (missing.length) return { error: `Missing output for: ${missing.join(", ")}` };
  if (names.length === 0) return { error: "No .in files found" };

  const points = Math.max(0, Number(form.get("points") ?? 1) || 0);
  // createMany keeps insertion order in the ids, which is the test order
  await db.testCase.createMany({
    data: names.map((name) => ({
      problemId,
      name,
      input: inputs.get(name)!,
      output: outputs.get(name)!,
      isSample: /sample|example/i.test(name),
      points,
    })),
  });
  revalidatePath(`/admin/problems/${problemId}`);
  return { message: `Added ${names.length} test case(s)` };
}

export async function toggleSample(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const tc = await db.testCase.findUniqueOrThrow({ where: { id } });
  await db.testCase.update({ where: { id }, data: { isSample: !tc.isSample } });
  revalidatePath(`/admin/problems/${tc.problemId}`);
}

export async function deleteTestCase(form: FormData) {
  await requireAdmin();
  const tc = await db.testCase.delete({ where: { id: Number(form.get("id")) } });
  revalidatePath(`/admin/problems/${tc.problemId}`);
}

export async function deleteAllTestCases(form: FormData) {
  await requireAdmin();
  const problemId = Number(form.get("problemId"));
  await db.testCase.deleteMany({ where: { problemId } });
  revalidatePath(`/admin/problems/${problemId}`);
}

export async function rejudgeProblem(form: FormData) {
  await requireAdmin();
  const problemId = Number(form.get("problemId"));
  await db.submission.updateMany({ where: { problemId, status: "DONE" }, data: { status: "PENDING" } });
  revalidatePath(`/admin/problems/${problemId}`);
}

export async function rejudgeSubmission(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  await db.submission.updateMany({ where: { id, status: "DONE" }, data: { status: "PENDING" } });
  revalidatePath(`/submissions/${id}`);
}

export async function setRole(form: FormData) {
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  if (id === me.id) return; // don't let an admin lock themselves out
  const role = form.get("role") === "ADMIN" ? "ADMIN" : "STUDENT";
  await db.user.update({ where: { id }, data: { role } });
  revalidatePath("/admin/users");
}

export async function resetPassword(_: AdminFormState, form: FormData): Promise<AdminFormState> {
  await requireAdmin();
  const password = String(form.get("password") ?? "");
  if (password.length < 6) return { error: "At least 6 characters" };
  const userId = Number(form.get("id"));
  await db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId } });
  return { message: "Password reset" };
}
