"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/auth";

const ADMIN_NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/providers", label: "Providers" },
  { href: "/providers/new", label: "Add Provider" },
  { href: "/lookup", label: "Credential Status" },
  { href: "/network", label: "Network Status" },
  { href: "/documents", label: "Document Expirations" },
  { href: "/payers", label: "Payers" },
];

const PROVIDER_NAV_ITEMS = [{ href: "/my", label: "My Profile" }];

function getActiveHref(navItems: { href: string }[], pathname: string): string {
  const matches = navItems.map((i) => i.href).filter((href) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)
  );
  return matches.sort((a, b) => b.length - a.length)[0] ?? "";
}

export default function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = user.role === "admin" ? ADMIN_NAV_ITEMS : PROVIDER_NAV_ITEMS;
  const activeHref = getActiveHref(navItems, pathname);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center px-5 py-6">
        <Image src="/vetta-logo.svg" alt="Vetta" width={136} height={41} priority />
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => {
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
        <p className="truncate text-xs text-slate-500" title={user.email}>
          {user.email}
        </p>
        <p className="text-xs text-slate-400 capitalize">{user.role}</p>
        <button
          onClick={handleLogout}
          className="mt-2 text-xs font-medium text-brand-blue hover:underline"
        >
          Log out
        </button>
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            Demo — no real payer systems contacted
          </span>
        </div>
      </div>
    </aside>
  );
}
