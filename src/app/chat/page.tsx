import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { ChatWidget } from "@/components/chat/ChatWidget";

export const dynamic = 'force-dynamic';

export default async function ChatPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Snakk med ditt townsfolk da vell</h1>
          <p className="mt-2 text-slate-400">
            Chat med alle brukere i sanntid
          </p>
        </div>

        {/* Chat Widget */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 overflow-hidden shadow-lg">
          <div className="h-[calc(100vh-250px)] min-h-[800px]">
            <ChatWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
