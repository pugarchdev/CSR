-- CreateEnum
CREATE TYPE "GovernmentOrganizationType" AS ENUM ('COLLECTORATE', 'ZILLA_PARISHAD', 'MUNICIPAL_CORPORATION', 'SUB_DEPARTMENT', 'STATE_CSR_CELL');

-- CreateEnum
CREATE TYPE "GovernmentOrganizationLevel" AS ENUM ('MAIN', 'SUB_DEPARTMENT', 'STATE');

-- CreateEnum
CREATE TYPE "PortalCaseType" AS ENUM ('CORPORATE_ENQUIRY', 'GOVERNMENT_PITCH', 'CORPORATE_PITCH_INTEREST');

-- CreateEnum
CREATE TYPE "GeographicScope" AS ENUM ('SINGLE_DISTRICT', 'MULTI_DISTRICT', 'STATEWIDE');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'PENDING_FIRST_LOGIN', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- DropIndex
DROP INDEX "AgencySubLogin_email_key";

DROP INDEX IF EXISTS "AgencySubLogin_userId_key";

-- DropIndex
DROP INDEX "DistrictDncAssignment_district_key";

-- DropIndex
DROP INDEX "DistrictDncAssignment_dncUserId_key";

-- AlterTable
ALTER TABLE "AgencySubLogin" ADD COLUMN     "corporateNgoMembershipId" TEXT,
ADD COLUMN     "loginIdentifier" TEXT;

-- AlterTable
ALTER TABLE "CorporatePitchInterest" ADD COLUMN     "assignedRelationshipManagerId" TEXT,
ADD COLUMN     "declarationAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "firstContactedAt" TIMESTAMP(3),
ADD COLUMN     "implementationMode" TEXT,
ADD COLUMN     "indicativeBudget" DECIMAL(15,2),
ADD COLUMN     "message" TEXT,
ADD COLUMN     "ngoOrFoundationDetails" TEXT,
ADD COLUMN     "portalCaseId" TEXT,
ADD COLUMN     "preferredStartPeriod" TEXT,
ADD COLUMN     "submittedByUserId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "DistrictDncAssignment" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "FeasibilityAssessment" ADD COLUMN     "portalCaseId" TEXT,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "enquiryId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "governmentLevel" "GovernmentOrganizationLevel",
ADD COLUMN     "governmentType" "GovernmentOrganizationType",
ADD COLUMN     "operationalNodalUserId" TEXT,
ADD COLUMN     "organizationCode" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "invitationAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "loginIdentifier" TEXT,
ADD COLUMN     "mustResetPassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "passwordChangedAt" TIMESTAMP(3),
ADD COLUMN     "temporaryPasswordExpiresAt" TIMESTAMP(3);

-- OTP proof tokens are stored only as hashes and remain bounded by the OTP expiry.
ALTER TABLE "OtpVerification" ADD COLUMN "verificationTokenHash" TEXT,
ADD COLUMN "verifiedAt" TIMESTAMP(3);

-- Existing accounts continue to sign in with their email while new NGO access
-- contexts may use a distinct login identifier with a repeated contact email.
UPDATE "User" SET "loginIdentifier" = "email" WHERE "loginIdentifier" IS NULL;
UPDATE "AgencySubLogin" SET "loginIdentifier" = "email" WHERE "loginIdentifier" IS NULL;

-- Client-consolidated government structure guardrails. Legacy government
-- organizations remain valid with a NULL level/type until explicitly migrated.
ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_government_level_kind_check"
CHECK ("governmentLevel" IS NULL OR "kind" = 'GOVERNMENT_DEPARTMENT');

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_government_main_type_check"
CHECK (
  "governmentLevel" IS DISTINCT FROM 'MAIN' OR
  "governmentType" IN ('COLLECTORATE', 'ZILLA_PARISHAD', 'MUNICIPAL_CORPORATION')
);

ALTER TABLE "Organization"
ADD CONSTRAINT "Organization_government_subdepartment_check"
CHECK (
  "governmentLevel" IS DISTINCT FROM 'SUB_DEPARTMENT' OR
  ("governmentType" = 'SUB_DEPARTMENT' AND "parentOrganizationId" IS NOT NULL)
);

-- CreateTable
CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" INTEGER,
    "membershipType" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "invitationId" TEXT,
    "invitedByUserId" TEXT,
    "activatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokeReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentOnboardingApplication" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "organizationLevel" "GovernmentOrganizationLevel" NOT NULL,
    "formData" JSONB NOT NULL,
    "documentSnapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedByUserId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewerRoleCode" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "decision" TEXT,
    "decisionRemarks" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernmentOnboardingApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RelationshipManagerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isOutOfOffice" BOOLEAN NOT NULL DEFAULT false,
    "leaveStartsAt" TIMESTAMP(3),
    "leaveEndsAt" TIMESTAMP(3),
    "maxActiveWorkload" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RelationshipManagerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmAllocationCursor" (
    "poolKey" TEXT NOT NULL,
    "lastSelectedUserId" TEXT,
    "sequence" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RmAllocationCursor_pkey" PRIMARY KEY ("poolKey")
);

-- CreateTable
CREATE TABLE "PortalCase" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "type" "PortalCaseType" NOT NULL,
    "sourceEntityId" TEXT NOT NULL,
    "sourcePitchId" TEXT,
    "submittingOrganizationId" TEXT,
    "submittedByUserId" TEXT,
    "assignedRmId" TEXT,
    "geographicScope" "GeographicScope" NOT NULL DEFAULT 'SINGLE_DISTRICT',
    "targetDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentStage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "firstContactedAt" TIMESTAMP(3),
    "lastInteractionAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseStatusHistory" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "remarks" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseInteraction" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "participants" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "budgetDiscussion" TEXT,
    "notes" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseFeasibilityAssessment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "checklist" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "executiveSummary" TEXT,
    "targetDistricts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetDepartmentId" TEXT,
    "conditions" JSONB,
    "assessedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "jsDecision" TEXT,
    "jsDecisionReason" TEXT,
    "jsDecidedByUserId" TEXT,
    "jsDecidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaseFeasibilityAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RmAllocationEvent" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "selectedRmId" TEXT,
    "ruleVersion" TEXT NOT NULL,
    "workloadSnapshot" JSONB NOT NULL,
    "tieCandidateIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cursorBefore" TEXT,
    "cursorAfter" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RmAllocationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentAssignment" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "projectId" TEXT,
    "ownershipLevel" TEXT NOT NULL,
    "governmentOrganizationId" TEXT,
    "primaryNodalUserId" TEXT,
    "stateNodalUserId" TEXT,
    "csrCellHeadUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignmentLetterUrl" TEXT,
    "assignmentLetterHash" TEXT,
    "letterTemplateVersion" TEXT,
    "assignedByUserId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernmentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDistrictAssignment" (
    "id" TEXT NOT NULL,
    "governmentAssignmentId" TEXT NOT NULL,
    "projectId" TEXT,
    "district" TEXT NOT NULL,
    "governmentOrganizationId" TEXT,
    "nodalUserId" TEXT,
    "assignedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectDistrictAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentAssignmentDnc" (
    "id" TEXT NOT NULL,
    "governmentAssignmentId" TEXT NOT NULL,
    "dncUserId" TEXT NOT NULL,
    "district" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "linkedByUserId" TEXT NOT NULL,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernmentAssignmentDnc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernmentAssignmentEvent" (
    "id" TEXT NOT NULL,
    "governmentAssignmentId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "fromOwnerUserId" TEXT,
    "toOwnerUserId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "reasonCode" TEXT,
    "remarks" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernmentAssignmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateNgoMembership" (
    "id" TEXT NOT NULL,
    "corporateOrganizationId" TEXT NOT NULL,
    "ngoOrganizationId" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "invitedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "reviewRemarks" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateNgoMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateNgoAccess" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "loginIdentifier" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "mustResetPassword" BOOLEAN NOT NULL DEFAULT true,
    "temporaryPasswordExpiresAt" TIMESTAMP(3),
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "projectIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "MembershipStatus" NOT NULL DEFAULT 'INVITED',
    "lastContextLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateNgoAccess_pkey" PRIMARY KEY ("id")
);

-- Backfill the common case shell without changing legacy entity IDs or the
-- tracking references already presented to users.
INSERT INTO "PortalCase" (
  "id", "trackingId", "type", "sourceEntityId", "submittingOrganizationId",
  "submittedByUserId", "assignedRmId", "geographicScope", "targetDistricts",
  "currentStage", "status", "version", "firstContactedAt", "createdAt", "updatedAt"
)
SELECT
  'case-enquiry-' || e."id",
  COALESCE(e."trackingId", 'ENQ-LEGACY-' || e."id"),
  'CORPORATE_ENQUIRY'::"PortalCaseType",
  e."id",
  e."organizationId",
  e."submittedByUserId",
  e."assignedRelationshipManagerId",
  CASE WHEN cardinality(e."preferredDistricts") > 1
    THEN 'MULTI_DISTRICT'::"GeographicScope"
    ELSE 'SINGLE_DISTRICT'::"GeographicScope" END,
  CASE WHEN cardinality(e."preferredDistricts") > 0
    THEN e."preferredDistricts"
    WHEN e."district" IS NOT NULL THEN ARRAY[e."district"]
    ELSE ARRAY[]::TEXT[] END,
  CASE
    WHEN e."status" IN ('JS_APPROVED', 'APPROVED') THEN 'GOVERNMENT_ASSIGNMENT'
    WHEN e."status" LIKE 'JS_%' THEN 'JS_REVIEW'
    WHEN e."assignedRelationshipManagerId" IS NULL THEN 'RM_ALLOCATION'
    ELSE 'RM_REVIEW' END,
  e."status",
  1,
  e."firstContactedAt",
  e."createdAt",
  e."updatedAt"
FROM "CorporateEnquiry" e;

INSERT INTO "PortalCase" (
  "id", "trackingId", "type", "sourceEntityId", "submittingOrganizationId",
  "submittedByUserId", "assignedRmId", "geographicScope", "targetDistricts",
  "currentStage", "status", "version", "createdAt", "updatedAt"
)
SELECT
  'case-pitch-' || p."id",
  CASE
    WHEN p."pitchReferenceId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "PortalCase" c WHERE c."trackingId" = p."pitchReferenceId")
      THEN p."pitchReferenceId"
    ELSE 'PITCH-LEGACY-' || p."id" END,
  'GOVERNMENT_PITCH'::"PortalCaseType",
  p."id",
  COALESCE(p."organizationId", p."departmentOrganizationId", p."departmentId"),
  p."submittedByUserId",
  p."assignedRelationshipManagerId",
  CASE WHEN cardinality(p."districts") > 1
    THEN 'MULTI_DISTRICT'::"GeographicScope"
    ELSE 'SINGLE_DISTRICT'::"GeographicScope" END,
  CASE WHEN cardinality(p."districts") > 0
    THEN p."districts"
    WHEN p."district" IS NOT NULL THEN ARRAY[p."district"]
    ELSE ARRAY[]::TEXT[] END,
  CASE
    WHEN p."status" IN ('APPROVED', 'PUBLIC', 'PUBLISHED') THEN 'PUBLICATION'
    WHEN p."status" LIKE 'JS_%' THEN 'JS_REVIEW'
    WHEN p."assignedRelationshipManagerId" IS NULL THEN 'RM_ALLOCATION'
    ELSE 'RM_VERIFICATION' END,
  p."status",
  1,
  p."createdAt",
  p."updatedAt"
FROM "GovernmentPitch" p;

INSERT INTO "PortalCase" (
  "id", "trackingId", "type", "sourceEntityId", "sourcePitchId",
  "submittingOrganizationId", "submittedByUserId", "assignedRmId",
  "geographicScope", "targetDistricts", "currentStage", "status", "version",
  "firstContactedAt", "createdAt", "updatedAt"
)
SELECT
  'case-interest-' || i."id",
  CASE
    WHEN i."interestTrackingId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "PortalCase" c WHERE c."trackingId" = i."interestTrackingId")
      THEN i."interestTrackingId"
    ELSE 'INT-LEGACY-' || i."id" END,
  'CORPORATE_PITCH_INTEREST'::"PortalCaseType",
  i."id",
  i."pitchId",
  i."corporateId",
  i."submittedByUserId",
  i."assignedRelationshipManagerId",
  CASE WHEN cardinality(p."districts") > 1
    THEN 'MULTI_DISTRICT'::"GeographicScope"
    ELSE 'SINGLE_DISTRICT'::"GeographicScope" END,
  CASE WHEN cardinality(p."districts") > 0
    THEN p."districts"
    WHEN p."district" IS NOT NULL THEN ARRAY[p."district"]
    ELSE ARRAY[]::TEXT[] END,
  CASE WHEN i."assignedRelationshipManagerId" IS NULL THEN 'RM_ALLOCATION' ELSE 'RM_FEASIBILITY' END,
  i."status",
  1,
  i."firstContactedAt",
  i."createdAt",
  i."updatedAt"
FROM "CorporatePitchInterest" i
JOIN "GovernmentPitch" p ON p."id" = i."pitchId";

UPDATE "CorporatePitchInterest" i
SET "portalCaseId" = c."id"
FROM "PortalCase" c
WHERE c."type" = 'CORPORATE_PITCH_INTEREST'
  AND c."sourceEntityId" = i."id";

UPDATE "FeasibilityAssessment" f
SET "portalCaseId" = c."id"
FROM "PortalCase" c
WHERE c."type" = 'CORPORATE_ENQUIRY'
  AND c."sourceEntityId" = f."enquiryId";

INSERT INTO "CaseStatusHistory" (
  "id", "caseId", "version", "fromStatus", "toStatus", "stage", "action",
  "actorUserId", "remarks", "metadata", "createdAt"
)
SELECT
  'case-history-initial-' || c."id", c."id", 1, NULL, c."status", c."currentStage",
  'LEGACY_BACKFILL', c."submittedByUserId", 'Migrated from the pre-consolidation workflow',
  jsonb_build_object('sourceEntityId', c."sourceEntityId", 'caseType', c."type"::text), c."createdAt"
FROM "PortalCase" c;

INSERT INTO "CaseFeasibilityAssessment" (
  "id", "caseId", "version", "checklist", "recommendation", "executiveSummary",
  "targetDistricts", "targetDepartmentId", "conditions", "assessedByUserId",
  "status", "submittedAt", "jsDecision", "jsDecisionReason", "jsDecidedByUserId",
  "jsDecidedAt", "createdAt", "updatedAt"
)
SELECT
  'case-assessment-' || f."id", f."portalCaseId", f."version", f."checklist",
  f."recommendation", f."executiveSummary", f."targetDistricts", f."targetDepartmentId",
  f."conditions", f."assessedByUserId", f."status", f."submittedAt", f."jsDecision",
  f."jsDecisionReason", f."jsDecidedByUserId", f."jsDecidedAt", f."createdAt", f."updatedAt"
FROM "FeasibilityAssessment" f
WHERE f."portalCaseId" IS NOT NULL;

INSERT INTO "RmAllocationEvent" (
  "id", "caseId", "selectedRmId", "ruleVersion", "workloadSnapshot",
  "tieCandidateIds", "cursorBefore", "cursorAfter", "outcome", "createdAt"
)
SELECT
  'rm-allocation-legacy-' || c."id", c."id", c."assignedRmId", 'legacy-backfill-v1',
  '{}'::jsonb, ARRAY[]::TEXT[], NULL, c."assignedRmId",
  CASE WHEN c."assignedRmId" IS NULL THEN 'UNASSIGNED' ELSE 'LEGACY_ASSIGNED' END,
  c."createdAt"
FROM "PortalCase" c;

-- Exactly one active main CSR Cell organization of each approved type may
-- exist for a district. Sub-departments and legacy NULL-type records are not
-- covered by this partial constraint.
CREATE UNIQUE INDEX "Organization_active_main_csr_cell_key"
ON "Organization" (LOWER("district"), "governmentType")
WHERE "governmentLevel" = 'MAIN' AND "deletedAt" IS NULL;

-- CreateIndex
CREATE INDEX "OrganizationMembership_userId_status_idx" ON "OrganizationMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "OrganizationMembership_organizationId_membershipType_status_idx" ON "OrganizationMembership"("organizationId", "membershipType", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_membershipType_key" ON "OrganizationMembership"("organizationId", "userId", "membershipType");

-- CreateIndex
CREATE INDEX "GovernmentOnboardingApplication_reviewerRoleCode_status_sub_idx" ON "GovernmentOnboardingApplication"("reviewerRoleCode", "status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentOnboardingApplication_organizationId_version_key" ON "GovernmentOnboardingApplication"("organizationId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "RelationshipManagerProfile_userId_key" ON "RelationshipManagerProfile"("userId");

-- CreateIndex
CREATE INDEX "RelationshipManagerProfile_isAvailable_isOutOfOffice_idx" ON "RelationshipManagerProfile"("isAvailable", "isOutOfOffice");

-- CreateIndex
CREATE UNIQUE INDEX "PortalCase_trackingId_key" ON "PortalCase"("trackingId");

-- CreateIndex
CREATE INDEX "PortalCase_assignedRmId_status_idx" ON "PortalCase"("assignedRmId", "status");

-- CreateIndex
CREATE INDEX "PortalCase_currentStage_status_idx" ON "PortalCase"("currentStage", "status");

-- CreateIndex
CREATE INDEX "PortalCase_submittingOrganizationId_type_idx" ON "PortalCase"("submittingOrganizationId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PortalCase_type_sourceEntityId_key" ON "PortalCase"("type", "sourceEntityId");

-- CreateIndex
CREATE INDEX "CaseStatusHistory_caseId_createdAt_idx" ON "CaseStatusHistory"("caseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseStatusHistory_caseId_version_key" ON "CaseStatusHistory"("caseId", "version");

-- CreateIndex
CREATE INDEX "CaseInteraction_caseId_occurredAt_idx" ON "CaseInteraction"("caseId", "occurredAt");

-- CreateIndex
CREATE INDEX "CaseInteraction_actorUserId_idx" ON "CaseInteraction"("actorUserId");

-- CreateIndex
CREATE INDEX "CaseFeasibilityAssessment_status_submittedAt_idx" ON "CaseFeasibilityAssessment"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CaseFeasibilityAssessment_caseId_version_key" ON "CaseFeasibilityAssessment"("caseId", "version");

-- CreateIndex
CREATE INDEX "RmAllocationEvent_caseId_createdAt_idx" ON "RmAllocationEvent"("caseId", "createdAt");

-- CreateIndex
CREATE INDEX "RmAllocationEvent_selectedRmId_createdAt_idx" ON "RmAllocationEvent"("selectedRmId", "createdAt");

-- CreateIndex
CREATE INDEX "GovernmentAssignment_caseId_status_idx" ON "GovernmentAssignment"("caseId", "status");

-- CreateIndex
CREATE INDEX "GovernmentAssignment_governmentOrganizationId_status_idx" ON "GovernmentAssignment"("governmentOrganizationId", "status");

-- CreateIndex
CREATE INDEX "GovernmentAssignment_primaryNodalUserId_status_idx" ON "GovernmentAssignment"("primaryNodalUserId", "status");

-- Prevent concurrent JS requests from creating two live owners for one case.
CREATE UNIQUE INDEX "GovernmentAssignment_one_live_case_owner_key"
ON "GovernmentAssignment"("caseId")
WHERE "status" NOT IN ('COMPLETED', 'CLOSED', 'REVOKED');

-- CreateIndex
CREATE INDEX "ProjectDistrictAssignment_nodalUserId_status_idx" ON "ProjectDistrictAssignment"("nodalUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDistrictAssignment_governmentAssignmentId_district_key" ON "ProjectDistrictAssignment"("governmentAssignmentId", "district");

-- CreateIndex
CREATE INDEX "GovernmentAssignmentDnc_dncUserId_status_idx" ON "GovernmentAssignmentDnc"("dncUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GovernmentAssignmentDnc_governmentAssignmentId_dncUserId_di_key" ON "GovernmentAssignmentDnc"("governmentAssignmentId", "dncUserId", "district");

-- CreateIndex
CREATE INDEX "GovernmentAssignmentEvent_governmentAssignmentId_createdAt_idx" ON "GovernmentAssignmentEvent"("governmentAssignmentId", "createdAt");

-- CreateIndex
CREATE INDEX "CorporateNgoMembership_ngoOrganizationId_status_idx" ON "CorporateNgoMembership"("ngoOrganizationId", "status");

-- CreateIndex
CREATE INDEX "CorporateNgoMembership_corporateOrganizationId_status_idx" ON "CorporateNgoMembership"("corporateOrganizationId", "status");

-- CreateIndex
CREATE INDEX "CorporateNgoMembership_contactEmail_idx" ON "CorporateNgoMembership"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateNgoMembership_corporateOrganizationId_ngoOrganizat_key" ON "CorporateNgoMembership"("corporateOrganizationId", "ngoOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateNgoAccess_loginIdentifier_key" ON "CorporateNgoAccess"("loginIdentifier");

-- CreateIndex
CREATE INDEX "CorporateNgoAccess_membershipId_status_idx" ON "CorporateNgoAccess"("membershipId", "status");

-- CreateIndex
CREATE INDEX "CorporateNgoAccess_userId_status_idx" ON "CorporateNgoAccess"("userId", "status");

CREATE INDEX "CorporateNgoAccess_contactEmail_idx" ON "CorporateNgoAccess"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateNgoAccess_membershipId_userId_key" ON "CorporateNgoAccess"("membershipId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencySubLogin_loginIdentifier_key" ON "AgencySubLogin"("loginIdentifier");

-- CreateIndex
CREATE INDEX "AgencySubLogin_corporateNgoMembershipId_idx" ON "AgencySubLogin"("corporateNgoMembershipId");

-- CreateIndex
CREATE UNIQUE INDEX "CorporatePitchInterest_portalCaseId_key" ON "CorporatePitchInterest"("portalCaseId");

-- CreateIndex
CREATE INDEX "CorporatePitchInterest_assignedRelationshipManagerId_status_idx" ON "CorporatePitchInterest"("assignedRelationshipManagerId", "status");

-- CreateIndex
CREATE INDEX "DistrictDncAssignment_organizationId_isActive_idx" ON "DistrictDncAssignment"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DistrictDncAssignment_district_organizationId_dncUserId_key" ON "DistrictDncAssignment"("district", "organizationId", "dncUserId");

-- CreateIndex
CREATE INDEX "FeasibilityAssessment_portalCaseId_version_idx" ON "FeasibilityAssessment"("portalCaseId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "User_loginIdentifier_key" ON "User"("loginIdentifier");

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentOnboardingApplication" ADD CONSTRAINT "GovernmentOnboardingApplication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RelationshipManagerProfile" ADD CONSTRAINT "RelationshipManagerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalCase" ADD CONSTRAINT "PortalCase_assignedRmId_fkey" FOREIGN KEY ("assignedRmId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseStatusHistory" ADD CONSTRAINT "CaseStatusHistory_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PortalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseInteraction" ADD CONSTRAINT "CaseInteraction_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PortalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseFeasibilityAssessment" ADD CONSTRAINT "CaseFeasibilityAssessment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PortalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RmAllocationEvent" ADD CONSTRAINT "RmAllocationEvent_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PortalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentAssignment" ADD CONSTRAINT "GovernmentAssignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "PortalCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentAssignment" ADD CONSTRAINT "GovernmentAssignment_governmentOrganizationId_fkey" FOREIGN KEY ("governmentOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDistrictAssignment" ADD CONSTRAINT "ProjectDistrictAssignment_governmentAssignmentId_fkey" FOREIGN KEY ("governmentAssignmentId") REFERENCES "GovernmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentAssignmentDnc" ADD CONSTRAINT "GovernmentAssignmentDnc_governmentAssignmentId_fkey" FOREIGN KEY ("governmentAssignmentId") REFERENCES "GovernmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentAssignmentEvent" ADD CONSTRAINT "GovernmentAssignmentEvent_governmentAssignmentId_fkey" FOREIGN KEY ("governmentAssignmentId") REFERENCES "GovernmentAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateNgoMembership" ADD CONSTRAINT "CorporateNgoMembership_corporateOrganizationId_fkey" FOREIGN KEY ("corporateOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateNgoMembership" ADD CONSTRAINT "CorporateNgoMembership_ngoOrganizationId_fkey" FOREIGN KEY ("ngoOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateNgoAccess" ADD CONSTRAINT "CorporateNgoAccess_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CorporateNgoMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorporateNgoAccess" ADD CONSTRAINT "CorporateNgoAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
