import { ResetPasswordForm } from "@/components/admin/forms";
import { PageHead } from "@/components/PageHead";
import { setRole } from "@/lib/actions/admin";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";

export default async function UsersPage() {
  const me = await getCurrentUser();
  const users = await db.user.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <>
      <PageHead title="Users" sub="Promote admins and reset forgotten passwords." />
      <div className="page">
        <section className="card flush">
          <div className="card-head">
            <h2>Accounts</h2>
            <span className="muted">{users.length} users</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th className="num">Submissions</th>
                  <th style={{ width: "100%" }}>Reset password</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="nowrap">
                      {u.username}
                      {u.id === me?.id && <span className="muted"> · you</span>}
                    </td>
                    <td className="nowrap">
                      <span className={`tag ${u.role === "ADMIN" ? "pending" : "neutral"}`}>{u.role === "ADMIN" ? "Admin" : "Student"}</span>
                      {u.id !== me?.id && (
                        <form action={setRole} style={{ display: "inline", marginLeft: 10 }}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="role" value={u.role === "ADMIN" ? "STUDENT" : "ADMIN"} />
                          <button className="link" type="submit">{u.role === "ADMIN" ? "Make student" : "Make admin"}</button>
                        </form>
                      )}
                    </td>
                    <td className="nowrap muted">{formatDate(u.createdAt)}</td>
                    <td className="num">{u._count.submissions}</td>
                    <td><ResetPasswordForm userId={u.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
