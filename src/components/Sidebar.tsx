"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/providers", label: "Providers" },
  { href: "/providers/new", label: "Add Provider" },
  { href: "/lookup", label: "Status Lookup" },
];

function getActiveHref(pathname: string): string {
  const matches = NAV_ITEMS.map((i) => i.href).filter((href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)
  );
  return matches.sort((a, b) => b.length - a.length)[0] ?? "";
}

export default function Sidebar() {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center px-5 py-6">
        <Image src="/pointwell-logo.svg" alt="Pointwell" width={140} height={48} priority />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-blue-light text-brand-blue"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-navy"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 px-5 py-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
          Demo — simulated payer data
        </span>
      </div>
    </aside>
  );
}
