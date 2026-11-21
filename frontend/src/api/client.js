
import axios from 'axios';

// ========================================
// MICROSERVICE BASE URLS
// ========================================

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 'http://localhost:4000'
).replace(/\/$/, '');

export const MERCHANT_API_BASE_URL = (
  import.meta.env.VITE_MERCHANT_API_URL || 'http://localhost:4001'
).replace(/\/$/, '');

export const PARCEL_API_BASE_URL = (
  import.meta.env.VITE_PARCEL_API_URL || 'http://localhost:4002'
).replace(/\/$/, '');

export const ADMIN_API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:4009'
).replace(/\/$/, '');

export const COURIER_API_BASE_URL = (
  import.meta.env.VITE_COURIER_API_URL || 'http://localhost:4003'
).replace(/\/$/, '');

export const TRACKING_API_BASE_URL = (
  import.meta.env.VITE_TRACKING_API_URL || 'http://localhost:4004'
).replace(/\/$/, '');


// ========================================
// IN-MEMORY AUTHENTICATION
// ========================================

let accessToken = null;
let sessionRefresher = null;
let refreshPromise = null;

let sessionQueue = Promise.resolve();
let errorNotifier = null;

/**
 * Register a callback that receives user-facing error messages from the global
 * Axios error interceptor. Called by ErrorProvider on mount; returns a cleanup
 * function that unregisters the notifier.
 */
export const setErrorNotifier = (callback) => {
  errorNotifier = callback;
  return () => { if (errorNotifier === callback) errorNotifier = null; };
};

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
// AUTH SERVICE CLIENT
// ========================================

export const api = createServiceClient(API_BASE_URL);


// ========================================
// SESSION CLIENT
// ========================================

// Keep this immediately after api.
// Your existing Vitest tests expect it as the second
// Axios instance created.
const sessionApi = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-SwiftDrop-CSRF': '1',
  },
});


// ========================================
// MERCHANT SERVICE CLIENT
// ========================================

export const merchantApi = createServiceClient(MERCHANT_API_BASE_URL);


// ========================================
// PARCEL SERVICE CLIENT
// ========================================

export const parcelApi = createServiceClient(PARCEL_API_BASE_URL);


// ========================================
// ADMIN SERVICE CLIENT
// ========================================

export const adminApi = createServiceClient(ADMIN_API_BASE_URL);


// ========================================
// COURIER SERVICE CLIENT
// ========================================

export const courierApi = createServiceClient(COURIER_API_BASE_URL);

// ========================================
// TRACKING SERVICE CLIENT
// ========================================

export const trackingApi = createServiceClient(TRACKING_API_BASE_URL);


// ========================================
// SESSION REQUEST
// ========================================

export const sessionRequest = (endpoint, payload = {}) => {

  const request = () => sessionApi.post(endpoint, payload);

  const run = () =>
    globalThis.navigator?.locks
      ? globalThis.navigator.locks.request(
          'swiftdrop-session',
          request
        )
      : request();

  const pending = sessionQueue.then(run, run);

  sessionQueue = pending.catch(() => {});

  return pending;

};


// ========================================
// REFRESH SESSION
// ========================================

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

  // Attach the same in-memory token to service requests
  instance.interceptors.request.use((config) => {

    if (accessToken) {

      config.headers.Authorization = `Bearer ${accessToken}`;

    } else {

      delete config.headers.Authorization;

    }

    return config;

  });


  // Handle expired access tokens + global error notification
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

            const restored = await sessionRefresher();

            if (restored) {
              return instance(config);
            }

          } catch {
            // Session restoration failed.
          }

        }


        // Clear authentication after the final failed request
        if (
          config.headers.Authorization ===
          `Bearer ${accessToken}`
        ) {

          accessToken = null;

          if (typeof window !== 'undefined') {

            window.dispatchEvent(
              new Event('swiftdrop:unauthorized')
            );

          }

        }

      }

      // Global error notification for non-401 errors (skip if request opted out)
      if (error.response?.status !== 401 && !config?.silent && errorNotifier) {
        const body = error.response?.data;
        const message = body?.message || (error.code === 'ERR_NETWORK' ? 'Network error — please check your connection' : 'An unexpected error occurred');
        errorNotifier(message);
      }

      return Promise.reject(error);

    }

  );

};


// ========================================
// INSTALL AUTHENTICATION ON ALL SERVICES
// ========================================

installAuthentication(api);

installAuthentication(merchantApi);

installAuthentication(parcelApi);

installAuthentication(adminApi);

installAuthentication(courierApi);

installAuthentication(trackingApi);


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

export const dashboardPath = (role) => ({

  ADMIN: '/admin',

  DISPATCHER: '/admin',

  COURIER: '/courier',

  MERCHANT: '/merchant',

}[role] || '/customer');
