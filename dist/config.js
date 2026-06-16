"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
require("dotenv/config");
exports.config = {
    port: parseInt(process.env.PORT ?? '3000', 10),
    mongoUri: process.env.MONGO_URI ?? 'mongodb://localhost:27017/bibliotecasys',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-prod',
    sqsQueueUrl: process.env.SQS_QUEUE_URL ?? '',
    awsRegion: process.env.AWS_REGION ?? 'us-east-1',
    nodeEnv: process.env.NODE_ENV ?? 'development',
};
