import{
    pgTable,
    uuid,
    varchar,
    timestamp,
    unique,
} from "drizzle-orm/pg-core";

import { users } from "./user.js";

export const oauthAccounts = pgTable(
    "oauth_acccounts",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        userId: uuid("user_id")
            .notNull()
            .references(()=> users.id,{
                onDelete: "cascade",
            }),
        
        provider: varchar("provider",{
            length: 20,
        }).notNull(),

        providerAccountId: varchar("provider_account_id",{
            length: 255,
        }).notNull(),

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
    },
    (table) => ({
        providerAccountUnique: unique().on(
            table.provider,
            table.providerAccountId,
        ),
    }),
);