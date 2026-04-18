import type { Metadata } from "next";
import { AdminSubnav } from "@/components/admin-subnav";

export const metadata: Metadata = {
  title: "Admin",
  description: "Platform pricing, contact inbox, and user management (admin only).",
  alternates: { canonical: "/admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[50vh]">
      <div className="border-b border-neutral-200 bg-neutral-50/80 dark:border-neutral-800 dark:bg-neutral-950/40">
        <AdminSubnav />
      </div>
      {children}
    </div>
  );
}
