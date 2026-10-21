"use client";

import type { Problem } from "@prisma/client";
import { useActionState } from "react";
import { problemSections } from "@/lib/problem";
import { addTestCase, createProblem, resetPassword, updateProblem, uploadTestCases, type AdminFormState } from "@/lib/actions/admin";
import { SubmitButton } from "../SubmitButton";

function Status({ state }: { state: AdminFormState }) {
  if (state?.error) return <div className="banner error">{state.error}</div>;
  if (state?.message) return <div className="banner ok">{state.message}</div>;
  return null;
}

export function CreateProblemForm() {
  const [state, action] = useActionState(createProblem, undefined);
  return (
    <form action={action} className="card">
      <h2>New problem</h2>
      <div className="grid two">
        <label>
          <span>Title</span>
          <input name="title" type="text" placeholder="A + B" required />
        </label>
        <label>
          <span>Slug (used in the URL)</span>
          <input name="slug" type="text" placeholder="a-plus-b" required />
        </label>
      </div>
      <Status state={state} />
      <div className="actions">
        <SubmitButton pendingText="Creating…">Create problem</SubmitButton>
        <span className="hint">It starts as a draft; add tests and publish it when ready.</span>
      </div>
    </form>
  );
}

export function EditProblemForm({ problem }: { problem: Problem }) {
  const [state, action] = useActionState(updateProblem, undefined);
  const text = problemSections(problem);
  return (
    <form action={action} className="card">
      <h2>Details</h2>
      <input type="hidden" name="id" value={problem.id} />
      <div className="grid">
        <label>
          <span>Title</span>
          <input name="title" type="text" defaultValue={problem.title} required />
        </label>
        <label>
          <span>Slug</span>
          <input name="slug" type="text" defaultValue={problem.slug} required />
        </label>
        <label>
          <span>Time limit (ms)</span>
          <input name="timeLimitMs" type="number" min={100} max={15000} defaultValue={problem.timeLimitMs} />
        </label>
        <label>
          <span>Memory limit (MB)</span>
          <input name="memoryLimitMb" type="number" min={16} max={512} defaultValue={Math.round(problem.memoryLimitKb / 1024)} />
        </label>
        <label className="wide">
          <span>Statement: the story and the task (Markdown)</span>
          <textarea name="statement" rows={10} defaultValue={text.statement} placeholder="Read two integers and print their sum." />
        </label>
        <div className="wide grid two">
          <label>
            <span>Input: what the program reads</span>
            <textarea name="inputFormat" rows={6} defaultValue={text.inputFormat} placeholder={"One line with two integers `A` and `B`.\n\n- -10^9 ≤ A, B ≤ 10^9"} />
          </label>
          <label>
            <span>Output: what it must print</span>
            <textarea name="outputFormat" rows={6} defaultValue={text.outputFormat} placeholder="Print `A + B` on one line." />
          </label>
        </div>
      </div>
      <Status state={state} />
      <div className="actions">
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
        <label className="check">
          <input type="checkbox" name="published" defaultChecked={problem.published} />
          <span>Published (students can see it)</span>
        </label>
      </div>
    </form>
  );
}

export function AddTestCaseForm({ problemId }: { problemId: number }) {
  const [state, action] = useActionState(addTestCase, undefined);
  return (
    <form action={action} className="card" key={state?.message}>
      <h2>Add one test case</h2>
      <input type="hidden" name="problemId" value={problemId} />
      <div className="grid two">
        <label>
          <span>Input</span>
          <textarea name="input" rows={6} />
        </label>
        <label>
          <span>Expected output</span>
          <textarea name="output" rows={6} />
        </label>
        <label>
          <span>Name (optional)</span>
          <input name="name" type="text" placeholder="e.g. big-numbers" />
        </label>
        <label>
          <span>Points</span>
          <input name="points" type="number" min={0} defaultValue={1} />
        </label>
      </div>
      <Status state={state} />
      <div className="actions">
        <SubmitButton pendingText="Adding…">Add test case</SubmitButton>
        <label className="check">
          <input type="checkbox" name="isSample" />
          <span>Example (shown to students)</span>
        </label>
      </div>
    </form>
  );
}

export function UploadTestCasesForm({ problemId }: { problemId: number }) {
  const [state, action] = useActionState(uploadTestCases, undefined);
  return (
    <form action={action} className="card" key={state?.message}>
      <h2>Upload test files</h2>
      <input type="hidden" name="problemId" value={problemId} />
      <div className="grid two">
        <label>
          <span>Files (.in with matching .out or .ans)</span>
          <input type="file" name="files" multiple accept=".in,.out,.ans" />
        </label>
        <label>
          <span>Points each</span>
          <input name="points" type="number" min={0} defaultValue={1} />
        </label>
      </div>
      <Status state={state} />
      <div className="actions">
        <SubmitButton pendingText="Uploading…">Upload</SubmitButton>
        <span className="hint">
          Pairs like <code>1.in</code> + <code>1.out</code>. Files named <code>sample…</code> or <code>example…</code> become examples.
        </span>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: number }) {
  const [state, action] = useActionState(resetPassword, undefined);
  return (
    <form action={action} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="hidden" name="id" value={userId} />
      <input name="password" type="text" placeholder="New password" className="inline" style={{ width: 150 }} />
      <SubmitButton className="secondary">Reset</SubmitButton>
      {state?.error && <span className="hint err-text">{state.error}</span>}
      {state?.message && <span className="tag good">{state.message}</span>}
    </form>
  );
}
