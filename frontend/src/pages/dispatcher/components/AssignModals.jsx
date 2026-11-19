
import React from 'react';
import { MapPin } from 'lucide-react';

export const SingleAssignModal = ({
  isModalOpen,
  setIsModalOpen,
  selectedParcel,
  selectedCourierId,
  setSelectedCourierId,
  suggestedCourierId,
  suggestionReason,
  courierWorkloads,
  handleAssignCourier,
  assigning
}) => {
  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">

        <h3 className="text-xl font-bold text-slate-900 mb-1">
          Assign Courier Agent
        </h3>

        <p className="text-xs text-slate-500 mb-4">
          Allocate parcel{' '}
          <span className="font-mono font-bold text-blue-600">
            {selectedParcel?.trackingNumber}
          </span>
          {' '}to a courier.
        </p>

        <form onSubmit={handleAssignCourier} className="space-y-4">

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Pickup Route:</span>
              <span className="font-semibold text-slate-700">
                {selectedParcel?.pickupAddress}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Dropoff Destination:</span>
              <span className="font-semibold text-slate-700">
                {selectedParcel?.dropoffAddress}
              </span>
            </div>

            <div className="flex justify-between border-t border-slate-200 pt-1.5">
              <span className="text-slate-500">Estimated Fee:</span>
              <span className="font-bold text-slate-900">
                LKR {(selectedParcel?.estimatedFee || 1500).toLocaleString(
                  'en-US',
                  { minimumFractionDigits: 2 }
                )}
              </span>
            </div>
          </div>

          {suggestedCourierId && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />

                <div>
                  <p className="text-xs font-bold text-blue-900">
                    Smart Recommendation
                  </p>
                  <p className="text-[11px] text-blue-700 font-medium">
                    {suggestionReason}
                  </p>
                </div>
              </div>

              <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                RECOMMENDED
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
              Select Courier Agent
            </label>

            <select
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Choose Courier Agent --</option>

              {courierWorkloads.map((courier) => {
                const active = courier.activeDeliveriesCount || 0;

                return (
                  <option
                    key={courier.courierId}
                    value={courier.courierId}
                    disabled={!courier.isAvailable || active >= 5}
                  >
                    {courier.name} - {courier.vehicleType} - {courier.zone || 'General Zone'}
                    ({active}/5 Jobs)
                    {courier.courierId === suggestedCourierId
                      ? ' ★ RECOMMENDED'
                      : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={assigning}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
            >
              {assigning ? 'Assigning...' : 'Confirm Allocation'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export const BatchAssignModal = ({
  isBatchModalOpen,
  handleCloseBatchModal,
  selectedParcelIds,
  selectedCourierId,
  setSelectedCourierId,
  courierWorkloads,
  handleBatchAssignCourier,
  assigning
}) => {
  if (!isBatchModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">

        <h3 className="text-xl font-bold text-slate-900 mb-1">
          Bulk Batch Allocation
        </h3>

        <p className="text-xs text-slate-500 mb-4">
          Allocating{' '}
          <span className="font-bold text-indigo-600">
            {selectedParcelIds.length} Selected Parcels
          </span>
          {' '}to a single courier.
        </p>

        <form onSubmit={handleBatchAssignCourier} className="space-y-4">

          <div>
            <label className="block text-xs font-bold uppercase text-slate-400 mb-2">
              Select Target Courier Agent
            </label>

            <select
              value={selectedCourierId}
              onChange={(e) => setSelectedCourierId(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">-- Select Courier Agent --</option>

              {courierWorkloads.map((courier) => {
                const active = courier.activeDeliveriesCount || 0;
                const available = 5 - active;

                return (
                  <option
                    key={courier.courierId}
                    value={courier.courierId}
                    disabled={
                      !courier.isAvailable ||
                      available < selectedParcelIds.length
                    }
                  >
                    {courier.name} - {courier.vehicleType}
                    ({active}/5 Jobs) -
                    {courier.isAvailable && available >= selectedParcelIds.length
                      ? ` ${available} Spots Left`
                      : ' UNAVAILABLE / INSUFFICIENT SPOTS'}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCloseBatchModal}
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={assigning}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
            >
              {assigning ? 'Assigning Batch...' : 'Confirm Bulk Allocation'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
