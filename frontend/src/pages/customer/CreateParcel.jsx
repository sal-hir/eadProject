
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  MapPin,
  Calculator,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Package
} from 'lucide-react';
import { parcelApi } from '../../api/client';
import { Download } from 'lucide-react';

export const CreateParcel = () => {
  const navigate = useNavigate();

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [estimating, setEstimating] = useState(false);

  const [error, setError] = useState('');
  const [estimate, setEstimate] = useState(null);
  const [booking, setBooking] = useState(null);

  const [form, setForm] = useState({
    pickupAddress: '',
    dropoffAddress: '',
    pickupZoneId: '',
    dropoffZoneId: '',

    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',

    parcelDescription: '',

    weightKg: '1',
    fragile: false,
    deliveryPriority: 'STANDARD'
  });

  const updateField = (field, value) => {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  };

  const isValidPhone = (phone) => /^0[0-9]{9}$/.test(phone);

  // Load active delivery zones
  useEffect(() => {
    let active = true;

    const loadZones = async () => {
      try {
        setLoadingZones(true);
        setError('');
        const response = await parcelApi.get('/parcels/booking/zones');

        if (!active) return;

        const availableZones = response.data;
        setZones(availableZones);

        if (availableZones.length > 0) {
          setForm(previous => ({
            ...previous,
            pickupZoneId: previous.pickupZoneId || availableZones[0].id,
            dropoffZoneId: previous.dropoffZoneId || availableZones[0].id
          }));
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
            'Unable to load delivery zones. Please try again.'
          );
        }
      } finally {
        if (active) setLoadingZones(false);
      }
    };

    loadZones();

    return () => {
      active = false;
    };
  }, []);

  // Request a delivery fee quote
  useEffect(() => {
    let active = true;

    const getQuote = async () => {
      const weight = Number(form.weightKg);

      if (
        !form.pickupZoneId ||
        !form.dropoffZoneId ||
        !Number.isFinite(weight) ||
        weight <= 0
      ) {
        setEstimate(null);
        return;
      }

      setEstimating(true);
      setEstimate(null);

      try {
        const response = await parcelApi.post(
          '/parcels/booking/quote',
          {
            pickupZoneId: form.pickupZoneId,
            dropoffZoneId: form.dropoffZoneId,
            weightKg: weight
          }
        );

        if (active) {
          setEstimate(response.data);
        }
      } catch (err) {
        if (active) {
          setEstimate(null);
          setError(
            err.response?.data?.message ||
            'Unable to calculate the delivery fee for these details.'
          );
        }
      } finally {
        if (active) setEstimating(false);
      }
    };

    getQuote();

    return () => {
      active = false;
    };
  }, [
    form.pickupZoneId,
    form.dropoffZoneId,
    form.weightKg
  ]);

  // Submit parcel booking
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!isValidPhone(form.senderPhone)) {
      setError('Sender phone number must contain exactly 10 digits and start with 0.');
      return;
    }

    if (!isValidPhone(form.receiverPhone)) {
      setError('Receiver phone number must contain exactly 10 digits and start with 0.');
      return;
    }

    if (!form.senderName.trim() || !form.receiverName.trim()) {
      setError('Please enter both sender and receiver names.');
      return;
    }

    if (!form.parcelDescription.trim()) {
      setError('Please enter a description of the parcel.');
      return;
    }

    if (!estimate) {
      setError('Please wait until the delivery fee is calculated.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await parcelApi.post('/parcels', {
        pickupAddress: form.pickupAddress.trim(),
        dropoffAddress: form.dropoffAddress.trim(),

        senderName: form.senderName.trim(),
        senderPhone: form.senderPhone,

        receiverName: form.receiverName.trim(),
        receiverPhone: form.receiverPhone,

        parcelDescription: form.parcelDescription.trim(),

        pickupZoneId: form.pickupZoneId,
        dropoffZoneId: form.dropoffZoneId,
        weightKg: Number(form.weightKg),
        fragile: form.fragile,
        deliveryPriority: form.deliveryPriority
      });

      setBooking(response.data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Failed to create the parcel booking. Please check your details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Download receipt
  const handleDownloadReceipt = async () => {
    try {
      if (!booking?.parcelId) {
        alert('Parcel information is not available.');
        return;
      }

      const response = await parcelApi.get(
        `/parcels/${booking.parcelId}/receipt`,
        { responseType: 'blob' }
      );

      const pdfBlob = new Blob([response.data], { type: 'application/pdf' });
      const downloadUrl = window.URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `SwiftDrop-Receipt-${booking.parcelId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Receipt download failed:', error);
      alert('Unable to download the receipt. Please try again.');
    }
  };

  // Booking confirmation screen
  if (booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center">
          <div className="flex justify-center mb-5">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">
            Booking Successful!
          </h1>

          <p className="text-slate-500 mt-2 text-sm">
            Your parcel delivery request has been created successfully.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mt-7">
            <p className="text-xs font-bold text-blue-600 uppercase">
              Your Tracking Number
            </p>

            <p className="text-2xl font-black text-blue-800 mt-2 tracking-wide">
              {booking.trackingNumber}
            </p>
          </div>

          <div className="text-left space-y-3 mt-6 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Parcel ID</span>
              <span className="font-semibold text-slate-800 break-all">
                {booking.parcelId}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className="font-semibold text-slate-800">
                {booking.currentStatus}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Estimated Fee</span>
              <span className="font-bold text-blue-700">
                LKR {Number(booking.estimatedFee).toFixed(2)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadReceipt}
            className="w-full mt-6 px-5 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Download PDF Receipt
          </button>

          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="w-full mt-4 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
          >
            Go to My Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Create Delivery Request
        </h1>

        <p className="text-slate-500 text-sm mt-2">
          Enter your parcel details and get an automatically calculated delivery fee.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Pickup and drop-off details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">

            <div className="flex items-center gap-2 text-blue-600 font-bold text-sm border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4" />
              1. Pickup Details
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Pickup Address *
              </label>

              <input
                type="text"
                required
                value={form.pickupAddress}
                onChange={e => updateField('pickupAddress', e.target.value)}
                placeholder="No. 25, Duplication Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Sender details */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Sender Name *
              </label>

              <input
                type="text"
                required
                maxLength={100}
                value={form.senderName}
                onChange={e => updateField('senderName', e.target.value)}
                placeholder="Enter sender's full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Sender Phone Number *
              </label>

              <input
                type="tel"
                required
                inputMode="numeric"
                maxLength={10}
                pattern="0[0-9]{9}"
                value={form.senderPhone}
                onChange={e =>
                  updateField(
                    'senderPhone',
                    e.target.value.replace(/\D/g, '').slice(0, 10)
                  )
                }
                placeholder="07XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <p className="text-xs text-slate-500 mt-1">
                Enter a valid 10-digit Sri Lankan phone number.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Pickup Zone *
              </label>

              <select
                required
                disabled={loadingZones || zones.length === 0}
                value={form.pickupZoneId}
                onChange={e => updateField('pickupZoneId', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
              >
                {loadingZones ? (
                  <option value="">Loading zones...</option>
                ) : zones.length === 0 ? (
                  <option value="">No active zones available</option>
                ) : (
                  zones.map(zone => (
                    <option key={zone.id} value={zone.id}>
                      {zone.zoneName}
                    </option>
                  ))
                )}
              </select>

              {!loadingZones && zones.length === 0 && (
                <p className="text-xs text-rose-600 mt-1">
                  Please contact the administrator to add delivery zones.
                </p>
              )}
            </div>

          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">

            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4" />
              2. Delivery Details
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Drop-off Address *
              </label>

              <input
                type="text"
                required
                value={form.dropoffAddress}
                onChange={e => updateField('dropoffAddress', e.target.value)}
                placeholder="No. 108, Peradeniya Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Receiver details */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Receiver Name *
              </label>

              <input
                type="text"
                required
                maxLength={100}
                value={form.receiverName}
                onChange={e => updateField('receiverName', e.target.value)}
                placeholder="Enter receiver's full name"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Receiver Phone Number *
              </label>

              <input
                type="tel"
                required
                inputMode="numeric"
                maxLength={10}
                pattern="0[0-9]{9}"
                value={form.receiverPhone}
                onChange={e =>
                  updateField(
                    'receiverPhone',
                    e.target.value.replace(/\D/g, '').slice(0, 10)
                  )
                }
                placeholder="07XXXXXXXX"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

              <p className="text-xs text-slate-500 mt-1">
                Enter a valid 10-digit Sri Lankan phone number.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Drop-off Zone *
              </label>

              <select
                required
                disabled={loadingZones || zones.length === 0}
                value={form.dropoffZoneId}
                onChange={e => updateField('dropoffZoneId', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
              >
                {loadingZones ? (
                  <option value="">Loading zones...</option>
                ) : zones.length === 0 ? (
                  <option value="">No active zones available</option>
                ) : (
                  zones.map(zone => (
                    <option key={zone.id} value={zone.id}>
                      {zone.zoneName}
                    </option>
                  ))
                )}
              </select>

              {!loadingZones && zones.length === 0 && (
                <p className="text-xs text-rose-600 mt-1">
                  Please contact the administrator to add delivery zones.
                </p>
              )}
            </div>

          </div>
        </div>

        {/* Parcel specifications */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">

          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-b border-slate-100 pb-3">
            <Package className="w-4 h-4 text-blue-600" />
            3. Parcel Specification
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Parcel Weight (KG) *
            </label>

            <input
              type="number"
              min="0.001"
              step="0.001"
              required
              value={form.weightKg}
              onChange={e => updateField('weightKg', e.target.value)}
              className="w-full sm:w-1/2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Parcel description */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
              Description of the Parcel *
            </label>

            <textarea
              required
              rows={3}
              maxLength={500}
              value={form.parcelDescription}
              onChange={e => updateField('parcelDescription', e.target.value)}
              placeholder="Example: Glass kitchen items, books, clothes..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
            />

            <div className="flex justify-between gap-3 mt-1">
              <p className="text-xs text-slate-500">
                Briefly describe the items inside your parcel. Do not include valuable or confidential information.
              </p>

              <span className="text-xs text-slate-400 whitespace-nowrap">
                {form.parcelDescription.length}/500
              </span>
            </div>
          </div>

          {/* Parcel handling type */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              Parcel Handling Type *
            </label>

            <select
              value={form.fragile ? 'FRAGILE' : 'NON_FRAGILE'}
              onChange={e => updateField('fragile', e.target.value === 'FRAGILE')}
              className="w-full sm:w-1/2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="NON_FRAGILE">Non-fragile</option>
              <option value="FRAGILE">Fragile / Breakable</option>
            </select>

            <p className="text-xs text-slate-500 mt-2">
              Select Fragile for glass, ceramics, electronics, and other items
              that require careful handling.
            </p>
          </div>

          {/* Delivery priority */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
              Delivery Priority *
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              <label className={`border rounded-xl p-4 cursor-pointer transition ${
                form.deliveryPriority === 'STANDARD'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deliveryPriority"
                    value="STANDARD"
                    checked={form.deliveryPriority === 'STANDARD'}
                    onChange={e => updateField('deliveryPriority', e.target.value)}
                  />

                  <span className="font-bold text-sm text-slate-800">
                    Standard Delivery
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Regular delivery service at the normal calculated fee.
                </p>

                <p className="text-sm font-bold text-green-700 mt-2">
                  No additional charge
                </p>
              </label>

              <label className={`border rounded-xl p-4 cursor-pointer transition ${
                form.deliveryPriority === 'EXPRESS'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-blue-300'
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="deliveryPriority"
                    value="EXPRESS"
                    checked={form.deliveryPriority === 'EXPRESS'}
                    onChange={e => updateField('deliveryPriority', e.target.value)}
                  />

                  <span className="font-bold text-sm text-slate-800">
                    Express Delivery
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  Priority handling for customers who need a faster delivery service.
                </p>

                <p className="text-sm font-bold text-blue-700 mt-2">
                  Additional LKR 200.00
                </p>
              </label>

            </div>
          </div>

          {/* Pricing preview */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-3">

            <div>
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Calculator className="w-4 h-4" />
                Estimated Delivery Fee
              </div>

              <p className="text-xs text-slate-500 mt-1">
                Based on the pickup zone, parcel weight, and selected delivery priority.
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-2xl font-black text-blue-700">
                {estimating
                  ? 'Calculating...'
                  : estimate
                    ? `LKR ${(
                        Number(estimate.estimatedFee) +
                        (form.deliveryPriority === 'EXPRESS' ? 200 : 0)
                      ).toFixed(2)}`
                    : 'LKR —'}
              </span>
            </div>

          </div>

        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">

          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="px-5 py-2.5 rounded-xl border border-slate-300 font-semibold text-slate-700 hover:bg-slate-50 text-sm"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              loadingZones ||
              zones.length === 0 ||
              estimating ||
              !estimate
            }
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>
              {submitting ? 'Creating Booking...' : 'Confirm Delivery Request'}
            </span>

            <ArrowRight className="w-4 h-4" />

          </button>

        </div>

      </form>

    </div>
  );
};

export default CreateParcel;
