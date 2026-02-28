import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq, like, sql, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");
  const set = searchParams.get("set");
  const colors = searchParams.get("colors");
  const rarity = searchParams.get("rarity");
  const type = searchParams.get("type");
  const format = searchParams.get("format");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "40"), 100);
  const sort = searchParams.get("sort") || "name";
  const order = searchParams.get("order") === "desc" ? "DESC" : "ASC";
  const offset = (page - 1) * limit;

  // Use FTS for text search if available
  if (q) {
    try {
      const ftsQuery = q
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => `${w}*`)
        .join(" ");

      const conditions: string[] = [];
      const params: Record<string, string | number> = {};

      if (set) {
        conditions.push("c.set_code = @set");
        params.set = set;
      }
      if (rarity) {
        conditions.push("c.rarity = @rarity");
        params.rarity = rarity;
      }
      if (type) {
        conditions.push("c.types LIKE @type");
        params.type = `%${type}%`;
      }
      if (colors) {
        for (const color of colors.split(",")) {
          conditions.push(`c.colors LIKE '%${color}%'`);
        }
      }
      if (format) {
        conditions.push(`json_extract(c.legalities, '$.${format}') = 'legal'`);
      }

      const whereClause = conditions.length
        ? "AND " + conditions.join(" AND ")
        : "";

      const countResult = sqlite
        .prepare(
          `SELECT COUNT(*) as count FROM cards_fts fts
         JOIN cards c ON c.rowid = fts.rowid
         WHERE cards_fts MATCH @q ${whereClause}`
        )
        .get({ ...params, q: ftsQuery }) as { count: number };

      const sortCol = sort === "cmc" ? "c.cmc" : sort === "price" ? "c.price_tcg_player" : sort === "set" ? "c.set_code" : "c.name";

      const results = sqlite
        .prepare(
          `SELECT c.* FROM cards_fts fts
         JOIN cards c ON c.rowid = fts.rowid
         WHERE cards_fts MATCH @q ${whereClause}
         ORDER BY ${sortCol} ${order}
         LIMIT @limit OFFSET @offset`
        )
        .all({ ...params, q: ftsQuery, limit, offset });

      return NextResponse.json({
        cards: results,
        total: countResult.count,
        page,
        totalPages: Math.ceil(countResult.count / limit),
      });
    } catch {
      // FTS table might not exist yet, fall back to LIKE
    }
  }

  // Fallback: LIKE-based search
  const conditions = [];
  if (q) conditions.push(like(cards.name, `%${q}%`));
  if (set) conditions.push(eq(cards.set_code, set));
  if (rarity) conditions.push(eq(cards.rarity, rarity));
  if (type) conditions.push(like(cards.types, `%${type}%`));
  if (colors) {
    for (const color of colors.split(",")) {
      conditions.push(like(cards.colors, `%${color}%`));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cards)
    .where(where);

  const results = await db
    .select()
    .from(cards)
    .where(where)
    .orderBy(sql`${sql.identifier(sort)} ${sql.raw(order)}`)
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    cards: results,
    total: countResult.count,
    page,
    totalPages: Math.ceil(countResult.count / limit),
  });
}
