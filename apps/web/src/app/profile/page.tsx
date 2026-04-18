"use client";

import { CONSTRUCTION_PROFESSIONS } from "@tradebook/construction-professions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { MeUser } from "@/components/auth-nav";
import { MapboxAddressField } from "@/components/mapbox-address-field";
import type { MapboxAddressCoords } from "@/components/mapbox-address-field";
import { PageShell } from "@/components/page-shell";
import { apiFetch } from "@/lib/api";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

type OwnerTradesmanProfile = {
  userId: string;
  bio: string;
  companyName: string | null;
  tradeCategories: string[];
  regionConfig: Record<string, unknown> | null;
  isAvailable: boolean;
  contactEmail: string | null;
  contactPhone: string | null;
  contactEmailVisible: boolean;
  contactPhoneVisible: boolean;
};

function readServiceAddress(rc: Record<string, unknown> | null | undefined): string {
  if (!rc || typeof rc !== "object") return "";
  const v = rc.serviceAddress;
  return typeof v === "string" ? v : "";
}

function readCoords(rc: Record<string, unknown> | null | undefined): MapboxAddressCoords | null {
  if (!rc || typeof rc !== "object") return null;
  const lat = rc.lat;
  const lonOrLng =
    typeof rc.lon === "number" ? rc.lon : typeof rc.lng === "number" ? rc.lng : null;
  if (typeof lat === "number" && lonOrLng != null && Number.isFinite(lat) && Number.isFinite(lonOrLng)) {
    return { lat, lng: lonOrLng };
  }
  return null;
}

export default function TradesmanProfilePage() {
  const router = useRouter();
  const [me, setMe] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [bio, setBio] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState<MapboxAddressCoords | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmailVisible, setContactEmailVisible] = useState(false);
  const [contactPhoneVisible, setContactPhoneVisible] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const removeSpecialty = useCallback((profession: string) => {
    setSpecialties((prev) => prev.filter((p) => p !== profession));
  }, []);

  const addSpecialtyOnListDoubleClick = useCallback((e: React.MouseEvent<HTMLSelectElement>) => {
    const select = e.currentTarget;
    const t = e.target;
    let profession: string | null = null;
    if (t instanceof HTMLOptionElement && t.parentElement === select) {
      profession = t.value;
    } else if (select.selectedOptions.length === 1) {
      profession = select.selectedOptions[0]?.value ?? null;
    }
    if (!profession) return;
    setSpecialties((prev) => (prev.includes(profession) ? prev : [...prev, profession]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadErr(null);
      try {
        const meRes = await apiFetch("/api/users/me");
        if (meRes.status === 401) {
          router.replace("/login?next=/profile");
          return;
        }
        if (!meRes.ok) {
          if (!cancelled) setLoadErr("Could not load your account.");
          return;
        }
        const meJson = (await meRes.json()) as { user: MeUser };
        const user = meJson.user;
        if (user.role !== "tradesman") {
          router.replace("/dashboard");
          return;
        }
        if (!cancelled) setMe(user);

        const pRes = await apiFetch(`/api/tradesmen/${encodeURIComponent(user.id)}/profile`);
        if (!pRes.ok) {
          if (!cancelled) setLoadErr("Could not load your tradesman profile.");
          return;
        }
        const pJson = (await pRes.json()) as { profile?: OwnerTradesmanProfile };
        const p = pJson.profile;
        if (!p || cancelled) return;

        setBio(p.bio ?? "");
        setCompanyName(p.companyName?.trim() ?? "");
        setSpecialties([...(p.tradeCategories ?? [])]);
        const rc = (p.regionConfig ?? null) as Record<string, unknown> | null;
        setAddress(readServiceAddress(rc));
        setAddressCoords(readCoords(rc));
        setIsAvailable(Boolean(p.isAvailable));
        setContactEmail(p.contactEmail?.trim() ?? "");
        setContactPhone(p.contactPhone?.trim() ?? "");
        setContactEmailVisible(Boolean(p.contactEmailVisible));
        setContactPhoneVisible(Boolean(p.contactPhoneVisible));
      } catch {
        if (!cancelled) setLoadErr("Network error.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!me || saving) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const regionConfig: Record<string, unknown> = {};
      const line = address.trim();
      if (line) regionConfig.serviceAddress = line;
      if (addressCoords) {
        regionConfig.lat = addressCoords.lat;
        regionConfig.lon = addressCoords.lng;
      }

      const res = await apiFetch(`/api/tradesmen/${encodeURIComponent(me.id)}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bio: bio.trim(),
          companyName: companyName.trim() === "" ? null : companyName.trim(),
          tradeCategories: specialties,
          regionConfig: Object.keys(regionConfig).length ? regionConfig : {},
          isAvailable,
          contactEmail: contactEmail.trim() === "" ? null : contactEmail.trim(),
          contactPhone: contactPhone.trim() === "" ? null : contactPhone.trim(),
          contactEmailVisible,
          contactPhoneVisible,
        }),
      });
      const raw = await res.text();
      let msg = "Saved.";
      if (!res.ok) {
        try {
          const j = JSON.parse(raw) as { error?: { message?: string } };
          msg = j.error?.message ?? `Request failed (${res.status}).`;
        } catch {
          msg = `Request failed (${res.status}).`;
        }
        setSaveMsg(msg);
        return;
      }
      setSaveMsg(msg);
    } catch {
      setSaveMsg("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageShell title="Your profile" description="">
        <p className="text-sm text-neutral-500">Loading…</p>
      </PageShell>
    );
  }

  if (loadErr) {
    return (
      <PageShell title="Your profile" description="">
        <p className="text-sm text-red-600 dark:text-red-400">{loadErr}</p>
      </PageShell>
    );
  }

  if (!me) return null;

  return (
    <PageShell
      title="Your public profile"
      description="These details power how you appear on Find tradesmen. Your display name is updated from the dashboard."
    >
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        <Link
          href={`/find-tradesmen/${encodeURIComponent(me.id)}`}
          className="font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-700 dark:text-neutral-100 dark:hover:text-neutral-300"
        >
          Preview your public listing
        </Link>
      </p>

      {!me.emailVerified ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Verify your email to save profile changes.
        </p>
      ) : null}

      <form onSubmit={(ev) => void save(ev)} className="mt-8 space-y-8">
        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Bio
          <textarea
            name="bio"
            rows={6}
            maxLength={8000}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className={inputClass}
            placeholder="A short introduction for customers…"
          />
        </label>

        <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Company name <span className="font-normal text-neutral-500 dark:text-neutral-400">(optional)</span>
          <input
            name="companyName"
            type="text"
            autoComplete="organization"
            maxLength={120}
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="block space-y-1.5">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Trades & specialties</span>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Double-click a profession in the list to add it. Remove entries with the button beside each tag.
          </p>
          <div
            className="mt-1.5 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2.5 dark:border-neutral-600 dark:bg-neutral-900/80"
            aria-live="polite"
          >
            <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">Your selections</p>
            {specialties.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
                None yet — double-click trades in the list below.
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {specialties.map((p) => (
                  <li
                    key={p}
                    className="flex max-w-full items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 py-1 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
                  >
                    <span className="min-w-0 flex-1 break-words">{p}</span>
                    <button
                      type="button"
                      onClick={() => {
                        removeSpecialty(p);
                      }}
                      className="shrink-0 rounded px-1.5 py-0.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                      aria-label={`Remove ${p}`}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="sr-only" id="profile-specialties-list-label">
            All professions — double-click one to add it to your selections
          </span>
          <select
            multiple
            defaultValue={[]}
            onDoubleClick={addSpecialtyOnListDoubleClick}
            className={`${inputClass} min-h-[14rem] py-2`}
            size={Math.min(14, CONSTRUCTION_PROFESSIONS.length)}
            aria-labelledby="profile-specialties-list-label"
          >
            {CONSTRUCTION_PROFESSIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="block space-y-1">
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Primary service area</span>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Search for the address or area you want to highlight on your listing (Mapbox).
          </p>
          <MapboxAddressField
            id="profile-service-address"
            value={address}
            onChange={(line, coords) => {
              setAddress(line);
              setAddressCoords(coords ?? null);
            }}
            placeholder="Search for your business or service address"
            inputClassName={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-300"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
          />
          Show as available for new work
        </label>

        <fieldset className="space-y-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <legend className="px-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Contact on your public profile
          </legend>
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Optional. Only values you mark as visible are shown to customers on Find tradesmen.
          </p>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Contact email
            <input
              type="email"
              autoComplete="email"
              maxLength={320}
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300"
              checked={contactEmailVisible}
              onChange={(e) => setContactEmailVisible(e.target.checked)}
            />
            Show email on public profile
          </label>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Contact phone
            <input
              type="tel"
              autoComplete="tel"
              maxLength={32}
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-neutral-300"
              checked={contactPhoneVisible}
              onChange={(e) => setContactPhoneVisible(e.target.checked)}
            />
            Show phone on public profile
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || !me.emailVerified}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
          {saveMsg ? (
            <p
              className={`text-sm ${saveMsg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              role={saveMsg === "Saved." ? undefined : "alert"}
            >
              {saveMsg}
            </p>
          ) : null}
        </div>
      </form>
    </PageShell>
  );
}
