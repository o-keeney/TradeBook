"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  createdAt: string | number | Date;
  deletedAt?: string | number | Date | null;
};

const limit = 50;

export default function AdminUsersListPage() {
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFrom = useCallback(
    async (startOffset: number, append: boolean, searchQ: string) => {
      setLoading(true);
      setError(null);
      try {
        await apiFetch("/api/users/me");
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        params.set("offset", String(startOffset));
        if (searchQ.trim()) params.set("q", searchQ.trim());
        if (includeDeleted) params.set("all", "1");
        const res = await apiFetch(`/api/admin/users?${params.toString()}`);
        if (res.status === 403) {
          setError("Admin access required.");
          if (!append) setUsers([]);
          return;
        }
        if (!res.ok) {
          setError("Could not load users.");
          if (!append) setUsers([]);
          return;
        }
        const data = (await res.json()) as {
          users?: AdminUserRow[];
          total?: number;
        };
        const batch = Array.isArray(data.users) ? data.users : [];
        if (append) setUsers((prev) => [...prev, ...batch]);
        else setUsers(batch);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch {
        setError("Could not reach the API.");
        if (!append) setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [includeDeleted],
  );

  useEffect(() => {
    void loadFrom(0, false, "");
  }, [includeDeleted, loadFrom]);

  const canLoadMore = users.length < total;

  return (
    <PageShell
      title="Users"
      description="Search accounts, open a user to edit their profile and tradesman details."
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        <Link
          href="/admin"
          className="font-medium text-neutral-900 underline-offset-4 hover:underline dark:text-neutral-100"
        >
          ← Admin overview
        </Link>
      </p>

      <form
        className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void loadFrom(0, false, q);
        }}
      >
        <label className="block min-w-0 flex-1 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Search (email or name)
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            placeholder="e.g. smith or @gmail"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Include deleted
        </label>
        <button
          type="submit"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Search
        </button>
      </form>

      {loading && users.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">Loading…</p>
      ) : error ? (
        <p className="mt-8 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm text-neutral-600 dark:text-neutral-400">
            Showing {users.length} of {total} user{total === 1 ? "" : "s"}.
          </p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-sm dark:divide-neutral-800">
              <thead className="bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-900/60 dark:text-neutral-400">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Verified</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white dark:divide-neutral-800 dark:bg-neutral-950">
                {users.map((u) => {
                  const name =
                    [u.firstName, u.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || "—";
                  const deleted = u.deletedAt != null;
                  return (
                    <tr key={u.id} className={deleted ? "opacity-60" : ""}>
                      <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">{name}</td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">{u.email}</td>
                      <td className="px-4 py-3 capitalize text-neutral-700 dark:text-neutral-300">{u.role}</td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                        {u.emailVerified ? "Yes" : "No"}
                      </td>
                      <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300">
                        {deleted ? "Deleted" : "Active"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${encodeURIComponent(u.id)}`}
                          className="font-medium text-indigo-600 underline-offset-2 hover:underline dark:text-indigo-400"
                        >
                          Edit
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {canLoadMore ? (
            <button
              type="button"
              disabled={loading}
              className="mt-6 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-900"
              onClick={() => void loadFrom(users.length, true, q)}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
