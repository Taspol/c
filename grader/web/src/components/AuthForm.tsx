"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register } from "@/lib/actions/auth";
import { SubmitButton } from "./SubmitButton";

export function AuthForm({ mode, needsCode }: { mode: "login" | "register"; needsCode?: boolean }) {
  const [state, action] = useActionState(mode === "login" ? login : register, undefined);
  const isLogin = mode === "login";
  return (
    <div className="auth">
      <form action={action} className="card">
        <h1>{isLogin ? "Log in" : "Create account"}</h1>
        <p className="sub">{isLogin ? "Sign in to read problems and submit your code." : "Pick a username and password for this grader."}</p>

        <label>
          <span>Username</span>
          <input name="username" type="text" autoComplete="username" required />
        </label>
        <label>
          <span>Password</span>
          <input name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} required />
        </label>
        {!isLogin && (
          <label>
            <span>Confirm password</span>
            <input name="confirm" type="password" autoComplete="new-password" required />
          </label>
        )}
        {!isLogin && needsCode && (
          <label>
            <span>Class code</span>
            <input name="code" type="text" required />
          </label>
        )}

        {state?.error && <div className="banner error">{state.error}</div>}

        <div className="actions">
          <SubmitButton pendingText={isLogin ? "Logging in…" : "Creating…"}>{isLogin ? "Log in" : "Register"}</SubmitButton>
          <span className="spacer" />
          <span className="hint">
            {isLogin ? <>No account? <Link href="/register">Register</Link></> : <>Have an account? <Link href="/login">Log in</Link></>}
          </span>
        </div>
      </form>
    </div>
  );
}
