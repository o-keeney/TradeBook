import { ApiStatus } from "@/components/api-status";
import { AuthSandbox } from "@/components/auth-sandbox";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Auth",
};

export default function DevAuthPage() {
  return (
    <PageShell
      title="Authentication"
      description="Session cookies and API auth flows. Use http://localhost:3000 and run the API on the same host family as NEXT_PUBLIC_API_URL."
    >
      <div className="space-y-8">
        <section>
          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            API health
          </h2>
          <div className="mt-3">
            <ApiStatus />
          </div>
        </section>
        <section>
          <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
            Auth sandbox
          </h2>
          <div className="mt-3">
            <AuthSandbox />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
