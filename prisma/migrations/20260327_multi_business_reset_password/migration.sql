-- Migration: multi_business + reset_password

-- 1. Remove unique constraint on Business.userId (allow multiple businesses per user)
ALTER TABLE "Business" DROP CONSTRAINT IF EXISTS "Business_userId_key";

-- 2. Add index on Business.userId
CREATE INDEX IF NOT EXISTS "Business_userId_idx" ON "Business"("userId");

-- 3. Create PasswordResetToken table
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- 4. Add unique constraint on token
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- 5. Add foreign key
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
