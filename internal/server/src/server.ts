import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { env } from './config/env.js';
import { prisma } from './prisma/prisma.js';
import { closeFlowQueue } from './queues/producers/flow.js';
import { startFlowWorker, closeFlowWorker } from './queues/consumers/flow.js';
import flowRoutes from './routes/flow.js';
import { closeRedisConnection, getRedisClient } from './redis/client.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { flowQueue } from './queues/producers/flow.js';

const app: Express = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(flowQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/flows', flowRoutes);

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

let httpServer: ReturnType<Express['listen']> | null = null;
let isShuttingDown = false;

export async function startServer(): Promise<void> {
  try {
    console.log('Starting server...');

    // 1. Connect to database
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected');

    // 2. Start workers
    await startFlowWorker();

    // 3. Start HTTP server
    console.log(`Starting HTTP server on port ${env.PORT}...`);
    httpServer = app.listen(env.PORT, () => {
      console.log('Server started successfully');
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${env.PORT}/health`);
      console.log(`BullMQ UI: http://localhost:${env.PORT}/admin/queues`);
    });

    httpServer.on('error', (err: Error) => {
      console.error('HTTP server error:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    await shutdown();
    process.exit(1);
  }
}

async function shutdown(): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  console.log('Starting graceful shutdown...');

  const shutdownPromises: Promise<void>[] = [];

  // 1. Stop accepting new HTTP requests
  if (httpServer) {
    shutdownPromises.push(
      new Promise<void>((resolve) => {
        httpServer!.close(() => {
          console.log('HTTP server closed');
          resolve();
        });
      })
    );
  }

  // 2. Close workers (stop processing new jobs, wait for current jobs)
  shutdownPromises.push(
    closeFlowWorker()
      .then(() => console.log('Flow worker closed'))
      .catch((err) => console.error('Error closing flow worker:', err))
  );

  // 3. Close queue
  shutdownPromises.push(
    closeFlowQueue()
      .then(() => console.log('Queue closed'))
      .catch((err) => console.error('Error closing queue:', err))
  );

  // 4. Close Redis connection
  shutdownPromises.push(
    closeRedisConnection()
      .then(() => console.log('Redis connection closed'))
      .catch((err: Error) => console.error('Error closing Redis:', err))
  );

  // 5. Close database connection
  shutdownPromises.push(
    prisma
      .$disconnect()
      .then(() => console.log('Database connection closed'))
      .catch((err) => console.error('Error closing database:', err))
  );

  // Wait for all shutdown operations with timeout
  try {
    await Promise.race([
      Promise.all(shutdownPromises),
      new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Shutdown timeout')), 30000);
      }),
    ]);
    console.log('Graceful shutdown completed');
  } catch (error) {
    console.error('Shutdown timeout or error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('SIGTERM received');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received');
  await shutdown();
  process.exit(0);
});

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error);
  shutdown().finally(() => {
    process.exit(1);
  });
});

process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Rejection:', reason);
  shutdown().finally(() => {
    process.exit(1);
  });
});

export { app };
