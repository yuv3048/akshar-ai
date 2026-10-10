import type { Database } from "@akshar/db";
import { users } from "@akshar/db/schema/user";
import { eq } from "drizzle-orm";

export const userRepository = {
  async findByEmail(db: Database, email: string) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  },

  async createVerifiedUser(db: Database, input: { firstName: string; lastName?: string; email: string; passwordHash: string }) {
    await db.insert(users).values({
      firstName: input.firstName,
      lastName: input.lastName ?? null,
      email: input.email,
      passwordHash: input.passwordHash,
      emailVerifiedAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing({ target: users.email });
    return this.findByEmail(db, input.email);
  },
};
