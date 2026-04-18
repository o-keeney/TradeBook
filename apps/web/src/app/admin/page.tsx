"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type ContactSubmission = {
  id: string;
  createdAt: number;
  email: string;
  name: string;
  message: string;
};

export default function AdminPage() {
  const [euros, setEuros] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<ContactSubmission[] | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setContactError(null);
    setSaved(false);
    setLoading(true);
    try {
      await apiFetch("/api/users/me");
      const [pricingRes, contactRes] = await Promise.all([
        apiFetch("/api/admin/pricing"),
        apiFetch("/api/admin/contact-submissions"),
      ]);
      if (pricingRes.status === 403 || contactRes.status === 403) {
        setError("You need to be signed in as an admin to view this page.");
        setSubmissions(null);
        return;
      }
      if (!pricingRes.ok) {
        setError("Could not load pricing.");
        setSubmissions(null);
        return;
      }
      const data = (await pricingRes.json()) as { tradesmanMonthlyEuros?: number };
      const n = data.tradesmanMonthlyEuros;
      setEuros(typeof n === "number" && Number.isFinite(n) ? String(n) : "30");

      if (!contactRes.ok) {
        setContactError("Could not load contact messages.");
        setSubmissions(null);
        return;
      }
      const contactJson = (await contactRes.json()) as { submissions?: ContactSubmission[] };
      setSubmissions(Array.isArray(contactJson.submissions) ? contactJson.submissions : []);
    } catch {
      setError("Could not reach the API.");
      setSubmissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const parsed = Number.parseFloat(euros.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Enter a valid price (0 or greater).");
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/pricing", {
        method: "PATCH",
        body: JSON.stringify({ tradesmanMonthlyEuros: parsed }),
      });
      if (res.status === 403) {
        setError("Admin access required.");
        return;
      }
      if (!res.ok) {
        setError("Could not save.");
        return;
      }
      setSaved(true);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Admin"
      description="Platform pricing and messages from the public contact form."
    >
      {loading ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <>
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Tradesman subscription (EUR / month)
        </h2>
        <form onSubmit={(e) => void onSave(e)} className="max-w-md space-y-4">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Tradesman monthly price (EUR)
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={euros}
              onChange={(ev) => setEuros(ev.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}
          {saved ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
          ) : null}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>

        <section className="mt-12 max-w-2xl border-t border-neutral-200 pt-10 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Contact form (latest 100)
          </h2>
          {contactError ? (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
              {contactError}
            </p>
          ) : null}
          {submissions && submissions.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">No messages yet.</p>
          ) : null}
          {submissions && submissions.length > 0 ? (
            <ul className="mt-4 space-y-4">
              {submissions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm dark:border-neutral-700 dark:bg-neutral-900/40"
                >
                  <p className="font-medium text-neutral-900 dark:text-neutral-100">
                    {s.name}{" "}
                    <span className="font-normal text-neutral-600 dark:text-neutral-400">
                      {`<${s.email}>`}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                    {new Date(s.createdAt).toLocaleString("en-IE", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                    {s.message}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        </>
      )}
    </PageShell>
  );
}
