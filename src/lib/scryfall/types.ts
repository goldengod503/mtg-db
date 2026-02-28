export interface ScryfallCard {
  id: string;
  oracle_id?: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  oracle_text?: string;
  type_line?: string;
  colors?: string[];
  color_identity?: string[];
  set: string;
  set_name: string;
  collector_number: string;
  rarity: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    png?: string;
    art_crop?: string;
    border_crop?: string;
  };
  card_faces?: Array<{
    name: string;
    mana_cost?: string;
    oracle_text?: string;
    type_line?: string;
    image_uris?: {
      small?: string;
      normal?: string;
      large?: string;
    };
  }>;
  multiverse_ids?: number[];
  mtgo_id?: number;
  prices?: {
    usd?: string | null;
    usd_foil?: string | null;
    eur?: string | null;
    tix?: string | null;
  };
  legalities?: Record<string, string>;
  power?: string;
  toughness?: string;
  loyalty?: string;
  keywords?: string[];
  released_at?: string;
  layout?: string;
}

export interface ScryfallBulkDataInfo {
  id: string;
  type: string;
  updated_at: string;
  name: string;
  description: string;
  size: number;
  download_uri: string;
  content_type: string;
  content_encoding: string;
}

export interface ScryfallSearchResult {
  object: string;
  total_cards: number;
  has_more: boolean;
  next_page?: string;
  data: ScryfallCard[];
}

export function parseTypeLine(typeLine: string | undefined): {
  supertypes: string;
  types: string;
  subtypes: string;
} {
  if (!typeLine) return { supertypes: "", types: "", subtypes: "" };

  const knownSupertypes = ["Legendary", "Basic", "Snow", "World", "Ongoing"];
  const knownTypes = [
    "Creature", "Artifact", "Enchantment", "Instant", "Sorcery",
    "Planeswalker", "Land", "Battle", "Tribal", "Kindred",
  ];

  const [mainPart, subPart] = typeLine.split("—").map((s) => s.trim());
  const mainWords = mainPart ? mainPart.split(/\s+/) : [];

  const supertypes = mainWords.filter((w) => knownSupertypes.includes(w));
  const types = mainWords.filter((w) => knownTypes.includes(w));
  const subtypes = subPart ? subPart.split(/\s+/).filter(Boolean) : [];

  return {
    supertypes: supertypes.join(","),
    types: types.join(","),
    subtypes: subtypes.join(","),
  };
}

export function scryfallToDbCard(card: ScryfallCard) {
  const { supertypes, types, subtypes } = parseTypeLine(card.type_line);

  const imageUri =
    card.image_uris?.normal ||
    card.card_faces?.[0]?.image_uris?.normal ||
    null;
  const imageUriSmall =
    card.image_uris?.small ||
    card.card_faces?.[0]?.image_uris?.small ||
    null;

  return {
    id: card.id,
    oracle_id: card.oracle_id || null,
    name: card.name,
    mana_cost: card.mana_cost || card.card_faces?.[0]?.mana_cost || null,
    cmc: card.cmc ?? null,
    oracle_text:
      card.oracle_text ||
      card.card_faces?.map((f) => f.oracle_text).join("\n---\n") ||
      null,
    types,
    subtypes,
    supertypes,
    type_line: card.type_line || null,
    colors: card.colors?.join(",") || null,
    color_identity: card.color_identity?.join(",") || null,
    set_code: card.set,
    set_name: card.set_name,
    collector_number: card.collector_number,
    rarity: card.rarity,
    image_uri: imageUri,
    image_uri_small: imageUriSmall,
    multiverse_id: card.multiverse_ids?.[0] || null,
    mtgo_id: card.mtgo_id || null,
    price_tcg_player: card.prices?.usd ? parseFloat(card.prices.usd) : null,
    price_card_kingdom: null,
    price_star_city: null,
    price_card_hoarder: card.prices?.tix
      ? parseFloat(card.prices.tix)
      : null,
    price_card_market: card.prices?.eur ? parseFloat(card.prices.eur) : null,
    legalities: card.legalities ? JSON.stringify(card.legalities) : null,
    power: card.power || null,
    toughness: card.toughness || null,
    loyalty: card.loyalty || null,
    keywords: card.keywords ? JSON.stringify(card.keywords) : null,
    released_at: card.released_at || null,
    updated_at: new Date().toISOString(),
  };
}
