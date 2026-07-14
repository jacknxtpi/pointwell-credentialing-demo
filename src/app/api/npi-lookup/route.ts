import { NextRequest, NextResponse } from "next/server";
import { lookupNpi } from "@/lib/npi";

export async function GET(req: NextRequest) {
  const npi = req.nextUrl.searchParams.get("npi")?.trim();
  if (!npi || !/^\d{10}$/.test(npi)) {
    return NextResponse.json({ error: "Provide a valid 10-digit NPI." }, { status: 400 });
  }

  try {
    const result = await lookupNpi(npi);
    if (!result) {
      return NextResponse.json({ error: "No provider found for that NPI in the NPPES registry." }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "NPI lookup failed." },
      { status: 502 }
    );
  }
}
