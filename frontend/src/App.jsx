import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorProvider } from './context/ErrorContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { NotificationCenterProvider } from './context/NotificationCenterContext';
import { OAuthCallback } from './pages/OAuthCallback';
import { MilestoneUnavailable } from './components/MilestoneUnavailable';
import { ApplicationLayout } from './layouts/SharedLayouts';

// Pages
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { AdminUsers } from './pages/AdminUsers';
import { ActivateAccount } from './pages/ActivateAccount';
import { AccountSettings } from './pages/AccountSettings';
import { ForgotPassword, ResetPassword } from './pages/PasswordRecovery';
import { MerchantApply, MerchantStatus, MerchantDashboard } from './pages/MerchantOnboarding';
import { AdminMerchants } from './pages/AdminMerchants';
import { MerchantCredentials, AdminMerchantCredentials } from './pages/MerchantCredentials';
import { MerchantOAuthClients, AdminMerchantOAuthClients } from './pages/MerchantOAuthClients';
import { PublicTracking } from './pages/PublicTracking';
import { CourierDashboard } from './pages/courier/CourierDashboard';
import { Pricing } from './pages/Pricing';
import { Help } from './pages/Help';
import { Contact } from './pages/Contact';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import PricingManagement from "./pages/admin/PricingManagement";
import ZoneManagement from "./pages/admin/ZoneManagement";
import { AdminDashboard } from "./pages/admin/AdminDashboard";

import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { CreateParcel } from './pages/customer/CreateParcel';
import { ParcelDetails } from './pages/customer/ParcelDetail';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-r-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ErrorProvider>
            <ToastProvider>
              <NotificationCenterProvider>
                <ApplicationLayout>
                  <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/track" element={<PublicTracking />} />
                    <Route path="/track/:trackingNumber" element={<PublicTracking />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/help" element={<Help />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/auth/callback" element={<OAuthCallback />} />
                    <Route path="/activate" element={<ActivateAccount />} />
                    <Route path="/account" element={<ProtectedRoute><AccountSettings /></ProtectedRoute>} />

                    {/* Admin Routes */}
                    <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminUsers /></ProtectedRoute>} />
                    <Route path="/admin/merchants" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminMerchants /></ProtectedRoute>} />
                    <Route path="/admin/merchants/:merchantId/credentials" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminMerchantCredentials /></ProtectedRoute>} />
                    <Route path="/admin/merchants/:merchantId/oauth-clients" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminMerchantOAuthClients /></ProtectedRoute>} />

                    {/* Merchant Routes */}
                    <Route path="/merchant/credentials" element={<ProtectedRoute allowedRoles={['MERCHANT']}><MerchantCredentials /></ProtectedRoute>} />
                    <Route path="/merchant/oauth-clients" element={<ProtectedRoute allowedRoles={['MERCHANT']}><MerchantOAuthClients /></ProtectedRoute>} />
                    <Route path="/merchant/apply" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'MERCHANT']}><MerchantApply /></ProtectedRoute>} />
                    <Route path="/merchant/application-status" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'MERCHANT']}><MerchantStatus /></ProtectedRoute>} />
                    <Route
                      path="/merchant"
                      element={
                        <ProtectedRoute allowedRoles={['MERCHANT', 'ADMIN']}>
                          <MerchantDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Customer Routes */}
                    <Route
                      path="/customer"
                      element={
                        <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                          <CustomerDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/customer/new"
                      element={
                        <ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                          <CreateParcel />
                        </ProtectedRoute>
                      }
                    />

                    {/* Courier Routes */}
                    <Route
                      path="/courier"
                      element={
                        <ProtectedRoute allowedRoles={['COURIER', 'ADMIN', 'CUSTOMER']}>
                          <CourierDashboard />
                        </ProtectedRoute>
                      }
                    />

                    {/* Parcel Details */}
                    <Route
                      path="/parcels/:id"
                      element={
                        <ProtectedRoute allowedRoles={['CUSTOMER', 'COURIER', 'MERCHANT', 'DISPATCHER', 'ADMIN']}>
                          <ParcelDetails />
                        </ProtectedRoute>
                      }
                    />

                    {/* Admin / Dispatcher Routes */}
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/analytics"
                      element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                          <AdminAnalytics />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/pricing"
                      element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                          <PricingManagement />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/zones"
                      element={
                        <ProtectedRoute allowedRoles={['ADMIN']}>
                          <ZoneManagement />
                        </ProtectedRoute>
                      }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ApplicationLayout>
              </NotificationCenterProvider>
            </ToastProvider>
          </ErrorProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
