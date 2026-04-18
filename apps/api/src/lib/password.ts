import bcrypt from "bcryptjs";

/**
 * Password policy: bcrypt (cost 10). Argon2id is a future upgrade if we need stronger
 * offline-cracking resistance; see TODO (Security & compliance).
 */
const SALT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
