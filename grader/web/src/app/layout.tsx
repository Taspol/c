import type { Metadata } from "next";
import Link from "next/link";
import { NavLinks } from "@/components/NavLinks";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Grader",
  description: "C/C++ grader",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const items = !user
    ? []
    : [
        { href: "/", label: "Problems" },
        { href: "/submissions", label: "Submissions" },
        ...(user.role === "ADMIN"
          ? [
              { href: "/admin", label: "Manage" },
              { href: "/admin/scoreboard", label: "Scoreboard" },
              { href: "/admin/users", label: "Users" },
            ]
          : []),
      ];

  return (
    <html lang="en">
      <body>
        <div className="topnav">
          <Link href="/" className="brand">
            <span className="brand-mark">{"{}"}</span>
            Grader
          </Link>
          <NavLinks items={items} />
          {user ? (
            <form action={logout} className="env">
              <span>
                <span className="who-label">Signed in as </span>
                <strong>{user.username}</strong>
                {user.role === "ADMIN" && <span className="who-label"> · admin</span>}
              </span>
              <button className="link" type="submit">Log out</button>
            </form>
          ) : (
            <span className="env">
              <Link href="/login">Log in</Link>
              <Link href="/register">Register</Link>
            </span>
          )}
        </div>
        {children}
      </body>
    </html>
  );
}
