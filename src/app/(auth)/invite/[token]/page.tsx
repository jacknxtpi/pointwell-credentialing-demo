"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type InviteInfo = {
  provider_id: number;
  first_name: string;
  last_name: string;
  npi: string;
};

export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/invites/${params.token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setLoadError(data.error ?? "This invite is invalid.");
          return;
        }
        setInvite(data);
      })
      .catch(() => setLoadError("This invite is invalid."));
  }, [params.token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invites/${params.token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to set up account.");
        return;
      }
      router.push("/my");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-red-600">{loadError}</p>
      </div>
    );
  }
  if (!invite) {
    return <p className="text-center text-sm text-slate-500">Loading…</p>;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h1 className="text-lg font-semibold text-brand-navy">Set up your account</h1>
      <p className="mt-1 text-sm text-slate-600">
        Welcome, {invite.first_name} {invite.last_name} (NPI {invite.npi}). Create a login to
        finish your credentialing intake.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Confirm password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-blue-dark disabled:opacity-40"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </div>
  );
}
