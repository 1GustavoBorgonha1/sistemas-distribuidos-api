"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishLoanEvent = publishLoanEvent;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const config_1 = require("../config");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'queue' });
const sqs = new client_sqs_1.SQSClient({ region: config_1.config.awsRegion });
async function publishLoanEvent(event) {
    if (!config_1.config.sqsQueueUrl) {
        logger.info({ event }, 'SQS not configured — skipping publish');
        return;
    }
    try {
        await sqs.send(new client_sqs_1.SendMessageCommand({
            QueueUrl: config_1.config.sqsQueueUrl,
            MessageBody: JSON.stringify(event),
            MessageAttributes: {
                EventType: { DataType: 'String', StringValue: event.type },
            },
        }));
        logger.info({ eventType: event.type, loanId: event.loanId }, 'SQS message sent');
    }
    catch (err) {
        logger.error({ err }, 'Failed to publish SQS message');
    }
}
