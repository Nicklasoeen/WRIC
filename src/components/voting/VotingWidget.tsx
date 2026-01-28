"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getActiveVote,
  getUserVotes,
  castVote,
  getVoteResults,
  Vote,
  VoteOption,
} from "@/app/actions/voting";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { FaPlus, FaCheck } from "react-icons/fa";

export function VotingWidget() {
  const [vote, setVote] = useState<(Vote & { options: VoteOption[] }) | null>(null);
  const [userVotes, setUserVotes] = useState<Record<string, number>>({});
  const [totalUserVotes, setTotalUserVotes] = useState<number>(0);
  const [results, setResults] = useState<
    Array<{ optionId: string; optionName: string; voteCount: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadVote();
  }, []);

  async function loadVote() {
    setLoading(true);
    setError(null);

    try {
      const voteResult = await getActiveVote();
      if (voteResult.success && voteResult.vote) {
        setVote(voteResult.vote);

        // Hent brukerens stemmer
        const userVotesResult = await getUserVotes(voteResult.vote.id);
        if (userVotesResult.success) {
          setUserVotes(userVotesResult.votes || {});
          setTotalUserVotes(userVotesResult.totalVotes || 0);
        }

        // Hent resultater
        const resultsResult = await getVoteResults(voteResult.vote.id);
        if (resultsResult.success && resultsResult.results) {
          setResults(resultsResult.results);
        }
      } else {
        setError(voteResult.error || "Ingen aktiv vote for øyeblikket");
      }
    } catch (err) {
      console.error("Error loading vote:", err);
      setError("Kunne ikke laste vote");
    } finally {
      setLoading(false);
    }
  }

  async function handleVote(optionId: string) {
    if (!vote) return;

    setError(null);
    setSuccess(null);

    // Optimistic update
    const previousVotes = { ...userVotes };
    const previousTotal = totalUserVotes;
    const previousResults = [...results];

    // Oppdater lokalt først
    setUserVotes((prev) => ({
      ...prev,
      [optionId]: (prev[optionId] || 0) + 1,
    }));
    setTotalUserVotes((prev) => prev + 1);

    // Oppdater resultater lokalt
    setResults((prev) => {
      const updated = prev.map((r) =>
        r.optionId === optionId
          ? { ...r, voteCount: r.voteCount + 1 }
          : r
      );
      return updated;
    });

    startTransition(async () => {
      const result = await castVote(vote.id, optionId);

      if (result.success) {
        setSuccess(`+${result.xpEarned || 10} XP!`);

        // Varsle resten av appen om at XP/level er oppdatert
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("level-updated"));
        }

        // Reload vote data for å synkronisere
        setTimeout(async () => {
          await loadVote();
          setTimeout(() => setSuccess(null), 2000);
        }, 500);
      } else {
        // Revert optimistic update ved feil
        setUserVotes(previousVotes);
        setTotalUserVotes(previousTotal);
        setResults(previousResults);
        setError(result.error || "Kunne ikke stemme");
      }
    });
  }

  const getVotesRemaining = () => {
    if (!vote) return 0;
    return vote.maxVotesPerUser - totalUserVotes;
  };

  const getVotesForOption = (optionId: string) => {
    return userVotes[optionId] || 0;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400 py-12">
        <div className="animate-pulse">Laster vote...</div>
      </div>
    );
  }

  if (error && !vote) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">{error}</p>
        <p className="text-sm text-slate-500 mt-2">
          Admin må opprette en vote for denne uken
        </p>
      </div>
    );
  }

  if (!vote) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Ingen aktiv vote for øyeblikket</p>
        <p className="text-sm text-slate-500 mt-2">
          Admin må opprette en vote for denne uken
        </p>
      </div>
    );
  }

  const votesRemaining = getVotesRemaining();

  return (
    <div className="space-y-6">
      {/* Vote info */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{vote.title}</h2>
        {vote.description && (
          <p className="text-slate-300 mb-4">{vote.description}</p>
        )}
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span>
            Uke: {format(new Date(vote.weekStartDate), "d. MMM", { locale: nb })} -{" "}
            {format(new Date(vote.weekEndDate), "d. MMM", { locale: nb })}
          </span>
          <span>•</span>
          <span>
            {totalUserVotes} av {vote.maxVotesPerUser} stemmer brukt ({votesRemaining} igjen)
          </span>
        </div>
      </div>

      {/* Meldinger */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400 animate-in fade-in slide-in-from-top-2">
          {success}
        </div>
      )}

      {/* Vote options */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Stem på:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {vote.options.map((option) => {
            const userVoteCount = getVotesForOption(option.id);
            const optionResult = results.find((r) => r.optionId === option.id);
            const voteCount = optionResult?.voteCount || 0;
            const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
            const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
            const canVote = votesRemaining > 0 && !isPending;

            return (
              <div
                key={option.id}
                className={`relative p-4 rounded-xl border-2 transition-all ${
                  userVoteCount > 0
                    ? "bg-indigo-600/20 border-indigo-500"
                    : "bg-slate-700/40 border-slate-600"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Venstre side - Navn og info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-white text-lg">
                        {option.optionName}
                      </span>
                      {userVoteCount > 0 && (
                        <span className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-full flex items-center gap-1">
                          <FaCheck size={10} />
                          {userVoteCount}
                        </span>
                      )}
                    </div>
                    {option.description && (
                      <p className="text-sm text-slate-400 mb-3">{option.description}</p>
                    )}
                    
                    {/* Resultat bar */}
                    {totalVotes > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span>{voteCount} stemmer</span>
                          <span>{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Høyre side - Stemme knapp */}
                  <button
                    onClick={() => handleVote(option.id)}
                    disabled={!canVote}
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      canVote
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-110 active:scale-95"
                        : "bg-slate-600 text-slate-400 cursor-not-allowed"
                    }`}
                    title={canVote ? "Legg til stemme (+10 XP)" : "Ingen stemmer igjen"}
                  >
                    <FaPlus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Resultater oversikt */}
      {results.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">Resultater</h3>
          <div className="space-y-2">
            {results.map((result, index) => {
              const totalVotes = results.reduce((sum, r) => sum + r.voteCount, 0);
              const percentage = totalVotes > 0 ? (result.voteCount / totalVotes) * 100 : 0;

              return (
                <div
                  key={result.optionId}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30"
                >
                  <span className="text-lg font-bold text-slate-400 w-6">
                    #{index + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-white">{result.optionName}</span>
                      <span className="text-sm text-slate-400">
                        {result.voteCount} stemmer ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
