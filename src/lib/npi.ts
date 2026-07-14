export type NpiLookupResult = {
  npi: string;
  firstName: string;
  lastName: string;
  credential: string | null;
  providerType: string | null;
  practiceAddress: string | null;
  practicePhone: string | null;
  licenseNumber: string | null;
  licenseState: string | null;
  status: string | null;
};

export async function lookupNpi(npi: string): Promise<NpiLookupResult | null> {
  const res = await fetch(
    `https://npiregistry.cms.hhs.gov/api/?number=${encodeURIComponent(npi)}&version=2.1`
  );
  if (!res.ok) throw new Error(`NPPES registry request failed (${res.status})`);

  const data = await res.json();
  if (!data.result_count || data.result_count === 0) return null;

  const result = data.results[0];
  const basic = result.basic ?? {};
  const addresses: Array<Record<string, string>> = result.addresses ?? [];
  const taxonomies: Array<Record<string, unknown>> = result.taxonomies ?? [];

  const location = addresses.find((a) => a.address_purpose === "LOCATION") ?? addresses[0];
  const primaryTaxonomy =
    (taxonomies.find((t) => t.primary === true) as Record<string, unknown> | undefined) ??
    taxonomies[0];

  const practiceAddress = location
    ? [location.address_1, location.address_2, location.city, location.state, location.postal_code]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    npi: result.number,
    firstName: basic.first_name ?? "",
    lastName: basic.last_name ?? "",
    credential: basic.credential ?? null,
    providerType: (primaryTaxonomy?.desc as string) ?? null,
    practiceAddress,
    practicePhone: location?.telephone_number ?? null,
    licenseNumber: (primaryTaxonomy?.license as string) ?? null,
    licenseState: (primaryTaxonomy?.state as string) ?? null,
    status: basic.status ?? null,
  };
}
