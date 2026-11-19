import { parcelApi } from './client';

export const createParcel = (data) => parcelApi.post('/parcels', data);
export const getBookingZones = () => parcelApi.get('/booking/zones');
