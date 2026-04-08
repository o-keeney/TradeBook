import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "Log in",
};

function safeNext(raw: string | undefined): string {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) {
    return "/dashboard";
  }
  return raw;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = safeNext(sp.next);

  return (
    <PageShell
      title="Log in"
      description="Sign in with the email and password you used to register."
    >
      <LoginForm nextPath={next} />
      <p className="mt-6 text-center text-sm text-neutral-600 dark:text-neutral-400">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-neutral-900 underline dark:text-neutral-100">
          Register
        </Link>
      </p>
    </PageShell>
  );
}
