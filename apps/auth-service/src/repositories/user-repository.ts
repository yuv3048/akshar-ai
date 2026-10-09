import { db } from "@akshar/db";
import { users } from "@akshar/db/schema/user";
import { eq } from "drizzle-orm";

export const userRepository = {
    async findByEmail(email: string){
        const result = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

        return result[0] ?? null;
    },
};