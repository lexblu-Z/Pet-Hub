import { prisma } from '../lib/prisma';

export interface AdminAuditParams {
  adminId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: any;
  ipAddress?: string | null;
}

export async function logAdminAction(params: AdminAuditParams) {
  try {
    return await prisma.adminAuditLog.create({
      data: {
        adminId: params.adminId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        details: params.details ? params.details : undefined,
        ipAddress: params.ipAddress || null,
      },
    });
  } catch (error) {
    console.error('[AdminAuditLogger] Error writing audit log:', error);
    return null;
  }
}
