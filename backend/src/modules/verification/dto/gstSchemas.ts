import { z } from "zod";
import { GSTIN_REGEX } from "../utils/masking";

const entityTypeEnum = z.enum(["COMPANY", "NGO", "ORGANIZATION", "ONBOARDING_APPLICATION", "USER"]);

const gstinField = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase().replace(/[^0-9A-Z]/g, ""))
  .refine((value) => GSTIN_REGEX.test(value), { message: "Invalid GSTIN format" });

export const gstVerifySchema = z.object({
  body: z.object({
    gstin: gstinField,
    entityType: entityTypeEnum,
    entityId: z.string().uuid("Valid entity ID required"),
    source: z.string().max(50).optional()
  })
});

export const gstReverifySchema = z.object({
  body: z.object({
    gstin: gstinField,
    entityType: entityTypeEnum,
    entityId: z.string().uuid("Valid entity ID required"),
    source: z.string().max(50).optional(),
    reason: z.string().min(5, "A reason is required for re-verification").max(500)
  })
});

export const gstHistorySchema = z.object({
  params: z.object({
    id: z.string().uuid("Valid entity ID required")
  }),
  query: z.object({
    entityType: entityTypeEnum
  })
});

export type GstVerifyBody = z.infer<typeof gstVerifySchema>["body"];
export type GstReverifyBody = z.infer<typeof gstReverifySchema>["body"];
