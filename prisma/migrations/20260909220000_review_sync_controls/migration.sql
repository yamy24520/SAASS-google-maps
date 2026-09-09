ALTER TABLE "Business"
  ADD COLUMN "gbpReviewLocationId" TEXT,
  ADD COLUMN "syncAttemptAt" TIMESTAMP(3),
  ADD COLUMN "syncLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "reviewSyncCursor" TEXT;

-- Preserve legacy accounts that already stored the full GBP resource path.
UPDATE "Business" SET "gbpReviewLocationId" = "gbpLocationId"
WHERE "gbpLocationId" LIKE 'accounts/%/locations/%';
