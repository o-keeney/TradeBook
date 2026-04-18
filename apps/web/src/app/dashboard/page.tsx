"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PageShell } from "@/components/page-shell";
import type { MeUser } from "@/components/auth-nav";
import { apiFetch } from "@/lib/api";
import {
  meRequiresEmailVerifiedForMutations,
  meRequiresSmsVerifiedForMutations,
} from "@/lib/mutation-verification";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch("/api/users/me");
        if (res.status === 401) {
          router.replace("/login?next=/dashboard");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError("Could not load your account.");
          return;
        }
        const data = (await res.json()) as { user: MeUser };
        if (!cancelled) setUser(data.user);
      } catch {
        if (!cancelled) {
          setError("Could not reach the API. Start it with npm run dev:api from the repo root.");
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <PageShell title="Dashboard" description="">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </PageShell>
    );
  }

  if (!user) {
    return (
      <PageShell title="Dashboard" description="">
        <p className="text-neutral-500">Loading…</p>
      </PageShell>
    );
  }

  return (
    <PageShell title="Dashboard" maxWidth="wide">
      {meRequiresEmailVerifiedForMutations(user) && !user.emailVerified ? (
        <EmailVerificationBanner />
      ) : null}
      {meRequiresSmsVerifiedForMutations(user) && !user.phoneVerified ? (
        <div
          className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100"
          role="status"
        >
          <p className="font-medium">Phone not marked verified</p>
          <p className="mt-1 text-sky-900/90 dark:text-sky-100/90">
            This environment requires a verified phone before you can create or change jobs, messages, portfolio, and
            similar data. An admin can enable &quot;Phone verified&quot; on your user for testing until SMS is wired
            up.
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[minmax(0,15.5rem)_1fr] md:items-start">
        <aside className="shrink-0 self-start rounded-2xl border border-neutral-200/90 bg-neutral-50/95 p-4 shadow-sm backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-900/95 md:sticky md:top-24 md:z-[1] md:max-h-[calc(100dvh-6.5rem)] md:overflow-y-auto">
          <h2 className="text-[0.65rem] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Account
          </h2>
          <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {[user.firstName, user.lastName]
              .map((s) => s?.trim())
              .filter((s): s is string => Boolean(s && s.length > 0))
              .join(" ") || "—"}
          </p>
          <p className="mt-1 truncate text-xs text-neutral-600 dark:text-neutral-400" title={user.email}>
            {user.email}
          </p>
          <p className="mt-2">
            <span className="inline-flex rounded-full border border-neutral-200 bg-white px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-800 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200">
              {user.role}
            </span>
          </p>
          <AccountNameForm user={user} onSaved={setUser} />
          <p className="mt-3 text-xs text-neutral-600 dark:text-neutral-400">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">Email verified: </span>
            {user.emailVerified ? (
              <span className="text-emerald-700 dark:text-emerald-400">Yes</span>
            ) : (
              <span className="text-amber-800 dark:text-amber-300">No</span>
            )}
          </p>
          <details className="mt-4 border-t border-neutral-200 pt-3 dark:border-neutral-700">
            <summary className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
              Technical id
            </summary>
            <p className="mt-2 break-all font-mono text-[0.65rem] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {user.id}
            </p>
          </details>
        </aside>

        <section aria-labelledby="dashboard-actions-heading">
          <h2
            id="dashboard-actions-heading"
            className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-neutral-50"
          >
            Where to next
          </h2>
          <ul className="mt-6 flex flex-col gap-4">
            <li>
              <DashboardActionCard
                href="/find-tradesmen"
                title="Find tradesmen"
                description="Search profiles, regions, and public portfolios to shortlist the right trade."
                icon={<IconSearch />}
              />
            </li>
            {user.role === "tradesman" ? (
              <>
                <li>
                  <DashboardActionCard
                    href="/profile"
                    title="Public profile"
                    description="Bio, trades, service area, and optional contact details shown on Find tradesmen."
                    icon={<IconUserCircle />}
                  />
                </li>
                <li>
                  <DashboardActionCard
                    href="/portfolio"
                    title="Portfolio"
                    description="Showcase completed work with photos, dates, and project notes on your public profile."
                    icon={<IconPortfolio />}
                  />
                </li>
              </>
            ) : null}
            <li>
              <DashboardActionCard
                href="/work-orders"
                title={user.role === "tradesman" ? "Work orders & jobs" : "Work orders"}
                description={
                  user.role === "tradesman"
                    ? "Open bids, submit quotes, track awarded jobs, and keep timelines up to date."
                    : "Post jobs, compare bids, award work, and follow each job in one place."
                }
                icon={<IconClipboard />}
              />
            </li>
            <li>
              <DashboardActionCard
                href="/messages"
                title="Messages"
                description="Inbox for private job threads between you and the other party once a job is assigned."
                icon={<IconMessages />}
              />
            </li>
          </ul>
        </section>

        {user.emailVerified ? (
          <GdprDataPanel userEmail={user.email} />
        ) : (
          <section
            aria-labelledby="gdpr-locked-heading"
            className="mt-12 rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-5 dark:border-neutral-800 dark:bg-neutral-900/40"
          >
            <h2
              id="gdpr-locked-heading"
              className="text-sm font-semibold text-neutral-800 dark:text-neutral-200"
            >
              Your data & privacy
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              After you verify your email, you can download a copy of your data or permanently delete your account
              from this dashboard.
            </p>
          </section>
        )}
      </div>
    </PageShell>
  );
}

function AccountNameForm({
  user,
  onSaved,
}: {
  user: MeUser;
  onSaved: (u: MeUser) => void;
}) {
  const [firstName, setFirstName] = useState(user.firstName?.trim() ?? "");
  const [lastName, setLastName] = useState(user.lastName?.trim() ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setFirstName(user.firstName?.trim() ?? "");
    setLastName(user.lastName?.trim() ?? "");
  }, [user.id, user.firstName, user.lastName]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!firstName.trim() || !lastName.trim()) {
      setMsg("First and last name are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        user?: MeUser;
        error?: { message?: string };
      };
      if (!res.ok) {
        setMsg(data?.error?.message ?? `Update failed (${res.status}).`);
        return;
      }
      if (data.user) onSaved(data.user);
      setMsg("Saved.");
    } catch {
      setMsg("Could not reach the API.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100";

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="mt-4 border-t border-neutral-200 pt-4 dark:border-neutral-700"
    >
      <h3 className="text-[0.65rem] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
        Your name
      </h3>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
        {user.role === "tradesman"
          ? "This is the name shown on Find tradesmen when customers browse listings."
          : "Used in your account and in emails about your activity."}
      </p>
      <label className="mt-3 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
        First name
        <input
          name="accountFirstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          autoComplete="given-name"
          className={inputClass}
        />
      </label>
      <label className="mt-2 block text-xs font-medium text-neutral-700 dark:text-neutral-300">
        Last name
        <input
          name="accountLastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          autoComplete="family-name"
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="mt-3 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
      >
        {busy ? "Saving…" : "Save name"}
      </button>
      {msg ? (
        <p
          className={`mt-2 text-xs ${msg === "Saved." ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
          role={msg === "Saved." ? undefined : "alert"}
        >
          {msg}
        </p>
      ) : null}
    </form>
  );
}

function GdprDataPanel({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [exportBusy, setExportBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [eraseBusy, setEraseBusy] = useState(false);
  const [eraseMsg, setEraseMsg] = useState<string | null>(null);

  async function downloadExport() {
    setExportBusy(true);
    setEraseMsg(null);
    try {
      const res = await apiFetch("/api/gdpr/export");
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEraseMsg(
          (data as { error?: { message?: string } })?.error?.message ?? `Export failed (${res.status}).`,
        );
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tradebook-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.rel = "noopener";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setEraseMsg("Could not download export.");
    } finally {
      setExportBusy(false);
    }
  }

  async function eraseAccount() {
    setEraseMsg(null);
    setEraseBusy(true);
    try {
      const res = await apiFetch("/api/gdpr/erase", {
        method: "POST",
        body: JSON.stringify({ confirmEmail: confirmEmail.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { message?: string }; ok?: boolean };
      if (!res.ok) {
        setEraseMsg(data.error?.message ?? `Request failed (${res.status}).`);
        return;
      }
      if (data.ok) {
        router.replace("/login?erased=1");
        return;
      }
      setEraseMsg("Unexpected response.");
    } catch {
      setEraseMsg("Could not reach the API.");
    } finally {
      setEraseBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="gdpr-heading"
      className="mt-12 rounded-2xl border border-neutral-200/90 bg-neutral-50/50 p-5 dark:border-neutral-800 dark:bg-neutral-900/40"
    >
      <h2 id="gdpr-heading" className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Your data & privacy
      </h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Download everything we store about your account (jobs, bids, portfolio metadata, and contact form messages
        sent from your email). Erasing deletes your user row and cascades related records; portfolio files in storage
        are removed when configured.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={exportBusy}
          onClick={() => void downloadExport()}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-60 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100 dark:hover:bg-neutral-900"
        >
          {exportBusy ? "Preparing…" : "Download JSON export"}
        </button>
      </div>

      <div className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-700">
        <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">Permanently delete account</h3>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
          Type your email <span className="font-mono text-neutral-800 dark:text-neutral-200">{userEmail}</span> to
          confirm. This cannot be undone.
        </p>
        <label className="mt-3 block text-sm font-medium text-neutral-800 dark:text-neutral-200">
          Confirmation email
          <input
            type="email"
            autoComplete="off"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            className="mt-1.5 w-full max-w-md rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
            placeholder={userEmail}
          />
        </label>
        <button
          type="button"
          disabled={eraseBusy || confirmEmail.trim().toLowerCase() !== userEmail.toLowerCase()}
          onClick={() => void eraseAccount()}
          className="mt-4 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50 dark:bg-red-800 dark:hover:bg-red-700"
        >
          {eraseBusy ? "Deleting…" : "Delete my account permanently"}
        </button>
        {eraseMsg ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {eraseMsg}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function DashboardActionCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-neutral-200/90 bg-gradient-to-b from-white to-neutral-50/95 p-5 shadow-sm transition hover:border-neutral-300 hover:shadow-md sm:flex-row sm:items-center sm:gap-6 sm:p-6 dark:border-neutral-800 dark:from-neutral-950 dark:to-neutral-900/85 dark:hover:border-neutral-600"
    >
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-inner dark:bg-neutral-100 dark:text-neutral-900"
        aria-hidden
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-neutral-900 dark:text-neutral-100 sm:self-center">
        Open
        <span className="transition-transform group-hover:translate-x-0.5" aria-hidden>
          →
        </span>
      </span>
    </Link>
  );
}

function IconSearch() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function IconPortfolio() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function IconUserCircle() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function IconMessages() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}

function EmailVerificationBanner() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "sent" | "rate_limited" | "error" | "send_failed"
  >("idle");
  const [retrySec, setRetrySec] = useState<number | null>(null);
  const rateLimitDeadlineMs = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "rate_limited" || rateLimitDeadlineMs.current == null) return;
    const tick = () => {
      const deadline = rateLimitDeadlineMs.current;
      if (deadline == null) return;
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRetrySec(left);
      if (left <= 0) {
        rateLimitDeadlineMs.current = null;
        setStatus("idle");
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  async function resend() {
    setStatus("loading");
    setRetrySec(null);
    rateLimitDeadlineMs.current = null;
    try {
      const res = await apiFetch("/api/users/me/request-email-verification", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        emailSent?: boolean;
        error?: { code?: string; retryAfterMs?: number; message?: string };
      };
      if (res.status === 429 && data.error?.retryAfterMs != null) {
        rateLimitDeadlineMs.current = Date.now() + data.error.retryAfterMs;
        setRetrySec(Math.ceil(data.error.retryAfterMs / 1000));
        setStatus("rate_limited");
        return;
      }
      if (!res.ok) {
        setStatus("error");
        return;
      }
      if (data.emailSent === false) {
        setStatus("send_failed");
        return;
      }
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div
      className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
      role="status"
    >
      <p className="font-medium">Verify your email</p>
      <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">
        We sent a link to your address. Some actions (posting jobs, portfolio uploads, profile
        updates) stay disabled until you confirm.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void resend()}
          disabled={status === "loading" || (status === "rate_limited" && (retrySec ?? 0) > 0)}
          className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-60 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
        >
          {status === "loading" ? "Sending…" : "Resend verification email"}
        </button>
        {status === "sent" ? (
          <span className="text-xs text-green-800 dark:text-green-300">Check your inbox.</span>
        ) : null}
        {status === "rate_limited" && retrySec != null && retrySec > 0 ? (
          <span className="text-xs tabular-nums" aria-live="polite">
            Try again in {retrySec}s.
          </span>
        ) : null}
        {status === "send_failed" ? (
          <span className="text-xs">
            The server did not send an email (missing API key or provider error). In local dev,
            check the API terminal for a printed verification link. In production, configure{" "}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/80">BREVO_API_KEY</code> and{" "}
            <code className="rounded bg-amber-100/80 px-1 dark:bg-amber-900/80">BREVO_SENDER_EMAIL</code>
            .
          </span>
        ) : null}
        {status === "error" ? (
          <span className="text-xs text-red-700 dark:text-red-300">Could not send. Try again.</span>
        ) : null}
      </div>
    </div>
  );
}
