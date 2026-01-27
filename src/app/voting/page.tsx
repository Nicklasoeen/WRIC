import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { VotingWidget } from "@/components/voting/VotingWidget";

export const dynamic = 'force-dynamic';

export default async function VotingPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Voting</h1>
          <p className="mt-2 text-slate-400">
            Stem på ukentlige avstemninger
          </p>
        </div>

        {/* Voting Widget */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-6 shadow-lg">
          <VotingWidget />
        </div>
      </div>
    </div>
  );
}
