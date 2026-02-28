"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CardDetail } from "@/components/card/card-detail";

interface CardData {
  id: string;
  name: string;
  mana_cost: string | null;
  cmc: number | null;
  oracle_text: string | null;
  type_line: string | null;
  colors: string | null;
  color_identity: string | null;
  set_code: string | null;
  set_name: string | null;
  collector_number: string | null;
  rarity: string | null;
  image_uri: string | null;
  image_uri_small: string | null;
  power: string | null;
  toughness: string | null;
  loyalty: string | null;
  legalities: string | null;
  keywords: string | null;
  price_tcg_player: number | null;
  price_card_market: number | null;
  price_card_hoarder: number | null;
}

export default function CardDetailPage() {
  const params = useParams();
  const [card, setCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addedMessage, setAddedMessage] = useState("");

  useEffect(() => {
    fetch(`/api/cards/${params.id}`)
      .then((r) => r.json())
      .then(setCard)
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleAddToCollection = async () => {
    if (!card) return;
    await fetch("/api/collection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ card_id: card.id }),
    });
    setAddedMessage("Added to collection!");
    setTimeout(() => setAddedMessage(""), 2000);
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  if (!card) {
    return <div className="text-center py-12 text-gray-500">Card not found</div>;
  }

  return (
    <div className="space-y-4">
      {addedMessage && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-3 text-sm text-green-300">
          {addedMessage}
        </div>
      )}
      <CardDetail card={card} onAddToCollection={handleAddToCollection} />
    </div>
  );
}
