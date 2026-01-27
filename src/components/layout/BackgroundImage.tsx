"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";

export function BackgroundImage() {
  const pathname = usePathname();

  // Ikke vis bakgrunnsbildet på login-siden
  if (pathname === "/") {
    return null;
  }

  return (
    <div className="fixed inset-0 z-0">
      <Image
        src="/the-city.png"
        alt="Byen bak dashbordet"
        fill
        priority
        quality={100}
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/75" />
    </div>
  );
}
