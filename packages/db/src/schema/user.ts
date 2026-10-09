import{
    pgTable,
    uuid,
    varchar,
    timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users",{
    id: uuid("id").defaultRandom().primaryKey(),

    firstName: varchar("first_name", {length:15}).notNull(),

    lastName: varchar("last_name", {length: 15}),

    email: varchar("email", {length: 255}).notNull().unique(),

    passwordHash: varchar("password_hash", {length: 255}),

    emailVerifiedAt: timestamp("email_verified_at",{
        withTimezone: true,
    }),

    createdAt: timestamp("created_at",{
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at",{
        withTimezone: true,
    })
        .defaultNow()
        .notNull(),

})