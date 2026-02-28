import { ScryfallCard, ScryfallSearchResult } from "./types";

const BASE_URL = "https://api.scryfall.com";
const RATE_LIMIT_MS = 100;

let lastRequestTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

export async function searchCards(
  query: string,
  page = 1
): Promise<ScryfallSearchResult> {
  const url = `${BASE_URL}/cards/search?q=${encodeURIComponent(query)}&page=${page}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    throw new Error(`Scryfall search failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getCardByName(
  name: string,
  fuzzy = true
): Promise<ScryfallCard> {
  const param = fuzzy ? "fuzzy" : "exact";
  const url = `${BASE_URL}/cards/named?${param}=${encodeURIComponent(name)}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    throw new Error(`Scryfall lookup failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getCardById(id: string): Promise<ScryfallCard> {
  const url = `${BASE_URL}/cards/${id}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) {
    throw new Error(`Scryfall lookup failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function autocomplete(query: string): Promise<string[]> {
  const url = `${BASE_URL}/cards/autocomplete?q=${encodeURIComponent(query)}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data || [];
}
