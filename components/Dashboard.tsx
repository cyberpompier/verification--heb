
import React from 'react';
import { Vehicle, VehicleStatus } from '../types';

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
    <div className="space-y-4 mb-6">
      {/* Numerical Stats - Force 4 columns on all screens and reduce padding/text size */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatCard label="Flotte" value={stats.total} color="bg-white text-gray-800 border-gray-100" />
        <StatCard label="Dispo" value={stats.available} color="bg-white text-green-700 border-green-100" />
        <StatCard label="Maint." value={stats.maintenance} color="bg-white text-orange-700 border-orange-100" />
        <StatCard label="Inter." value={stats.outOnCall} color="bg-white text-red-700 border-red-100" />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className={`p-2 sm:p-4 rounded-xl shadow-sm border ${color} flex flex-col items-center justify-center transition-transform active:scale-95 bg-white`}>
    <span className="text-lg sm:text-2xl font-black leading-tight">{value}</span>
    <span className="text-[8px] sm:text-[10px] uppercase tracking-tighter font-black opacity-60 text-center truncate w-full">{label}</span>
  </div>
);

export default Dashboard;
