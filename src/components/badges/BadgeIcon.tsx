"use client";

import { 
  FaUser, FaStar, FaTrophy, FaGem, FaCrown, FaFire, FaBolt,
  FaHammer, FaSeedling, FaLock, FaPiggyBank, FaHardHat, FaDollarSign
} from "react-icons/fa";
import { HiStar } from "react-icons/hi";

interface BadgeIconProps {
  icon: string;
  className?: string;
  size?: number;
}

/**
 * Komponent for å vise badge-ikoner fra react-icons
 * Støtter format: "fa:FaUser", "hi:HiStar", etc.
 */
export function BadgeIcon({ icon, className = "", size = 20 }: BadgeIconProps) {
  // Håndter både nye format (fa:FaHammer) og gamle emojis (fallback)
  if (!icon || typeof icon !== "string") {
    return <FaHammer className={className} size={className.includes("text-") ? undefined : size} />;
  }

  const iconMap: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
    // Font Awesome icons - Nye badges
    "fa:FaHammer": FaHammer,
    "fa:FaSeedling": FaSeedling,
    "fa:FaLock": FaLock,
    "fa:FaPiggyBank": FaPiggyBank,
    "fa:FaHardHat": FaHardHat,
    "fa:FaDollarSign": FaDollarSign,
    "fa:FaCrown": FaCrown,
    // Gamle ikoner (fallback)
    "fa:FaUser": FaUser,
    "fa:FaStar": FaStar,
    "fa:FaTrophy": FaTrophy,
    "fa:FaGem": FaGem,
    "fa:FaFire": FaFire,
    "fa:FaBolt": FaBolt,
    // Heroicons
    "hi:HiStar": HiStar,
    // Fallback for gamle emojis (hvis de fortsatt finnes i DB)
    "👤": FaUser,
    "⭐": FaStar,
    "🌟": FaTrophy,
    "💎": FaGem,
    "👑": FaCrown,
    "🔥": FaFire,
    "⚡": FaBolt,
  };

  const IconComponent = iconMap[icon] || FaHammer; // Fallback til FaHammer hvis ikke funnet

  // Hvis className inneholder text-4xl eller lignende, ignorer size prop
  const finalSize = className.includes("text-") ? undefined : size;

  return <IconComponent className={className} size={finalSize} />;
}
