import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import pino from 'pino';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { connectRedis } from './services/cache';
import { swaggerSpec } from './swagger';
import authRouter from './routes/auth';
import booksRouter from './routes/books';
import loansRouter from './routes/loans';

const logger = pino({
  transport: config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
});

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/auth', authRouter);
app.use('/books', booksRouter);
app.use('/loans', loansRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ message: 'Erro interno do servidor' });
});

async function bootstrap() {
  await mongoose.connect(config.mongoUri);
  logger.info('MongoDB connected');

  await connectRedis();

  app.listen(config.port, () => {
    logger.info({ port: config.port }, 'BiblioSys API running');
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal startup error');
  process.exit(1);
});
