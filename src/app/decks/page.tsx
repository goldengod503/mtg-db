"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FORMATS } from "@/lib/utils";

interface Deck {
  id: number;
  name: string;
  format: string | null;
  description: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
}

export default function DecksPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFormat, setNewFormat] = useState("");

  const fetchDecks = async () => {
    const res = await fetch("/api/decks");
    const data = await res.json();
    setDecks(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/decks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, format: newFormat || null }),
    });
    const deck = await res.json();
    router.push(`/decks/${deck.id}`);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/decks/${id}`, { method: "DELETE" });
    fetchDecks();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Decks</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          New Deck
        </button>
      </div>

      {showCreate && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Deck name"
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white placeholder-gray-400"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <select
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
          >
            <option value="">Format (optional)</option>
            {FORMATS.map((f) => (
              <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
            ))}
          </select>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700"
          >
            Create
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : decks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No decks yet</p>
          <p className="text-sm mt-1">Click &quot;New Deck&quot; to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck) => (
            <div
              key={deck.id}
              className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-colors group"
            >
              <Link href={`/decks/${deck.id}`}>
                {deck.cover_image ? (
                  <div className="h-40 overflow-hidden">
                    <img src={deck.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                    <span className="text-4xl text-gray-700">{deck.name[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold">{deck.name}</h3>
                  {deck.format && (
                    <p className="text-gray-400 text-sm capitalize">{deck.format}</p>
                  )}
                  {deck.description && (
                    <p className="text-gray-500 text-xs mt-1 line-clamp-2">{deck.description}</p>
                  )}
                </div>
              </Link>
              <div className="px-4 pb-3 flex justify-end">
                <button
                  onClick={() => handleDelete(deck.id)}
                  className="text-red-400 hover:text-red-300 text-xs"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
