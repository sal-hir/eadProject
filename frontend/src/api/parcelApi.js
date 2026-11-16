
import { parcelApi } from './client';

// Create a new parcel
export const createParcel = (parcelData) => {
  return parcelApi.post('/parcels', parcelData);
};

// Get parcels belonging to the logged-in customer
export const getMyParcels = () => {
  return parcelApi.get('/parcels/mine');
};

// Get parcel details by ID
export const getParcelById = (parcelId) => {
  return parcelApi.get(`/parcels/${parcelId}`);
};

// Track parcel using tracking number
export const trackParcel = (trackingNumber) => {
  return parcelApi.get(`/parcels/tracking/${trackingNumber}`);
};

// Get available booking zones
export const getBookingZones = () => {
  return parcelApi.get('/parcels/booking/zones');
};
