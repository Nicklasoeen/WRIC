"use client";

import { useEffect, useState, useRef } from "react";
import { sendChatMessage, deleteChatMessage, ChatMessage } from "@/app/actions/chat";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { useTransition } from "react";

export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
    // Oppdater meldinger hvert 2. sekund for live-oppdatering
    const interval = setInterval(loadMessages, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Scroll til bunnen når nye meldinger kommer
    scrollToBottom();
  }, [messages]);

  async function loadMessages() {
    try {
      const response = await fetch("/api/chat?limit=50");
      const result = await response.json();

      if (result.success && result.data) {
        setMessages(result.data);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isPending) return;

    setError(null);
    const messageText = newMessage;
    setNewMessage("");

    startTransition(async () => {
      const result = await sendChatMessage(messageText);

      if (result.success) {
        // Last meldinger på nytt for å få oppdatert liste
        await loadMessages();
      } else {
        setError(result.error || "Kunne ikke sende melding");
        setNewMessage(messageText); // Gjenopprett melding hvis feil
      }
    });
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm("Er du sikker på at du vil slette denne meldingen?")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteChatMessage(messageId);
      if (result.success) {
        await loadMessages();
      } else {
        alert(result.error || "Kunne ikke slette melding");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        Laster chat...
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Meldinger */}
      <div className="flex-1 overflow-y-auto space-y-3 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <p>Ingen meldinger ennå.</p>
            <p className="text-sm mt-2">Vær den første til å skrive!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className="group rounded-lg bg-slate-700/50 border border-slate-600 p-3 hover:bg-slate-700/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm">
                      {msg.userName}
                    </span>
                    <span className="text-xs text-slate-400">
                      {format(new Date(msg.createdAt), "HH:mm", { locale: nb })}
                    </span>
                  </div>
                  <p className="text-slate-200 text-sm break-words">{msg.message}</p>
                </div>
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs px-2 py-1 transition-opacity"
                  title="Slett melding"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Feilmelding */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="border-t border-slate-700 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Skriv en melding..."
            maxLength={1000}
            className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            disabled={isPending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isPending}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
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
