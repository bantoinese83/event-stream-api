/*
  Warnings:

  - You are about to drop the column `priority` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `tags` on the `Event` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Event` table. All the data in the column will be lost.
  - You are about to alter the column `duration` on the `Event` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- DropIndex
DROP INDEX "Event_tags_idx";

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "priority",
DROP COLUMN "tags",
DROP COLUMN "updatedAt",
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'info',
ALTER COLUMN "timestamp" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "data" DROP NOT NULL,
ALTER COLUMN "duration" SET DATA TYPE INTEGER,
ALTER COLUMN "status" SET DEFAULT 'success',
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "_RolePermissions" ADD CONSTRAINT "_RolePermissions_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_RolePermissions_AB_unique";

-- AlterTable
ALTER TABLE "_UserRoles" ADD CONSTRAINT "_UserRoles_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserRoles_AB_unique";

-- CreateIndex
CREATE INDEX "Event_severity_idx" ON "Event"("severity");

-- CreateIndex
CREATE INDEX "Event_timestamp_eventType_source_idx" ON "Event"("timestamp", "eventType", "source");

-- CreateIndex
CREATE INDEX "Event_userId_sessionId_timestamp_idx" ON "Event"("userId", "sessionId", "timestamp");
