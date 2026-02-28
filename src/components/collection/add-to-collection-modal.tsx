"use client";

import { useState } from "react";
import { CONDITIONS, FINISHES } from "@/lib/utils";

interface CardResult {
  id: string;
  name: string;
  set_name: string;
  set_code: string;
  collector_number: string;
  image_uri_small: string | null;
  rarity: string;
}

interface AddToCollectionModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export function AddToCollectionModal({ onClose, onAdded }: AddToCollectionModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CardResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<CardResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [finish, setFinish] = useState("Normal");
  const [condition, setCondition] = useState("NM");
  const [adding, setAdding] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/cards?q=${encodeURIComponent(query)}&limit=20`);
    const data = await res.json();
    setResults(data.cards || []);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!selected) return;
    setAdding(true);
    await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        card_id: selected.id,
        quantity,
        finish,
        condition,
      }),
    });
    setAdding(false);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold">Add to Collection</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        {!selected ? (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 flex gap-2">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Search for a card..."
                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                onClick={search}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Search
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 pt-0 space-y-1">
              {results.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelected(card)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 text-left"
                >
                  {card.image_uri_small && (
                    <img src={card.image_uri_small} alt="" className="w-10 h-14 object-cover rounded" />
                  )}
                  <div>
                    <p className="font-medium">{card.name}</p>
                    <p className="text-xs text-gray-400">
                      {card.set_name} ({card.set_code?.toUpperCase()}) #{card.collector_number} — {card.rarity}
                    </p>
                  </div>
                </button>
              ))}
              {!loading && results.length === 0 && query && (
                <p className="text-gray-500 text-center py-4">No results found</p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              {selected.image_uri_small && (
                <img src={selected.image_uri_small} alt="" className="w-16 h-22 object-cover rounded" />
              )}
              <div>
                <p className="font-semibold text-lg">{selected.name}</p>
                <p className="text-sm text-gray-400">
                  {selected.set_name} ({selected.set_code?.toUpperCase()})
                </p>
                <button
                  onClick={() => setSelected(null)}
                  className="text-blue-400 text-sm hover:underline mt-1"
                >
                  Change card
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Finish</label>
                <select
                  value={finish}
                  onChange={(e) => setFinish(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  {FINISHES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                >
                  {CONDITIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={adding}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add to Collection"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
