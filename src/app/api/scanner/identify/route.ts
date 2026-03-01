import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "minicpm-v";

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
  let rawResponse: string;
  let ollamaStats = { total_duration_ms: 0, prompt_eval_count: 0, eval_count: 0 };

  try {
    const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: "user",
            content: "Read ONLY the text you can clearly see on this Magic: The Gathering card. Output: card name, mana cost symbols, type line, rules text, power/toughness. Do not guess or make up any text. Do not read the tiny text at the bottom of the card. Do not describe the image.",
            images: [base64Data],
          },
        ],
        stream: false,
        options: {
          num_predict: 250,
          stop: ["Note:", "Capture", "The image", "The background", "\n---", "\n**"],
        },
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
    rawResponse = (ollamaData.message?.content || "").trim();
    console.log("Ollama raw response:", JSON.stringify(ollamaData));

    // Try to extract a card name from the response
    // Look for patterns like "Card name: X" or "the card name is X" or just use the first line
    const namePatterns = [
      /card name[:\s]+["']?([^"'\n.]+)/i,
      /titled?\s+["']([^"']+)/i,
      /called\s+["']([^"']+)/i,
      /^["']?([A-Z][A-Za-z,'\- ]+)/m,
    ];

    identifiedName = "";
    for (const pattern of namePatterns) {
      const match = rawResponse.match(pattern);
      if (match) {
        identifiedName = match[1].trim();
        break;
      }
    }

    // Fallback: use first line if short enough to be a card name
    if (!identifiedName) {
      const firstLine = rawResponse.split("\n")[0].trim();
      if (firstLine.length > 0 && firstLine.length < 60) {
        identifiedName = firstLine;
      }
    }

    ollamaStats = {
      total_duration_ms: Math.round((ollamaData.total_duration || 0) / 1e6),
      prompt_eval_count: ollamaData.prompt_eval_count || 0,
      eval_count: ollamaData.eval_count || 0,
    };
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
    return NextResponse.json({ identified_name: "", raw_response: rawResponse, cards: [], stats: ollamaStats });
  }

  // Search local DB: exact match first, then FTS, then LIKE
  let cards: unknown[] = [];

  // Try exact name match first
  cards = sqlite
    .prepare(
      `SELECT * FROM cards
       WHERE name = @q
       ORDER BY set_code DESC
       LIMIT 20`
    )
    .all({ q: identifiedName });

  // Fall back to FTS
  if (cards.length === 0) {
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
           ORDER BY CASE WHEN c.name = @exact THEN 0 ELSE 1 END, c.name ASC
           LIMIT 20`
        )
        .all({ q: ftsQuery, exact: identifiedName });
    } catch {
      // FTS table might not exist, fall back to LIKE
    }
  }

  // Fall back to LIKE
  if (cards.length === 0) {
    cards = sqlite
      .prepare(
        `SELECT * FROM cards
         WHERE name LIKE @q
         ORDER BY CASE WHEN name = @exact THEN 0 ELSE 1 END, name ASC
         LIMIT 20`
      )
      .all({ q: `%${identifiedName}%`, exact: identifiedName });
  }

  return NextResponse.json({ identified_name: identifiedName, raw_response: rawResponse, cards, stats: ollamaStats });
}
