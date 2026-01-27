"use client";

import { useState, useTransition } from "react";
import { createVote } from "@/app/actions/voting";

export function CreateVoteForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Beregn uke-datoer (mandag til søndag)
  const getWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Mandag
    const monday = new Date(today.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  };

  const weekDates = getWeekDates();

  const [formData, setFormData] = useState({
    title: "Vote the traitor of the week",
    description: "",
    weekStartDate: weekDates.start,
    weekEndDate: weekDates.end,
    maxVotesPerUser: 3,
    options: ["", ""], // Minst 2 alternativer
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validOptions = formData.options.filter((opt) => opt.trim().length > 0);

    if (validOptions.length < 2) {
      setError("Minst 2 alternativer er påkrevd");
      return;
    }

    startTransition(async () => {
      const result = await createVote(
        formData.title,
        formData.description || null,
        formData.weekStartDate,
        formData.weekEndDate,
        formData.maxVotesPerUser,
        validOptions
      );

      if (result.success) {
        setSuccess("Vote opprettet!");
        setFormData({
          title: "Vote the traitor of the week",
          description: "",
          weekStartDate: weekDates.start,
          weekEndDate: weekDates.end,
          maxVotesPerUser: 3,
          options: ["", ""],
        });
        setShowForm(false);
      } else {
        setError(result.error || "Kunne ikke opprette vote");
      }
    });
  };

  const addOption = () => {
    setFormData({
      ...formData,
      options: [...formData.options, ""],
    });
  };

  const removeOption = (index: number) => {
    if (formData.options.length <= 2) {
      setError("Minst 2 alternativer er påkrevd");
      return;
    }
    setFormData({
      ...formData,
      options: formData.options.filter((_, i) => i !== index),
    });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
      >
        Opprett ny vote
      </button>
    );
  }

  return (
    <div className="mt-6 p-4 rounded-lg bg-slate-700/30 border border-slate-600">
      <h3 className="text-lg font-semibold text-white mb-4">Opprett ny vote</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Tittel
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Vote the traitor of the week"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Beskrivelse (valgfritt)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            rows={2}
            placeholder="Beskrivelse av vote..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Uke start (mandag)
            </label>
            <input
              type="date"
              value={formData.weekStartDate}
              onChange={(e) => setFormData({ ...formData, weekStartDate: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Uke slutt (søndag)
            </label>
            <input
              type="date"
              value={formData.weekEndDate}
              onChange={(e) => setFormData({ ...formData, weekEndDate: e.target.value })}
              required
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Maks stemmer per bruker
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={formData.maxVotesPerUser}
            onChange={(e) =>
              setFormData({ ...formData, maxVotesPerUser: parseInt(e.target.value) || 3 })
            }
            required
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Alternativer (minst 2)
          </label>
          <div className="space-y-2">
            {formData.options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  required
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={`Alternativ ${index + 1}`}
                />
                {formData.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Fjern
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addOption}
            className="mt-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"
          >
            + Legg til alternativ
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-2 text-sm text-green-400">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isPending ? "Oppretter..." : "Opprett vote"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setError(null);
              setSuccess(null);
            }}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Avbryt
          </button>
        </div>
      </form>
    </div>
  );
}
