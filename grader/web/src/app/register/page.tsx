import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  if (process.env.REGISTRATION_OPEN === "false") {
    return (
      <div className="auth">
        <div className="banner warn">Registration is closed. Ask your teacher for an account.</div>
      </div>
    );
  }
  return <AuthForm mode="register" needsCode={Boolean(process.env.REGISTRATION_CODE)} />;
}
