"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const pino_1 = __importDefault(require("pino"));
const config_1 = require("./config");
const cache_1 = require("./services/cache");
const auth_1 = __importDefault(require("./routes/auth"));
const books_1 = __importDefault(require("./routes/books"));
const loans_1 = __importDefault(require("./routes/loans"));
const logger = (0, pino_1.default)({
    transport: config_1.config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/auth', auth_1.default);
app.use('/books', books_1.default);
app.use('/loans', loans_1.default);
app.use((err, _req, res, _next) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ message: 'Erro interno do servidor' });
});
async function bootstrap() {
    await mongoose_1.default.connect(config_1.config.mongoUri);
    logger.info('MongoDB connected');
    await (0, cache_1.connectRedis)();
    app.listen(config_1.config.port, () => {
        logger.info({ port: config_1.config.port }, 'BiblioSys API running');
    });
}
bootstrap().catch((err) => {
    logger.error({ err }, 'Fatal startup error');
    process.exit(1);
});
