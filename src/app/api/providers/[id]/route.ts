import { NextRequest, NextResponse } from "next/server";
import db, { maskSsn } from "@/lib/db";
import { Provider, PracticeLocation, Reference, Disclosure } from "@/lib/types";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAdmin();
  if (!user) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }
  const { id } = await params;
  const provider = db
    .prepare("SELECT * FROM providers WHERE id = ?")
    .get(id) as Provider | undefined;

  if (!provider) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  const practiceLocations = db
    .prepare("SELECT * FROM provider_practice_locations WHERE provider_id = ? ORDER BY id")
    .all(id) as PracticeLocation[];
  const references = db
    .prepare("SELECT * FROM provider_references WHERE provider_id = ? ORDER BY ref_number")
    .all(id) as Reference[];
  const disclosures = db
    .prepare("SELECT * FROM provider_disclosures WHERE provider_id = ? ORDER BY id")
    .all(id) as Disclosure[];

  return NextResponse.json({
    ...provider,
    ssn: maskSsn(provider.ssn),
    practice_locations: practiceLocations,
    references,
    disclosures,
  });
}
