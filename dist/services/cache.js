"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRedis = connectRedis;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
const redis_1 = require("redis");
const config_1 = require("../config");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'cache' });
let client = null;
async function connectRedis() {
    try {
        client = (0, redis_1.createClient)({ url: config_1.config.redisUrl });
        client.on('error', (err) => logger.error({ err }, 'Redis client error'));
        await client.connect();
        logger.info('Redis connected');
    }
    catch (err) {
        logger.warn({ err }, 'Redis unavailable — cache disabled');
        client = null;
    }
}
async function cacheGet(key) {
    if (!client)
        return null;
    try {
        return await client.get(key);
    }
    catch {
        return null;
    }
}
async function cacheSet(key, value, ttlSeconds = 60) {
    if (!client)
        return;
    try {
        await client.set(key, value, { EX: ttlSeconds });
    }
    catch {
        // cache failure is non-fatal
    }
}
async function cacheDel(key) {
    if (!client)
        return;
    try {
        await client.del(key);
    }
    catch {
        // cache failure is non-fatal
    }
}
