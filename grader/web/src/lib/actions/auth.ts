"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, hashPassword, verifyPassword } from "../auth";
import { db } from "../db";

export type FormState = { error?: string } | undefined;

const credentials = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_.-]{3,32}$/, "Username must be 3-32 letters, digits, '_', '.' or '-'"),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Wrong username or password" };
  }
  await createSession(user.id);
  redirect("/");
}

export async function register(_: FormState, form: FormData): Promise<FormState> {
  if (process.env.REGISTRATION_OPEN === "false") return { error: "Registration is closed" };
  const code = process.env.REGISTRATION_CODE;
  if (code && form.get("code") !== code) return { error: "Wrong class code" };

  const parsed = credentials.safeParse({ username: form.get("username"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Passwords do not match" };

  const { username, password } = parsed.data;
  if (await db.user.findUnique({ where: { username } })) return { error: "That username is taken" };

  const user = await db.user.create({ data: { username, passwordHash: await hashPassword(password) } });
  await createSession(user.id);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
