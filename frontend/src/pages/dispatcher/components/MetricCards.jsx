import React from 'react';
import { Package, Clock, Truck } from 'lucide-react';

const MetricCards = ({ totalParcelsCount, unassignedCount, assignedCount }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Orders</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalParcelsCount}</h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
          <Package className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md">
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Dispatch</p>
          <h3 className="text-2xl font-bold text-amber-600 mt-1">{unassignedCount}</h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
          <Clock className="w-6 h-6" />
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between transition hover:shadow-md">
        <div>
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">In-Transit</p>
          <h3 className="text-2xl font-bold text-emerald-600 mt-1">{assignedCount}</h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
          <Truck className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};

export default MetricCards;