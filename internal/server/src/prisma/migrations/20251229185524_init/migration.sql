-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "Flow" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Flow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Step" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "flowId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "StepStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Step_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL,
    "stepId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "s3Url" TEXT NOT NULL,
    "queryable" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Flow_name_idx" ON "Flow"("name");

-- CreateIndex
CREATE INDEX "Step_flowId_name_version_idx" ON "Step"("flowId", "name", "version");

-- CreateIndex
CREATE INDEX "Step_flowId_idx" ON "Step"("flowId");

-- CreateIndex
CREATE UNIQUE INDEX "Step_flowId_name_version_key" ON "Step"("flowId", "name", "version");

-- CreateIndex
CREATE INDEX "Observation_stepId_idx" ON "Observation"("stepId");

-- CreateIndex
CREATE INDEX "Observation_name_version_idx" ON "Observation"("name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Observation_stepId_name_version_key" ON "Observation"("stepId", "name", "version");

-- AddForeignKey
ALTER TABLE "Step" ADD CONSTRAINT "Step_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "Flow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "Step"("id") ON DELETE CASCADE ON UPDATE CASCADE;
