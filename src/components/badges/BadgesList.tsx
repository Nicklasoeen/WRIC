"use client";

import { useEffect, useState } from "react";
import { getUserBadges, UserBadge } from "@/app/actions/badges";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { BadgeIcon } from "./BadgeIcon";

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

export function BadgesList() {
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  async function loadBadges() {
    try {
      const result = await getUserBadges();
      if (result.success && result.badges) {
        setBadges(result.badges);
      }
    } catch (error) {
      console.error("Error loading badges:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-4 text-slate-400 text-sm">Laster badges...</div>
    );
  }

  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-sm">Ingen badges unlocket ennå.</p>
        <p className="text-xs mt-2">Tjen XP og stig i level for å unlocke badges!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {badges.map((userBadge) => (
        <div
          key={userBadge.id}
          className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-4 text-center shadow-lg hover:bg-slate-800/70 transition-colors"
        >
          <div className="flex justify-center mb-2">
            <BadgeIcon
              icon={userBadge.badge.icon}
              className={`text-4xl ${getBadgeColorClass(userBadge.badge.color)}`}
              size={32}
            />
          </div>
          <h3 className={`font-semibold text-sm mb-1 ${getBadgeColorClass(userBadge.badge.color)}`}>
            {userBadge.badge.name}
          </h3>
          <p className="text-xs text-slate-400 mb-2">
            {userBadge.badge.description}
          </p>
          <p className="text-[10px] text-slate-500">
            Unlocket: {format(new Date(userBadge.unlockedAt), "dd.MM.yyyy", { locale: nb })}
          </p>
        </div>
      ))}
    </div>
  );
}
