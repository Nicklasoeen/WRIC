"use client";

import { useEffect, useState, useRef } from "react";
import { sendChatMessage, ChatMessage } from "@/app/actions/chat";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useTransition } from "react";
import Link from "next/link";
import { BadgeIcon } from "@/components/badges/BadgeIcon";

interface UserBadge {
  icon: string;
  color: string;
  name: string;
}

export function ChatWidgetCompact() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);
  const [userBadges, setUserBadges] = useState<Record<string, UserBadge>>({});

  useEffect(() => {
    loadMessages();
    // Oppdater meldinger hvert 3. sekund for live-oppdatering
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll til bunnen kun hvis brukeren ikke har scrollet opp
    if (shouldAutoScroll.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      // Bruk scrollTop direkte i stedet for scrollIntoView for å unngå side-scroll
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // Oppdater badges når meldinger endres (i tilfelle noen har fått ny badge)
  useEffect(() => {
    if (messages.length > 0) {
      const userIds = [...new Set(messages.map((msg) => msg.userId))];
      if (userIds.length > 0) {
        loadUserBadges(userIds).catch(() => {});
      }
    }
  }, [messages]);

  // Oppdater badges periodisk (hvert 10. sekund) for å fange opp nye badges
  useEffect(() => {
    if (messages.length === 0) return;
    
    const userIds = [...new Set(messages.map((msg) => msg.userId))];
    if (userIds.length === 0) return;

    const badgeInterval = setInterval(() => {
      loadUserBadges(userIds).catch(() => {});
    }, 10000); // Oppdater badges hvert 10. sekund
    
    return () => clearInterval(badgeInterval);
  }, [messages]);

  async function loadMessages() {
    try {
      const response = await fetch("/api/chat?limit=5");
      const result = await response.json();

      if (result.success && result.data) {
        // Sjekk om brukeren er nederst før oppdatering
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
          shouldAutoScroll.current = isNearBottom;
        }
        
        const messages = result.data as ChatMessage[];
        setMessages(messages);

        // Hent badges for alle brukere i meldingene
        const userIds: string[] = [...new Set(messages.map((msg) => msg.userId))];
        if (userIds.length > 0) {
          loadUserBadges(userIds);
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserBadges(userIds: string[]) {
    try {
      // Legg til cache-busting for å sikre at vi får oppdaterte badges
      const response = await fetch(`/api/chat-users?userIds=${userIds.join(",")}&_t=${Date.now()}`);
      const result = await response.json();
      if (result.success && result.data) {
        setUserBadges(result.data);
      }
    } catch (err) {
      console.error("Error loading user badges:", err);
    }
  }

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
      gray: "text-slate-300",
      yellow: "text-yellow-400",
      silver: "text-slate-200",
      green: "text-green-400",
    };
    return colorMap[color] || "text-slate-300";
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      shouldAutoScroll.current = isNearBottom;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isPending) return;

    const messageText = newMessage;
    setNewMessage("");

    startTransition(async () => {
      // Når brukeren sender melding, skal vi alltid auto-scrolle
      shouldAutoScroll.current = true;
      
      const result = await sendChatMessage(messageText);
      if (result.success) {
        await loadMessages();
      } else {
        setNewMessage(messageText); // Gjenopprett melding hvis feil
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 text-sm">
        Laster chat...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header med link til full chat */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          Nylig aktivitet
        </h3>
        <Link
          href="/chat"
          className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Se alle →
        </Link>
      </div>

      {/* Meldinger (kompakt) */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-2 min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 text-xs py-4">
            <p>Ingen meldinger ennå.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-xl bg-slate-800/60 border border-slate-700/80 p-2"
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {userBadges[msg.userId] && (
                      <BadgeIcon
                        icon={userBadges[msg.userId].icon}
                        className={getBadgeColorClass(userBadges[msg.userId].color)}
                        size={14}
                      />
                    )}
                    <span
                      className={`font-medium text-xs ${
                        userBadges[msg.userId]
                          ? getBadgeColorClass(userBadges[msg.userId].color)
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {msg.userName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(msg.createdAt), "HH:mm", { locale: nb })}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs break-words line-clamp-2">
                    {msg.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input (kompakt) */}
      <form onSubmit={handleSend} className="mt-2 border-t border-slate-200 dark:border-slate-700 pt-2">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv melding..."
            maxLength={200}
            className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isPending}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
          >
            {isPending ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
