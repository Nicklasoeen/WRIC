"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface WelcomeAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
}

// Denne animasjonen bruker det samme bakgrunnsbildet som login-siden
// og zoomer deg «inn i riket» gjennom portene med lys og bevegelse.
export function WelcomeAnimation({ isActive, onComplete }: WelcomeAnimationProps) {
  useEffect(() => {
    if (!isActive) return;

    // Litt kortere og mer forutsigbar varighet for jevnere følelse
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2600); // ~2.6s total

    return () => clearTimeout(timer);
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">
      {/* Steg 3 (riktig passord) – portene åpner seg og du zoomer inn */}
      <motion.div
        initial={{ scale: 1, opacity: 1 }}
        animate={{ scale: 1.18, opacity: 1 }}
        transition={{ duration: 2, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        <Image
          src="/open-gate.png"
          alt="Portene åpnes til riket"
          fill
          priority
          quality={100}
          className="object-cover"
          style={{
            filter: "brightness(1.1) contrast(1.1)",
          }}
        />

        {/* Lys som drar deg inn gjennom portene – én jevn animasjon */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 0.7, scale: 1.4 }}
          transition={{ duration: 1.8, ease: "easeOut", delay: 0.1 }}
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.35) 18%, rgba(255,255,255,0.08) 38%, transparent 65%)",
            mixBlendMode: "screen",
          }}
        />

        {/* Vertikal lysstråle i midten av portene */}
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{ opacity: 0.85, scaleY: 1.1 }}
          transition={{ duration: 1.4, delay: 0.15, ease: "easeOut" }}
          className="absolute left-1/2 top-0 bottom-0"
          style={{
            width: "5px",
            transform: "translateX(-50%)",
            background:
              "linear-gradient(to bottom, transparent, rgba(255,255,255,0.95), rgba(255,255,255,0.95), transparent)",
            boxShadow:
              "0 0 50px rgba(255,255,255,0.8), 0 0 120px rgba(255,255,255,0.7)",
          }}
        />

        {/* Lett vignette i ytterkantene så midten føles som port/åpning */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)",
          }}
        />
      </motion.div>

      {/* Subtil mørk vignette som øker fokus – statisk for å unngå hakking */}
      <div className="absolute inset-0 bg-black/30" />
    </div>
  );
}

