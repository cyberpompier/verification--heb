
import React from 'react';
import { Vehicle, VehicleStatus } from '../types.ts';

interface DashboardProps {
  vehicles: Vehicle[];
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles }) => {
  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length,
    maintenance: vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length,
    outOnCall: vehicles.filter(v => v.status === VehicleStatus.OUT_ON_CALL).length,
  };

  return (
    <div className="space-y-4 mb-4">
      {/* Numerical Stats - Force 4 compact columns */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Flotte" value={stats.total} color="text-gray-900" />
        <StatCard label="Dispo" value={stats.available} color="text-green-600" />
        <StatCard label="Maint." value={stats.maintenance} color="text-orange-600" />
        <StatCard label="Inter." value={stats.outOnCall} color="text-red-600" />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="p-2 sm:p-3 rounded-xl shadow-sm border border-gray-100 bg-white flex flex-col items-center justify-center transition-transform active:scale-95">
    <span className={`text-base sm:text-xl font-black leading-none ${color}`}>{value}</span>
    <span className="text-[7px] sm:text-[9px] uppercase tracking-tighter font-black opacity-40 mt-1">{label}</span>
  </div>
);

export default Dashboard;