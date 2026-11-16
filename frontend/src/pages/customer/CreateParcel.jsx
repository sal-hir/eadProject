
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  MapPin,
  Calculator,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Package
} from 'lucide-react';

import {
  createParcel,
  getBookingZones
} from '../../api/parcelApi';

export const CreateParcel = () => {
  const navigate = useNavigate();

  const [zones, setZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [booking, setBooking] = useState(null);

  const [form, setForm] = useState({
    pickupAddress: '',
    pickupCity: '',
    dropoffAddress: '',
    dropoffCity: '',
    pickupZoneId: '',
    dropoffZoneId: '',
    weightKg: '1'
  });

  // Update form fields
  const updateField = (field, value) => {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  };

  // =====================================
  // LOAD ACTIVE ZONES
  // =====================================

  useEffect(() => {
    let active = true;

    const loadZones = async () => {
      try {
        setLoadingZones(true);
        setError('');

        const response = await getBookingZones();

        if (!active) return;

        const receivedZones = Array.isArray(response.data)
          ? response.data
          : response.data?.data || [];

        const availableZones = receivedZones
          .map(zone => ({
            ...zone,
            id: zone.id || zone.zoneId
          }))
          .filter(zone =>
            zone.id && zone.active !== false
          );

        setZones(availableZones);

        if (availableZones.length > 0) {
          setForm(previous => ({
            ...previous,
            pickupZoneId:
              previous.pickupZoneId || availableZones[0].id,
            dropoffZoneId:
              previous.dropoffZoneId || availableZones[0].id
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
        if (active) {
          setLoadingZones(false);
        }
      }
    };

    loadZones();

    return () => {
      active = false;
    };
  }, []);

  // =====================================
  // SUBMIT PARCEL BOOKING
  // =====================================

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.pickupZoneId || !form.dropoffZoneId) {
      setError('Please select pickup and drop-off zones.');
      return;
    }

    const weight = Number(form.weightKg);

    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Please enter a valid parcel weight.');
      return;
    }

    if (
      !form.pickupAddress.trim() ||
      !form.pickupCity.trim() ||
      !form.dropoffAddress.trim() ||
      !form.dropoffCity.trim()
    ) {
      setError('Please complete all address details.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await createParcel({
        pickupAddress:
          `${form.pickupAddress.trim()}, ${form.pickupCity.trim()}`,

        dropoffAddress:
          `${form.dropoffAddress.trim()}, ${form.dropoffCity.trim()}`,

        pickupZoneId: form.pickupZoneId,
        dropoffZoneId: form.dropoffZoneId,
        weightKg: weight
      });

      const bookingData = response.data?.data || response.data;

      if (!bookingData) {
        throw new Error('The server returned an empty booking response.');
      }

      setBooking(bookingData);

    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to create the parcel booking. Please check your details.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================
  // BOOKING CONFIRMATION
  // =====================================

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
              {booking.trackingNumber || 'Not available'}
            </p>

          </div>

          <div className="text-left space-y-3 mt-6 text-sm">

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Parcel ID</span>

              <span className="font-semibold text-slate-800 break-all">
                {booking.parcelId || booking.id || 'Not available'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Status</span>

              <span className="font-semibold text-slate-800">
                {booking.currentStatus || booking.status || 'Pending'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Parcel Weight</span>

              <span className="font-semibold text-slate-800">
                {booking.weightKg ?? form.weightKg} kg
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Estimated Fee</span>

              <span className="font-bold text-blue-700">
                LKR {Number(booking.estimatedFee ?? 0).toFixed(2)}
              </span>
            </div>

          </div>

          <button
            type="button"
            onClick={() => navigate('/customer')}
            className="w-full mt-8 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm"
          >
            Go to My Dashboard
          </button>

        </div>
      </div>
    );
  }

  // =====================================
  // CREATE PARCEL FORM
  // =====================================

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

      {/* Page heading */}

      <div className="mb-8">

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          Create Delivery Request
        </h1>

        <p className="text-slate-500 text-sm mt-2">
          Enter your parcel details and get an automatically calculated delivery fee.
        </p>

      </div>

      {/* Error message */}

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-3 text-sm">

          <AlertCircle className="w-5 h-5 flex-shrink-0" />

          <span>{error}</span>

        </div>
      )}

      {/* Loading zones */}

      {loadingZones && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-sm">
          Loading available delivery zones...
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* PICKUP AND DELIVERY DETAILS */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Pickup details */}

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
                onChange={e =>
                  updateField('pickupAddress', e.target.value)
                }
                placeholder="No. 25, Duplication Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

            </div>

            <div>

              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Pickup City *
              </label>

              <input
                type="text"
                required
                value={form.pickupCity}
                onChange={e =>
                  updateField('pickupCity', e.target.value)
                }
                placeholder="Colombo 03"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

            </div>

            <div>

              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Pickup Zone *
              </label>

              <select
                required
                disabled={loadingZones || zones.length === 0}
                value={form.pickupZoneId}
                onChange={e =>
                  updateField('pickupZoneId', e.target.value)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
              >

                <option value="">
                  {loadingZones
                    ? 'Loading zones...'
                    : 'Select pickup zone'}
                </option>

                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.zoneName}
                  </option>
                ))}

              </select>

            </div>

          </div>

          {/* Drop-off details */}

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
                onChange={e =>
                  updateField('dropoffAddress', e.target.value)
                }
                placeholder="No. 108, Peradeniya Road"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

            </div>

            <div>

              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Drop-off City *
              </label>

              <input
                type="text"
                required
                value={form.dropoffCity}
                onChange={e =>
                  updateField('dropoffCity', e.target.value)
                }
                placeholder="Kandy"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />

            </div>

            <div>

              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Drop-off Zone *
              </label>

              <select
                required
                disabled={loadingZones || zones.length === 0}
                value={form.dropoffZoneId}
                onChange={e =>
                  updateField('dropoffZoneId', e.target.value)
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-100"
              >

                <option value="">
                  {loadingZones
                    ? 'Loading zones...'
                    : 'Select drop-off zone'}
                </option>

                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>
                    {zone.zoneName}
                  </option>
                ))}

              </select>

            </div>

          </div>

        </div>

        {/* PARCEL SPECIFICATION */}

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
              onChange={e =>
                updateField('weightKg', e.target.value)
              }
              className="w-full sm:w-1/2 px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

          </div>

          {/* Pricing information */}

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-5">

            <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">

              <Calculator className="w-4 h-4" />

              Delivery Fee Calculation

            </div>

            <p className="text-xs text-slate-500 mt-2">
              Parcel Service automatically calculates the delivery fee using the latest pricing rules received from Admin Service through RabbitMQ.
            </p>

            <p className="text-xs font-semibold text-blue-700 mt-3">
              Your final delivery fee will appear after booking.
            </p>

          </div>

        </div>

        {/* SUBMIT BUTTONS */}

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
              zones.length === 0
            }
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >

            <span>
              {submitting
                ? 'Creating Booking...'
                : 'Confirm Delivery Request'}
            </span>

            <ArrowRight className="w-4 h-4" />

          </button>

        </div>

      </form>

    </div>
  );
};

export default CreateParcel;
