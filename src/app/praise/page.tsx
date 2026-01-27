import { redirect } from "next/navigation";
import { getSession } from "@/app/actions/auth";
import { PraiseButton } from "@/components/praise/PraiseButton";
import { TopPraisers } from "@/components/praise/TopPraisers";

export default async function PraisePage() {
  const session = await getSession();

  if (!session.isAuthenticated) {
    redirect("/");
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">
            Praise the Founding Fathers
          </h1>
          <p className="mt-2 text-slate-400">
            Gi din hyllest til grunnleggerne og tjen XP
          </p>
        </div>

        {/* Hovedinnhold - To kolonner */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Venstre side - Bilde og Praise-knapp */}
          <div className="lg:col-span-2">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-10">
              {/* Bilde */}
              <div className="mb-6 flex justify-center">
                <div className="relative h-[500px] w-[500px] overflow-hidden rounded-lg border-4 border-yellow-500 shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/image (5).png"
                    alt="Founding Fathers"
                    className="h-full w-full object-cover"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              </div>

              {/* Tekst */}
              <div className="mb-8 text-center">
                <h2 className="mb-4 text-2xl font-bold text-white">
                  Hyll grunnleggerne
                </h2>
                <p className="text-slate-300">
                  Gi din hyllest og tjen XP. Du kan gi praise 3 ganger per dag.
                </p>
              </div>

              {/* Praise-knapp */}
              <div className="flex justify-center">
                <PraiseButton />
              </div>
            </div>
          </div>

          {/* Høyre side - Top Praisers */}
          <div className="lg:col-span-1">
            <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-6 sticky top-24">
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-white mb-2">
                  Top Praisers of the Month
                </h2>
                <p className="text-sm text-slate-400">
                  De som har gitt flest praises denne måneden
                </p>
              </div>
              <TopPraisers />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
