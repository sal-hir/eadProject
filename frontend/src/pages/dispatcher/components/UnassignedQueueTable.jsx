
import React from 'react';
import { Sparkles, UserPlus } from 'lucide-react';

const UnassignedQueueTable = ({
  loading,
  unassignedParcels,
  selectedParcelIds,
  handleSelectParcel,
  handleOpenAssignModal
}) => {
  if (loading) {
    return (
      <div className="text-center py-10 text-slate-400 font-medium">
        Loading queue data...
      </div>
    );
  }

  if (unassignedParcels.length === 0) {
    return (
      <div className="text-center py-12">
        <Sparkles className="w-10 h-10 text-amber-500 mx-auto mb-2" />
        <p className="text-slate-500 font-medium text-sm">
          Queue is empty! All parcels have been allocated.
        </p>
      </div>
    );
  }

  const allSelected =
    unassignedParcels.length > 0 &&
    unassignedParcels.every(parcel =>
      selectedParcelIds.includes(parcel.id)
    );

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full min-w-[1050px] table-fixed text-left">
        <colgroup>
          <col className="w-[7%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[17%]" />
          <col className="w-[12%]" />
          <col className="w-[11%]" />
          <col className="w-[19%]" />
        </colgroup>

        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wide">
            <th className="py-4 px-3 text-center whitespace-nowrap">
              Select
            </th>
            <th className="py-4 px-4 whitespace-nowrap">
              Tracking Code
            </th>
            <th className="py-4 px-4 whitespace-nowrap">
              Pickup Route
            </th>
            <th className="py-4 px-4 whitespace-nowrap">
              Dropoff Route
            </th>
            <th className="py-4 px-4 whitespace-nowrap">
              Est. Fee
            </th>
            <th className="py-4 px-4 whitespace-nowrap">
              Status
            </th>
            <th className="py-4 px-4 text-right whitespace-nowrap">
              Allocation
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100 bg-white">
          {unassignedParcels.map((parcel) => (
            <tr
              key={parcel.id}
              className="hover:bg-blue-50/40 transition-colors"
            >
              <td className="py-4 px-3 text-center">
                <input
                  type="checkbox"
                  checked={selectedParcelIds.includes(parcel.id)}
                  onChange={() => handleSelectParcel(parcel.id)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  aria-label={`Select parcel ${parcel.trackingNumber}`}
                />
              </td>

              <td className="py-4 px-4">
                <span
                  className="font-mono font-bold text-blue-600 text-sm block truncate"
                  title={parcel.trackingNumber}
                >
                  {parcel.trackingNumber}
                </span>
              </td>

              <td className="py-4 px-4 text-slate-600 text-sm">
                <span
                  className="block truncate"
                  title={parcel.pickupAddress}
                >
                  {parcel.pickupAddress || 'N/A'}
                </span>
              </td>

              <td className="py-4 px-4 text-slate-600 text-sm">
                <span
                  className="block truncate"
                  title={parcel.dropoffAddress}
                >
                  {parcel.dropoffAddress || 'N/A'}
                </span>
              </td>

              <td className="py-4 px-4 font-bold text-slate-800 text-sm whitespace-nowrap">
                LKR {(parcel.estimatedFee || 1500).toLocaleString(
                  'en-US',
                  { minimumFractionDigits: 2 }
                )}
              </td>

              <td className="py-4 px-4">
                <span className="inline-flex items-center px-3 py-1 text-xs rounded-full bg-amber-100 text-amber-800 font-semibold whitespace-nowrap">
                  {parcel.status}
                </span>
              </td>

              <td className="py-4 px-4 text-right">
                <button
                  onClick={() => handleOpenAssignModal(parcel)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-lg font-semibold shadow-sm transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Assign Courier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UnassignedQueueTable;
