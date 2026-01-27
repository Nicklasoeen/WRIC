import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { getAllUsers } from "@/app/actions/admin";
import { AdminPanel } from "@/components/admin/AdminPanel";

export default async function AdminPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  // Sjekk om brukeren er admin
  const users = await getAllUsers();
  
  // Hvis ingen brukere returneres, er brukeren ikke admin
  if (users.length === 0 && session.userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="mt-2 text-slate-400">
            Administrer brukere og tilganger
          </p>
        </div>
        <AdminPanel initialUsers={users} />
      </div>
    </div>
  );
}
