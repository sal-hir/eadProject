const amqp = require('amqplib');
const winston = require('winston');
const http = require('http');
const { initTransport, sendEmailNotification } = require('./emailService');
const { sendSmsNotification, getSmsHistory } = require('./smsService');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://swiftdrop:swiftdrop_pass@rabbitmq:5672';
const EXCHANGE_NAME = 'swiftdrop.events';
const EMAIL_QUEUE = 'swiftdrop.notifications.email';
const SMS_QUEUE = 'swiftdrop.notifications.sms';
const PORT = parseInt(process.env.PORT || '4005', 10);

let isConsumerHealthy = false;

// In-memory list of active SSE client responses
const sseClients = new Set();

function broadcastSse(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  logger.info(`📢 Broadcasting SSE event to ${sseClients.size} client(s): ${data.event || 'unknown'} (parcel: ${data.trackingNumber || 'N/A'}, recipient: ${data.recipientEmail || 'all'})`);
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Keep-alive heartbeat every 15 seconds to prevent browser/proxy timeouts
setInterval(() => {
  for (const client of sseClients) {
    try {
      client.write(': ping\n\n');
    } catch (e) {
      sseClients.delete(client);
    }
  }
}, 15000);

// HTTP Health Check, SMS History, and Real-time SSE Notification Stream
function startHttpServer() {
  const server = http.createServer((req, res) => {
    // Enable CORS for frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Normalize URL to handle both direct and reverse-proxied paths (/notifications-api/...)
    const cleanUrl = (req.url || '').replace(/^\/notifications-api/, '') || '/';

    if (cleanUrl === '/health' || cleanUrl === '/actuator/health') {
      res.writeHead(isConsumerHealthy ? 200 : 503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: isConsumerHealthy ? 'UP' : 'DOWN', service: 'notification-service' }));
      return;
    }

    if (cleanUrl === '/api/v1/notifications/sms-log') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: getSmsHistory().length, messages: getSmsHistory() }));
      return;
    }

    // Server-Sent Events (SSE) stream for live in-app notifications
    if (cleanUrl.startsWith('/api/v1/notifications/stream') || req.url?.startsWith('/api/v1/notifications/stream')) {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'X-Accel-Buffering': 'no',
      });
      res.write(': connected\n\n');
      sseClients.add(res);
      logger.info(`📡 SSE client connected (Total active clients: ${sseClients.size})`);

      req.on('close', () => {
        sseClients.delete(res);
        logger.info(`🔌 SSE client disconnected (Remaining active clients: ${sseClients.size})`);
      });
      return;
    }

    // GET /api/v1/info - Public system info endpoint (no auth required)
    if (req.method === 'GET' && (cleanUrl === '/api/v1/info' || cleanUrl === '/info')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({
        applicationName: 'notification-service',
        description: 'SwiftDrop Notification Consumer - Email and SMS Event Processor',
        version: '1.0.0',
        apiVersion: 'v1',
        status: isConsumerHealthy ? 'UP' : 'DEGRADED',
        timestamp: new Date().toISOString(),
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', requestedUrl: req.url, cleanedUrl: cleanUrl }));
  });

  server.listen(PORT, '0.0.0.0', () => {
    logger.info(`🌐 Notification Service HTTP & SSE stream listening on port ${PORT}`);
  });
}

async function startRabbitMqConsumer() {
  const maxRetries = 30;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      logger.info(`🔌 Connecting to RabbitMQ at ${RABBITMQ_URL} (Attempt ${attempt + 1}/${maxRetries})...`);
      const connection = await amqp.connect(RABBITMQ_URL);
      const channel = await connection.createChannel();

      channel.prefetch(1);

      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      await channel.assertQueue(EMAIL_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'swiftdrop.events.dlx',
          'x-dead-letter-routing-key': 'email.dlq',
        },
      });
      await channel.assertQueue(SMS_QUEUE, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': 'swiftdrop.events.dlx',
          'x-dead-letter-routing-key': 'sms.dlq',
        },
      });

      await channel.bindQueue(EMAIL_QUEUE, EXCHANGE_NAME, 'parcel.*');
      await channel.bindQueue(SMS_QUEUE, EXCHANGE_NAME, 'parcel.*');

      logger.info(' Connected to RabbitMQ!');
      isConsumerHealthy = true;

      // 1. Email Consumer
      channel.consume(EMAIL_QUEUE, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          logger.info(`📧 [EMAIL-QUEUE] Received event: ${payload.event} for parcel: ${payload.trackingNumber}`);
          await sendEmailNotification(payload);

          // Push live event to frontend browsers over SSE!
          broadcastSse({
            ...payload,
            type: 'PARCEL_NOTIFICATION',
            event: payload.event || (payload.newStatus ? 'parcel.status_changed' : 'parcel.created'),
            trackingNumber: payload.trackingNumber,
            recipientEmail: payload.recipientEmail,
            recipientName: payload.recipientName,
            senderEmail: payload.senderEmail || payload.merchantEmail,
            merchantId: payload.merchantId,
            courierId: payload.courierId,
            courierName: payload.courierName,
            newStatus: payload.newStatus || payload.status || 'CREATED',
            previousStatus: payload.previousStatus,
            note: payload.note,
            failureReason: payload.failureReason,
            pickupCity: payload.pickupCity,
            dropoffCity: payload.dropoffCity,
            timestamp: payload.timestamp || new Date().toISOString()
          });

          channel.ack(msg);
        } catch (err) {
          logger.error(`❌ [EMAIL-QUEUE] Failed to process message: ${err.message}`);
          channel.nack(msg, false, !msg.fields.redelivered);
        }
      });

      // 2. SMS Consumer
      channel.consume(SMS_QUEUE, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          logger.info(`📱 [SMS-QUEUE] Received event: ${payload.event} for parcel: ${payload.trackingNumber}`);
          await sendSmsNotification(payload);
          channel.ack(msg);
        } catch (err) {
          logger.error(`❌ [SMS-QUEUE] Failed to process SMS: ${err.message}`);
          channel.nack(msg, false, !msg.fields.redelivered);
        }
      });

      connection.on('error', (err) => {
        logger.error('RabbitMQ connection error:', err.message);
        isConsumerHealthy = false;
      });

      connection.on('close', () => {
        logger.warn('RabbitMQ connection closed. Attempting reconnect in 5 seconds...');
        isConsumerHealthy = false;
        setTimeout(startRabbitMqConsumer, 5000);
      });

      return;
    } catch (err) {
      attempt++;
      isConsumerHealthy = false;
      logger.warn(`RabbitMQ connection attempt ${attempt} failed (${err.message}). Retrying in 5s...`);
      if (attempt >= maxRetries) {
        logger.error('Max retry attempts reached. Exiting process.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

async function bootstrap() {
  startHttpServer();
  await initTransport();
  await startRabbitMqConsumer();
}

bootstrap().catch((err) => {
  logger.error('Fatal initialization error:', err);
  process.exit(1);
});
