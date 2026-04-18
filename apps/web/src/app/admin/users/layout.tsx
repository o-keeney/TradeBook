import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users",
  description: "Search and edit user accounts (admin only).",
  robots: { index: false, follow: false },
};

export default function AdminUsersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
