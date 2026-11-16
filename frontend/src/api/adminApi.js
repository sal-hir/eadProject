import { adminApi } from './client';

export const zoneApi = {
  getAll: () => adminApi.get('/admin/zones'),
  getById: (id) => adminApi.get(`/admin/zones/${id}`),
  create: (data) => adminApi.post('/admin/zones', data),
  update: (id, data) => adminApi.put(`/admin/zones/${id}`, data),
  delete: (id) => adminApi.delete(`/admin/zones/${id}`),
};

export const pricingApi = {
  getAll: () => adminApi.get('/admin/pricing'),
  getById: (id) => adminApi.get(`/admin/pricing/${id}`),
  create: (data) => adminApi.post('/admin/pricing', data),
  update: (id, data) => adminApi.put(`/admin/pricing/${id}`, data),
  delete: (id) => adminApi.delete(`/admin/pricing/${id}`),
};

export const analyticsApi = {
  getOverview: () => adminApi.get('/admin/analytics/overview'),

  getDailyDeliveries: (from, to) =>
    adminApi.get('/admin/analytics/deliveries/daily', {
      params: { from, to },
    }),

  getDeliveryStatus: () =>
    adminApi.get('/admin/analytics/delivery-status'),
};

export const userApi = {
  getAll: (params = {}) =>
    adminApi.get('/admin/users', { params }),
};