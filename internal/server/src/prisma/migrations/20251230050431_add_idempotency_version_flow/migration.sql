/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Flow` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,version,idempotencyKey]` on the table `Flow` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `idempotencyKey` to the `Flow` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Flow_name_idx";

-- AlterTable
ALTER TABLE "Flow" ADD COLUMN     "idempotencyKey" TEXT NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "Flow_idempotencyKey_key" ON "Flow"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Flow_idempotencyKey_idx" ON "Flow"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Flow_name_version_idx" ON "Flow"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Flow_name_version_idempotencyKey_key" ON "Flow"("name", "version", "idempotencyKey");
