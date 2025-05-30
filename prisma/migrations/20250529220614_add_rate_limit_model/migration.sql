-- DropIndex
DROP INDEX "RateLimit_key_idx";

-- AlterTable
ALTER TABLE "RateLimit" ALTER COLUMN "resetAt" SET DATA TYPE TIMESTAMP(3);
