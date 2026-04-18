"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type Policy = {
  requireEmailVerifiedForMutations: boolean;
  requireSmsVerifiedForMutations: boolean;
};

export default function AdminVerificationPage() {
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setSaved(false);
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/verification-policy");
      if (res.status === 403) {
        setError("You must be signed in as an admin.");
        setPolicy(null);
        return;
      }
      if (!res.ok) {
        setError("Could not load verification policy.");
        setPolicy(null);
        return;
      }
      const data = (await res.json()) as Policy;
      setPolicy(data);
    } catch {
      setError("Could not reach the API.");
      setPolicy(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(next: Policy) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await apiFetch("/api/admin/verification-policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (res.status === 403) {
        setError("You must be signed in as an admin.");
        return;
      }
      if (!res.ok) {
        const t = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
        setError(t.error?.message ?? `Save failed (${res.status}).`);
        return;
      }
      const data = (await res.json()) as Policy;
      setPolicy(data);
      setSaved(true);
    } catch {
      setError("Could not reach the API.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Verification gates"
      description="Control whether verified email and verified phone are required for creating or changing data (jobs, messages, portfolio, reviews, profile). GDPR export/erase still require a verified email."
      maxWidth="wide"
    >
      {loading ? <p className="text-sm text-neutral-500">Loading…</p> : null}
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {policy ? (
        <div className="mt-8 max-w-xl space-y-8 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-neutral-300"
                checked={policy.requireEmailVerifiedForMutations}
                disabled={saving}
                onChange={(e) => {
                  const checked = e.target.checked;
                  void save({
                    ...policy,
                    requireEmailVerifiedForMutations: checked,
                  });
                }}
              />
              <span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Require verified email for mutations
                </span>
                <span className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">
                  When off, users can post jobs, send messages, edit portfolio, etc. without verifying email.
                  Strongly recommended on in production.
                </span>
              </span>
            </label>
          </div>

          <div className="space-y-3 border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-neutral-300"
                checked={policy.requireSmsVerifiedForMutations}
                disabled={saving}
                onChange={(e) => {
                  const checked = e.target.checked;
                  void save({
                    ...policy,
                    requireSmsVerifiedForMutations: checked,
                  });
                }}
              />
              <span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Require verified phone for mutations
                </span>
                <span className="mt-1 block text-xs text-neutral-600 dark:text-neutral-400">
                  When on, users need <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">phone_verified</code>{" "}
                  {`SMS flow not integrated yet — use Admin → Users → edit user to toggle "Phone verified" for testing.`}
                </span>
              </span>
            </label>
          </div>

          {saved ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
          ) : null}
        </div>
      ) : null}
    </PageShell>
  );
}
