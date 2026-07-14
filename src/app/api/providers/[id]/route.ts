import { NextRequest, NextResponse } from "next/server";
import db, { maskSsn } from "@/lib/db";
import { Provider } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const provider = db
    .prepare("SELECT * FROM providers WHERE id = ?")
    .get(id) as Provider | undefined;

  if (!provider) {
    return NextResponse.json({ error: "Provider not found." }, { status: 404 });
  }

  return NextResponse.json({ ...provider, ssn: maskSsn(provider.ssn) });
}
