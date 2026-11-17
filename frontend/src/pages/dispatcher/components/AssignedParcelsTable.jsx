import React from 'react';
import { User, ArrowRight } from 'lucide-react';

const AssignedParcelsTable = ({ loading, assignedParcels }) => {
  if (loading) {
    return <div className="text-center py-10 text-slate-400 font-medium">Loading assigned parcels...</div>;
  }

  if (assignedParcels.length === 0) {
    return <div className="text-center py-12 text-slate-500">No active assigned parcels found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-200 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <th className="pb-3 px-4">Tracking Code</th>
            <th className="pb-3 px-4">Assigned Agent</th>
            <th className="pb-3 px-4">Route Path</th>
            <th className="pb-3 px-4">Est. Fee</th>
            <th className="pb-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {assignedParcels.map((parcel) => (
            <tr key={parcel.id} className="hover:bg-slate-50/80 transition-all">
              <td className="py-4 px-4 font-mono font-bold text-blue-600 text-sm">{parcel.trackingNumber}</td>
              <td className="py-4 px-4 text-sm font-semibold">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-xl inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {parcel.courierName || 'N/A'}
                </span>
              </td>
              <td className="py-4 px-4 text-slate-600 text-sm inline-flex items-center gap-2">
                <span>{parcel.pickupAddress}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>{parcel.dropoffAddress}</span>
              </td>
              <td className="py-4 px-4 font-bold text-slate-800 text-sm">
                LKR {(parcel.estimatedFee || 1500).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-4 px-4">
                <span className="px-3 py-1 text-xs rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {parcel.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AssignedParcelsTable;