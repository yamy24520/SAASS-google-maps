-- CreateEnum
CREATE TYPE "OfferType" AS ENUM ('FIXED', 'SPIN_WHEEL');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('WAITING_REVIEW', 'CLAIMED');

-- AlterTable
ALTER TABLE "Business" ADD COLUMN "offerType" "OfferType" NOT NULL DEFAULT 'FIXED';
ALTER TABLE "Business" ADD COLUMN "spinPrizes" JSONB;

-- AlterTable
ALTER TABLE "ReviewRequest" ADD COLUMN "claimToken" TEXT;
ALTER TABLE "ReviewRequest" ADD COLUMN "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'WAITING_REVIEW';
ALTER TABLE "ReviewRequest" ADD COLUMN "claimedAt" TIMESTAMP(3);
ALTER TABLE "ReviewRequest" ADD COLUMN "prizeWon" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ReviewRequest_claimToken_key" ON "ReviewRequest"("claimToken");
