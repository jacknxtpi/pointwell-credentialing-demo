import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

const cards = [
  {
    href: "/providers/new",
    title: "Look up & add a provider",
    body: "Pull a provider's basic info from the real NPPES NPI Registry, then fill in the rest of the intake form.",
  },
  {
    href: "/providers",
    title: "Generate a submission packet",
    body: "Auto-populate a provider's data using a payer's own field labels. Downloading it registers the application as pending.",
  },
  {
    href: "/providers",
    title: "Record payer decisions",
    body: "Manually enter what a payer responds with — approval requires uploaded evidence and an approved-through date.",
  },
  {
    href: "/network",
    title: "Track network status",
    body: "Payer → line of business → plan, gradually filled in as it's confirmed through contracts and directory research.",
  },
  {
    href: "/documents",
    title: "Manage documents",
    body: "Upload required credentialing documents and get flagged on anything expired or expiring soon.",
  },
  {
    href: "/lookup",
    title: "Check status",
    body: 'Answer "Is Dr. X approved under Payer Y?" instantly from tracked submission status.',
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  if (user?.role === "provider") {
    redirect("/my");
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">
          Provider Credentialing Demo
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          NPI-based lookup, payer submission packets, network status tracking, and document
          expirations. Data here is for demonstration only — do not enter real SSNs, DOBs, or DEA
          numbers for real people.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.title}
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
