"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";

interface ExplosionAnimationProps {
  isActive: boolean;
  onComplete?: () => void;
}

// Steg 3 (feil passord 3 ganger) – portene lukkes og alt fade'r til svart
export function ExplosionAnimation({
  isActive,
  onComplete,
}: ExplosionAnimationProps) {
  useEffect(() => {
    if (!isActive) return;

    const timer = setTimeout(() => {
      onComplete?.();
    }, 2600);

    return () => clearTimeout(timer);
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden pointer-events-none">
      {/* Portene som lukkes og zoomer sakte ut */}
      <motion.div
        initial={{ scale: 1.05, opacity: 1 }}
        animate={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 2.2, ease: "easeInOut" }}
        className="absolute inset-0"
      >
        <Image
          src="/closed-gate.png"
          alt="Portene lukkes – ingen tilgang"
          fill
          priority
          quality={100}
          className="object-cover"
        />
      </motion.div>

      {/* Mørk fade til svart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.8, ease: "easeIn" }}
        className="absolute inset-0 bg-black"
      />

      {/* Tekst: Du har ikke tilgang */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.8, ease: "easeOut" }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="px-6 text-center">
          <p className="text-2xl md:text-3xl font-black text-red-500 drop-shadow-[0_0_25px_rgba(248,113,113,0.9)]">
            Du har ikke tilgang, ha deg vekk!!
          </p>
        </div>
      </motion.div>
    </div>
  );
}
