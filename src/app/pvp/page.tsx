import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { PvpGame } from "@/components/pvp/PvpGame";

export const dynamic = 'force-dynamic';

export default async function PvpPage() {
  try {
    const session = await getSession();

    if (!session.isAuthenticated) {
      redirect("/");
    }

    return (
      <div className="min-h-screen p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">PvP Arena</h1>
            <p className="mt-2 text-slate-400">
              Angrip andre brukeres baser og bygg opp din makt gjennom Raid
            </p>
          </div>

          {/* Game Widget */}
          <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-6 shadow-lg">
            <PvpGame />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in PvpPage:", error);
    redirect("/");
  }
}
