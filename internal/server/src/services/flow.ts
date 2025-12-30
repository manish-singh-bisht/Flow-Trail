import { FlowPayloadSchema, StepStatusSchema, type FlowPayload } from '@flow-trail/shared';
import type { FlowJobResult } from '../queues/types/flow-processing.js';
import { prisma } from '../prisma/prisma.js';
import { uploadToS3, getS3Url } from '../s3/index.js';
import { randomUUID } from 'crypto';
import { Prisma } from '../prisma/generated/prisma/client.js';

interface PreparedObservation {
  observationPayload: FlowPayload['steps'][number]['observations'][number];
  s3Key: string;
  s3Url: string;
  observationId: string;
}

interface PreparedStep {
  stepPayload: FlowPayload['steps'][number];
  stepId: string;
  preparedObservations: PreparedObservation[];
}

// TODO: keep this somewhere else, others should use it
interface PaginationOptions {
  skip?: number;
  take?: number;
  orderBy?: 'createdAt';
  order?: 'asc' | 'desc';
}

export async function getAllFlows(options: PaginationOptions = {}) {
  const { skip = 0, take = 20, orderBy = 'createdAt', order = 'desc' } = options;

  const [flows, total] = await Promise.all([
    prisma.flow.findMany({
      skip,
      take,
      orderBy: {
        [orderBy]: order,
      },
      include: {
        _count: {
          select: {
            steps: true,
          },
        },
      },
    }),
    prisma.flow.count(),
  ]);

  return {
    flows: flows.map((flow) => ({
      id: flow.id,
      name: flow.name,
      createdAt: flow.createdAt,
      finishedAt: flow.finishedAt,
      stepCount: flow._count.steps,
    })),
    pagination: {
      total,
      page: Math.floor(skip / take) + 1,
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
}

// TODO: for now we send everything, but we should only send the necessary data
export async function getFlowByIdDetails(id: string) {
  return await prisma.flow.findUnique({
    where: { id },
    include: {
      steps: {
        orderBy: {
          position: 'asc',
        },
        include: {
          observations: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      },
    },
  });
}

export async function processFlow(
  payload: FlowPayload,
  idempotencyKey: string
): Promise<FlowJobResult> {
  try {
    const data = payload;
    const flowId = randomUUID();

    let totalObservations = 0;

    const preparedSteps: PreparedStep[] = data.steps.map((stepPayload) => {
      const statusResult = StepStatusSchema.safeParse(stepPayload.status);
      if (!statusResult.success) {
        throw new Error(`Invalid step status: ${stepPayload.status}`);
      }

      totalObservations += stepPayload.observations.length;
      return {
        stepPayload: {
          ...stepPayload,
          status: statusResult.data,
        },
        stepId: randomUUID(),
        preparedObservations: [],
      };
    });
    console.log(`Uploading ${totalObservations} observations to S3...`);

    // TODO: currently if there is a race condition where the idempotency key is same, the check for that is happening below in the tx, so this will still dump the data into s3, correct this.
    await Promise.all(
      preparedSteps.map(async (preparedStep) => {
        const observations = await Promise.all(
          preparedStep.stepPayload.observations.map(async (observationPayload) => {
            const observationId = randomUUID();
            const s3Key = `flows/${flowId}/steps/${preparedStep.stepId}/observations/${observationPayload.name}-v${observationPayload.version}.json`;

            await uploadToS3(s3Key, observationPayload.data);

            return {
              observationPayload,
              observationId,
              s3Key,
              s3Url: getS3Url(s3Key),
            };
          })
        );

        preparedStep.preparedObservations = observations;
      })
    );

    console.log('All observations uploaded to S3 successfully');

    const stepValues = preparedSteps.map((ps) => {
      return {
        id: ps.stepId,
        name: ps.stepPayload.name,
        version: ps.stepPayload.version,
        flowId: flowId,
        position: ps.stepPayload.position,
        status: ps.stepPayload.status,
        reason: ps.stepPayload.reason,
        startedAt: ps.stepPayload.startedAt,
        finishedAt: ps.stepPayload.finishedAt,
        createdAt: ps.stepPayload.createdAt,
      };
    });

    const allObservations = preparedSteps.flatMap((ps) =>
      ps.preparedObservations.map((obs) => ({
        id: obs.observationId,
        stepId: ps.stepId,
        name: obs.observationPayload.name,
        version: obs.observationPayload.version,
        s3Url: obs.s3Url,
        queryable: obs.observationPayload.queryable ?? Prisma.JsonNull,
      }))
    );

    // TODO: abstract this and make it generalize to any database, making it db agnostic and easier replacement for db used by this service
    const flow = await prisma.$transaction(
      async (tx) => {
        const existingFlow = await tx.flow.findUnique({
          where: {
            name: data.flow.name,
            idempotencyKey: idempotencyKey,
          },
        });
        if (existingFlow) {
          return existingFlow;
        }

        const flow = await tx.flow.create({
          data: {
            id: flowId,
            name: data.flow.name,
            idempotencyKey: idempotencyKey,
            createdAt: data.flow.createdAt,
            finishedAt: data.flow.finishedAt ?? null,
          },
        });

        if (stepValues.length > 0) {
          await tx.step.createMany({
            data: stepValues,
            skipDuplicates: true,
          });
        }

        if (allObservations.length > 0) {
          await tx.observation.createMany({
            data: allObservations,
            skipDuplicates: true,
          });
        }

        return flow;
      },
      {
        timeout: 30000,
      }
    );

    console.log(`Flow "${flow.name}" (id: ${flow.id}) processed successfully with bulk inserts`);

    return {
      success: true,
      flowId: flow.id,
    };
  } catch (error) {
    console.error('Error processing flow:', error);
    throw error;
  }
}
