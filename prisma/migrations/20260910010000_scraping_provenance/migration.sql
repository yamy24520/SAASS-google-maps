ALTER TABLE "Business" ADD COLUMN "scrapePlaceKey" TEXT;
CREATE UNIQUE INDEX "Business_userId_scrapePlaceKey_key" ON "Business"("userId", "scrapePlaceKey");
ALTER TABLE "Review" ADD COLUMN "reviewUrl" TEXT, ADD COLUMN "sourceDateLabel" TEXT;
