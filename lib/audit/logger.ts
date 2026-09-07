import { db } from '@/lib/db';

export type AuditAction =
  | 'USER_REGISTERED'
  | 'USER_LOGGED_IN'
  | 'PROFILE_UPDATED'
  | 'TRANSACTIONS_IMPORTED'
  | 'SCORE_GENERATED'
  | 'CREDIT_APPLICATION_CREATED'
  | 'APPLICATION_APPROVED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_UNDER_REVIEW'
  | 'LOAN_CREATED'
  | 'REPAYMENT_CREATED'
  | 'LOAN_COMPLETED'
  | 'RISK_EVENT_CREATED';

export type AuditEntity =
  | 'USER'
  | 'PROFILE'
  | 'TRANSACTION'
  | 'SCORE'
  | 'APPLICATION'
  | 'LOAN'
  | 'REPAYMENT'
  | 'RISK_EVENT';

interface LogAuditParams {
  userId?: string | null;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  metadata?: Record<string, any>;
}

export async function logAuditEvent(params: LogAuditParams) {
  try {
    return await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        actorEmail: params.actorEmail,
        actorRole: params.actorRole,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
    return null;
  }
}
