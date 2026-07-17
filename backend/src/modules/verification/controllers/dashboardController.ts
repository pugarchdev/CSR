import { Response, NextFunction } from "express";
import { Prisma, VerificationRecordStatus } from "@prisma/client";
import prisma from "../../../config/db";
import { Role } from "../../../types/role";
import { successResponse } from "../../../utils/apiResponse";
import { VerificationRequest } from "./gstController";

const parseDate = (value: unknown): Date | undefined => {
  if (typeof value !== "string" || !value) return undefined;
  const date = new Date(value);
  return isNaN(date.getTime()) ? undefined : date;
};

const buildBaseWhere = (req: VerificationRequest): Prisma.VerificationRecordWhereInput => {
  const where: Prisma.VerificationRecordWhereInput = {};

  const from = parseDate(req.query.from);
  const to = parseDate(req.query.to);
  if (from || to) {
    where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  const verificationType = req.query.verificationType;
  if (verificationType === "GST" || verificationType === "AADHAAR") {
    where.verificationType = verificationType;
  }

  return where;
};

export const getDashboardStats = async (req: VerificationRequest, res: Response, next: NextFunction) => {
  try {
    const where = buildBaseWhere(req);

    const [byTypeAndStatus, responseTimeAgg] = await Promise.all([
      prisma.verificationRecord.groupBy({
        by: ["verificationType", "status"],
        where,
        _count: { _all: true }
      }),
      prisma.verificationRecord.aggregate({
        where: { ...where, responseTimeMs: { not: null } },
        _avg: { responseTimeMs: true }
      })
    ]);

    const count = (type?: string, status?: VerificationRecordStatus) =>
      byTypeAndStatus
        .filter((row) => (!type || row.verificationType === type) && (!status || row.status === status))
        .reduce((sum, row) => sum + row._count._all, 0);

    const totalAll = count();
    const totalSuccess = count(undefined, VerificationRecordStatus.SUCCESS);
    const totalFailed = count(undefined, VerificationRecordStatus.FAILED);
    const completed = totalSuccess + totalFailed;


    const daily = await prisma.$queryRaw<Array<{ day: Date; success: bigint; failed: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day,
             count(*) FILTER (WHERE status = 'SUCCESS') AS success,
             count(*) FILTER (WHERE status = 'FAILED') AS failed
      FROM "VerificationRecord"
      WHERE "createdAt" >= now() - interval '30 days'
        GROUP BY 1 ORDER BY 1`;

    const monthly = await prisma.$queryRaw<Array<{ month: Date; success: bigint; failed: bigint }>>`
      SELECT date_trunc('month', "createdAt") AS month,
             count(*) FILTER (WHERE status = 'SUCCESS') AS success,
             count(*) FILTER (WHERE status = 'FAILED') AS failed
      FROM "VerificationRecord"
      WHERE "createdAt" >= now() - interval '12 months'
        GROUP BY 1 ORDER BY 1`;

    return successResponse(res, {
      totals: {
        all: totalAll,
        gst: count("GST"),
        aadhaar: count("AADHAAR"),
        gstVerified: count("GST", VerificationRecordStatus.SUCCESS),
        aadhaarVerified: count("AADHAAR", VerificationRecordStatus.SUCCESS)
      },
      byStatus: {
        success: totalSuccess,
        failed: totalFailed,
        inProgress: count(undefined, VerificationRecordStatus.IN_PROGRESS),
        otpSent: count(undefined, VerificationRecordStatus.OTP_SENT),
        expired: count(undefined, VerificationRecordStatus.EXPIRED)
      },
      pending: count(undefined, VerificationRecordStatus.IN_PROGRESS) + count(undefined, VerificationRecordStatus.OTP_SENT),
      successRate: completed > 0 ? Math.round((totalSuccess / completed) * 1000) / 10 : null,
      avgResponseTimeMs: responseTimeAgg._avg.responseTimeMs ? Math.round(responseTimeAgg._avg.responseTimeMs) : null,
      daily: daily.map((row) => ({
        date: row.day.toISOString().slice(0, 10),
        success: Number(row.success),
        failed: Number(row.failed)
      })),
      monthly: monthly.map((row) => ({
        month: row.month.toISOString().slice(0, 7),
        success: Number(row.success),
        failed: Number(row.failed)
      }))
    });
  } catch (err) {
    return next(err);
  }
};

export const getDashboardLogs = async (req: VerificationRequest, res: Response, next: NextFunction) => {
  try {
    const where = buildBaseWhere(req);

    const status = req.query.status;
    if (typeof status === "string" && status in VerificationRecordStatus) {
      where.status = status as VerificationRecordStatus;
    }
    const entityType = req.query.entityType;
    if (typeof entityType === "string" && entityType) {
      where.entityType = entityType as any;
    }
    if (typeof req.query.entityId === "string" && req.query.entityId) {
      where.entityId = req.query.entityId;
    }
    if (typeof req.query.initiatedById === "string" && req.query.initiatedById) {
      where.initiatedById = req.query.initiatedById;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));

    const [total, records] = await Promise.all([
      prisma.verificationRecord.count({ where }),
      prisma.verificationRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          entityType: true,
          entityId: true,
          verificationType: true,
          status: true,
          attempt: true,
          isLatest: true,
          maskedIdentifier: true,
          transactionId: true,
          errorCode: true,
          responseTimeMs: true,
          source: true,
          ipAddress: true,
          verifiedAt: true,
          createdAt: true,
          initiatedBy: { select: { id: true, email: true, role: true } }
        }
      })
    ]);

    return successResponse(res, {
      records,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) }
    });
  } catch (err) {
    return next(err);
  }
};
