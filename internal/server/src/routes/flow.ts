import { Router, type Request, type Response, type NextFunction } from 'express';
import { FlowPayloadSchema } from '@flow-trail/shared';
import { addFlowToQueue } from '../queues/producers/flow.js';
import { getAllFlows, getFlowByIdDetails } from '../services/flow.js';
import z from 'zod';

const router = Router();

// POST /api/flows - Add flow to queue
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const idempotencyKey = req.headers['idempotency-key'] as string;

    if (!idempotencyKey) {
      return res.status(400).json({
        error: 'Missing idempotency-key header',
      });
    }

    const validationResult = FlowPayloadSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: validationResult.error.message,
      });
    }

    const payload = validationResult.data;

    await addFlowToQueue(payload, idempotencyKey);

    res.status(202).json({
      message: 'Flow accepted for processing',
      flowName: payload.flow.name,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/flows - Get all flows
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const result = await getAllFlows({ skip, take: limit });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/flows/:id - Get flow details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const validatedId = z.uuid().safeParse(id);
    if (!validatedId.success) {
      return res.status(400).json({
        error: 'Invalid ID',
      });
    }

    const flow = await getFlowByIdDetails(validatedId.data);

    if (!flow) {
      return res.status(404).json({
        error: 'Flow not found',
      });
    }

    res.json(flow);
  } catch (error) {
    next(error);
  }
});

export default router;
