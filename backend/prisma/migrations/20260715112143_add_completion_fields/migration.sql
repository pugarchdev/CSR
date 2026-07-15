-- AlterTable
ALTER TABLE "ConvergenceProject" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "beneficiariesSummary" TEXT,
ADD COLUMN     "impactSummary" TEXT;
