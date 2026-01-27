import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { getAllUsers } from "@/app/actions/admin";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { CreateVoteForm } from "@/components/admin/CreateVoteForm";

export const dynamic = 'force-dynamic';

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
        <div className="space-y-6">
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-6 shadow-lg">
            <AdminPanel initialUsers={users} />
          </div>
          
          {/* Voting admin */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Voting Administration</h2>
            <p className="text-sm text-slate-400 mb-4">
              Opprett ukentlige votes for brukerne
            </p>
            <CreateVoteForm />
          </div>
        </div>
      </div>
    </div>
  );
}
