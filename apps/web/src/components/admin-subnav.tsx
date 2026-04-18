"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview", match: (p: string) => p === "/admin" },
  { href: "/admin/users", label: "Users", match: (p: string) => p.startsWith("/admin/users") },
] as const;

function linkClass(active: boolean) {
  return `rounded-md px-3 py-1.5 text-sm font-medium ${
    active
      ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
  }`;
}

export function AdminSubnav() {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 py-3"
      aria-label="Admin sections"
    >
      {links.map(({ href, label, match }) => (
        <Link key={href} href={href} className={linkClass(match(pathname))}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
