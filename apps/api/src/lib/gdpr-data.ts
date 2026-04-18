import { and, eq, inArray, or } from "drizzle-orm";
import type { Db } from "../db/drizzle";
import {
  bidsQuotes,
  consentAuditLogs,
  contactSubmissions,
  conversationMessages,
  conversationReadStates,
  conversations,
  jobUpdates,
  jobWorkMedia,
  plannerTasks,
  portfolioProjectImages,
  portfolioProjects,
  reviews,
  tradesmenProfiles,
  users,
  workOrders,
} from "../db/schema";
import { toPublicUser, type UserRow } from "./public-user";

export async function collectPortfolioR2Keys(db: Db, userId: string): Promise<string[]> {
  const rows = await db
    .select({ key: portfolioProjectImages.r2Key })
    .from(portfolioProjectImages)
    .innerJoin(portfolioProjects, eq(portfolioProjectImages.projectId, portfolioProjects.id))
    .where(eq(portfolioProjects.userId, userId));
  return [...new Set(rows.map((r) => r.key))];
}

/**
 * Job-site photos in R2: anything you uploaded, plus all attachments on jobs where you are
 * customer or assignee (so blobs are removed before those work order rows cascade away).
 */
export async function collectTradesmanProfilePhotoR2Keys(db: Db, userId: string): Promise<string[]> {
  const [row] = await db
    .select({ key: tradesmenProfiles.profilePhotoR2Key })
    .from(tradesmenProfiles)
    .where(eq(tradesmenProfiles.userId, userId));
  const k = row?.key?.trim();
  return k ? [k] : [];
}

export async function collectJobWorkMediaR2Keys(db: Db, userId: string): Promise<string[]> {
  const keys = new Set<string>();

  const asUploader = await db
    .select({ key: jobWorkMedia.r2Key })
    .from(jobWorkMedia)
    .where(eq(jobWorkMedia.uploadedByUserId, userId));
  for (const r of asUploader) keys.add(r.key);

  const myOrderIds = (
    await db
      .select({ id: workOrders.id })
      .from(workOrders)
      .where(
        or(eq(workOrders.customerId, userId), eq(workOrders.assignedTradesmanId, userId)),
      )
  ).map((r) => r.id);

  if (myOrderIds.length > 0) {
    const onMyJobs = await db
      .select({ key: jobWorkMedia.r2Key })
      .from(jobWorkMedia)
      .where(inArray(jobWorkMedia.workOrderId, myOrderIds));
    for (const r of onMyJobs) keys.add(r.key);
  }

  return [...keys];
}

function userForExport(user: UserRow) {
  const pub = toPublicUser(user);
  return {
    ...pub,
    createdAt: user.createdAt.getTime(),
    deletedAt: user.deletedAt?.getTime() ?? null,
  };
}

/** Portable JSON snapshot for GDPR data export (no secrets). */
export async function buildGdprExportJson(db: Db, user: UserRow): Promise<Record<string, unknown>> {
  const uid = user.id;
  const emailLower = user.email.toLowerCase();

  const [profile] = await db.select().from(tradesmenProfiles).where(eq(tradesmenProfiles.userId, uid));

  const projects = await db.select().from(portfolioProjects).where(eq(portfolioProjects.userId, uid));
  const projectIds = projects.map((p) => p.id);
  const images =
    projectIds.length > 0
      ? await db
          .select()
          .from(portfolioProjectImages)
          .where(inArray(portfolioProjectImages.projectId, projectIds))
      : [];

  const orders = await db
    .select()
    .from(workOrders)
    .where(or(eq(workOrders.customerId, uid), eq(workOrders.assignedTradesmanId, uid)));

  const orderIds = orders.map((o) => o.id);

  const bidsAsTradesman = await db.select().from(bidsQuotes).where(eq(bidsQuotes.tradesmanId, uid));
  const bidsOnMyJobs =
    orderIds.length > 0
      ? await db.select().from(bidsQuotes).where(inArray(bidsQuotes.workOrderId, orderIds))
      : [];
  const bidById = new Map([...bidsAsTradesman, ...bidsOnMyJobs].map((b) => [b.id, b]));
  const bids = [...bidById.values()];

  const timeline =
    orderIds.length > 0
      ? await db.select().from(jobUpdates).where(inArray(jobUpdates.workOrderId, orderIds))
      : [];

  const jobMedia =
    orderIds.length > 0
      ? await db.select().from(jobWorkMedia).where(inArray(jobWorkMedia.workOrderId, orderIds))
      : [];

  const plannerTaskRows =
    orderIds.length > 0
      ? await db.select().from(plannerTasks).where(inArray(plannerTasks.workOrderId, orderIds))
      : [];

  const jobConversations =
    orderIds.length > 0
      ? await db.select().from(conversations).where(inArray(conversations.workOrderId, orderIds))
      : [];
  const jobConversationIds = jobConversations.map((c) => c.id);
  const jobConversationMessages =
    jobConversationIds.length > 0
      ? await db
          .select()
          .from(conversationMessages)
          .where(inArray(conversationMessages.conversationId, jobConversationIds))
      : [];
  const jobConversationReadStates =
    jobConversationIds.length > 0
      ? await db
          .select()
          .from(conversationReadStates)
          .where(
            and(
              eq(conversationReadStates.userId, uid),
              inArray(conversationReadStates.conversationId, jobConversationIds),
            ),
          )
      : [];

  const contactRows = await db
    .select()
    .from(contactSubmissions)
    .where(eq(contactSubmissions.email, emailLower));

  const consentRows = await db
    .select()
    .from(consentAuditLogs)
    .where(eq(consentAuditLogs.userId, uid));

  const reviewsReceived = await db.select().from(reviews).where(eq(reviews.tradesmanId, uid));
  const reviewsGiven = await db.select().from(reviews).where(eq(reviews.reviewerId, uid));

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    user: userForExport(user),
    tradesmanProfile: profile ?? null,
    portfolio: {
      projects,
      images,
    },
    workOrders: orders,
    bids,
    jobTimelineUpdates: timeline,
    jobWorkMedia: jobMedia,
    plannerTasks: plannerTaskRows,
    jobConversations,
    jobConversationMessages,
    jobConversationReadStates,
    contactFormSubmissionsMatchedByEmail: contactRows,
    consentAuditLog: consentRows,
    reviewsReceived,
    reviewsGiven,
  };
}

export async function deleteUserById(db: Db, userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}
