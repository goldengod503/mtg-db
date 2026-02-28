"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CardImage } from "@/components/card/card-image";
import { formatPrice } from "@/lib/utils";

interface Stats {
  totalCards: number;
  uniqueCards: number;
  estimatedValue: number;
  colorBreakdown: { colors: string; count: number }[];
  rarityBreakdown: { rarity: string; count: number }[];
  recentAdditions: Array<{
    id: number;
    card_id: string;
    name: string;
    image_uri_small: string;
    set_name: string;
    quantity: number;
    added_at: string;
  }>;
}

interface Deck {
  id: number;
  name: string;
  format: string | null;
  cover_image: string | null;
  updated_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/collection/stats").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/decks").then((r) => r.json()).then((d) => setDecks(Array.isArray(d) ? d.slice(0, 5) : [])).catch(() => {});
  }, []);

  const handleBulkImport = async () => {
    if (importing) return;
    setImporting(true);
    setImportStatus("Downloading and importing Scryfall data... This may take several minutes.");
    try {
      const res = await fetch("/api/import", { method: "POST" });
      if (res.ok) {
        setImportStatus("Import complete! Refresh the page to see updated data.");
      } else {
        const data = await res.json();
        setImportStatus(`Import failed: ${data.error}`);
      }
    } catch {
      setImportStatus("Import failed. Check the console for details.");
    }
    setImporting(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Magic DB</h1>
          <p className="text-gray-400 mt-1">Your local MTG collection manager</p>
        </div>
        <button
          onClick={handleBulkImport}
          disabled={importing}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {importing ? "Importing..." : "Import Card Data"}
        </button>
      </div>

      {importStatus && (
        <div className={`p-4 rounded-lg ${importing ? "bg-blue-900/30 border border-blue-700" : importStatus.includes("failed") ? "bg-red-900/30 border border-red-700" : "bg-green-900/30 border border-green-700"}`}>
          <p className="text-sm">{importStatus}</p>
        </div>
      )}

      {/* Quick Search */}
      <div className="relative max-w-xl">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Quick search cards..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && searchQuery) {
              window.location.href = `/collection?q=${encodeURIComponent(searchQuery)}`;
            }
          }}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm">Total Cards</p>
          <p className="text-3xl font-bold mt-1">{stats?.totalCards ?? 0}</p>
          <p className="text-gray-500 text-xs mt-1">{stats?.uniqueCards ?? 0} unique</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm">Estimated Value</p>
          <p className="text-3xl font-bold mt-1">{formatPrice(stats?.estimatedValue)}</p>
          <p className="text-gray-500 text-xs mt-1">TCGPlayer market</p>
        </div>
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <p className="text-gray-400 text-sm">Decks</p>
          <p className="text-3xl font-bold mt-1">{decks.length}</p>
          <Link href="/decks" className="text-blue-400 text-xs mt-1 hover:underline">
            View all decks
          </Link>
        </div>
      </div>

      {/* Recent Decks */}
      {decks.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Recent Decks</h2>
            <Link href="/decks" className="text-blue-400 text-sm hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <Link
                key={deck.id}
                href={`/decks/${deck.id}`}
                className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-gray-600 transition-colors"
              >
                {deck.cover_image && (
                  <div className="h-32 overflow-hidden">
                    <img src={deck.cover_image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-semibold">{deck.name}</h3>
                  {deck.format && <p className="text-gray-400 text-sm capitalize">{deck.format}</p>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Additions */}
      {stats?.recentAdditions && stats.recentAdditions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">Recently Added</h2>
            <Link href="/collection" className="text-blue-400 text-sm hover:underline">View collection</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {stats.recentAdditions.map((item) => (
              <CardImage
                key={item.id}
                id={item.card_id}
                name={item.name}
                imageUri={item.image_uri_small}
                size="small"
                showName
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
