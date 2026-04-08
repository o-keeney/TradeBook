import { users } from "../db/schema";

export type UserRow = typeof users.$inferSelect;

export function toPublicUser(user: UserRow) {
  const { passwordHash: _p, ...rest } = user;
  return rest;
}
