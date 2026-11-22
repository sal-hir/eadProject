
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  MapPin,
  CalendarDays,
  Weight,
  CreditCard,
  Truck,
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { parcelApi } from '../../api/client';

export const ParcelDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [parcel, setParcel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadParcel = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await parcelApi.get(`/parcels/${id}`);
      setParcel(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Unable to load parcel details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParcel();
  }, [id]);

  const formatDate = (date) => {
    if (!date) return 'Not available';

    return new Date(date).toLocaleString('en-LK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
const [receiptError, setReceiptError] = useState('');

  const statusColors = {
    BOOKED: 'bg-blue-100 text-blue-700',
    PICKED_UP: 'bg-indigo-100 text-indigo-700',
    IN_TRANSIT: 'bg-amber-100 text-amber-700',
    OUT_FOR_DELIVERY: 'bg-purple-100 text-purple-700',
    DELIVERED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-rose-100 text-rose-700'
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-r-transparent mx-auto" />
          <p className="text-sm text-slate-500 mt-4">
            Loading parcel details...
          </p>
        </div>
      </div>
    );
  }
  // Function to handle receipt download
  const handleDownloadReceipt = async () => {
  if (!parcel?.parcelId) {
    setReceiptError('Parcel information is not available.');
    return;
  }

  setDownloadingReceipt(true);
  setReceiptError('');

  try {
    const response = await parcelApi.get(
      `/parcels/${parcel.parcelId}/receipt`,
      {
        responseType: 'blob',
        Accept: {'application/pdf',
                },
      }
    );

    const pdfBlob = new Blob([response.data], {
      type: 'application/pdf',
    });

    const downloadUrl = window.URL.createObjectURL(pdfBlob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `SwiftDrop-Receipt-${parcel.parcelId}.pdf`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(downloadUrl);

  } catch (error) {
    console.error('Receipt download failed:', error);
    setReceiptError('Unable to download the receipt. Please try again.');
  } finally {
    setDownloadingReceipt(false);
  }
};
  if (error || !parcel) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />

          <h2 className="text-xl font-bold text-slate-900">
            Unable to Load Parcel
          </h2>

          <p className="text-sm text-slate-500 mt-2">
            {error || 'Parcel not found.'}
          </p>

          <div className="flex justify-center gap-3 mt-6">
            <button
              onClick={loadParcel}
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>

            <button
              onClick={() => navigate('/customer')}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold"
            >
              Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      <button
        onClick={() => navigate('/customer')}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <Package className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Parcel Details
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Delivery Information
          </h1>

          <p className="text-sm text-slate-500 mt-1 break-all">
            Parcel ID: {parcel.parcelId}
          </p>
        </div>

        <span className={`inline-flex self-start px-4 py-2 rounded-full text-xs font-bold ${statusColors[parcel.currentStatus] || 'bg-slate-100 text-slate-700'}`}>
          {parcel.currentStatus?.replaceAll('_', ' ')}
        </span>
      </div>

      {/* Tracking number */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 text-blue-100 text-sm font-semibold">
          <Truck className="w-5 h-5" />
          Tracking Number
        </div>

        <p className="text-2xl sm:text-3xl font-black tracking-wider mt-3">
          {parcel.trackingNumber}
        </p>

        <p className="text-xs text-blue-100 mt-2">
          Use this number to track your parcel delivery.
        </p>

<div className="flex flex-wrap items-center gap-3 mt-5">

  <button
    onClick={() => navigate(`/track/${parcel.trackingNumber}`)}
    className="bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50"
  >
    Track Parcel
  </button>

  <button
    type="button"
    onClick={handleDownloadReceipt}
    disabled={downloadingReceipt}
    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
  >
    <Download className="w-4 h-4" />

    {downloadingReceipt ? 'Downloading...' : 'Download PDF Receipt'}
  </button>

    </div>

    {receiptError && (
    <p className="mt-3 text-sm text-red-200">
        {receiptError}
    </p>
    )}
        </div>

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-sm mb-4">
            <MapPin className="w-5 h-5" />
            Pickup Location
          </div>

          <p className="text-slate-800 font-semibold break-words">
            {parcel.pickupAddress}
          </p>

          <p className="text-xs text-slate-500 mt-3">
            Pickup Zone ID
          </p>

          <p className="text-xs text-slate-600 break-all mt-1">
            {parcel.pickupZoneId}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-4">
            <MapPin className="w-5 h-5" />
            Drop-off Location
          </div>

          <p className="text-slate-800 font-semibold break-words">
            {parcel.dropoffAddress}
          </p>

          <p className="text-xs text-slate-500 mt-3">
            Drop-off Zone ID
          </p>

          <p className="text-xs text-slate-600 break-all mt-1">
            {parcel.dropoffZoneId}
          </p>
        </div>

      </div>

      {/* Parcel information */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">

        <h2 className="font-bold text-slate-900 mb-5">
          Parcel Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          <div className="flex items-start gap-3">
            <Weight className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-xs text-slate-500">Parcel Weight</p>
              <p className="font-bold text-slate-800 mt-1">
                {parcel.weightKg} kg
              </p>
            </div>
          </div>

          {/*changed for receipt to add priority */}  
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-blue-600 mt-1" />
            <div>
                <p className="text-xs text-slate-500">Delivery Priority</p>

                <span
                className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                    parcel.deliveryPriority === 'EXPRESS'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-green-100 text-green-700'
                }`}
                >
                {parcel.deliveryPriority === 'EXPRESS'
                    ? 'EXPRESS DELIVERY'
                    : 'STANDARD DELIVERY'}
                </span>
            </div>
            </div>
            <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-blue-600 mt-1" />
                <div>
                    <p className="text-xs text-slate-500">Parcel Handling</p>

                    <span
                    className={`inline-flex mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                        parcel.fragile
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                    >
                    {parcel.fragile ? 'FRAGILE' : 'NON-FRAGILE'}
                    </span>
                </div>
                </div>

                

          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-xs text-slate-500">Estimated Delivery Fee</p>
              <p className="font-bold text-blue-700 mt-1">
                LKR {Number(parcel.estimatedFee).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CalendarDays className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-xs text-slate-500">Booking Date</p>
              <p className="font-semibold text-slate-800 mt-1">
                {formatDate(parcel.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-1" />
            <div>
              <p className="text-xs text-slate-500">Pricing Reference</p>
              <p className="font-semibold text-slate-800 mt-1 break-all">
                {parcel.pricingId}
              </p>
            </div>
          </div>

        </div>
      </div>

      <div className="text-xs text-slate-400 text-center">
        SwiftDrop Parcel Delivery System
      </div>

    </div>
  );
};
