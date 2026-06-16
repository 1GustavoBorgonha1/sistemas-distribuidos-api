import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../config';
import pino from 'pino';

const logger = pino({ name: 'queue' });

const sqs = new SQSClient({ region: config.awsRegion });

export type LoanEvent = {
  type: 'LOAN_CREATED' | 'LOAN_RETURNED';
  loanId: string;
  userId: string;
  userEmail: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  timestamp: string;
};

export async function publishLoanEvent(event: LoanEvent): Promise<void> {
  if (!config.sqsQueueUrl) {
    logger.info({ event }, 'SQS not configured — skipping publish');
    return;
  }
  try {
    await sqs.send(
      new SendMessageCommand({
        QueueUrl: config.sqsQueueUrl,
        MessageBody: JSON.stringify(event),
        MessageAttributes: {
          EventType: { DataType: 'String', StringValue: event.type },
        },
      }),
    );
    logger.info({ eventType: event.type, loanId: event.loanId }, 'SQS message sent');
  } catch (err) {
    logger.error({ err }, 'Failed to publish SQS message');
  }
}
