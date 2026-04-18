"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MapboxAddressField } from "@/components/mapbox-address-field";
import type { MapboxAddressCoords } from "@/components/mapbox-address-field";
import { apiFetch } from "@/lib/api";
import { postTradesmanProfilePhoto } from "@/lib/tradesman-profile-photo";
import { CONSTRUCTION_PROFESSIONS } from "@tradebook/construction-professions";

export type RegisterFormProps = {
  role: "customer" | "tradesman";
  alternateRegisterHref: string;
  alternateRegisterLabel: string;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

type TradesmanFieldKey = "address" | "specialties" | "phone";

function stripFieldError(
  prev: Partial<Record<TradesmanFieldKey, string>>,
  key: TradesmanFieldKey,
): Partial<Record<TradesmanFieldKey, string>> {
  if (!(key in prev)) return prev;
  const rest = { ...prev };
  delete rest[key];
  return rest;
}

export function RegisterForm({
  role,
  alternateRegisterHref,
  alternateRegisterLabel,
}: RegisterFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState<MapboxAddressCoords | null>(null);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [contact, setContact] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TradesmanFieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [profilePhotoPreviewUrl, setProfilePhotoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!profilePhoto) {
      setProfilePhotoPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(profilePhoto);
    setProfilePhotoPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [profilePhoto]);

  useEffect(() => {
    if (role !== "tradesman" || !address.trim()) return;
    setFieldErrors((prev) => stripFieldError(prev, "address"));
  }, [role, address]);

  useEffect(() => {
    if (role !== "tradesman" || specialties.length === 0) return;
    setFieldErrors((prev) => stripFieldError(prev, "specialties"));
  }, [role, specialties]);

  useEffect(() => {
    if (role !== "tradesman" || !phone.trim()) return;
    setFieldErrors((prev) => stripFieldError(prev, "phone"));
  }, [role, phone]);

  const removeSpecialty = useCallback((profession: string) => {
    setSpecialties((prev) => prev.filter((p) => p !== profession));
  }, []);

  const addSpecialtyOnListDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLSelectElement>) => {
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
    },
    [],
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormError("First name and last name are required.");
      return;
    }
    if (role === "tradesman") {
      const next: Partial<Record<TradesmanFieldKey, string>> = {};
      if (!address.trim()) next.address = "Address is required.";
      if (specialties.length === 0) next.specialties = "Select at least one specialty.";
      if (!phone.trim()) next.phone = "Phone number is required.";
      if (Object.keys(next).length > 0) {
        setFieldErrors(next);
        return;
      }
      setFieldErrors({});
    }
    setPending(true);
    try {
      const payload: Record<string, unknown> = {
        email,
        password,
        role,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gdprConsentDataProcessing: true,
        gdprConsentMarketing: marketing,
        gdprConsentContactDisplay: contact,
      };
      if (role === "tradesman") {
        const co = companyName.trim();
        if (co) payload.companyName = co;
        payload.phone = phone.trim();
        payload.address = address.trim();
        payload.specialties = specialties;
        if (addressCoords) {
          payload.addressLat = addressCoords.lat;
          payload.addressLng = addressCoords.lng;
        }
      }
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        user?: { id: string };
      };
      if (!res.ok) {
        setFieldErrors({});
        setFormError(data.error?.message ?? "Could not sign up");
        return;
      }
      const newUserId = data.user?.id;
      if (role === "tradesman" && profilePhoto && newUserId) {
        const up = await postTradesmanProfilePhoto(newUserId, profilePhoto);
        if (!up.ok) {
          console.error("Profile photo upload after register failed:", up.message);
        }
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setFieldErrors({});
      setFormError(
        "Could not reach the server. Check that the API is running and NEXT_PUBLIC_API_URL matches how you open the site (localhost vs 127.0.0.1).",
      );
    } finally {
      setPending(false);
    }
  }

  const submitLabel =
    role === "tradesman" ? "Create tradesman account" : "Create customer account";

  return (
    <form method="post" onSubmit={(e) => void onSubmit(e)} className="max-w-md space-y-4">
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Password
        <input
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <span className="mt-1 block text-xs font-normal text-neutral-500">
          At least 8 characters.
        </span>
      </label>
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        First name
        <input
          name="firstName"
          type="text"
          autoComplete="given-name"
          required
          maxLength={80}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Last name
        <input
          name="lastName"
          type="text"
          autoComplete="family-name"
          required
          maxLength={80}
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className={inputClass}
        />
      </label>
      {role === "tradesman" ? (
        <>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Company name{" "}
            <span className="font-normal text-neutral-500 dark:text-neutral-400">(optional)</span>
            <input
              name="companyName"
              type="text"
              autoComplete="organization"
              maxLength={120}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={"e.g. O'Sullivan Electrical Ltd"}
              className={inputClass}
            />
          </label>
          <div className="block space-y-1">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Address
            </span>
            <MapboxAddressField
              id="register-tradesman-address"
              value={address}
              onChange={(line, coords) => {
                setAddress(line);
                setAddressCoords(coords ?? null);
              }}
              required
              placeholder="Search for your business or service address"
              inputClassName={inputClass}
            />
            {fieldErrors.address ? (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.address}
              </p>
            ) : null}
          </div>
          <div className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Specialties
            </span>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              Double-click a profession in the list below to add it. Remove any entry from your
              current list using the button beside it.
            </p>
            <div
              className="mt-1.5 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2.5 dark:border-neutral-600 dark:bg-neutral-900/80"
              aria-live="polite"
            >
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Your selections
              </p>
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
            <span className="sr-only" id="register-specialties-list-label">
              All professions — double-click one to add it to your selections
            </span>
            <select
              multiple
              defaultValue={[]}
              onDoubleClick={addSpecialtyOnListDoubleClick}
              className={`${inputClass} min-h-[14rem] py-2`}
              size={Math.min(14, CONSTRUCTION_PROFESSIONS.length)}
              aria-labelledby="register-specialties-list-label"
            >
              {CONSTRUCTION_PROFESSIONS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {fieldErrors.specialties ? (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.specialties}
              </p>
            ) : null}
          </div>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Phone number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              required
              maxLength={32}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputClass}
              aria-invalid={fieldErrors.phone ? true : undefined}
            />
            {fieldErrors.phone ? (
              <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
                {fieldErrors.phone}
              </p>
            ) : null}
          </label>
          <div className="block space-y-1.5">
            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Profile photo{" "}
              <span className="font-normal text-neutral-500 dark:text-neutral-400">(optional)</span>
            </span>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              JPEG, PNG, WebP, or AVIF. Shown on Find tradesmen after you save your public profile.
            </p>
            <input
              name="profilePhoto"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className={`${inputClass} py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-200 file:px-2 file:py-1 file:text-xs file:font-medium file:text-neutral-800 dark:file:bg-neutral-800 dark:file:text-neutral-200`}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setProfilePhoto(f);
              }}
            />
            {profilePhotoPreviewUrl ? (
              <Image
                src={profilePhotoPreviewUrl}
                alt="Selected profile photo preview"
                width={112}
                height={112}
                unoptimized
                className="mt-2 rounded-full object-cover ring-2 ring-neutral-200 dark:ring-neutral-700"
              />
            ) : null}
          </div>
        </>
      ) : null}
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" required className="mt-1" />
        <span>
          I agree to the processing of my data as required to run this service (GDPR).
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={marketing}
          onChange={(e) => setMarketing(e.target.checked)}
          className="mt-1"
        />
        <span>Email me marketing and product updates (optional).</span>
      </label>
      <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <input
          type="checkbox"
          checked={contact}
          onChange={(e) => setContact(e.target.checked)}
          className="mt-1"
        />
        <span>Allow contact details on my profile where applicable (optional).</span>
      </label>
      {formError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        {pending ? "Creating account…" : submitLabel}
      </button>
      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Log in
        </Link>
      </p>
      <p className="text-center text-sm text-neutral-600 dark:text-neutral-400">
        {alternateRegisterLabel}{" "}
        <Link
          href={alternateRegisterHref}
          className="font-medium text-neutral-900 underline dark:text-neutral-100"
        >
          Register here
        </Link>
        .
      </p>
    </form>
  );
}
