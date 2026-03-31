-- Fix unique constraint name (was still named after old googleReviewId column)
DROP INDEX IF EXISTS "Review_googleReviewId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Review_externalReviewId_key" ON "Review" ("externalReviewId");

-- Prefix existing Google reviews with source prefix (deduplicate first)
DELETE FROM "Review"
WHERE "externalReviewId" LIKE 'GOOGLE:%'
AND EXISTS (
  SELECT 1 FROM "Review" r2
  WHERE r2."externalReviewId" = SUBSTRING("Review"."externalReviewId" FROM 8)
);

UPDATE "Review"
SET "externalReviewId" = 'GOOGLE:' || "externalReviewId"
WHERE "externalReviewId" NOT LIKE '%:%';
