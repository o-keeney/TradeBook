"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

type MeUser = {
  id: string;
  email: string;
  role: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerified: boolean;
  gdprConsentDataProcessing: boolean;
  gdprConsentMarketing: boolean;
  gdprConsentContactDisplay: boolean;
  deletedAt?: string | number | Date | null;
};

type TradesmanProfile = {
  userId: string;
  bio: string;
  companyName: string | null;
  tradeCategories: string[];
  regionConfig: Record<string, unknown>;
  isAvailable: boolean;
  verificationStatus: string;
  subscriptionStatus: string;
  subscriptionTier: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactEmailVisible: boolean;
  contactPhoneVisible: boolean;
};

export default function AdminUserEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<MeUser | null>(null);
  const [profile, setProfile] = useState<TradesmanProfile | null>(null);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("customer");
  const [emailVerified, setEmailVerified] = useState(false);
  const [gdprData, setGdprData] = useState(true);
  const [gdprMarketing, setGdprMarketing] = useState(false);
  const [gdprContact, setGdprContact] = useState(false);
  const [accountActive, setAccountActive] = useState(true);

  const [bio, setBio] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [tradeCategoriesText, setTradeCategoriesText] = useState("");
  const [regionJson, setRegionJson] = useState("{}");
  const [isAvailable, setIsAvailable] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState("none");
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");
  const [subscriptionTier, setSubscriptionTier] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmailVisible, setContactEmailVisible] = useState(false);
  const [contactPhoneVisible, setContactPhoneVisible] = useState(false);

  const [savingUser, setSavingUser] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [userMsg, setUserMsg] = useState<string | null>(null);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  const [consentEntries, setConsentEntries] = useState<
    {
      id: string;
      createdAt: number;
      ip: string | null;
      userAgent: string | null;
      gdprConsentDataProcessing: boolean;
      gdprConsentMarketing: boolean;
      gdprConsentContactDisplay: boolean;
      source: string;
    }[]
  | null>(null);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  /** Aborts stale GET /users/:id so an in-flight load cannot overwrite state after a successful save. */
  const loadUserAbortRef = useRef<AbortController | null>(null);
  /** Bumped on each load start so aborted/outdated fetches do not clear `loading` while a newer load runs (Strict Mode). */
  const loadSeqRef = useRef(0);

  const applyPayload = useCallback((u: MeUser, p: TradesmanProfile | null) => {
    setUser(u);
    setProfile(p);
    setEmail(u.email);
    setFirstName(u.firstName ?? "");
    setLastName(u.lastName ?? "");
    setPhone(u.phone ?? "");
    setRole(u.role);
    setEmailVerified(u.emailVerified);
    setGdprData(u.gdprConsentDataProcessing);
    setGdprMarketing(u.gdprConsentMarketing);
    setGdprContact(u.gdprConsentContactDisplay);
    setAccountActive(u.deletedAt == null);
    if (p) {
      setBio(p.bio);
      setCompanyName(p.companyName ?? "");
      setTradeCategoriesText(p.tradeCategories.join(", "));
      setRegionJson(JSON.stringify(p.regionConfig ?? {}, null, 2));
      setIsAvailable(p.isAvailable);
      setVerificationStatus(p.verificationStatus);
      setSubscriptionStatus(p.subscriptionStatus);
      setSubscriptionTier(p.subscriptionTier ?? "");
      setContactEmail(p.contactEmail ?? "");
      setContactPhone(p.contactPhone ?? "");
      setContactEmailVisible(p.contactEmailVisible);
      setContactPhoneVisible(p.contactPhoneVisible);
    } else {
      setBio("");
      setCompanyName("");
      setTradeCategoriesText("");
      setRegionJson("{}");
      setIsAvailable(true);
      setVerificationStatus("none");
      setSubscriptionStatus("inactive");
      setSubscriptionTier("");
      setContactEmail("");
      setContactPhone("");
      setContactEmailVisible(false);
      setContactPhoneVisible(false);
    }
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    loadUserAbortRef.current?.abort();
    const ac = new AbortController();
    loadUserAbortRef.current = ac;
    const mySeq = ++loadSeqRef.current;

    setLoading(true);
    setError(null);
    setUserMsg(null);
    setProfileMsg(null);
    setConsentEntries(null);
    setConsentError(null);
    try {
      const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        signal: ac.signal,
        cache: "no-store",
      });
      if (mySeq !== loadSeqRef.current || ac.signal.aborted) return;
      if (res.status === 403) {
        setError("Admin access required.");
        setUser(null);
        setProfile(null);
        return;
      }
      if (res.status === 404) {
        setError("User not found.");
        setUser(null);
        setProfile(null);
        return;
      }
      if (!res.ok) {
        setError("Could not load user.");
        setUser(null);
        setProfile(null);
        return;
      }
      const data = (await res.json()) as { user?: MeUser; tradesmanProfile?: TradesmanProfile | null };
      if (mySeq !== loadSeqRef.current || ac.signal.aborted) return;
      if (!data.user) {
        setError("User not found.");
        setUser(null);
        setProfile(null);
        return;
      }
      applyPayload(data.user, data.tradesmanProfile ?? null);
    } catch {
      if (mySeq !== loadSeqRef.current || ac.signal.aborted) return;
      setError("Network error.");
      setUser(null);
      setProfile(null);
    } finally {
      if (loadUserAbortRef.current === ac) loadUserAbortRef.current = null;
      if (mySeq === loadSeqRef.current) setLoading(false);
    }
  }, [id, applyPayload]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void load();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [load]);

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    loadUserAbortRef.current?.abort();
    setSavingUser(true);
    setUserMsg(null);
    try {
      const body: Record<string, unknown> = {
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || null,
        lastName: lastName.trim() || null,
        phone: phone.trim() || null,
        role,
        emailVerified,
        gdprConsentDataProcessing: gdprData,
        gdprConsentMarketing: gdprMarketing,
        gdprConsentContactDisplay: gdprContact,
        accountActive,
      };
      const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = "Save failed.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setUserMsg(msg);
        return;
      }
      const data = JSON.parse(raw) as { user?: MeUser; tradesmanProfile?: TradesmanProfile | null };
      if (data.user) applyPayload(data.user, data.tradesmanProfile ?? null);
      setUserMsg("Saved.");
    } catch {
      setUserMsg("Network error.");
    } finally {
      setSavingUser(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    loadUserAbortRef.current?.abort();
    setSavingProfile(true);
    setProfileMsg(null);
    let regionConfig: Record<string, unknown>;
    try {
      regionConfig = JSON.parse(regionJson) as Record<string, unknown>;
      if (regionConfig === null || typeof regionConfig !== "object" || Array.isArray(regionConfig)) {
        throw new Error("invalid");
      }
    } catch {
      setProfileMsg("Region config must be valid JSON object.");
      setSavingProfile(false);
      return;
    }
    const tradeCategories = tradeCategoriesText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}/tradesman-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio,
          companyName: companyName.trim() || null,
          tradeCategories,
          regionConfig,
          isAvailable,
          verificationStatus,
          subscriptionStatus,
          subscriptionTier: subscriptionTier.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          contactEmailVisible,
          contactPhoneVisible,
        }),
      });
      const raw = await res.text();
      if (!res.ok) {
        let msg = "Save failed.";
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          if (j.error?.message) msg = j.error.message;
        } catch {
          /* ignore */
        }
        setProfileMsg(msg);
        return;
      }
      const data = JSON.parse(raw) as { user?: MeUser; tradesmanProfile?: TradesmanProfile | null };
      if (data.user) applyPayload(data.user, data.tradesmanProfile ?? null);
      setProfileMsg("Saved.");
    } catch {
      setProfileMsg("Network error.");
    } finally {
      setSavingProfile(false);
    }
  }

  if (!id) {
    return (
      <PageShell title="User" description="">
        <p className="text-sm text-neutral-500">Invalid user id.</p>
      </PageShell>
    );
  }

  if (loading) {
    return (
      <PageShell title="User" description="">
        <p className="text-sm text-neutral-500">Loading…</p>
      </PageShell>
    );
  }

  if (error || !user) {
    return (
      <PageShell title="User" description="">
        <Link href="/admin/users" className="text-sm font-medium text-indigo-600 underline dark:text-indigo-400">
          ← Users list
        </Link>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error ?? "Not found."}
        </p>
      </PageShell>
    );
  }

  const isTradesman = user.role === "tradesman";

  return (
    <PageShell
      title="Edit user"
      description={`${user.email} · ${user.id}`}
    >
      <p className="text-sm">
        <Link href="/admin/users" className="font-medium text-indigo-600 underline dark:text-indigo-400">
          ← Users list
        </Link>
      </p>

      <form onSubmit={(e) => void saveUser(e)} className="mt-10 max-w-xl space-y-4">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Account</h2>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            First name
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Last name
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
        </div>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Phone
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          />
        </label>
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Role
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
          >
            <option value="customer">Customer</option>
            <option value="tradesman">Tradesman</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
          <input type="checkbox" checked={emailVerified} onChange={(e) => setEmailVerified(e.target.checked)} />
          Email verified
        </label>
        <label className="flex items-center gap-2 text-sm text-neutral-800 dark:text-neutral-200">
          <input type="checkbox" checked={accountActive} onChange={(e) => setAccountActive(e.target.checked)} />
          Account active (clear soft-delete)
        </label>
        <div className="space-y-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">GDPR consents</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gdprData} onChange={(e) => setGdprData(e.target.checked)} />
            Data processing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gdprMarketing} onChange={(e) => setGdprMarketing(e.target.checked)} />
            Marketing
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={gdprContact} onChange={(e) => setGdprContact(e.target.checked)} />
            Contact display
          </label>
        </div>
        {userMsg ? (
          <p className={`text-sm ${userMsg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {userMsg}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={savingUser}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {savingUser ? "Saving…" : "Save account"}
        </button>
      </form>

      {isTradesman && profile ? (
        <form onSubmit={(e) => void saveProfile(e)} className="mt-12 max-w-xl space-y-4 border-t border-neutral-200 pt-10 dark:border-neutral-800">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Tradesman profile</h2>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Company name
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Trade categories (comma-separated, must match platform list)
            <input
              type="text"
              value={tradeCategoriesText}
              onChange={(e) => setTradeCategoriesText(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Region config (JSON)
            <textarea
              value={regionJson}
              onChange={(e) => setRegionJson(e.target.value)}
              rows={6}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-xs dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
            Available for work
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Verification
              <select
                value={verificationStatus}
                onChange={(e) => setVerificationStatus(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <option value="none">none</option>
                <option value="pending">pending</option>
                <option value="verified">verified</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Subscription status
              <select
                value={subscriptionStatus}
                onChange={(e) => setSubscriptionStatus(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              >
                <option value="inactive">inactive</option>
                <option value="active">active</option>
                <option value="past_due">past_due</option>
                <option value="cancelled">cancelled</option>
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Subscription tier (label)
            <input
              type="text"
              value={subscriptionTier}
              onChange={(e) => setSubscriptionTier(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Contact email (listing)
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Contact phone (listing)
            <input
              type="text"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={contactEmailVisible}
              onChange={(e) => setContactEmailVisible(e.target.checked)}
            />
            Show contact email publicly
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={contactPhoneVisible}
              onChange={(e) => setContactPhoneVisible(e.target.checked)}
            />
            Show contact phone publicly
          </label>
          {profileMsg ? (
            <p
              className={`text-sm ${profileMsg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {profileMsg}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={savingProfile}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {savingProfile ? "Saving…" : "Save tradesman profile"}
          </button>
        </form>
      ) : isTradesman && !profile ? (
        <p className="mt-10 text-sm text-amber-700 dark:text-amber-400">
          This user is marked as a tradesman but has no profile row yet. Save the account once (e.g. toggle role) to
          create it, or contact support.
        </p>
      ) : null}

      <section className="mt-12 max-w-3xl border-t border-neutral-200 pt-10 dark:border-neutral-800">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">Signup consent audit</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Rows from <code className="text-xs">consent_audit_log</code> (registration snapshot).
        </p>
        {consentEntries === null ? (
          <button
            type="button"
            className="mt-4 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-60 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-neutral-900"
            disabled={consentLoading || !id}
            onClick={() => {
              setConsentLoading(true);
              setConsentError(null);
              void (async () => {
                try {
                  const res = await apiFetch(`/api/admin/users/${encodeURIComponent(id)}/consent-audit`);
                  if (!res.ok) {
                    setConsentError("Could not load consent log.");
                    return;
                  }
                  const data = (await res.json()) as {
                    entries?: {
                      id: string;
                      createdAt: number;
                      ip: string | null;
                      userAgent: string | null;
                      gdprConsentDataProcessing: boolean;
                      gdprConsentMarketing: boolean;
                      gdprConsentContactDisplay: boolean;
                      source: string;
                    }[];
                  };
                  setConsentEntries(Array.isArray(data.entries) ? data.entries : []);
                } catch {
                  setConsentError("Network error.");
                } finally {
                  setConsentLoading(false);
                }
              })();
            }}
          >
            {consentLoading ? "Loading…" : "Load consent log"}
          </button>
        ) : null}
        {consentError ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {consentError}
          </p>
        ) : null}
        {consentEntries !== null ? (
          consentEntries.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">No consent audit rows for this user.</p>
          ) : (
            <div className="mt-4 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full text-left text-xs text-neutral-800 dark:text-neutral-200">
                <thead className="bg-neutral-50 font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-900/80 dark:text-neutral-400">
                  <tr>
                    <th className="px-3 py-2">When</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">IP</th>
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Mkt</th>
                    <th className="px-3 py-2">Contact</th>
                    <th className="px-3 py-2">UA (trunc.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {consentEntries.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(e.createdAt).toLocaleString("en-IE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-3 py-2">{e.source}</td>
                      <td className="px-3 py-2 font-mono text-[11px]">{e.ip ?? "—"}</td>
                      <td className="px-3 py-2">{e.gdprConsentDataProcessing ? "Y" : "N"}</td>
                      <td className="px-3 py-2">{e.gdprConsentMarketing ? "Y" : "N"}</td>
                      <td className="px-3 py-2">{e.gdprConsentContactDisplay ? "Y" : "N"}</td>
                      <td className="max-w-[12rem] truncate px-3 py-2 font-mono text-[10px] text-neutral-600 dark:text-neutral-400">
                        {e.userAgent ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>
    </PageShell>
  );
}
