import { z } from "zod";

const entityTypeEnum = z.enum(["COMPANY", "NGO", "ORGANIZATION", "ONBOARDING_APPLICATION", "USER"]);

const aadhaarField = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ""))
  .refine((value) => /^[2-9][0-9]{11}$/.test(value), { message: "Invalid Aadhaar number format" });

export const aadhaarGenerateOtpSchema = z.object({
  body: z.object({
    aadhaarNumber: aadhaarField,
    entityType: entityTypeEnum,
    entityId: z.string().uuid("Valid entity ID required"),
    consent: z.literal(true, { errorMap: () => ({ message: "Explicit consent is required for Aadhaar eKYC" }) }),
    source: z.string().max(50).optional()
  })
});

export const aadhaarVerifyOtpSchema = z.object({
  body: z.object({
    recordId: z.string().uuid("Valid verification record ID required"),
    otp: z.string().regex(/^[0-9]{6}$/, "OTP must be 6 digits"),
    aadhaarNumber: aadhaarField,
    shareCode: z.string().regex(/^[0-9]{4}$/).optional()
  })
});

export const aadhaarStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid("Valid verification record ID required")
  })
});

export type AadhaarGenerateOtpBody = z.infer<typeof aadhaarGenerateOtpSchema>["body"];
export type AadhaarVerifyOtpBody = z.infer<typeof aadhaarVerifyOtpSchema>["body"];
