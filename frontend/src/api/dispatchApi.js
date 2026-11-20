
import axios from 'axios';

const dispatchClient = axios.create({
  baseURL:
    import.meta.env.VITE_DISPATCH_API_URL ||
    'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dispatch Analytics API
export const dispatchAnalyticsApi = {
  // Dashboard overview
  getOverview: () =>
    dispatchClient.get('/dispatch/analytics/overview'),

  // Recent parcels
  getRecent: (limit = 10) =>
    dispatchClient.get('/dispatch/analytics/recent', {
      params: { limit },
    }),

  // Parcel status distribution
  getStatus: () =>
    dispatchClient.get('/dispatch/analytics/status'),

  // Daily parcel creation
  getDaily: () =>
    dispatchClient.get('/dispatch/analytics/daily'),

  // Pickup locations
  getPickupLocations: () =>
    dispatchClient.get('/dispatch/analytics/locations/pickup'),

  // Drop-off locations
  getDropoffLocations: () =>
    dispatchClient.get('/dispatch/analytics/locations/dropoff'),

  // Fee analytics
  getFees: () =>
    dispatchClient.get('/dispatch/analytics/fees'),
};

export default dispatchAnalyticsApi;
