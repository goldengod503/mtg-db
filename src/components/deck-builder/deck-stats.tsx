"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { formatPrice, COLOR_MAP } from "@/lib/utils";

interface DeckCardEntry {
  deckCard: {
    quantity: number;
    category: string;
  };
  card: {
    cmc: number | null;
    types: string | null;
    colors: string | null;
    price_tcg_player: number | null;
  };
}

interface DeckStatsProps {
  cards: DeckCardEntry[];
  format?: string | null;
}

const PIE_COLORS: Record<string, string> = {
  W: "#F9FAF4",
  U: "#0E68AB",
  B: "#150B00",
  R: "#D3202A",
  G: "#00733E",
  Colorless: "#6B7280",
  Multi: "#C084FC",
};

export function DeckStats({ cards }: DeckStatsProps) {
  const mainCards = cards.filter((c) => c.deckCard.category === "main");

  const manaCurve = useMemo(() => {
    const curve: Record<number, number> = {};
    for (const { deckCard, card } of mainCards) {
      if (card.cmc == null) continue;
      const cmc = Math.min(Math.floor(card.cmc), 7);
      curve[cmc] = (curve[cmc] || 0) + deckCard.quantity;
    }
    return Array.from({ length: 8 }, (_, i) => ({
      cmc: i === 7 ? "7+" : String(i),
      count: curve[i] || 0,
    }));
  }, [mainCards]);

  const colorBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { deckCard, card } of mainCards) {
      const colors = card.colors?.split(",").filter(Boolean) || [];
      if (colors.length === 0) {
        counts["Colorless"] = (counts["Colorless"] || 0) + deckCard.quantity;
      } else if (colors.length > 1) {
        counts["Multi"] = (counts["Multi"] || 0) + deckCard.quantity;
      } else {
        counts[colors[0]] = (counts[colors[0]] || 0) + deckCard.quantity;
      }
    }
    return Object.entries(counts).map(([color, count]) => ({
      name: COLOR_MAP[color]?.name || color,
      value: count,
      color: PIE_COLORS[color] || "#6B7280",
    }));
  }, [mainCards]);

  const typeBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const { deckCard, card } of mainCards) {
      const types = card.types?.split(",") || ["Other"];
      const primary = types[0] || "Other";
      counts[primary] = (counts[primary] || 0) + deckCard.quantity;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));
  }, [mainCards]);

  const totalCards = mainCards.reduce((s, c) => s + c.deckCard.quantity, 0);
  const totalPrice = mainCards.reduce(
    (s, c) => s + (c.card.price_tcg_player || 0) * c.deckCard.quantity,
    0
  );
  const sideboardCount = cards
    .filter((c) => c.deckCard.category === "sideboard")
    .reduce((s, c) => s + c.deckCard.quantity, 0);

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
      <h3 className="font-semibold">Deck Stats</h3>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <p className="text-gray-400">Main Deck</p>
          <p className="text-lg font-bold">{totalCards}</p>
        </div>
        <div>
          <p className="text-gray-400">Sideboard</p>
          <p className="text-lg font-bold">{sideboardCount}</p>
        </div>
        <div>
          <p className="text-gray-400">Est. Price</p>
          <p className="text-lg font-bold">{formatPrice(totalPrice)}</p>
        </div>
      </div>

      {/* Mana Curve */}
      <div>
        <h4 className="text-sm text-gray-400 mb-2">Mana Curve</h4>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={manaCurve}>
            <XAxis dataKey="cmc" tick={{ fill: "#9CA3AF", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8 }}
              labelStyle={{ color: "#9CA3AF" }}
              itemStyle={{ color: "#fff" }}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Color Pie + Type breakdown side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm text-gray-400 mb-2">Colors</h4>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie
                data={colorBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={50}
                strokeWidth={1}
                stroke="#111827"
              >
                {colorBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: 8 }}
                itemStyle={{ color: "#fff" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <h4 className="text-sm text-gray-400 mb-2">Card Types</h4>
          <div className="space-y-1 text-sm">
            {typeBreakdown.map(({ type, count }) => (
              <div key={type} className="flex justify-between">
                <span className="text-gray-300">{type}</span>
                <span className="text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
