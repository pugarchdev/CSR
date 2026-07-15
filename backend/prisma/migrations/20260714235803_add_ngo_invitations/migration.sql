-- AlterTable
ALTER TABLE "NGO" ADD COLUMN     "finalApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "finalApprovedAt" TIMESTAMP(3),
ADD COLUMN     "finalApprovedById" TEXT,
ADD COLUMN     "invitedByCompanyId" TEXT,
ADD COLUMN     "preliminaryApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "preliminaryApprovedAt" TIMESTAMP(3),
ADD COLUMN     "preliminaryRemarks" TEXT;

-- CreateTable
CREATE TABLE "NgoInvitation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ngoName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NgoInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NgoInvitation_token_key" ON "NgoInvitation"("token");

-- CreateIndex
CREATE INDEX "NgoInvitation_companyId_idx" ON "NgoInvitation"("companyId");

-- AddForeignKey
ALTER TABLE "NGO" ADD CONSTRAINT "NGO_invitedByCompanyId_fkey" FOREIGN KEY ("invitedByCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NGO" ADD CONSTRAINT "NGO_finalApprovedById_fkey" FOREIGN KEY ("finalApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NgoInvitation" ADD CONSTRAINT "NgoInvitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
