import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { api } from './api/client';
import { analyticsApi, zoneApi, pricingApi } from './api/adminApi';

vi.mock('./api/client', () => ({ api: { get: vi.fn(), patch: vi.fn() } }));
vi.mock('./api/adminApi', () => ({
  analyticsApi: { getOverview: vi.fn(), getDailyDeliveries: vi.fn(), getDeliveryStatus: vi.fn() },
  zoneApi: { getAll: vi.fn() }, pricingApi: { getAll: vi.fn() },
}));
beforeEach(() => {
  vi.resetAllMocks();
  for (const method of [...Object.values(analyticsApi), zoneApi.getAll, pricingApi.getAll]) {
    method.mockResolvedValue({ data: { data: [] } });
  }
  api.get.mockResolvedValue({ data: { data: [] } });
});
afterEach(cleanup);
const dashboard = () => render(<MemoryRouter><AdminDashboard /></MemoryRouter>);

it('renders safely before dashboard requests complete', async () => {
  api.get.mockReturnValue(new Promise(() => {}));
  dashboard();
  expect(screen.getByRole('heading', { name: /Welcome back, Administrator/ })).toBeTruthy();
  expect(screen.getByText('No Parcel Activities Found')).toBeTruthy();
});

it('loads parcel rows and filters them by tracking number', async () => {
  api.get.mockImplementation(path => Promise.resolve({ data: { data: path === '/parcels' ? [
    { id: 'parcel-1', trackingNumber: 'SWIFT-REGRESSION', status: 'CREATED' },
  ] : [] } }));
  dashboard();
  expect(await screen.findByText('SWIFT-REGRESSION')).toBeTruthy();
  fireEvent.change(screen.getByPlaceholderText('Search parcels or tracking...'), { target: { value: 'absent' } });
  expect(screen.queryByText('SWIFT-REGRESSION')).toBeNull();
  expect(screen.getByText('No Parcel Activities Found')).toBeTruthy();
});

it('keeps the empty dashboard usable when its parcel request fails', async () => {
  api.get.mockRejectedValue(new Error('Unavailable'));
  dashboard();
  await waitFor(() => expect(analyticsApi.getOverview).toHaveBeenCalledOnce());
  expect(screen.getByRole('heading', { name: /Welcome back, Administrator/ })).toBeTruthy();
  expect(screen.getByText('No Parcel Activities Found')).toBeTruthy();
});
