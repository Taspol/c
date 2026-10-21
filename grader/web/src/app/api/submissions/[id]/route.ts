import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { viewSubmission } from "@/lib/submission-view";

// Polled by the result panel on the problem page while a submission is judged
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const view = await viewSubmission(Number((await params).id) || 0, user);
  if (!view) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(view, { headers: { "Cache-Control": "no-store" } });
}
