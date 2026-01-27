import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { BadgesList } from "@/components/badges/BadgesList";
import { getAllBadges } from "@/app/actions/badges";
import { BadgeIcon } from "@/components/badges/BadgeIcon";

const getBadgeColorClass = (color: string) => {
  const colorMap: Record<string, string> = {
    brown: "text-amber-800",
    orange: "text-orange-500",
    red: "text-red-500",
    pink: "text-pink-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    gold: "text-yellow-400",
    // Fallback for gamle farger
    gray: "text-slate-400",
    yellow: "text-yellow-400",
    silver: "text-slate-200",
    green: "text-green-400",
  };
  return colorMap[color] || "text-white";
};

export const dynamic = 'force-dynamic';

export default async function BadgesPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  const badgesResult = await getAllBadges();
  const allBadges = badgesResult.success ? badgesResult.badges || [] : [];

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">The ladder of WRIC</h1>
          <p className="mt-2 text-slate-400">
            Se alle badges du har unlocket
          </p>
        </div>

        {/* Badges */}
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-6 shadow-lg">
          <BadgesList />
        </div>

        {/* Alle tilgjengelige badges */}
        {allBadges.length > 0 && (
          <div className="mt-8 rounded-xl bg-slate-800/60 border border-slate-700/80 p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-white mb-4">
              Alle tilgjengelige badges
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {allBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-xl bg-slate-700/40 border border-slate-600/60 p-4 text-center"
                >
                  <div className="flex justify-center mb-2">
                    <BadgeIcon
                      icon={badge.icon}
                      className={`text-4xl ${getBadgeColorClass(badge.color)}`}
                      size={32}
                    />
                  </div>
                  <h3 className={`font-semibold text-sm mb-1 ${getBadgeColorClass(badge.color)}`}>
                    {badge.name}
                  </h3>
                  <p className="text-xs text-slate-400 mb-2">
                    {badge.description}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Level {badge.levelRequired} krevd
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
