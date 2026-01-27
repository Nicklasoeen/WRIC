import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { AddHolding } from "@/components/portfolio/AddHolding";
import { HoldingsList } from "@/components/portfolio/HoldingsList";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Innstillinger</h1>
          <p className="mt-2 text-slate-400">
            Administrer dine widget-tilkoblinger
          </p>
        </div>

        <div className="space-y-6">
          {/* Portefølje-seksjon */}
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">
                Portefølje – Track & Follow
              </h2>
              <p className="text-sm text-slate-400">
                Registrer dine kjøp manuelt og følg porteføljen din med
                offentlig tilgjengelige prisdata.
              </p>
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-400">
                  <strong>Hvordan det fungerer:</strong>
                </p>
                <ul className="mt-2 ml-4 list-disc text-xs text-blue-300 space-y-1">
                  <li>Søk etter aksjer eller fond nedenfor</li>
                  <li>Legg inn kjøpsdato, antall og kjøpspris</li>
                  <li>Prisdata hentes fra Yahoo Finance (offentlig API)</li>
                  <li>Data oppdateres automatisk hvert 5. minutt</li>
                  <li>Se gevinst/tap og porteføljeverdi i dashboardet</li>
                </ul>
              </div>
            </div>
            <AddHolding />
          </div>

          {/* Eksisterende kjøp */}
          <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">
                Dine kjøp
              </h2>
              <p className="text-sm text-slate-400">
                Oversikt over alle registrerte kjøp
              </p>
            </div>
            <HoldingsList />
          </div>
        </div>
      </div>
    </div>
  );
}
