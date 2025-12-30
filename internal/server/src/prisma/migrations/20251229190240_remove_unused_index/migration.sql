-- DropIndex
DROP INDEX "Observation_name_version_idx";

-- DropIndex
DROP INDEX "Observation_stepId_idx";

-- DropIndex
DROP INDEX "Step_flowId_idx";

-- CreateIndex
CREATE INDEX "Observation_stepId_name_version_idx" ON "Observation"("stepId", "name", "version");
