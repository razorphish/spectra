import { and, eq, isNull } from 'drizzle-orm';

import { buildActorJson } from './actor';
import type { SpectraDb } from './connection';
import { CATALOG_IDS } from '../schema/catalog-seed-ids';
import { notifications, users } from '../schema/control-plane';

const CATEGORY = 'production_access';

export type ParNotificationDb = SpectraDb;

/**
 * Fan-out staff-queue notifications for a new PAR submission or resubmit (same tx as PAR row).
 */
export async function insertParStaffQueueSubmissionNotifications(
  tx: ParNotificationDb,
  params: {
    productionAccessRequestId: string;
    orgId: string;
    /** `production_access.submitted` | `production_access.resubmitted` */
    type: 'production_access.submitted' | 'production_access.resubmitted';
    actorUserId: string;
  },
): Promise<void> {
  const staffRows = await tx
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.principalKindId, CATALOG_IDS.userPrincipal.staff),
        eq(users.statusId, CATALOG_IDS.status.active),
        isNull(users.deletedAt),
      ),
    );

  const title =
    params.type === 'production_access.resubmitted' ?
      'Production access request updated'
    : 'New production access request';
  const summary =
    params.type === 'production_access.resubmitted' ?
      'An integrator resubmitted a production access request after needs-information.'
    : 'An integrator submitted a new production access request for review.';

  for (const staff of staffRows) {
    const dedupeKey = `par:${params.productionAccessRequestId}:${params.type}:recipient:${staff.id}`;
    await tx.insert(notifications).values({
      recipientUserId: staff.id,
      orgId: params.orgId,
      category: CATEGORY,
      type: params.type,
      title,
      summary,
      dedupeKey,
      metadata: {
        v: 1,
        deepLink: `/platform/production-access/${params.productionAccessRequestId}`,
        resource: { kind: 'production_access_request', id: params.productionAccessRequestId },
      },
      createdBy: buildActorJson({ name: 'PAR_NOTIFICATION', userId: params.actorUserId }),
      updatedBy: buildActorJson({ name: 'PAR_NOTIFICATION', userId: params.actorUserId }),
    });
  }
}

export async function insertParPortalNotification(
  tx: ParNotificationDb,
  params: {
    recipientUserId: string;
    orgId: string;
    type: string;
    title: string;
    summary: string;
    productionAccessRequestId: string;
    dedupeKey: string;
    actorUserId: string;
  },
): Promise<void> {
  await tx.insert(notifications).values({
    recipientUserId: params.recipientUserId,
    orgId: params.orgId,
    category: CATEGORY,
    type: params.type,
    title: params.title,
    summary: params.summary,
    dedupeKey: params.dedupeKey,
    metadata: {
      v: 1,
      deepLink: `/apps/sandbox/production-access`,
      resource: { kind: 'production_access_request', id: params.productionAccessRequestId },
    },
    createdBy: buildActorJson({ name: 'PAR_NOTIFICATION', userId: params.actorUserId }),
    updatedBy: buildActorJson({ name: 'PAR_NOTIFICATION', userId: params.actorUserId }),
  });
}
