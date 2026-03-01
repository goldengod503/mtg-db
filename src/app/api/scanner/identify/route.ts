import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { image } = body;

  if (!image) {
    return NextResponse.json(
      { error: "image is required" },
      { status: 400 }
    );
  }

  // Strip data URL prefix if present
  const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

  let identifiedName: string;

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "moondream",
        prompt:
          "This is a photo of a Magic: The Gathering card. What is the exact card name shown on this card? Reply with ONLY the card name, nothing else.",
        images: [base64Data],
        stream: false,
      }),
    });

    if (!ollamaRes.ok) {
      const text = await ollamaRes.text();
      console.error("Ollama error:", ollamaRes.status, text);
      return NextResponse.json(
        { error: "Ollama request failed", details: text },
        { status: 502 }
      );
    }

    const ollamaData = await ollamaRes.json();
    identifiedName = (ollamaData.response || "").trim();
  } catch (err) {
    console.error("Ollama connection error:", err);
    return NextResponse.json(
      {
        error: "Could not connect to Ollama. Is it running?",
        details: String(err),
      },
      { status: 502 }
    );
  }

  if (!identifiedName) {
    return NextResponse.json({ identified_name: "", cards: [] });
  }

  // Search local DB: try FTS first, fall back to LIKE
  let cards: unknown[] = [];

  try {
    const ftsQuery = identifiedName
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w}*`)
      .join(" ");

    cards = sqlite
      .prepare(
        `SELECT c.* FROM cards_fts fts
         JOIN cards c ON c.rowid = fts.rowid
         WHERE cards_fts MATCH @q
         ORDER BY c.name ASC
         LIMIT 20`
      )
      .all({ q: ftsQuery });
  } catch {
    // FTS table might not exist, fall back to LIKE
  }

  if (cards.length === 0) {
    cards = sqlite
      .prepare(
        `SELECT * FROM cards
         WHERE name LIKE @q
         ORDER BY name ASC
         LIMIT 20`
      )
      .all({ q: `%${identifiedName}%` });
  }

  return NextResponse.json({ identified_name: identifiedName, cards });
}
