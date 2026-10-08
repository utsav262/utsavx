import { API_ORIGIN } from '../config';
import { request } from './client';

/**
 * Customer endpoints only. Organizer (/manager), staff (/invitations scan/sell)
 * and admin (/api/admin) APIs are deliberately not exposed in this app.
 */
export const api = {
  // Catalog
  events: params => request('/event/list', { params }),
  event: id => request(`/event/details/${encodeURIComponent(id)}`),
  relatedEvents: id => request(`/event/${encodeURIComponent(id)}/related`),
  categories: () => request('/catalog/categories'),
  cityCounts: params => request('/event/city-counts', { params }),
  siteSettings: () => request('/site-settings'),
  /** Render's free plan sleeps; ping /health early so the first real call is fast. */
  wake: () => fetch(`${API_ORIGIN}/health`).catch(() => {}),

  // Auth — sign-up always creates a customer account
  login: body => request('/auth/login', { method: 'POST', body }),
  register: body =>
    request('/auth/register', {
      method: 'POST',
      body: { ...body, role: 'customer' },
    }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Account
  profile: () => request('/account/profile'),
  updateProfile: body => request('/account/profile', { method: 'PATCH', body }),
  changePassword: body =>
    request('/account/password', { method: 'POST', body }),
  uploadAvatar: form => request('/account/avatar', { method: 'POST', form }),
  deleteAvatar: () => request('/account/avatar', { method: 'DELETE' }),

  // Orders, payments, tickets
  orders: () => request('/orders'),
  tickets: () => request('/orders/tickets'),
  createOrder: body => request('/orders', { method: 'POST', body }),
  createIntent: orderId =>
    request(`/payments/${encodeURIComponent(orderId)}/intent`, {
      method: 'POST',
    }),
  verifyRazorpay: body =>
    request('/payments/razorpay/verify', { method: 'POST', body }),

  // The signed-in user's own notification feed
  notifications: () => request('/invitations/notifications'),
  markNotificationsRead: () =>
    request('/invitations/notifications/read', { method: 'POST', body: {} }),
};

export default api;
