import Link from "next/link";

const cards = [
  {
    href: "/providers/new",
    title: "1. Look up & add a provider",
    body: "Pull a provider's basic info from the real NPPES NPI Registry, then fill in the rest (license, DEA, CAQH, etc.) to add them to the roster.",
  },
  {
    href: "/providers",
    title: "2. Submit to payers",
    body: "Select a provider and a payer and submit a credentialing application. Payer processing is simulated — no real payer is contacted.",
  },
  {
    href: "/lookup",
    title: "3. Check status",
    body: 'Answer "Is Dr. X approved under Payer Y?" instantly from tracked submission status.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Provider Credentialing Demo
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          A walkthrough of the three core workflows: NPI-based lookup, payer submission
          tracking, and admin status lookup. Data here is for demonstration only — do not
          enter real SSNs, DOBs, or DEA numbers for real people.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-blue hover:shadow-sm"
          >
            <h2 className="font-medium text-brand-navy">{c.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
