const amqp = require('amqplib');
const winston = require('winston');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { initTransport, sendEmailNotification } = require('./emailService');
const { sendSmsNotification, getSmsHistory } = require('./smsService');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.simple()),
  transports: [new winston.transports.Console()],
});

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://swiftdrop:swiftdrop_pass@rabbitmq:5672';
const EXCHANGE_NAME = 'swiftdrop.events';
const PARCEL_EXCHANGE = 'swiftdrop.parcel.exchange';
const EMAIL_QUEUE = 'swiftdrop.notifications.email';
const SMS_QUEUE = 'swiftdrop.notifications.sms';
const WEBHOOK_QUEUE = 'swiftdrop.notifications.webhook';
const DLQ_QUEUE = 'swiftdrop.dead-letter';
const PORT = parseInt(process.env.PORT || '4005', 10);

let isConsumerHealthy = false;
let rabbitChannel = null;

// In-memory audit log of merchant webhook dispatches
const webhookHistory = [];
const MAX_LOG_SIZE = 100;

function recordWebhookLog(entry) {
  webhookHistory.unshift(entry);
  if (webhookHistory.length > MAX_LOG_SIZE) webhookHistory.pop();
}

async function dispatchWebhookNotification(payload) {
  const trackingNumber = payload.trackingNumber || 'N/A';
  const event = payload.event || (payload.newStatus ? 'parcel.status_changed' : 'parcel.created');
  const targetUrl = payload.webhookUrl || process.env.DEFAULT_WEBHOOK_URL || null;

  const body = {
    event,
    eventType: payload.eventType || event,
    trackingNumber,
    newStatus: payload.newStatus || payload.status || 'CREATED',
    previousStatus: payload.previousStatus || null,
    recipientName: payload.recipientName || null,
    recipientEmail: payload.recipientEmail || null,
    senderEmail: payload.senderEmail || payload.merchantEmail || null,
    merchantId: payload.merchantId || null,
    courierName: payload.courierName || null,
    note: payload.note || null,
    timestamp: payload.timestamp || new Date().toISOString(),
  };

  const logEntry = {
    id: `wh-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    event,
    trackingNumber,
    targetUrl: targetUrl || 'mock://merchant-b2b-endpoint/webhooks',
    status: 'PENDING',
    statusCode: null,
    timestamp: new Date().toISOString(),
    payload: body,
  };

  if (!targetUrl) {
    logEntry.status = 'DELIVERED (SIMULATED)';
    logEntry.statusCode = 200;
    logEntry.response = 'Acknowledged by merchant B2B receiver';
    recordWebhookLog(logEntry);
    logger.info(`🔗 [WEBHOOK] Simulated webhook delivered for ${trackingNumber} -> ${logEntry.targetUrl}`);
    return logEntry;
  }

  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(targetUrl);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      const dataString = JSON.stringify(body);

      const req = client.request(
        parsedUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString),
            'User-Agent': 'SwiftDrop-Webhook-Dispatcher/1.0',
            'X-SwiftDrop-Event': event,
            'X-SwiftDrop-Timestamp': new Date().toISOString(),
          },
          timeout: 5000,
        },
        (res) => {
          let responseBody = '';
          res.on('data', (c) => (responseBody += c));
          res.on('end', () => {
            logEntry.status = res.statusCode >= 200 && res.statusCode < 300 ? 'DELIVERED' : 'FAILED';
            logEntry.statusCode = res.statusCode;
            logEntry.response = responseBody.slice(0, 200);
            recordWebhookLog(logEntry);
            logger.info(`🔗 [WEBHOOK] HTTP ${res.statusCode} from ${targetUrl} for ${trackingNumber}`);
            resolve(logEntry);
          });
        }
      );

      req.on('error', (err) => {
        logEntry.status = 'ERROR';
        logEntry.error = err.message;
        recordWebhookLog(logEntry);
        logger.warn(`⚠️ [WEBHOOK] Delivery failed to ${targetUrl}: ${err.message}`);
        resolve(logEntry);
      });

      req.on('timeout', () => {
        req.destroy();
        logEntry.status = 'TIMEOUT';
        recordWebhookLog(logEntry);
        logger.warn(`⚠️ [WEBHOOK] Timeout for ${targetUrl}`);
        resolve(logEntry);
      });

      req.write(dataString);
      req.end();
    } catch (err) {
      logEntry.status = 'INVALID_URL';
      logEntry.error = err.message;
      recordWebhookLog(logEntry);
      logger.error(`❌ [WEBHOOK] Invalid webhook URL: ${targetUrl}`, err.message);
      resolve(logEntry);
    }
  });
}

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

    if (cleanUrl === '/api/v1/notifications/webhook-log') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: webhookHistory.length, webhooks: webhookHistory }));
      return;
    }

    if (cleanUrl === '/api/v1/notifications/dlq') {
      if (!rabbitChannel) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'DOWN', error: 'RabbitMQ channel not active' }));
        return;
      }
      rabbitChannel.checkQueue(DLQ_QUEUE).then((queueInfo) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          queue: DLQ_QUEUE,
          messageCount: queueInfo.messageCount,
          consumerCount: queueInfo.consumerCount,
          status: queueInfo.messageCount === 0 ? 'HEALTHY' : 'PENDING_EXCEPTIONS',
        }));
      }).catch((err) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
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
      rabbitChannel = channel;

      channel.prefetch(1);

      // Assert Exchanges
      await channel.assertExchange(EXCHANGE_NAME, 'topic', { durable: true });
      await channel.assertExchange(PARCEL_EXCHANGE, 'topic', { durable: true });
      await channel.assertExchange('swiftdrop.events.dlx', 'direct', { durable: true });

      // Forward events from parcel-service / dispatch-service exchange into swiftdrop.events
      try {
        await channel.bindExchange(EXCHANGE_NAME, PARCEL_EXCHANGE, '#');
        logger.info(`🔗 Exchange bridge established: ${PARCEL_EXCHANGE} -> ${EXCHANGE_NAME}`);
      } catch (e) {
        logger.warn('Could not bind exchange bridge:', e.message);
      }

      // Assert Queues with DLX
      const dlqArgs = {
        'x-dead-letter-exchange': 'swiftdrop.events.dlx',
      };

      await channel.assertQueue(EMAIL_QUEUE, {
        durable: true,
        arguments: { ...dlqArgs, 'x-dead-letter-routing-key': 'email.dlq' },
      });
      await channel.assertQueue(SMS_QUEUE, {
        durable: true,
        arguments: { ...dlqArgs, 'x-dead-letter-routing-key': 'sms.dlq' },
      });
      await channel.assertQueue(WEBHOOK_QUEUE, {
        durable: true,
        arguments: { ...dlqArgs, 'x-dead-letter-routing-key': 'webhook.dlq' },
      });
      await channel.assertQueue(DLQ_QUEUE, { durable: true });

      // Bind Queues to swiftdrop.events (supports single word 'parcel.*' and dotted 'parcel.#')
      for (const rk of ['parcel.*', 'parcel.#', '#']) {
        await channel.bindQueue(EMAIL_QUEUE, EXCHANGE_NAME, rk);
        await channel.bindQueue(SMS_QUEUE, EXCHANGE_NAME, rk);
        await channel.bindQueue(WEBHOOK_QUEUE, EXCHANGE_NAME, rk);
      }

      // Also bind directly to PARCEL_EXCHANGE for resilience
      for (const rk of ['parcel.*', 'parcel.#', '#']) {
        await channel.bindQueue(EMAIL_QUEUE, PARCEL_EXCHANGE, rk);
        await channel.bindQueue(SMS_QUEUE, PARCEL_EXCHANGE, rk);
        await channel.bindQueue(WEBHOOK_QUEUE, PARCEL_EXCHANGE, rk);
      }

      logger.info(' Connected to RabbitMQ queues (Email, SMS, Webhook, DLQ)!');
      isConsumerHealthy = true;

      // 1. Email Consumer
      channel.consume(EMAIL_QUEUE, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          logger.info(`📧 [EMAIL-QUEUE] Received event: ${payload.event || payload.eventType} for parcel: ${payload.trackingNumber}`);
          await sendEmailNotification(payload);

          // Push live event to frontend browsers over SSE with all fields!
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
          logger.info(`📱 [SMS-QUEUE] Received event: ${payload.event || payload.eventType} for parcel: ${payload.trackingNumber}`);
          await sendSmsNotification(payload);
          channel.ack(msg);
        } catch (err) {
          logger.error(`❌ [SMS-QUEUE] Failed to process SMS: ${err.message}`);
          channel.nack(msg, false, !msg.fields.redelivered);
        }
      });

      // 3. Webhook Consumer (B2B Merchant Notifications)
      channel.consume(WEBHOOK_QUEUE, async (msg) => {
        if (!msg) return;
        try {
          const payload = JSON.parse(msg.content.toString());
          logger.info(`🔗 [WEBHOOK-QUEUE] Received event: ${payload.event || payload.eventType} for parcel: ${payload.trackingNumber}`);
          await dispatchWebhookNotification(payload);
          channel.ack(msg);
        } catch (err) {
          logger.error(`❌ [WEBHOOK-QUEUE] Failed to process webhook: ${err.message}`);
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
