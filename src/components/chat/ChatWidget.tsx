"use client";

import { useEffect, useState, useRef } from "react";
import { sendChatMessage, deleteChatMessage, ChatMessage } from "@/app/actions/chat";
import { format, isSameDay, differenceInDays } from "date-fns";
import { nb } from "date-fns/locale";
import { useTransition } from "react";
import { BadgeIcon } from "@/components/badges/BadgeIcon";
import { FaBars, FaPaperclip } from "react-icons/fa";

interface UserBadge {
  icon: string;
  color: string;
  name: string;
}

export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const shouldAutoScroll = useRef(true);
  const [userBadges, setUserBadges] = useState<Record<string, UserBadge>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Hent current user ID
    fetch("/api/user-status")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.userId) {
          setCurrentUserId(data.data.userId);
        }
      })
      .catch(console.error);

    loadMessages();
    // Oppdater meldinger hvert 2. sekund for live-oppdatering
    const interval = setInterval(() => {
      loadMessages();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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

  useEffect(() => {
    // Scroll til bunnen kun hvis brukeren ikke har scrollet opp
    if (shouldAutoScroll.current && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  async function loadMessages() {
    try {
      const response = await fetch("/api/chat?limit=50");
      const result = await response.json();

      if (result.success && result.data) {
        // Sjekk om brukeren er nederst før oppdatering
        if (messagesContainerRef.current) {
          const container = messagesContainerRef.current;
          const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
          shouldAutoScroll.current = isNearBottom;
        }
        
        const newMessages = result.data as ChatMessage[];
        setMessages(newMessages);

        // Hent badges for alle brukere i meldingene
        const userIds: string[] = [...new Set(newMessages.map((msg) => msg.userId))];
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
      gray: "text-slate-300",
      yellow: "text-yellow-400",
      silver: "text-slate-200",
      green: "text-green-400",
    };
    return colorMap[color] || "text-slate-300";
  };

  const getBadgeBgColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      brown: "bg-amber-900/40",
      orange: "bg-orange-900/40",
      red: "bg-red-900/40",
      pink: "bg-pink-900/40",
      blue: "bg-blue-900/40",
      purple: "bg-purple-900/40",
      gold: "bg-yellow-900/40",
      gray: "bg-slate-700/40",
      yellow: "bg-yellow-900/40",
      silver: "bg-slate-600/40",
      green: "bg-green-900/40",
    };
    return colorMap[color] || "bg-slate-700/40";
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

    setError(null);
    const messageText = newMessage;
    setNewMessage("");

    startTransition(async () => {
      shouldAutoScroll.current = true;
      
      const result = await sendChatMessage(messageText);

      if (result.success) {
        await loadMessages();
      } else {
        setError(result.error || "Kunne ikke sende melding");
        setNewMessage(messageText);
      }
    });
  };

  const isOwnMessage = (userId: string) => {
    return currentUserId === userId;
  };

  // Grupper meldinger med dato-separatorer
  const groupMessagesWithDates = () => {
    if (messages.length === 0) return [];
    
    const grouped: Array<{ type: 'date' | 'message'; date?: Date; message?: ChatMessage }> = [];
    let lastDate: Date | null = null;

    messages.forEach((msg, index) => {
      const msgDate = new Date(msg.createdAt);
      
      // Legg til dato-separator hvis det er ny dag
      if (!lastDate || !isSameDay(msgDate, lastDate)) {
        grouped.push({ type: 'date', date: msgDate });
        lastDate = msgDate;
      }
      
      grouped.push({ type: 'message', message: msg });
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <div className="animate-pulse">Laster chat...</div>
      </div>
    );
  }

  const groupedItems = groupMessagesWithDates();

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-900/50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Live Chat
        </h2>
        <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <FaBars size={18} />
        </button>
      </div>

      {/* Meldinger */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/50"
      >
        {groupedItems.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p className="text-lg">Ingen meldinger ennå.</p>
            <p className="text-sm mt-2">Vær den første til å skrive!</p>
          </div>
        ) : (
          groupedItems.map((item, index) => {
            if (item.type === 'date') {
              // Dato-separator
              const date = item.date!;
              const today = new Date();
              const daysDiff = differenceInDays(today, date);
              
              let dateText = format(date, "EEEE, d. MMMM", { locale: nb });
              if (daysDiff === 0) {
                dateText = "I dag";
              } else if (daysDiff === 1) {
                dateText = "I går";
              }

              return (
                <div key={`date-${date.getTime()}`} className="flex justify-center my-4">
                  <span className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full">
                    {dateText}
                  </span>
                </div>
              );
            }

            // Melding
            const msg = item.message!;
            const badge = userBadges[msg.userId];
            const isOwn = isOwnMessage(msg.userId);

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar (kun for inkommende meldinger) */}
                {!isOwn && (
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      badge
                        ? `${getBadgeBgColorClass(badge.color)}`
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    {badge ? (
                      <BadgeIcon
                        icon={badge.icon}
                        className={`${getBadgeColorClass(badge.color)} text-lg`}
                        size={20}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-slate-400 dark:bg-slate-500" />
                    )}
                  </div>
                )}

                {/* Melding boble */}
                <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  <div
                    className={`rounded-2xl px-4 py-2 ${
                      isOwn
                        ? "bg-amber-100 dark:bg-amber-900/30 rounded-br-sm"
                        : "bg-purple-100 dark:bg-purple-900/30 rounded-bl-sm"
                    }`}
                  >
                    <p className="text-slate-900 dark:text-slate-100 text-sm whitespace-pre-wrap break-words">
                      {msg.message}
                    </p>
                  </div>
                  
                  {/* Navn og tid */}
                  <div className={`flex items-center gap-2 mt-1 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {!isOwn && (
                      <span
                        className={`text-xs font-medium ${
                          badge
                            ? getBadgeColorClass(badge.color)
                            : "text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {msg.userName}
                      </span>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-500">
                      {format(new Date(msg.createdAt), "HH:mm", { locale: nb })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Feilmelding */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Legg til vedlegg"
          >
            <FaPaperclip size={18} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv en melding..."
            maxLength={1000}
            className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isPending}
            className="px-6 py-2.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white rounded-full font-medium transition-all"
          >
            {isPending ? "Sender..." : "Send"}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400 text-center">
          {newMessage.length}/1000 tegn
        </p>
      </form>
    </div>
  );
}
