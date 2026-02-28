"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { DeckStats } from "@/components/deck-builder/deck-stats";
import { DeckCardList } from "@/components/deck-builder/deck-card-list";
import { CardSearchPanel } from "@/components/deck-builder/card-search-panel";
import { FORMATS } from "@/lib/utils";

interface DeckCard {
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
    oracle_text: string | null;
    type_line: string | null;
    types: string | null;
    colors: string | null;
    color_identity: string | null;
    rarity: string | null;
    image_uri: string | null;
    image_uri_small: string | null;
    set_code: string | null;
    price_tcg_player: number | null;
    power: string | null;
    toughness: string | null;
    legalities: string | null;
  };
}

interface Deck {
  id: number;
  name: string;
  format: string | null;
  description: string | null;
  commander_id: string | null;
  cover_image: string | null;
  cards: DeckCard[];
}

export default function DeckEditorPage() {
  const params = useParams();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editFormat, setEditFormat] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [groupBy, setGroupBy] = useState<"category" | "type" | "cmc" | "color">("category");

  const fetchDeck = useCallback(async () => {
    const res = await fetch(`/api/decks/${params.id}`);
    const data = await res.json();
    setDeck(data);
    setEditName(data.name);
    setEditFormat(data.format || "");
    setEditDescription(data.description || "");
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    fetchDeck();
  }, [fetchDeck]);

  const handleSave = async () => {
    await fetch(`/api/decks/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editName,
        format: editFormat || null,
        description: editDescription || null,
      }),
    });
    setEditing(false);
    fetchDeck();
  };

  const handleAddCard = async (cardId: string, category = "main") => {
    await fetch(`/api/decks/${params.id}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: cardId, category }),
    });
    fetchDeck();
  };

  const handleRemoveCard = async (entryId: number) => {
    await fetch(`/api/decks/${params.id}/cards?entryId=${entryId}`, {
      method: "DELETE",
    });
    fetchDeck();
  };

  const handleUpdateCard = async (entryId: number, updates: Record<string, unknown>) => {
    await fetch(`/api/decks/${params.id}/cards`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, ...updates }),
    });
    fetchDeck();
  };

  const handleSetCommander = async (cardId: string) => {
    await fetch(`/api/decks/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commander_id: cardId }),
    });
    fetchDeck();
  };

  const handleExport = (format: string) => {
    window.open(`/api/decks/${params.id}/export?format=${format}`, "_blank");
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!deck) {
    return <div className="text-center py-12 text-gray-500">Deck not found</div>;
  }

  const mainCards = deck.cards.filter((c) => c.deckCard.category === "main");
  const totalCards = mainCards.reduce((sum, c) => sum + c.deckCard.quantity, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-2xl font-bold bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white w-full"
              />
              <div className="flex gap-2">
                <select
                  value={editFormat}
                  onChange={(e) => setEditFormat(e.target.value)}
                  className="px-3 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                >
                  <option value="">No format</option>
                  {FORMATS.map((f) => (
                    <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm resize-none h-20"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-3 py-1 bg-green-600 rounded text-sm hover:bg-green-700">Save</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-700 rounded text-sm hover:bg-gray-600">Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold">{deck.name}</h1>
              <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                {deck.format && <span className="capitalize">{deck.format}</span>}
                <span>{totalCards} cards</span>
                <button onClick={() => setEditing(true)} className="text-blue-400 hover:underline">Edit</button>
              </div>
              {deck.description && <p className="text-gray-400 text-sm mt-2">{deck.description}</p>}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <select
            onChange={(e) => e.target.value && handleExport(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
            defaultValue=""
          >
            <option value="" disabled>Export...</option>
            <option value="text">Text</option>
            <option value="csv">CSV</option>
            <option value="mtgo">MTGO</option>
          </select>
        </div>
      </div>

      {/* Main content: search panel + deck contents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Card search panel */}
        <div className="lg:col-span-1">
          <CardSearchPanel
            onAddCard={handleAddCard}
            deckFormat={deck.format}
          />
        </div>

        {/* Deck contents */}
        <div className="lg:col-span-2 space-y-4">
          {/* Group by selector */}
          <div className="flex gap-2 text-sm">
            <span className="text-gray-400">Group by:</span>
            {(["category", "type", "cmc", "color"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGroupBy(g)}
                className={`px-2 py-1 rounded ${groupBy === g ? "bg-gray-700 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {g === "cmc" ? "Mana Value" : g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>

          <DeckCardList
            cards={deck.cards}
            groupBy={groupBy}
            format={deck.format}
            commanderId={deck.commander_id}
            onRemoveCard={handleRemoveCard}
            onUpdateCard={handleUpdateCard}
            onSetCommander={handleSetCommander}
          />

          <DeckStats cards={deck.cards} format={deck.format} />
        </div>
      </div>
    </div>
  );
}
