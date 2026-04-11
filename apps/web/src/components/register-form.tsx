"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapboxAddressField } from "@/components/mapbox-address-field";
import type { MapboxAddressCoords } from "@/components/mapbox-address-field";
import { apiFetch } from "@/lib/api";

export type RegisterFormProps = {
  role: "customer" | "tradesman";
  alternateRegisterHref: string;
  alternateRegisterLabel: string;
};

const inputClass =
  "mt-1.5 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

export function RegisterForm({
  role,
  alternateRegisterHref,
  alternateRegisterLabel,
}: RegisterFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState<MapboxAddressCoords | null>(null);
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [marketing, setMarketing] = useState(false);
  const [contact, setContact] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (role === "tradesman") {
      if (!address.trim() || !specialty.trim() || !phone.trim()) {
        setError("Address, specialty, and phone number are required.");
        return;
      }
    }
    setPending(true);
    try {
      const payload: Record<string, unknown> = {
        email,
        password,
        role,
        gdprConsentDataProcessing: true,
        gdprConsentMarketing: marketing,
        gdprConsentContactDisplay: contact,
      };
      if (role === "tradesman") {
        payload.phone = phone.trim();
        payload.address = address.trim();
        payload.specialty = specialty.trim();
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
      };
      if (!res.ok) {
        setError(data.error?.message ?? "Could not sign up");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  const submitLabel =
    role === "tradesman" ? "Create tradesman account" : "Create customer account";

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="max-w-md space-y-4">
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
      {role === "tradesman" ? (
        <>
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
          </div>
          <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200">
            Specialty
            <input
              name="specialty"
              type="text"
              required
              maxLength={64}
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="e.g. Electrician, plumber"
              className={inputClass}
            />
          </label>
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
            />
          </label>
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
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
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
