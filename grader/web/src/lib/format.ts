import type { Verdict } from "@prisma/client";

export const VERDICT_LABEL: Record<Verdict, string> = {
  AC: "Accepted",
  WA: "Wrong Answer",
  TLE: "Time Limit Exceeded",
  MLE: "Memory Limit Exceeded",
  RE: "Runtime Error",
  CE: "Compile Error",
  IE: "Judge Error",
};

export const LANGUAGE_LABEL = { C: "C", CPP: "C++" } as const;

export function formatDate(d: Date) {
  return d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short", timeZone: process.env.TZ ?? "Asia/Bangkok" });
}
