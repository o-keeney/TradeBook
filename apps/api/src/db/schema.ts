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
  firstName: text("first_name"),
  lastName: text("last_name"),
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
  /** SHA-256 hex of the raw token sent by email (never expose to clients). */
  emailVerificationTokenHash: text("email_verification_token_hash"),
  emailVerificationExpiresAt: integer("email_verification_expires_at", {
    mode: "timestamp_ms",
  }),
  emailVerificationLastSentAt: integer("email_verification_last_sent_at", {
    mode: "timestamp_ms",
  }),
  /** SHA-256 hex of raw reset token (never expose to clients). */
  passwordResetTokenHash: text("password_reset_token_hash"),
  passwordResetExpiresAt: integer("password_reset_expires_at", {
    mode: "timestamp_ms",
  }),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(strftime('%s','now') * 1000)`),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

/** Snapshot of GDPR-related consents at signup (or future flows); IP/UA for accountability. */
export const consentAuditLogs = sqliteTable(
  "consent_audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
    ip: text("ip"),
    userAgent: text("user_agent"),
    gdprConsentDataProcessing: integer("gdpr_consent_data_processing", {
      mode: "boolean",
    }).notNull(),
    gdprConsentMarketing: integer("gdpr_consent_marketing", { mode: "boolean" }).notNull(),
    gdprConsentContactDisplay: integer("gdpr_consent_contact_display", {
      mode: "boolean",
    }).notNull(),
    source: text("source").notNull().default("register"),
  },
  (t) => [
    index("consent_audit_log_user_id_idx").on(t.userId),
    index("consent_audit_log_created_at_idx").on(t.createdAt),
  ],
);

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
  /** Optional trading / business name shown on public listings. */
  companyName: text("company_name"),
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
    /** When the work was done (ISO date YYYY-MM-DD). */
    projectDate: text("project_date"),
    /** Free-text duration, e.g. "3 weeks" or "5 days on site". */
    durationText: text("duration_text"),
    /** Free-text budget, e.g. "€8,000–€10,000". */
    budgetText: text("budget_text"),
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
  "quotes_submitted",
  "accepted",
  "in_progress",
  "awaiting_info",
  "completed",
  "cancelled",
  "declined",
  "customer_rejected",
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

/** R2-backed photos attached to a work order (timeline references URLs served from GET …/media/:id/file). */
export const jobWorkMedia = sqliteTable(
  "job_work_media",
  {
    id: text("id").primaryKey(),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    uploadedByUserId: text("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    r2Key: text("r2_key").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [
    index("job_work_media_work_order_id_idx").on(t.workOrderId),
    index("job_work_media_uploaded_by_user_id_idx").on(t.uploadedByUserId),
  ],
);

export const plannerColumnEnum = ["todo", "in_progress", "done", "blocked"] as const;

/** Tradesman job board tasks; visible read-only to the customer on the same work order. */
export const plannerTasks = sqliteTable(
  "planner_tasks",
  {
    id: text("id").primaryKey(),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    columnKey: text("column_key", { enum: plannerColumnEnum }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [index("planner_tasks_work_order_id_idx").on(t.workOrderId)],
);

/** Customer review of the assigned tradesman for a completed work order (one row per job). */
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    workOrderId: text("work_order_id")
      .notNull()
      .references(() => workOrders.id, { onDelete: "cascade" }),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tradesmanId: text("tradesman_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
  },
  (t) => [
    uniqueIndex("reviews_work_order_id_unique").on(t.workOrderId),
    index("reviews_tradesman_id_idx").on(t.tradesmanId),
    index("reviews_reviewer_id_idx").on(t.reviewerId),
  ],
);

/** Public contact form messages (bugs, feedback, improvements). */
export const contactSubmissions = sqliteTable(
  "contact_submissions",
  {
    id: text("id").primaryKey(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(strftime('%s','now') * 1000)`),
    email: text("email").notNull(),
    name: text("name").notNull(),
    message: text("message").notNull(),
  },
  (t) => [index("contact_submissions_created_at_idx").on(t.createdAt)],
);
