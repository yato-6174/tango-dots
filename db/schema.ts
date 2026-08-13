import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const userCardStates = sqliteTable(
  "user_card_states",
  {
    deviceId: text("device_id").notNull(),
    cardId: integer("card_id").notNull(),
    schedulerCardJson: text("scheduler_card_json").notNull(),
    firstReviewedAt: integer("first_reviewed_at", { mode: "timestamp_ms" }),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.deviceId, table.cardId] })],
);

export const reviewLogs = sqliteTable(
  "review_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    deviceId: text("device_id").notNull(),
    cardId: integer("card_id").notNull(),
    rating: integer("rating").notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("idx_review_logs_device_reviewed_at").on(table.deviceId, table.reviewedAt)],
);
