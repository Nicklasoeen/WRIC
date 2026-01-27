import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { ChatWidget } from "@/components/chat/ChatWidget";

export default async function ChatPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Live Chat</h1>
          <p className="mt-2 text-slate-400">
            Snakk med alle brukere i sanntid
          </p>
        </div>

        {/* Chat Widget */}
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
          <div className="h-[600px]">
            <ChatWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
