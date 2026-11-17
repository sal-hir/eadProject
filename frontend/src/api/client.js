import axios from 'axios';

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000'
).replace(/\/$/, '');

export const MERCHANT_API_BASE_URL = (
  import.meta.env.VITE_MERCHANT_API_URL || 'http://localhost:4001'
).replace(/\/$/, '');

export const ADMIN_API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4009'
).replace(/\/$/, '');

export const COURIER_API_BASE_URL = (
  import.meta.env.VITE_COURIER_API_URL || 'http://localhost:4002'
).replace(/\/$/, '');

let accessToken = null;
let sessionRefresher = null;
let refreshPromise = null;

let sessionQueue = Promise.resolve();

export const setAccessToken = (token) => {
  accessToken = token;
};

export const setSessionRefresher = (callback) => {
  sessionRefresher = callback;

  return () => {
    if (sessionRefresher === callback) {
      sessionRefresher = null;
    }
  };
};

// ========================================
// AXIOS SERVICE CLIENT FACTORY
// ========================================

const createServiceClient = (baseURL) =>
  axios.create({
    baseURL: `${baseURL}/api/v1`,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    timeout: 15000,
  });

// ========================================
// SERVICE CLIENTS
// ========================================

export const api = createServiceClient(API_BASE_URL);

export const merchantApi = createServiceClient(
  MERCHANT_API_BASE_URL
);

export const adminApi = createServiceClient(
  ADMIN_API_BASE_URL
);

export const courierApi = createServiceClient(
  COURIER_API_BASE_URL
);

// ========================================
// SESSION CLIENT
// ========================================

const sessionApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-SwiftDrop-CSRF': '1',
  },
});

// ========================================
// SESSION REQUEST
// ========================================

export const sessionRequest = (endpoint, payload = {}) => {
  const request = () => sessionApi.post(endpoint, payload);

  const run = () =>
    globalThis.navigator?.locks
      ? navigator.locks.request('swiftdrop-session', request)
      : request();

  const pending = sessionQueue.then(run, run);

  sessionQueue = pending.catch(() => {});

  return pending;
};

export const refreshSession = () => {
  if (!refreshPromise) {
    refreshPromise = sessionRequest('/auth/refresh')
      .then((response) => response.data.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

// ========================================
// SHARED AUTHENTICATION INTERCEPTORS
// ========================================

const installAuthentication = (instance) => {
  instance.interceptors.request.use((config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    } else {
      delete config.headers.Authorization;
    }

    return config;
  });

  instance.interceptors.response.use(
    (response) => response,

    async (error) => {
      const config = error.config;

      if (
        error.response?.status === 401 &&
        config?.headers?.Authorization
      ) {
        if (
          sessionRefresher &&
          !config.skipSessionRefresh &&
          !config._sessionRetried
        ) {
          config._sessionRetried = true;

          try {
            if (await sessionRefresher()) {
              return instance(config);
            }
          } catch {
            // Session restoration failed.
          }
        }

        if (
          config.headers.Authorization ===
          `Bearer ${accessToken}`
        ) {
          accessToken = null;

          window.dispatchEvent(
            new Event('swiftdrop:unauthorized')
          );
        }
      }

      return Promise.reject(error);
    }
  );
};

// Install the same authentication logic on all services.
installAuthentication(api);
installAuthentication(merchantApi);
installAuthentication(adminApi);
installAuthentication(courierApi);

// ========================================
// COMMON ERROR HANDLER
// ========================================

export const authError = (error, fallback) => {
  const body = error.response?.data;

  const fields = Object.entries(body?.errors || {})
    .map(([field, message]) => `${field}: ${message}`);

  return fields.length
    ? fields.join('. ')
    : body?.message || error.message || fallback;
};

// ========================================
// ROLE DASHBOARD
// ========================================

export const dashboardPath = (role) =>
  ({
    ADMIN: '/admin',
    DISPATCHER: '/admin',
    COURIER: '/courier',
    MERCHANT: '/merchant',
  }[role] || '/customer');