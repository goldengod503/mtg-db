"use client";

import Link from "next/link";
import { CATEGORIES } from "@/lib/utils";

interface DeckCardEntry {
  deckCard: {
    id: number;
    deck_id: number;
    card_id: string;
    quantity: number;
    category: string;
    custom_tag: string | null;
  };
  card: {
    id: string;
    name: string;
    mana_cost: string | null;
    cmc: number | null;
    type_line: string | null;
    types: string | null;
    colors: string | null;
    image_uri_small: string | null;
    rarity: string | null;
    price_tcg_player: number | null;
    legalities: string | null;
  };
}

interface DeckCardListProps {
  cards: DeckCardEntry[];
  groupBy: "category" | "type" | "cmc" | "color";
  format: string | null;
  commanderId: string | null;
  onRemoveCard: (entryId: number) => void;
  onUpdateCard: (entryId: number, updates: Record<string, unknown>) => void;
  onSetCommander: (cardId: string) => void;
}

function groupCards(cards: DeckCardEntry[], groupBy: string): Record<string, DeckCardEntry[]> {
  const groups: Record<string, DeckCardEntry[]> = {};

  for (const entry of cards) {
    let key: string;
    switch (groupBy) {
      case "type": {
        const types = entry.card.types?.split(",") || ["Other"];
        key = types[0] || "Other";
        break;
      }
      case "cmc":
        key = entry.card.cmc != null ? String(Math.floor(entry.card.cmc)) : "X";
        break;
      case "color": {
        const colors = entry.card.colors || "";
        key = colors || "Colorless";
        break;
      }
      default:
        key = entry.deckCard.category || "main";
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }

  // Sort entries within each group by name
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.card.name.localeCompare(b.card.name));
  }

  return groups;
}

function isLegal(card: DeckCardEntry["card"], format: string | null): boolean {
  if (!format || !card.legalities) return true;
  try {
    const legalities = JSON.parse(card.legalities);
    return legalities[format] === "legal" || legalities[format] === "restricted";
  } catch {
    return true;
  }
}

export function DeckCardList({
  cards,
  groupBy,
  format,
  commanderId,
  onRemoveCard,
  onUpdateCard,
  onSetCommander,
}: DeckCardListProps) {
  const groups = groupCards(cards, groupBy);
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    if (groupBy === "category") {
      const order = CATEGORIES as readonly string[];
      return order.indexOf(a) - order.indexOf(b);
    }
    if (groupBy === "cmc") return (parseInt(a) || 99) - (parseInt(b) || 99);
    return a.localeCompare(b);
  });

  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 bg-gray-900 rounded-xl border border-gray-800">
        <p>No cards in deck yet</p>
        <p className="text-sm mt-1">Use the search panel to add cards</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedKeys.map((key) => {
        const entries = groups[key];
        const count = entries.reduce((s, e) => s + e.deckCard.quantity, 0);
        return (
          <div key={key} className="bg-gray-900 rounded-xl border border-gray-800">
            <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
              <h4 className="font-semibold text-sm capitalize">{key}</h4>
              <span className="text-xs text-gray-400">{count} cards</span>
            </div>
            <div className="divide-y divide-gray-800/50">
              {entries.map((entry) => {
                const legal = isLegal(entry.card, format);
                const isCommander = entry.card.id === commanderId;
                return (
                  <div
                    key={entry.deckCard.id}
                    className={`flex items-center gap-2 px-4 py-1.5 hover:bg-gray-800/50 text-sm ${!legal ? "opacity-60" : ""}`}
                  >
                    <span className="text-gray-400 w-6 text-center">{entry.deckCard.quantity}x</span>
                    <Link href={`/cards/${entry.card.id}`} className="flex-1 hover:text-blue-400 truncate">
                      {entry.card.name}
                    </Link>
                    {isCommander && (
                      <span className="text-yellow-400 text-xs px-1 border border-yellow-400/30 rounded">CMD</span>
                    )}
                    {!legal && (
                      <span className="text-red-400 text-xs">Banned</span>
                    )}
                    <span className="text-gray-500 text-xs">{entry.card.mana_cost}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          if (entry.deckCard.quantity <= 1) onRemoveCard(entry.deckCard.id);
                          else onUpdateCard(entry.deckCard.id, { quantity: entry.deckCard.quantity - 1 });
                        }}
                        className="w-5 h-5 bg-gray-700 rounded text-xs hover:bg-gray-600 flex items-center justify-center"
                      >
                        -
                      </button>
                      <button
                        onClick={() => onUpdateCard(entry.deckCard.id, { quantity: entry.deckCard.quantity + 1 })}
                        className="w-5 h-5 bg-gray-700 rounded text-xs hover:bg-gray-600 flex items-center justify-center"
                      >
                        +
                      </button>
                      {format === "commander" && !isCommander && entry.card.type_line?.includes("Legendary") && entry.card.type_line?.includes("Creature") && (
                        <button
                          onClick={() => onSetCommander(entry.card.id)}
                          className="text-yellow-400/60 hover:text-yellow-400 text-xs ml-1"
                          title="Set as Commander"
                        >
                          CMD
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveCard(entry.deckCard.id)}
                        className="text-red-400/60 hover:text-red-400 text-xs ml-1"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
