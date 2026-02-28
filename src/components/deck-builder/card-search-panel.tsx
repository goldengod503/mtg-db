"use client";

import { useState } from "react";
import { SearchInput } from "@/components/ui/search-input";
import { CATEGORIES } from "@/lib/utils";

interface CardResult {
  id: string;
  name: string;
  mana_cost: string | null;
  cmc: number | null;
  type_line: string | null;
  image_uri_small: string | null;
  set_code: string | null;
  rarity: string | null;
  legalities: string | null;
}

interface CardSearchPanelProps {
  onAddCard: (cardId: string, category?: string) => void;
  deckFormat: string | null;
}

export function CardSearchPanel({ onAddCard, deckFormat }: CardSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("main");

  const search = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams({ q, limit: "20" });
    if (deckFormat) params.set("format", deckFormat);
    const res = await fetch(`/api/cards?${params}`);
    const data = await res.json();
    setResults(data.cards || []);
    setLoading(false);
  };

  const isLegal = (card: CardResult) => {
    if (!deckFormat || !card.legalities) return true;
    try {
      const legalities = JSON.parse(card.legalities);
      return legalities[deckFormat] === "legal" || legalities[deckFormat] === "restricted";
    } catch {
      return true;
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
      <h3 className="font-semibold text-sm">Add Cards</h3>

      <SearchInput value={query} onChange={search} placeholder="Search cards to add..." />

      <div className="flex gap-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-2 py-1 rounded text-xs capitalize ${
              category === c ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="max-h-[60vh] overflow-y-auto space-y-1">
        {loading && <p className="text-gray-500 text-sm text-center py-2">Searching...</p>}
        {results.map((card) => {
          const legal = isLegal(card);
          return (
            <button
              key={card.id}
              onClick={() => onAddCard(card.id, category)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800 text-left text-sm ${
                !legal ? "opacity-50" : ""
              }`}
            >
              {card.image_uri_small && (
                <img src={card.image_uri_small} alt="" className="w-8 h-11 object-cover rounded flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{card.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {card.mana_cost && `${card.mana_cost} `}
                  {card.type_line}
                </p>
              </div>
              {!legal && (
                <span className="text-red-400 text-xs flex-shrink-0">Banned</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
