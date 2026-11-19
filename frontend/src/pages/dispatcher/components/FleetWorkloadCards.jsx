
import React from 'react';
import { Truck, Phone, MapPin } from 'lucide-react';

const FleetWorkloadCards = ({ courierWorkloads }) => {
  if (!courierWorkloads.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Truck className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p className="font-semibold">No available couriers found.</p>
        <p className="text-xs mt-1">
          Check your Courier Service profiles and availability.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

      {courierWorkloads.map((courier) => {
        const activeCount = courier.activeDeliveriesCount || 0;
        const capacityPercent = Math.min((activeCount / 5) * 100, 100);

        return (
          <div
            key={courier.courierId}
            className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-sm"
          >

            <div className="flex justify-between items-start mb-4">

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    {courier.name}
                  </h4>

                  <p className="text-xs text-slate-500 font-medium">
                    {courier.vehicleType}
                  </p>
                </div>
              </div>

              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                !courier.isAvailable
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {courier.isAvailable ? 'Available' : 'Unavailable'}
              </span>

            </div>

            <div className="space-y-2 text-xs text-slate-600 mb-4">

              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {courier.phone || 'No phone number'}
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {courier.zone || 'General Zone'}
              </div>

            </div>

            <div className="border-t border-slate-200 pt-3">

              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-500 font-semibold">
                  Active Deliveries
                </span>

                <span className={`text-xs font-bold ${
                  activeCount >= 5 ? 'text-red-600' : 'text-blue-700'
                }`}>
                  {activeCount} / 5 Jobs
                </span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    activeCount >= 5 ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${capacityPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-2">
                {Math.max(0, 5 - activeCount)} available job slots
              </p>

            </div>

          </div>
        );
      })}

    </div>
  );
};

export default FleetWorkloadCards;
