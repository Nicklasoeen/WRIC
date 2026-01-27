"use client";

import { useState, useTransition } from "react";
import { createUser, deleteUser, getAllUsers } from "@/app/actions/admin";

interface User {
  id: string;
  name: string;
  is_active: boolean;
  is_admin: boolean;
}

interface AdminPanelProps {
  initialUsers: User[];
}

export function AdminPanel({ initialUsers }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", password: "" });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.name || !formData.password) {
      setError("Navn og passord er påkrevd");
      return;
    }

    startTransition(async () => {
      const result = await createUser(formData.name, formData.password);
      if (result.success) {
        setSuccess(`Bruker "${formData.name}" ble opprettet!`);
        setFormData({ name: "", password: "" });
        setShowAddForm(false);
        // Oppdater brukerlisten
        const updatedUsers = await getAllUsers();
        setUsers(updatedUsers);
      } else {
        setError(result.error || "Kunne ikke opprette bruker");
      }
    });
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Er du sikker på at du vil deaktivere brukeren "${userName}"?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await deleteUser(userId);
      if (result.success) {
        setSuccess(`Bruker "${userName}" ble deaktivert`);
        // Oppdater brukerlisten
        const updatedUsers = await getAllUsers();
        setUsers(updatedUsers);
      } else {
        setError(result.error || "Kunne ikke fjerne bruker");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Meldinger */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-emerald-400">
          {success}
        </div>
      )}

      {/* Legg til bruker knapp */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-white">Brukere</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
        >
          {showAddForm ? "Avbryt" : "+ Legg til bruker"}
        </button>
      </div>

      {/* Legg til bruker skjema */}
      {showAddForm && (
        <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Legg til ny bruker
          </h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Navn
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brukerens navn"
                disabled={isPending}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Passord
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Brukerens passord"
                disabled={isPending}
              />
            </div>
            <button
              type="submit"
              disabled={isPending}
              className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isPending ? "Oppretter..." : "Opprett bruker"}
            </button>
          </form>
        </div>
      )}

      {/* Brukerliste */}
      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Navn
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Rolle
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Handlinger
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_active
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {user.is_active ? "Aktiv" : "Deaktivert"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.is_admin
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {user.is_admin ? "Admin" : "Bruker"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {!user.is_admin && user.is_active && (
                      <button
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        disabled={isPending}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Deaktiver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          Ingen brukere funnet
        </div>
      )}
    </div>
  );
}
