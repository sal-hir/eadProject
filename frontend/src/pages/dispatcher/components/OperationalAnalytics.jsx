import React from 'react';

const OperationalAnalytics = ({ 
  overallCapacityUsagePct, 
  totalOccupiedCapacity, 
  totalSystemCapacity, 
  totalEstimatedRevenue, 
  totalParcelsCount, 
  assignedCount, 
  unassignedCount 
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Workload Capacity</p>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-slate-900">{overallCapacityUsagePct}%</h2>
            <span className="text-xs text-slate-500 font-medium">utilized</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-indigo-600 h-full transition-all duration-500" 
              style={{ width: `${overallCapacityUsagePct}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500">{totalOccupiedCapacity} out of {totalSystemCapacity} total delivery slots filled.</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Fee Estimation</p>
          <h2 className="text-3xl font-extrabold text-slate-900">
            LKR {totalEstimatedRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-emerald-600 font-semibold">Total estimated value across all registered parcels.</p>
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/80 space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Allocation Efficiency</p>
          <h2 className="text-3xl font-extrabold text-blue-600">
            {totalParcelsCount > 0 ? Math.round((assignedCount / totalParcelsCount) * 100) : 0}%
          </h2>
          <p className="text-xs text-slate-500">{assignedCount} allocated vs {unassignedCount} waiting in queue.</p>
        </div>

      </div>
    </div>
  );
};

export default OperationalAnalytics;