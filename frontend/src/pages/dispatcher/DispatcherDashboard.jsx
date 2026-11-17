import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Search, BarChart2 } from 'lucide-react';

import MetricCards from './components/MetricCards';
import UnassignedQueueTable from './components/UnassignedQueueTable';
import AssignedParcelsTable from './components/AssignedParcelsTable';
import FleetWorkloadCards from './components/FleetWorkloadCards';
import OperationalAnalytics from './components/OperationalAnalytics';
import { useAuth } from '../../context/AuthContext';
import { SingleAssignModal, BatchAssignModal } from './components/AssignModals';

const DispatcherDashboard = () => {
  const [allParcels, setAllParcels] = useState([]);
  const [courierWorkloads, setCourierWorkloads] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('unassigned');
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedParcel, setSelectedParcel] = useState(null);
  const [selectedCourierId, setSelectedCourierId] = useState('');
  const [suggestedCourierId, setSuggestedCourierId] = useState('');
  const [suggestionReason, setSuggestionReason] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [selectedParcelIds, setSelectedParcelIds] = useState([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  const { token } = useAuth();

  const fetchDashboardData = useCallback(async (isBackgroundSync = false) => {
  try {
    if (!isBackgroundSync) setLoading(true);

    // 1. Fetch parcels
    const parcelsRes = await fetch(
      'http://localhost:8080/api/v1/dispatch/parcels'
    );

    if (!parcelsRes.ok) {
      throw new Error('Failed to fetch parcels');
    }

    const parcelsData = await parcelsRes.json();
    const parcelsList = parcelsData.content || parcelsData || [];

    setAllParcels(parcelsList);

    // 2. Fetch real available couriers from Courier Service via Dispatch
    if (!token) {
      setCourierWorkloads([]);
      return;
    }

    const couriersRes = await fetch(
      'http://localhost:8080/api/v1/dispatch/couriers',
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!couriersRes.ok) {
      throw new Error('Failed to fetch available couriers');
    }

    const couriers = await couriersRes.json();

    // 3. Fetch workload for each real courier UUID
    const workloads = await Promise.all(
      (Array.isArray(couriers) ? couriers : []).map(async (courier) => {
        try {
          const workloadRes = await fetch(
            `http://localhost:8080/api/v1/dispatch/couriers/${courier.id}/workload`
          );

          const workload = workloadRes.ok
            ? await workloadRes.json()
            : null;

          return {
            ...courier,

            // Use the actual Courier Service profile UUID
            courierId: courier.id,

            activeDeliveriesCount: Number(
              workload?.activeDeliveriesCount ?? 0
            ),
          };
        } catch (error) {
          console.error(
            `Failed to fetch workload for ${courier.name}:`,
            error
          );

          return {
            ...courier,
            courierId: courier.id,
            activeDeliveriesCount: 0,
          };
        }
      })
    );

    setCourierWorkloads(workloads);

  } catch (err) {
    console.error('Error fetching dispatch data:', err);

    if (!isBackgroundSync) {
      toast.error('Failed to load real-time dashboard data.');
    }
  } finally {
    if (!isBackgroundSync) setLoading(false);
  }
}, [token]);

  useEffect(() => {
  fetchDashboardData();

  const intervalId = setInterval(() => {
    fetchDashboardData(true);
  }, 5000);

  return () => clearInterval(intervalId);
}, [fetchDashboardData]);

  const calculateBestCourier = (parcel) => {
  if (!parcel || courierWorkloads.length === 0) {
    return { bestId: '', reason: '' };
  }

  const routeText =
    `${parcel.pickupAddress} ${parcel.dropoffAddress}`.toLowerCase();

  const availableCouriers = courierWorkloads.filter(
    courier =>
      courier.isAvailable &&
      (courier.activeDeliveriesCount || 0) < 5
  );

  if (availableCouriers.length === 0) {
    return {
      bestId: '',
      reason: 'No available couriers with sufficient capacity.',
    };
  }

  // Try matching the actual courier zone with the parcel route
  const zoneMatchedCourier = availableCouriers.find(courier => {
    const zone = (courier.zone || '').toLowerCase();
    return zone && routeText.includes(zone);
  });

  if (zoneMatchedCourier) {
    return {
      bestId: zoneMatchedCourier.courierId,
      reason: `Matched Zone: ${zoneMatchedCourier.zone}`,
    };
  }

  // Otherwise recommend the courier with the lowest workload
  const lowestWorkloadCourier = [...availableCouriers].sort(
    (a, b) =>
      (a.activeDeliveriesCount || 0) -
      (b.activeDeliveriesCount || 0)
  )[0];

  return {
    bestId: lowestWorkloadCourier.courierId,
    reason: `Lowest Workload Match (${lowestWorkloadCourier.activeDeliveriesCount}/5 Jobs)`,
  };
};

  const handleOpenAssignModal = (parcel) => {
    setSelectedParcel(parcel);
    const { bestId, reason } = calculateBestCourier(parcel);
    setSuggestedCourierId(bestId);
    setSuggestionReason(reason);
    setSelectedCourierId(bestId);
    setIsModalOpen(true);
  };

  const handleSelectParcel = (id) => {
    setSelectedParcelIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCloseBatchModal = () => {
    setIsBatchModalOpen(false);
    setSelectedParcelIds([]);
    setSelectedCourierId('');
  };

  const unassignedParcels = allParcels.filter(
    (p) => p.status === 'CREATED' && p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const assignedParcels = allParcels
  .filter(
    (p) =>
      p.status !== 'CREATED' &&
      p.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase())
  )
  .map((parcel) => {
    const assignedCourier = courierWorkloads.find(
      (courier) => String(courier.id) === String(parcel.courierId)
    );

    return {
      ...parcel,
      courierName: assignedCourier?.name || 'Unknown Courier',
    };
  });

  const totalParcelsCount = allParcels.length;
  const unassignedCount = allParcels.filter((p) => p.status === 'CREATED').length;
  const assignedCount = allParcels.filter((p) => p.status !== 'CREATED').length;
  const activeCouriersCount = courierWorkloads.filter(w => w.activeDeliveriesCount > 0).length;

  const totalSystemCapacity = courierWorkloads.length * 5;
  const totalOccupiedCapacity = courierWorkloads.reduce((acc, curr) => acc + (curr.activeDeliveriesCount || 0), 0);
  const overallCapacityUsagePct = totalSystemCapacity > 0 ? Math.round((totalOccupiedCapacity / totalSystemCapacity) * 100) : 0;
  const totalEstimatedRevenue = allParcels.reduce((acc, curr) => acc + (curr.estimatedFee || 1500), 0);

  const handleAssignCourier = async (e) => {
    e.preventDefault();
    if (!selectedParcel || !selectedCourierId) {
      toast.error('Please select a courier agent!');
      return;
    }

    const targetWorkload = courierWorkloads.find((w) => w.courierId === selectedCourierId);
    if (targetWorkload && targetWorkload.activeDeliveriesCount >= 5) {
      toast.error(`Cannot Allocate! ${selectedCourierId} has reached maximum workload capacity (5 Active Jobs).`, {
        duration: 5000,
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: '600' },
      });
      return;
    }

    try {
      setAssigning(true);
      const response = await fetch(`http://localhost:8080/api/v1/dispatch/parcels/${selectedParcel.id}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parcelId: selectedParcel.id, courierId: selectedCourierId }),
      });

      if (response.ok) {
        toast.success(`Parcel ${selectedParcel.trackingNumber} allocated to ${selectedCourierId}!`, {
          duration: 4000,
          style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: '600' },
        });
        setIsModalOpen(false);
        setSelectedParcel(null);
        setSelectedCourierId('');
        fetchDashboardData();
      } else {
        toast.error('Failed to assign parcel.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Network connection error.');
    } finally {
      setAssigning(false);
    }
  };

  const handleBatchAssignCourier = async (e) => {
    e.preventDefault();
    if (selectedParcelIds.length === 0 || !selectedCourierId) {
      toast.error('Please select parcels and a courier agent!');
      return;
    }

    const targetWorkload = courierWorkloads.find((w) => w.courierId === selectedCourierId);
    const currentJobs = targetWorkload ? targetWorkload.activeDeliveriesCount || 0 : 0;
    const remainingCapacity = 5 - currentJobs;

    if (selectedParcelIds.length > remainingCapacity) {
      toast.error(`Batch Failed! ${selectedCourierId} can only take ${remainingCapacity} more job(s). (Max Limit: 5)`, {
        duration: 5000,
        style: { borderRadius: '12px', background: '#ef4444', color: '#fff', fontSize: '13px', fontWeight: '600' },
      });
      return;
    }

    try {
      setAssigning(true);
      const promises = selectedParcelIds.map(parcelId => 
        fetch(`http://localhost:8080/api/v1/dispatch/parcels/${parcelId}/assignments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parcelId, courierId: selectedCourierId }),
        })
      );

      await Promise.all(promises);
      toast.success(`Batch Allocation Successful! ${selectedParcelIds.length} parcels assigned to ${selectedCourierId}.`, {
        duration: 4000,
        style: { borderRadius: '12px', background: '#0f172a', color: '#fff', fontSize: '13px', fontWeight: '600' },
      });

      handleCloseBatchModal();
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to complete batch assignment.');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans antialiased text-slate-800">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dispatcher Control Center</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">Real-time parcel logistics routing and workload monitoring hub.</p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-100 px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-600">
            <span>SYSTEM STATUS:</span>
            <span className="text-emerald-600 font-bold">ONLINE</span>
          </div>
        </div>

        {/* Analytics Metric Cards Sub-component */}
        <MetricCards 
          totalParcelsCount={totalParcelsCount}
          unassignedCount={unassignedCount}
          assignedCount={assignedCount}
        />

        {/* Main Tabbed Container */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50 gap-4">
            <div className="flex bg-slate-200/60 p-1 rounded-xl overflow-x-auto">
              <button
                onClick={() => setActiveTab('unassigned')}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'unassigned' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unassigned Queue ({unassignedCount})
              </button>
              <button
                onClick={() => setActiveTab('assigned')}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'assigned' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Assigned Parcels ({assignedCount})
              </button>
              <button
                onClick={() => setActiveTab('workloads')}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'workloads' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fleet Workload ({activeCouriersCount} Active)
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-xs md:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === 'analytics' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart2 className="w-4 h-4" />
                Dispatch Analytics
              </button>
            </div>

            <div className="flex items-center gap-3">
              {activeTab === 'unassigned' && selectedParcelIds.length > 0 && (
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-xl font-bold shadow-sm transition-all"
                >
                  Batch Assign ({selectedParcelIds.length})
                </button>
              )}

              {activeTab !== 'workloads' && activeTab !== 'analytics' && (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search tracking #..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-xl text-xs md:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              )}
            </div>
          </div>

          {activeTab === 'unassigned' && (
            <div className="p-6">
              <UnassignedQueueTable
                loading={loading}
                unassignedParcels={unassignedParcels}
                selectedParcelIds={selectedParcelIds}
                handleSelectParcel={handleSelectParcel}
                handleOpenAssignModal={handleOpenAssignModal}
              />
            </div>
          )}

          {activeTab === 'assigned' && (
            <div className="p-6">
              <AssignedParcelsTable
                loading={loading}
                assignedParcels={assignedParcels}
              />
            </div>
          )}

          {activeTab === 'workloads' && (
            <div className="p-6">
              <FleetWorkloadCards
                courierWorkloads={courierWorkloads}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-6">
              <OperationalAnalytics
                overallCapacityUsagePct={overallCapacityUsagePct}
                totalOccupiedCapacity={totalOccupiedCapacity}
                totalSystemCapacity={totalSystemCapacity}
                totalEstimatedRevenue={totalEstimatedRevenue}
                totalParcelsCount={totalParcelsCount}
                assignedCount={assignedCount}
                unassignedCount={unassignedCount}
              />
            </div>
          )}

        </div>
      </div>

      <SingleAssignModal
        isModalOpen={isModalOpen}
        setIsModalOpen={setIsModalOpen}
        selectedParcel={selectedParcel}
        selectedCourierId={selectedCourierId}
        setSelectedCourierId={setSelectedCourierId}
        suggestedCourierId={suggestedCourierId}
        suggestionReason={suggestionReason}
        courierWorkloads={courierWorkloads}
        handleAssignCourier={handleAssignCourier}
        assigning={assigning}
      />

      <BatchAssignModal
        isBatchModalOpen={isBatchModalOpen}
        handleCloseBatchModal={handleCloseBatchModal}
        selectedParcelIds={selectedParcelIds}
        selectedCourierId={selectedCourierId}
        setSelectedCourierId={setSelectedCourierId}
        courierWorkloads={courierWorkloads}
        handleBatchAssignCourier={handleBatchAssignCourier}
        assigning={assigning}
      />

    </div>
  );
};

export default DispatcherDashboard;