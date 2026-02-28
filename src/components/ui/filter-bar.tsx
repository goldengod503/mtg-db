"use client";

import { RARITIES, COLOR_MAP } from "@/lib/utils";

interface FilterBarProps {
  colors: string[];
  onColorsChange: (colors: string[]) => void;
  rarity: string;
  onRarityChange: (rarity: string) => void;
  type: string;
  onTypeChange: (type: string) => void;
  sort: string;
  onSortChange: (sort: string) => void;
  order: string;
  onOrderChange: (order: string) => void;
  sortOptions?: { value: string; label: string }[];
}

const TYPES = ["Creature", "Instant", "Sorcery", "Enchantment", "Artifact", "Planeswalker", "Land"];

export function FilterBar({
  colors,
  onColorsChange,
  rarity,
  onRarityChange,
  type,
  onTypeChange,
  sort,
  onSortChange,
  order,
  onOrderChange,
  sortOptions = [
    { value: "name", label: "Name" },
    { value: "cmc", label: "Mana Value" },
    { value: "price", label: "Price" },
    { value: "set", label: "Set" },
  ],
}: FilterBarProps) {
  const toggleColor = (c: string) => {
    onColorsChange(
      colors.includes(c) ? colors.filter((x) => x !== c) : [...colors, c]
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {/* Color filters */}
      <div className="flex items-center gap-1">
        <span className="text-gray-400 mr-1">Colors:</span>
        {Object.entries(COLOR_MAP).map(([code, info]) => (
          <button
            key={code}
            onClick={() => toggleColor(code)}
            className={`w-7 h-7 rounded-full border-2 text-xs font-bold flex items-center justify-center transition-all ${
              colors.includes(code)
                ? "border-white scale-110"
                : "border-gray-600 opacity-50 hover:opacity-80"
            }`}
            style={{ backgroundColor: info.hex, color: code === "B" ? "#fff" : code === "W" ? "#000" : "#fff" }}
            title={info.name}
          >
            {code}
          </button>
        ))}
      </div>

      {/* Rarity */}
      <select
        value={rarity}
        onChange={(e) => onRarityChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
      >
        <option value="">All Rarities</option>
        {RARITIES.map((r) => (
          <option key={r} value={r}>
            {r.charAt(0).toUpperCase() + r.slice(1)}
          </option>
        ))}
      </select>

      {/* Type */}
      <select
        value={type}
        onChange={(e) => onTypeChange(e.target.value)}
        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
      >
        <option value="">All Types</option>
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {/* Sort */}
      <div className="flex items-center gap-1 ml-auto">
        <span className="text-gray-400">Sort:</span>
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onOrderChange(order === "asc" ? "desc" : "asc")}
          className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white hover:bg-gray-700"
          title={order === "asc" ? "Ascending" : "Descending"}
        >
          {order === "asc" ? "↑" : "↓"}
        </button>
      </div>
    </div>
  );
}
