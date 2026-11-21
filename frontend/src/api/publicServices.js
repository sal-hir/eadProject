import { trackingApi, parcelApi, TRACKING_API_BASE_URL } from './client';

export class PublicServiceError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'PublicServiceError';
    this.kind = kind;
  }
}

const demoShipments = {
  'SWIFT-1001-LK': {
    trackingNumber: 'SWIFT-1001-LK',
    status: 'IN_TRANSIT',
    originCity: 'Colombo',
    destinationCity: 'Kandy',
    weightKg: 2.5,
    latestUpdate: 'Package sorted and dispatched to Kandy central hub',
    updatedAt: new Date(Date.now() - 3600000).toISOString(),
    events: [
      { status: 'CREATED', city: 'Colombo', timestamp: new Date(Date.now() - 18000000).toISOString() },
      { status: 'PICKED_UP', city: 'Colombo', timestamp: new Date(Date.now() - 10800000).toISOString() },
      { status: 'IN_TRANSIT', city: 'Colombo Central Hub', timestamp: new Date(Date.now() - 3600000).toISOString() }
    ]
  },
  'SWIFT-1002-LK': {
    trackingNumber: 'SWIFT-1002-LK',
    status: 'OUT_FOR_DELIVERY',
    originCity: 'Galle',
    destinationCity: 'Colombo',
    weightKg: 1.2,
    latestUpdate: 'Courier is on the way to recipient address',
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    events: [
      { status: 'CREATED', city: 'Galle', timestamp: new Date(Date.now() - 28800000).toISOString() },
      { status: 'PICKED_UP', city: 'Galle', timestamp: new Date(Date.now() - 21600000).toISOString() },
      { status: 'IN_TRANSIT', city: 'Southern Expressway Hub', timestamp: new Date(Date.now() - 7200000).toISOString() },
      { status: 'OUT_FOR_DELIVERY', city: 'Colombo', timestamp: new Date(Date.now() - 1800000).toISOString() }
    ]
  }
};

const localAiAnswer = (prompt) => {
  const lower = prompt.toLowerCase();
  const toolsInvoked = [];

  // 1. Tracking query
  const match = prompt.match(/(SWIFT-[A-Z0-9-]+|[A-Z0-9]{4,}-[A-Z0-9-]{3,})/i);
  if (match) {
    const code = match[1].toUpperCase();
    toolsInvoked.push('trackParcel');
    const parcel = demoShipments[code];
    if (parcel) {
      return {
        success: true,
        reply: `📦 **Tracking Details for ${code}**\n\n- **Current Status:** \`${parcel.status}\`\n- **Route:** ${parcel.originCity} ➔ ${parcel.destinationCity}\n- **Weight:** ${parcel.weightKg} kg\n- **Latest Update:** ${parcel.latestUpdate}\n\nYou can also view the full animated timeline by searching **${code}** on our tracking page!`,
        toolsInvoked
      };
    }
    return {
      success: true,
      reply: `🔍 I checked our island-wide shipment database, but could not locate parcel reference **${code}**.\n\nPlease verify your tracking code or try searching sample code \`SWIFT-1001-LK\` or \`SWIFT-1002-LK\`.`,
      toolsInvoked
    };
  }

  // 2. Fee / Rate estimation query
  if (lower.includes('cost') || lower.includes('fee') || lower.includes('price') || lower.includes('how much') || lower.includes('rate')) {
    toolsInvoked.push('estimateShippingRate');
    let weight = 1.0;
    const weightMatch = lower.match(/(\d+(\.\d+)?)\s*(kg|kilos|kilograms)/);
    if (weightMatch) {
      weight = parseFloat(weightMatch[1]);
    }

    let destination = 'Kandy';
    if (lower.includes('colombo')) destination = 'Colombo';
    else if (lower.includes('galle')) destination = 'Galle';
    else if (lower.includes('jaffna')) destination = 'Jaffna';
    else if (lower.includes('negombo')) destination = 'Negombo';

    const baseRate = 350.0;
    const extraKg = Math.max(0, weight - 1.0) * 120.0;
    const multiplier = destination === 'Jaffna' ? 1.4 : 1.0;
    const fee = (baseRate + extraKg) * multiplier;

    return {
      success: true,
      reply: `💰 **Delivery Fee Estimate**\n\n- **Weight:** ${weight.toFixed(1)} kg\n- **Destination:** ${destination}\n- **Estimated Fee:** **LKR ${fee.toFixed(2)}**\n\n*(Calculated with LKR 350 base fee + LKR 120/kg rate). Ready to schedule a shipment? Head over to the Book Delivery page!*`,
      toolsInvoked
    };
  }

  // 3. Delivery hours or questions
  if (lower.includes('hour') || lower.includes('timing') || lower.includes('time') || lower.includes('when')) {
    return {
      success: true,
      reply: `🚚 **SwiftDrop Operating Hours**\n\n- **Customer Pickups:** Monday – Saturday, 8:00 AM – 6:00 PM\n- **Express Deliveries:** 7 days a week, 7:00 AM – 9:00 PM\n- **Customer Hotline:** 24/7 support across all provinces in Sri Lanka.`,
      toolsInvoked: []
    };
  }

  // 4. Greeting
  return {
    success: true,
    reply: `👋 Hello! I am **SwiftDrop AI**, your real-time delivery assistant.\n\nHow can I help you today? You can ask me:\n- 📦 *"Where is my parcel SWIFT-1001-LK?"*\n- 💰 *"How much to send 2.5 kg to Kandy?"*\n- 🚚 *"What are your delivery hours?"*`,
    toolsInvoked: []
  };
};

const statusLocationMap = {
  CREATED: 'Shipment created at origin facility',
  ASSIGNED_TO_COURIER: 'Assigned to delivery courier',
  PENDING_PICKUP: 'Awaiting courier pickup',
  PICKED_UP: 'Parcel collected from sender',
  IN_TRANSIT: 'In transit through sorting hub',
  OUT_FOR_DELIVERY: 'Out for final delivery with courier',
  DELIVERED: 'Delivered to recipient',
  FAILED: 'Delivery attempt unsuccessful'
};

export const publicServices = {
  /**
   * Fetches public tracking details for a parcel.
   * Strips all PII and returns public-safe delivery stages.
   * Resiliently queries trackingApi or parcelApi with demo fallback.
   */
  track: async (trackingNumber) => {
    const normalized = normalizeTrackingNumber(trackingNumber);

    // 1. First try Member 3's tracking service if running
    try {
      const response = await trackingApi.get(`/tracking/${encodeURIComponent(normalized)}`);
      if (response?.data) {
        return response.data;
      }
    } catch (err) {
      if (err.response?.status === 404) {
        // If 404 in tracking service, still check parcel-service
      }
    }

    // 2. Query real parcel-service (PostgreSQL Neon database)
    try {
      const pRes = await parcelApi.get(`/parcels/tracking/${encodeURIComponent(normalized)}`);
      if (pRes?.data) {
        const d = pRes.data;
        const events = (d.statusHistory || []).map((h) => ({
          status: h.status,
          timestamp: h.changedAt,
          city: statusLocationMap[h.status] || 'Sorting Hub'
        }));

        return {
          trackingNumber: d.trackingNumber,
          status: d.currentStatus || 'IN_TRANSIT',
          originCity: d.originCity || 'Colombo Hub',
          destinationCity: d.destinationCity || 'Destination Area',
          updatedAt: events.length > 0 ? events[events.length - 1].timestamp : d.createdAt,
          events: events.length > 0 ? events : [
            { status: d.currentStatus || 'CREATED', timestamp: d.createdAt, city: 'Colombo Hub' }
          ]
        };
      }
    } catch (pErr) {
      if (pErr.response?.status === 404) {
        if (demoShipments[normalized]) {
          return demoShipments[normalized];
        }
        throw new PublicServiceError('not-found', 'No parcel found matching this tracking reference.');
      }
    }

    // 3. Fallback to demo shipments for presentation
    if (demoShipments[normalized]) {
      return demoShipments[normalized];
    }

    throw new PublicServiceError('network', 'Could not reach the tracking service.');
  },

  /**
   * GenAI Assistant Chat
   * Sends user query + conversation history to the Gemini tool-calling endpoint.
   * Falls back to local intelligence if backend service is not running.
   */
  aiChat: async (message, history = []) => {
    try {
      const response = await trackingApi.post('/ai/chat', { message, history });
      if (response.data && response.data.reply) {
        return response.data;
      }
    } catch (err) {
      // Backend not running or connection error -> use intelligent fallback
    }

    // Check if user is asking to track a specific tracking number
    const match = message.match(/(SWIFT-[A-Z0-9-]+|[A-Z0-9]{8,})/i);
    if (match) {
      try {
        const parcel = await publicServices.track(match[1]);
        if (parcel) {
          return {
            success: true,
            reply: `📦 **Live Tracking Details for ${parcel.trackingNumber}**\n\n- **Current Status:** \`${parcel.status}\`\n- **Route:** ${parcel.originCity} ➔ ${parcel.destinationCity}\n- **Latest Update:** ${parcel.updatedAt ? new Date(parcel.updatedAt).toLocaleString() : 'Recently updated'}\n\nYou can also view the full delivery timeline on our tracking page!`,
            toolsInvoked: ['trackParcel']
          };
        }
      } catch (_) {}
    }

    return localAiAnswer(message);
  },

  quote: async () => { throw new PublicServiceError('unavailable', 'This service is not connected yet.'); },
  contact: async () => { throw new PublicServiceError('unavailable', 'This service is not connected yet.'); },
};

export const normalizeTrackingNumber = value => (value || '').trim().toUpperCase();
export const validTrackingNumber = value => /^[A-Z0-9][A-Z0-9-]{3,63}$/.test(normalizeTrackingNumber(value));

export const getTrackingStreamUrl = (trackingNumber) =>
  `${TRACKING_API_BASE_URL}/api/v1/tracking/${encodeURIComponent(normalizeTrackingNumber(trackingNumber))}/stream`;
