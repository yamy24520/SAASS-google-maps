-- CreateEnum
CREATE TYPE "ReviewSource" AS ENUM ('GOOGLE', 'TRIPADVISOR', 'BOOKING', 'TRUSTPILOT');

-- Add source field to Review (default GOOGLE for existing rows)
ALTER TABLE "Review" ADD COLUMN "source" "ReviewSource" NOT NULL DEFAULT 'GOOGLE';

-- Rename googleReviewId to externalReviewId
ALTER TABLE "Review" RENAME COLUMN "googleReviewId" TO "externalReviewId";

-- Drop old googleReplyName column (no longer needed)
ALTER TABLE "Review" DROP COLUMN IF EXISTS "googleReplyName";

-- Add source index
CREATE INDEX "Review_businessId_source_idx" ON "Review"("businessId", "source");

-- Add platform URL fields to Business
ALTER TABLE "Business" ADD COLUMN "tripAdvisorUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN "bookingUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN "trustpilotUrl" TEXT;
