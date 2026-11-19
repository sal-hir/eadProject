import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopNavbar } from './layouts/SharedLayouts';
import { NotificationCenterProvider } from './context/NotificationCenterContext';

let user;
const addToast = vi.fn();
vi.mock('./context/AuthContext', () => ({ useAuth: () => ({ user, isAuthenticated: !!user, logout: vi.fn() }) }));
vi.mock('./context/ToastContext', () => ({ useToast: () => ({ addToast }) }));

let streams;
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  user = { id: 'notification-fixture', name: 'Customer', email: 'customer@example.test', role: 'CUSTOMER' };
  streams = [];
  vi.stubGlobal('EventSource', class {
    constructor(url) { this.url = url; this.close = vi.fn(); streams.push(this); }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const navbar = () => render(<MemoryRouter><NotificationCenterProvider><TopNavbar portal /></NotificationCenterProvider></MemoryRouter>);

it('receives a live alert, shows it in the navbar, marks it read and clears persisted history', () => {
  const view = navbar();
  expect(streams).toHaveLength(1);
  expect(streams[0].url).toContain('/api/v1/notifications/stream');
  act(() => streams[0].onmessage({ data: JSON.stringify({ type: 'PARCEL_NOTIFICATION', event: 'parcel.created', trackingNumber: 'SWIFT-TEST', recipientEmail: user.email, newStatus: 'CREATED' }) }));
  fireEvent.click(screen.getByRole('button', { name: 'Notifications, 2 unread' }));
  expect(screen.getByText('Parcel Booked: SWIFT-TEST')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Track SWIFT-TEST' }).getAttribute('href')).toBe('/track/SWIFT-TEST');
  expect(addToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Parcel Booked: SWIFT-TEST' }));
  fireEvent.click(screen.getByRole('button', { name: /Mark read/ }));
  expect(screen.getByRole('button', { name: 'Notifications, 0 unread' })).toBeTruthy();
  const saved = JSON.parse(localStorage.getItem('swiftdrop_notifications_notification-fixture'));
  expect(saved).toHaveLength(2);
  expect(saved.every(item => item.read)).toBe(true);
  fireEvent.click(screen.getByTitle('Clear all notifications'));
  expect(screen.getByText('All caught up!')).toBeTruthy();
  expect(JSON.parse(localStorage.getItem('swiftdrop_notifications_notification-fixture'))).toEqual([]);
  view.unmount();
  expect(streams[0].close).toHaveBeenCalledOnce();
});

it('does not show the bell or connect to notifications when signed out', () => {
  user = null;
  navbar();
  expect(screen.queryByRole('button', { name: /Notifications/ })).toBeNull();
  expect(streams).toHaveLength(0);
});
