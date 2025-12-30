/*
  Warnings:

  - You are about to drop the column `version` on the `Flow` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,idempotencyKey]` on the table `Flow` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Flow_name_version_idempotencyKey_key";

-- DropIndex
DROP INDEX "Flow_name_version_idx";

-- AlterTable
ALTER TABLE "Flow" DROP COLUMN "version";

-- CreateIndex
CREATE INDEX "Flow_name_idx" ON "Flow"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Flow_name_idempotencyKey_key" ON "Flow"("name", "idempotencyKey");
