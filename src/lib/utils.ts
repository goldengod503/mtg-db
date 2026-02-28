export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}

export const COLOR_MAP: Record<string, { name: string; bg: string; text: string; hex: string }> = {
  W: { name: "White", bg: "bg-amber-100", text: "text-amber-900", hex: "#F9FAF4" },
  U: { name: "Blue", bg: "bg-blue-200", text: "text-blue-900", hex: "#0E68AB" },
  B: { name: "Black", bg: "bg-gray-800", text: "text-gray-100", hex: "#150B00" },
  R: { name: "Red", bg: "bg-red-200", text: "text-red-900", hex: "#D3202A" },
  G: { name: "Green", bg: "bg-green-200", text: "text-green-900", hex: "#00733E" },
};

export const FORMATS = [
  "standard",
  "pioneer",
  "modern",
  "legacy",
  "vintage",
  "commander",
  "pauper",
  "historic",
  "explorer",
  "brawl",
] as const;

export const RARITIES = ["common", "uncommon", "rare", "mythic"] as const;

export const CONDITIONS = ["NM", "LP", "MP", "HP", "DMG"] as const;

export const FINISHES = ["Normal", "Foil", "Etched"] as const;

export const CATEGORIES = ["main", "sideboard", "maybeboard", "companion"] as const;
