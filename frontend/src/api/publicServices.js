import { parcelApi } from './client';

export class PublicServiceError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'PublicServiceError';
    this.kind = kind;
  }
}

const trackParcel = async (trackingNumber) => {
  try {
    const response = await parcelApi.get(
      `/parcels/tracking/${encodeURIComponent(trackingNumber)}`
    );

    // Supports both a direct JSON response and a response wrapped in "data".
    const parcel = response.data?.data ?? response.data?.result ?? response.data;

    if (!parcel?.trackingNumber) {
      throw new PublicServiceError(
        'not-found',
        'No parcel tracking information was returned.'
      );
    }

    const history = Array.isArray(parcel.statusHistory)
      ? parcel.statusHistory
      : [];

    return {
      trackingNumber: parcel.trackingNumber,
      status: parcel.currentStatus,
      createdAt: parcel.createdAt,
      updatedAt: history.length
        ? history[history.length - 1].changedAt
        : parcel.createdAt,
      events: history.map((item) => ({
        status: item.status,
        timestamp: item.changedAt,
      })),
    };
  } catch (error) {
    if (error instanceof PublicServiceError) {
      throw error;
    }

    if (error.response?.status === 404) {
      throw new PublicServiceError('not-found', 'Parcel not found.');
    }

    if (error.response?.status >= 500) {
      throw new PublicServiceError(
        'unavailable',
        'The tracking service is temporarily unavailable.'
      );
    }

    if (!error.response) {
      throw new PublicServiceError(
        'network',
        'Could not connect to the tracking service.'
      );
    }

    throw new PublicServiceError(
      'network',
      error.response?.data?.message || 'Unable to retrieve parcel tracking.'
    );
  }
};

const unavailable = async () => {
  throw new PublicServiceError(
    'unavailable',
    'This service is not connected yet.'
  );
};

export const publicServices = {
  track: trackParcel,
  quote: unavailable,
  contact: unavailable,
};

export const normalizeTrackingNumber = (value) =>
  value.trim().toUpperCase();

export const validTrackingNumber = (value) =>
  /^[A-Z0-9][A-Z0-9-]{3,63}$/.test(normalizeTrackingNumber(value));