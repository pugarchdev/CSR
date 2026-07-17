import { NextFunction, Response } from "express";
import crypto from "crypto";
import { AuthenticatedRequest } from "../../../middlewares/authMiddleware";

export interface CorrelatedRequest extends AuthenticatedRequest {
  correlationId?: string;
}

/**
 * Attach a correlation ID to every verification request.
 * Honors an inbound X-Request-Id header (from gateways / retries),
 * otherwise generates a fresh UUID. Echoed back on the response.
 */
export const correlationIdMiddleware = (req: CorrelatedRequest, res: Response, next: NextFunction) => {
  const inbound = req.get("x-request-id");
  const correlationId = inbound && /^[\w-]{8,64}$/.test(inbound) ? inbound : crypto.randomUUID();
  req.correlationId = correlationId;
  res.setHeader("X-Request-Id", correlationId);
  next();
};
