import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { DungeonGame } from "@/components/dungeon/DungeonGame";

export const dynamic = 'force-dynamic';

export default async function DungeonPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Dungeon</h1>
          <p className="mt-2 text-slate-400">
            Samarbeid med andre for å beseire mektige bosses og tjen XP
          </p>
        </div>

        {/* Game Widget */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-6 shadow-lg">
          <DungeonGame />
        </div>
      </div>
    </div>
  );
}
