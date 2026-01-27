"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { checkPassword } from "@/app/actions/auth";
import { ExplosionAnimation } from "./ExplosionAnimation";
import { WelcomeAnimation } from "./WelcomeAnimation";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(3);
  const [isExploding, setIsExploding] = useState(false);
  const [isWelcome, setIsWelcome] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await checkPassword(password);

      if (result.success) {
        // Vis velkommen-animasjon
        console.log("✅ Riktig passord - setter isWelcome til true");
        setIsWelcome(true);
        console.log("✅ isWelcome state er nå:", true);
        // Redirect håndteres av WelcomeAnimation onComplete (etter ~4 sekunder)
      } else {
        const remaining = result.attemptsRemaining ?? 0;
        setAttempts(remaining);

        if (remaining === 0) {
          // Eksplodere!
          console.log("💥 3 feil forsøk - viser eksplosjon-animasjon");
          setIsExploding(true);
          setError("3 feil forsøk! 💥");
          setTimeout(() => {
            setIsExploding(false);
            setAttempts(3);
          }, 2500);
        } else {
          setError(`Feil passord. ${remaining} forsøk igjen.`);
        }
        setPassword("");
      }
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden">
      {/* Steg 1 – portene er stengt */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/closed-gate.png"
          alt="Lukkede porter"
          fill
          priority
          quality={90}
          className="object-cover"
        />
        {/* Subtile overlay for bedre lesbarhet */}
        <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/20" />
      </div>

      {/* Steg 2 – portene åpner seg litt mens kodeordet sjekkes */}
      {isPending && !isExploding && !isWelcome && (
        <div className="absolute inset-0 z-10">
          <Image
            src="/half-open-gate.png"
            alt="Portene åpnes litt – sjekker kodeord"
            fill
            priority
            quality={90}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
      )}

      {/* Cinematic eksplosjon-animasjon (Access Denied) */}
      <ExplosionAnimation
        isActive={isExploding}
        onComplete={() => {
          setIsExploding(false);
          setAttempts(3);
        }}
      />

      {/* Cinematic velkommen-animasjon (Porter som åpner seg) */}
      <WelcomeAnimation
        isActive={isWelcome}
        onComplete={() => {
          console.log("🚪 onComplete kalt - redirecter til dashboard");
          // Vent litt ekstra før redirect for å være sikker
          setTimeout(() => {
            router.push("/dashboard");
            router.refresh();
          }, 500);
        }}
      />

      {/* Login-form – mer «gammeldags», som en plate foran portene */}
      <div className="relative w-full max-w-md z-10">
        <div className="rounded-2xl border border-yellow-700/60 bg-gradient-to-b from-black/70 via-black/80 to-black/95 px-8 py-7 shadow-[0_18px_45px_rgba(0,0,0,0.85)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label
                htmlFor="password"
                className="block text-[15px] font-semibold tracking-wide text-yellow-200"
              >
                Kodeord for å komme til rikdom
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-0 rounded-md border border-yellow-700/70" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isPending || isExploding}
                  className="w-full rounded-md bg-black/70 px-4 py-2.5 text-sm text-yellow-100 placeholder:text-yellow-700/70 focus:outline-none focus:ring-1 focus:ring-yellow-400/70 border border-yellow-900/60 shadow-inner shadow-black/80"
                  placeholder="Skriv kodeord..."
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div
                className={`rounded-xl px-4 py-3 text-sm font-medium backdrop-blur-sm ${
                  attempts === 0
                    ? "bg-red-500/20 text-red-200 border border-red-400/30"
                    : "bg-amber-500/20 text-amber-200 border border-amber-400/30"
                }`}
              >
                {error}
              </div>
            )}

            {attempts < 3 && attempts > 0 && (
              <div className="text-center text-sm text-white/70 drop-shadow">
                {attempts} forsøk igjen
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || isExploding || !password}
              className="w-full rounded-md border border-yellow-500/80 bg-gradient-to-b from-yellow-500 to-amber-600 px-4 py-2.5 text-sm font-semibold tracking-wide text-black shadow-[0_10px_30px_rgba(234,179,8,0.55)] transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Sjekker..." : "Åpne portene"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
