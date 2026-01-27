import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { getSession, logout } from "@/app/actions/auth";
import {
  MiniBarChart,
  MiniLineChart,
  StatPill,
  WidgetCard,
} from "@/components/dashboard/widgets";
import { LogoutButton } from "@/components/dashboard/LogoutButton";
import { PortfolioWidget } from "@/components/portfolio/PortfolioWidget";
import { ChatWidgetCompact } from "@/components/chat/ChatWidgetCompact";
import { PraiseWidget } from "@/components/praise/PraiseWidget";

function useCurrentDateTime() {
  const now = new Date();
  const date = format(now, "EEEE d. MMMM yyyy", { locale: nb });
  const time = format(now, "HH:mm");
  return { date, time };
}

export default async function DashboardPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  // Bruk isAdmin fra session
  const isAdmin = session.isAdmin || false;

  const { date, time } = useCurrentDateTime();

  return (
    <div className="relative min-h-screen font-sans text-slate-50">
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        {/* Dashboard header */}
        <div className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Mitt dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Rask oversikt over dagen, investeringene og fokus.
          </p>
        </div>

        <main className="grid auto-rows-[minmax(140px,auto)] gap-5 md:grid-cols-4">
          <WidgetCard
            title="Investeringer"
            subtitle="Portefølje – track & follow"
            size="lg"
            footer="Manuelt registrerte kjøp. Data oppdateres hvert 5. minutt."
            className="md:col-span-3 md:row-span-3"
          >
            <PortfolioWidget />
          </WidgetCard>

          {/* Høyre kolonne - øverste rad */}
          <WidgetCard
            title="Chat"
            subtitle="Live aktivitet"
            size="md"
            className="md:row-span-2"
          >
            <ChatWidgetCompact />
          </WidgetCard>

          {/* Høyre kolonne - midterste rad */}
          <WidgetCard
            title="Praise the Founders"
            subtitle="Gi praise & tjen XP"
            size="md"
            className="md:row-span-2"
          >
            <PraiseWidget />
          </WidgetCard>

          {/* Høyre kolonne - nederste rad */}
          <WidgetCard
            title="E-post & kalender"
            subtitle="Oversikt (mock)"
            size="sm"
            footer="Koble til Google / Microsoft med OAuth i neste steg."
          >
            <div className="flex h-full flex-col justify-between gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Uleste e-poster
                </span>
                <span className="text-base font-semibold">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  Neste møte
                </span>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  13:30 · Sync med teamet
                </span>
              </div>
            </div>
          </WidgetCard>

          {/* Nye widgets nederst */}
          <WidgetCard
            title="Stemning på markedet"
            subtitle="Aksjer & krypto"
            size="md"
            className="md:col-span-2"
          >
            <div className="flex h-full flex-col justify-between gap-4">
              <MiniLineChart />
              <div className="grid grid-cols-2 gap-3">
                <StatPill
                  label="Indeks"
                  value="+0.8%"
                  trend={{ value: "i dag", positive: true }}
                />
                <StatPill
                  label="Krypto"
                  value="+3.1%"
                  trend={{ value: "24t", positive: true }}
                />
              </div>
            </div>
          </WidgetCard>

          <WidgetCard
            title="Sessions & fokus"
            subtitle="Denne uken"
            size="sm"
            className="md:col-span-2"
          >
            <MiniBarChart />
          </WidgetCard>

        </main>
      </div>
    </div>
  );
}
