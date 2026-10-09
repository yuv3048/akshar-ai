import { boolean, index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

import {users} from "./user.js";

export const sessions = pgTable(
    "sessions",
    {
        id: uuid("id").defaultRandom().primaryKey(),

        userId: uuid("user_id")
            .notNull()
            .references(()=> users.id,{
                onDelete: "cascade",
            }),

        deviceId: varchar("device_id",{
            length: 255,
        }).notNull(),

        refreshTokenHash: varchar("refresh_token_hash",{
            length: 255,
        })
            .notNull()
            .unique(),

        rememberMe: boolean("remember_me")
            .default(false)
            .notNull(),

        lastActivityAt: timestamp("last_activity_at",{
            withTimezone: true,
        }).notNull(),

        absoluteExpiresAt: timestamp("absolute_expires_at",{
            withTimezone: true,
        }).notNull(),

        idleExpiresAt: timestamp("idle_expires_at",{
            withTimezone: true,
        }).notNull(),

        userAgent: varchar("user_agent",{
            length: 255,
        }),

        ipAddress: varchar("ip_address",{
            length: 45,
        }),

        revokedAt: timestamp("revoked_at",{
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
    
    },

    (table) => ({
        userIdIdx: index("sessions_user_id_idx").on(table.userId),

        userRevokedIdx: index("sessions_user_revoked_idx").on(
            table.userId,
            table.revokedAt,
        ),

    }),
);