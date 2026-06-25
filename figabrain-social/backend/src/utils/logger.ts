import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) =>
    console.log(JSON.stringify({ level: "info", message, ...meta, ts: new Date().toISOString() })),
  warn: (message: string, meta?: Record<string, unknown>) =>
    console.warn(JSON.stringify({ level: "warn", message, ...meta, ts: new Date().toISOString() })),
  error: (message: string, meta?: Record<string, unknown>) =>
    console.error(JSON.stringify({ level: "error", message, ...meta, ts: new Date().toISOString() })),
};

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}

export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      ip: input.ip ?? null,
    },
  });
}
