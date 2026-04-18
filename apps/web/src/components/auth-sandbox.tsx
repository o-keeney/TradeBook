"use client";

import { useCallback, useState } from "react";
import { apiUrl } from "@/lib/api";
import { CSRF_HEADER_NAME, readCsrfTokenFromDocumentCookie } from "@/lib/csrf-client";

export function AuthSandbox() {
  const [email, setEmail] = useState("dev@example.com");
  const [password, setPassword] = useState("password12");
  const [role, setRole] = useState<"customer" | "tradesman">("customer");
  const [marketing, setMarketing] = useState(false);
  const [contact, setContact] = useState(false);
  const [log, setLog] = useState<string>("");

  const append = useCallback((msg: string) => {
    setLog((prev) => `${prev}\n${msg}`);
  }, []);

  const register = async () => {
    const res = await fetch(apiUrl("/api/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
        role,
        firstName: "Dev",
        lastName: "User",
        gdprConsentDataProcessing: true,
        gdprConsentMarketing: marketing,
        gdprConsentContactDisplay: contact,
        ...(role === "tradesman"
          ? {
              phone: "+353870000000",
              address: "1 Dev Street, Dublin",
              specialties: ["Electrician", "Plumber / heating engineer"],
              companyName: "Dev Co",
            }
          : {}),
      }),
    });
    const text = await res.text();
    append(`register ${res.status}: ${text}`);
  };

  const login = async () => {
    const res = await fetch(apiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const text = await res.text();
    append(`login ${res.status}: ${text}`);
  };

  const logout = async () => {
    const headers = new Headers();
    const csrf = readCsrfTokenFromDocumentCookie();
    if (csrf) headers.set(CSRF_HEADER_NAME, csrf);
    const res = await fetch(apiUrl("/api/auth/logout"), {
      method: "POST",
      headers,
      credentials: "include",
    });
    append(`logout ${res.status}`);
  };

  const me = async () => {
    const res = await fetch(apiUrl("/api/users/me"), { credentials: "include" });
    const text = await res.text();
    append(`me ${res.status}: ${text}`);
  };

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <section className="mt-10 w-full max-w-md rounded-xl border border-neutral-200 p-4 text-left dark:border-neutral-800">
      <h2 className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
        Dev auth (session cookie on app origin)
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        The browser calls same-origin <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">/api/*</code>{" "}
        (proxied to the worker). Use <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-900">npm run dev:all</code>{" "}
        and open <strong>http://localhost:3000</strong>.
      </p>
      <label className="mt-3 block text-xs">
        Email
        <input
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="mt-2 block text-xs">
        Password
        <input
          type="password"
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="mt-2 block text-xs">
        Role
        <select
          className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-950"
          value={role}
          onChange={(e) => setRole(e.target.value as "customer" | "tradesman")}
        >
          <option value="customer">customer</option>
          <option value="tradesman">tradesman</option>
        </select>
      </label>
      <label className="mt-2 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
        Marketing consent
      </label>
      <label className="mt-1 flex items-center gap-2 text-xs">
        <input type="checkbox" checked={contact} onChange={(e) => setContact(e.target.checked)} />
        Contact display consent
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded bg-neutral-900 px-3 py-1 text-xs text-white dark:bg-neutral-100 dark:text-neutral-900"
          onClick={() => void register()}
        >
          Register
        </button>
        <button
          type="button"
          className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void login()}
        >
          Login
        </button>
        <button
          type="button"
          className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void me()}
        >
          GET /me
        </button>
        <button
          type="button"
          className="rounded border border-neutral-400 px-3 py-1 text-xs dark:border-neutral-600"
          onClick={() => void logout()}
        >
          Logout
        </button>
      </div>
      <pre className="mt-3 max-h-40 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-neutral-100">
        {log.trim() || "…"}
      </pre>
    </section>
  );
}
