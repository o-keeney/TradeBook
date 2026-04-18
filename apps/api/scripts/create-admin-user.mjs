/**
 * Generate SQL to insert an admin user (bcrypt password hash).
 *
 * Prerequisite: local D1 schema must be up to date (adds users.first_name / last_name, etc.).
 * From apps/api run migrations first, then this script:
 *   npm run db:migrate:local
 *
 * Usage:
 *   cd apps/api
 *   set ADMIN_PASSWORD=your-secure-password
 *   set ADMIN_EMAIL=you@example.com   (optional; default admin@localhost.local)
 *   npm run create-admin
 *
 * Then apply from apps/api (same as other D1 commands in this repo):
 *   node run-wrangler.mjs d1 execute tradebook-db --local --file=scripts/last-admin-insert.sql
 *
 * Remote (after wrangler login):
 *   node run-wrangler.mjs d1 execute tradebook-db --remote --file=scripts/last-admin-insert.sql
 *
 * If the email already exists, this SQL upgrades that row to admin and sets the new password
 * (SQLite ON CONFLICT(email) DO UPDATE). Restart `wrangler dev` after applying if login still fails.
 */
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

const password = process.env.ADMIN_PASSWORD?.trim();
if (!password || password.length < 8) {
  console.error(
    "Set ADMIN_PASSWORD (at least 8 characters). Optionally ADMIN_EMAIL, ADMIN_FIRST_NAME, ADMIN_LAST_NAME.",
  );
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL ?? "admin@localhost.local").trim().toLowerCase();
const firstName = (process.env.ADMIN_FIRST_NAME ?? "Admin").trim() || "Admin";
const lastName = (process.env.ADMIN_LAST_NAME ?? "User").trim() || "User";

const passwordHash = await bcrypt.hash(password, 10);
const id = randomUUID();

/** If this email already exists (e.g. a test customer), upgrade row to admin and reset password. */
const statement = `INSERT INTO users (
  id,
  role,
  email,
  first_name,
  last_name,
  password_hash,
  gdpr_consent_data_processing,
  gdpr_consent_marketing,
  gdpr_consent_contact_display,
  email_verified
) VALUES (
  ${sqlLiteral(id)},
  'admin',
  ${sqlLiteral(email)},
  ${sqlLiteral(firstName)},
  ${sqlLiteral(lastName)},
  ${sqlLiteral(passwordHash)},
  1,
  0,
  0,
  1
)
ON CONFLICT(email) DO UPDATE SET
  role = excluded.role,
  first_name = excluded.first_name,
  last_name = excluded.last_name,
  password_hash = excluded.password_hash,
  gdpr_consent_data_processing = excluded.gdpr_consent_data_processing,
  gdpr_consent_marketing = excluded.gdpr_consent_marketing,
  gdpr_consent_contact_display = excluded.gdpr_consent_contact_display,
  email_verified = excluded.email_verified;`;

const outFile = join(__dirname, "last-admin-insert.sql");
writeFileSync(outFile, statement + "\n", "utf8");

console.log("Wrote:", outFile);
console.log("");
console.log("Local database (from apps/api):");
console.log("  node run-wrangler.mjs d1 execute tradebook-db --local --file=scripts/last-admin-insert.sql");
console.log("");
console.log("Remote database:");
console.log("  node run-wrangler.mjs d1 execute tradebook-db --remote --file=scripts/last-admin-insert.sql");
console.log("");
console.log(`Email: ${email}`);
console.log("Sign in at /login with this email and ADMIN_PASSWORD.");
