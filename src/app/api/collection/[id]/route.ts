import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { collectionCards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);
  const body = await request.json();

  const [existing] = await db
    .select()
    .from(collectionCards)
    .where(eq(collectionCards.id, id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(collectionCards)
    .set(body)
    .where(eq(collectionCards.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id);

  await db.delete(collectionCards).where(eq(collectionCards.id, id));

  return NextResponse.json({ success: true });
}
