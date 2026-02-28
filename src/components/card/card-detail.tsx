"use client";

import { CardImage } from "./card-image";
import { formatPrice } from "@/lib/utils";

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

interface CardDetailProps {
  card: CardData;
  onAddToCollection?: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-gray-300",
  rare: "text-yellow-400",
  mythic: "text-orange-500",
};

export function CardDetail({ card, onAddToCollection }: CardDetailProps) {
  const legalities = card.legalities ? JSON.parse(card.legalities) : {};
  const keywords = card.keywords ? JSON.parse(card.keywords) : [];

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <CardImage
        id={card.id}
        name={card.name}
        imageUri={card.image_uri}
        size="large"
        linked={false}
      />

      <div className="flex-1 space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{card.name}</h1>
          <p className="text-gray-400">{card.type_line}</p>
          {card.mana_cost && (
            <p className="text-gray-300 mt-1">Mana Cost: {card.mana_cost}</p>
          )}
        </div>

        {card.oracle_text && (
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-gray-200 whitespace-pre-wrap">{card.oracle_text}</p>
          </div>
        )}

        {(card.power || card.loyalty) && (
          <p className="text-gray-300">
            {card.power && card.toughness && `${card.power}/${card.toughness}`}
            {card.loyalty && `Loyalty: ${card.loyalty}`}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <span className={`text-sm ${RARITY_COLORS[card.rarity || ""] || ""}`}>
            {card.rarity?.charAt(0).toUpperCase()}{card.rarity?.slice(1)}
          </span>
          <span className="text-sm text-gray-400">
            {card.set_name} ({card.set_code?.toUpperCase()}) #{card.collector_number}
          </span>
        </div>

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {keywords.map((kw: string) => (
              <span key={kw} className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300">
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* Prices */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 rounded p-2 text-center">
            <p className="text-xs text-gray-400">TCGPlayer</p>
            <p className="text-white font-semibold">{formatPrice(card.price_tcg_player)}</p>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <p className="text-xs text-gray-400">Cardmarket</p>
            <p className="text-white font-semibold">{formatPrice(card.price_card_market)}</p>
          </div>
          <div className="bg-gray-800 rounded p-2 text-center">
            <p className="text-xs text-gray-400">MTGO</p>
            <p className="text-white font-semibold">{formatPrice(card.price_card_hoarder)}</p>
          </div>
        </div>

        {onAddToCollection && (
          <button
            onClick={onAddToCollection}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add to Collection
          </button>
        )}

        {/* Legalities */}
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Format Legality</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
            {Object.entries(legalities).map(([format, status]) => (
              <div key={format} className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === "legal"
                      ? "bg-green-500"
                      : status === "banned"
                      ? "bg-red-500"
                      : status === "restricted"
                      ? "bg-yellow-500"
                      : "bg-gray-600"
                  }`}
                />
                <span className="text-gray-300 capitalize">{format.replace(/_/g, " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
