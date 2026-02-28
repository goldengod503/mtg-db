"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CardGrid } from "@/components/card/card-grid";
import { SearchInput } from "@/components/ui/search-input";
import { FilterBar } from "@/components/ui/filter-bar";
import { Pagination } from "@/components/ui/pagination";
import { AddToCollectionModal } from "@/components/collection/add-to-collection-modal";
import { formatPrice } from "@/lib/utils";

interface CollectionItem {
  collection: {
    id: number;
    card_id: string;
    quantity: number;
    finish: string;
    condition: string;
    language: string;
    purchase_price: number | null;
    tags: string | null;
    added_at: string;
  };
  card: {
    id: string;
    name: string;
    image_uri: string | null;
    image_uri_small: string | null;
    mana_cost: string | null;
    cmc: number | null;
    type_line: string | null;
    rarity: string | null;
    set_code: string | null;
    set_name: string | null;
    price_tcg_player: number | null;
    colors: string | null;
    types: string | null;
  };
}

export default function CollectionPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-gray-500">Loading...</div>}>
      <CollectionContent />
    </Suspense>
  );
}

function CollectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showAddModal, setShowAddModal] = useState(false);

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [colors, setColors] = useState<string[]>([]);
  const [rarity, setRarity] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("added_at");
  const [order, setOrder] = useState("desc");

  const fetchCollection = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (colors.length) params.set("colors", colors.join(","));
    if (rarity) params.set("rarity", rarity);
    if (type) params.set("type", type);
    params.set("sort", sort);
    params.set("order", order);
    params.set("page", page.toString());

    const res = await fetch(`/api/collection?${params}`);
    const data = await res.json();
    setItems(data.items || []);
    setTotal(data.total || 0);
    setTotalPages(data.totalPages || 1);
    setLoading(false);
  }, [query, colors, rarity, type, sort, order, page]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleExport = () => {
    window.open("/api/collection/export", "_blank");
  };

  const handleRemove = async (collectionId: number) => {
    await fetch(`/api/collection/${collectionId}`, { method: "DELETE" });
    fetchCollection();
  };

  const handleUpdateQuantity = async (collectionId: number, quantity: number) => {
    if (quantity <= 0) {
      await handleRemove(collectionId);
      return;
    }
    await fetch(`/api/collection/${collectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    fetchCollection();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Collection</h1>
          <p className="text-gray-400 text-sm">{total} cards</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Cards
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
          >
            Export CSV
          </button>
          <div className="flex bg-gray-800 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-2 rounded-l-lg ${viewMode === "grid" ? "bg-gray-600" : ""}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 rounded-r-lg ${viewMode === "table" ? "bg-gray-600" : ""}`}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      <SearchInput value={query} onChange={setQuery} />

      <FilterBar
        colors={colors}
        onColorsChange={setColors}
        rarity={rarity}
        onRarityChange={setRarity}
        type={type}
        onTypeChange={setType}
        sort={sort}
        onSortChange={setSort}
        order={order}
        onOrderChange={setOrder}
        sortOptions={[
          { value: "added_at", label: "Date Added" },
          { value: "name", label: "Name" },
          { value: "cmc", label: "Mana Value" },
          { value: "price", label: "Price" },
          { value: "quantity", label: "Quantity" },
        ]}
      />

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : viewMode === "grid" ? (
        <CardGrid
          cards={items.map((i) => i.card)}
          renderOverlay={(card) => {
            const item = items.find((i) => i.card.id === card.id);
            return item ? (
              <div className="absolute top-1 right-1 bg-black/70 rounded px-2 py-0.5 text-xs font-bold">
                x{item.collection.quantity}
              </div>
            ) : null;
          }}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 text-left">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Set</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2 pr-4">Rarity</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Condition</th>
                <th className="pb-2 pr-4">Price</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ collection, card }) => (
                <tr
                  key={collection.id}
                  className="border-b border-gray-800/50 hover:bg-gray-900 cursor-pointer"
                  onClick={() => router.push(`/cards/${card.id}`)}
                >
                  <td className="py-2 pr-4 font-medium">{card.name}</td>
                  <td className="py-2 pr-4 text-gray-400">{card.set_code?.toUpperCase()}</td>
                  <td className="py-2 pr-4 text-gray-400">{card.type_line}</td>
                  <td className="py-2 pr-4 text-gray-400 capitalize">{card.rarity}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleUpdateQuantity(collection.id, collection.quantity - 1)}
                        className="w-6 h-6 bg-gray-700 rounded text-xs hover:bg-gray-600"
                      >
                        -
                      </button>
                      <span className="w-6 text-center">{collection.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(collection.id, collection.quantity + 1)}
                        className="w-6 h-6 bg-gray-700 rounded text-xs hover:bg-gray-600"
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">{collection.condition}</td>
                  <td className="py-2 pr-4">{formatPrice(card.price_tcg_player)}</td>
                  <td className="py-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(collection.id);
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-center">
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {showAddModal && (
        <AddToCollectionModal
          onClose={() => setShowAddModal(false)}
          onAdded={fetchCollection}
        />
      )}
    </div>
  );
}
