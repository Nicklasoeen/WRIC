"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTrophy, FaSkull, FaTimes } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { nb } from "date-fns/locale";

interface PvpNotification {
  id: string;
  attackerName: string;
  attackerLevel: number;
  defenderWon: boolean;
  damageDealt: number;
  createdAt: string;
}

export function PvpNotifications() {
  const [notifications, setNotifications] = useState<PvpNotification[]>([]);
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Last inn notifikasjoner ved mount
    loadNotifications();

    // Poll for nye notifikasjoner hvert 5. sekund
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const url = lastCheckedId
        ? `/api/pvp-notifications?lastCheckedId=${lastCheckedId}`
        : "/api/pvp-notifications";
      const response = await fetch(url);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.notifications) {
          const newNotifications = result.notifications.filter(
            (n: PvpNotification) => !notifications.find((existing) => existing.id === n.id)
          );

          if (newNotifications.length > 0) {
            setNotifications((prev) => [...newNotifications, ...prev].slice(0, 10)); // Hold maks 10
            setLastCheckedId(newNotifications[0].id); // Oppdater siste sjekket ID
          }
        }
      }
    } catch (error) {
      console.error("Error loading PvP notifications:", error);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (!isVisible || notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className={`rounded-lg border p-4 shadow-lg ${
              notification.defenderWon
                ? "bg-emerald-900/90 border-emerald-500/50"
                : "bg-red-900/90 border-red-500/50"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                {notification.defenderWon ? (
                  <FaTrophy className="text-yellow-400 text-2xl" />
                ) : (
                  <FaSkull className="text-red-400 text-2xl" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-bold text-white text-sm">
                    {notification.defenderWon ? "Seier!" : "Nederlag"}
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                </div>
                <div className="text-xs text-slate-300">
                  <div>
                    {notification.attackerName} (Level {notification.attackerLevel}) angrep deg
                  </div>
                  <div className="mt-1">
                    {notification.defenderWon ? (
                      <span className="text-emerald-300">
                        Du forsvarte basen din! Du tok {notification.damageDealt.toFixed(1)} skade,
                        men overlevde.
                      </span>
                    ) : (
                      <span className="text-red-300">
                        Basen din ble ødelagt! Du tok {notification.damageDealt.toFixed(1)} skade.
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-slate-400">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                      locale: nb,
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
