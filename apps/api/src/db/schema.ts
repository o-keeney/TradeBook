import { sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const userRoleEnum = ["customer", "tradesman", "admin"] as const;

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  role: text("role", { enum: userRoleEnum }).notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"),
  gdprConsentDataProcessing: integer("gdpr_consent_data_processing", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  gdprConsentMarketing: integer("gdpr_consent_marketing", { mode: "boolean" })
    .notNull()
    .default(false),
  gdprConsentContactDisplay: integer("gdpr_consent_contact_display", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(strftime('%s','now') * 1000)`),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

export const verificationStatusEnum = ["none", "pending", "verified"] as const;
export const subscriptionStatusEnum = [
  "inactive",
  "active",
  "past_due",
  "cancelled",
] as const;

/** One row per tradesman user (user_id PK). */
export const tradesmenProfiles = sqliteTable("tradesmen_profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tradeCategories: text("trade_categories", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .$defaultFn(() => []),
  regionConfig: text("region_config", { mode: "json" })
    .$type<Record<string, unknown>>()
    .notNull()
    .$defaultFn(() => ({})),
  bio: text("bio").notNull().default(""),
  verificationStatus: text("verification_status", {
    enum: verificationStatusEnum,
  })
    .notNull()
    .default("none"),
  isAvailable: integer("is_available", { mode: "boolean" })
    .notNull()
    .default(true),
  subscriptionStatus: text("subscription_status", {
    enum: subscriptionStatusEnum,
  })
    .notNull()
    .default("inactive"),
  subscriptionTier: text("subscription_tier"),
  avgRating: real("avg_rating"),
  reviewCount: integer("review_count").notNull().default(0),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactEmailVisible: integer("contact_email_visible", { mode: "boolean" })
    .notNull()
    .default(false),
  contactPhoneVisible: integer("contact_phone_visible", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(strftime('%s','now') * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(strftime('%s','now') * 1000)`),
});

/** Key/value site configuration (e.g. public pricing). */
export const platformSettings = sqliteTable("platform_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(strftime('%s','now') * 1000)`),
});

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

/** Showcase work: title, description, ordered; scoped to tradesman user */
export const portfolioProjects = sqliteTable(
  "portfolio_projects",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [index("portfolio_projects_user_id_idx").on(t.userId)],
);

export const portfolioProjectImages = sqliteTable(
  "portfolio_project_images",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id")
      .notNull()
      .references(() => portfolioProjects.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    caption: text("caption"),
    sortOrder: integer("sort_order").notNull().default(0),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [index("portfolio_project_images_project_id_idx").on(t.projectId)],
);

export const workOrderSubmissionEnum = ["direct", "open_bid"] as const;
export const workOrderStatusEnum = [
  "pending",
  "open_bidding",
  "accepted",
  "in_progress",
  "awaiting_info",
  "completed",
  "cancelled",
  "declined",
] as const;

export const jobUpdateTypeEnum = [
  "status_change",
  "progress_note",
  "media_upload",
  "quote_update",
] as const;

export const bidStatusEnum = ["submitted", "rejected", "accepted"] as const;

export const workOrders = sqliteTable(
  "work_orders",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedTradesmanId: text("assigned_tradesman_id").references(() => users.id, {
      onDelete: "set null",
    }),
    tradeCategory: text("trade_category").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    dimensionsJson: text("dimensions_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .$defaultFn(() => ({})),
    locationAddress: text("location_address").notNull(),
    locationPostcode: text("location_postcode").notNull(),
    submissionType: text("submission_type", {
      enum: workOrderSubmissionEnum,
    }).notNull(),
    status: text("status", { enum: workOrderStatusEnum }).notNull(),
    dueDate: integer("due_date", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [
    index("work_orders_customer_id_idx").on(t.customerId),
    index("work_orders_assigned_tradesman_id_idx").on(t.assignedTradesmanId),
    index("work_orders_status_idx").on(t.status),
  ],
);

export const bidsQuotes = sqliteTable(
  "bids_quotes",
  {
    id: text("id").primaryKey(),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    tradesmanId: text("tradesman_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    estimatedCost: real("estimated_cost"),
    estimatedTimeline: text("estimated_timeline"),
    notes: text("notes"),
    status: text("status", { enum: bidStatusEnum }).notNull().default("submitted"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [
    index("bids_quotes_work_order_id_idx").on(t.workOrderId),
    index("bids_quotes_tradesman_id_idx").on(t.tradesmanId),
    uniqueIndex("bids_quotes_work_order_tradesman_unique").on(
      t.workOrderId,
      t.tradesmanId,
    ),
  ],
);

export const jobUpdates = sqliteTable(
  "job_updates",
  {
    id: text("id").primaryKey(),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    updateType: text("update_type", {
      enum: jobUpdateTypeEnum,
    }).notNull(),
    content: text("content"),
    mediaUrls: text("media_urls", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [index("job_updates_work_order_id_idx").on(t.workOrderId)],
);
