import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { CustomPacketField } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;
  const existing = db
    .prepare("SELECT * FROM custom_packet_fields WHERE id = ?")
    .get(id) as CustomPacketField | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Custom field not found." }, { status: 404 });
  }

  const body = await req.json();
  const label = body.label !== undefined ? String(body.label) : existing.label;
  const included = body.included !== undefined ? (body.included ? 1 : 0) : existing.included;
  const sortOrder = body.sort_order !== undefined ? body.sort_order : existing.sort_order;

  db.prepare("UPDATE custom_packet_fields SET label = ?, included = ?, sort_order = ? WHERE id = ?").run(
    label,
    included,
    sortOrder,
    id
  );

  const updated = db.prepare("SELECT * FROM custom_packet_fields WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;

  const field = db.prepare("SELECT * FROM custom_packet_fields WHERE id = ?").get(id);
  if (!field) {
    return NextResponse.json({ error: "Custom field not found." }, { status: 404 });
  }

  // provider_custom_field_values cascades via FK on custom_field_id.
  db.prepare("DELETE FROM custom_packet_fields WHERE id = ?").run(id);

  return NextResponse.json({ deleted: true });
}
