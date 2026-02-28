"use client";

import { CardImage } from "./card-image";

interface CardData {
  id: string;
  name: string;
  image_uri: string | null;
  image_uri_small: string | null;
  mana_cost?: string | null;
  set_code?: string | null;
  rarity?: string | null;
}

interface CardGridProps {
  cards: CardData[];
  onCardClick?: (card: CardData) => void;
  renderOverlay?: (card: CardData) => React.ReactNode;
}

export function CardGrid({ cards, onCardClick, renderOverlay }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No cards found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {cards.map((card) => (
        <div
          key={card.id}
          className="relative"
          onClick={() => onCardClick?.(card)}
        >
          <CardImage
            id={card.id}
            name={card.name}
            imageUri={card.image_uri}
            imageUriSmall={card.image_uri_small}
            size="normal"
            showName
            linked={!onCardClick}
          />
          {renderOverlay?.(card)}
        </div>
      ))}
    </div>
  );
}
