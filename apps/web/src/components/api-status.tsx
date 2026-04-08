"use client";

import { useEffect, useState } from "react";
import { getPublicApiUrl } from "@/lib/public-env";

type HealthResponse = {
  ok?: boolean;
  service?: string;
  environment?: string;
  d1?: string;
  users?: number | null;
};

export function ApiStatus() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const base = getPublicApiUrl();
    fetch(`${base.replace(/\/$/, "")}/api/health`, { credentials: "omit" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<HealthResponse>;
      })
      .then(setData)
      .catch(() => setError("Could not reach the API (start it with npm run dev:api)."));
  }, []);

  if (error) {
    return (
      <p className="mt-4 max-w-lg text-center text-sm text-amber-700 dark:text-amber-400">
        {error}
      </p>
    );
  }
  if (!data) {
    return (
      <p className="mt-4 text-sm text-neutral-500">Checking API…</p>
    );
  }
  return (
    <pre className="mt-4 max-w-lg overflow-x-auto rounded-lg bg-neutral-900 p-4 text-left text-xs text-neutral-100">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
