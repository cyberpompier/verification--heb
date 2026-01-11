
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
      {/* Numerical Stats - Force 4 compact columns with improved legibility */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Flotte" value={stats.total} color="text-slate-900" />
        <StatCard label="Dispo" value={stats.available} color="text-green-600" />
        <StatCard label="Maint." value={stats.maintenance} color="text-orange-600" />
        <StatCard label="Inter." value={stats.outOnCall} color="text-red-600" />
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="p-3 sm:p-4 rounded-2xl shadow-md border border-slate-100 bg-white flex flex-col items-center justify-center transition-all active:scale-95 hover:border-slate-200">
    <span className={`text-xl sm:text-2xl font-black leading-none mb-1 ${color}`}>{value}</span>
    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-500 text-center">{label}</span>
  </div>
);

export default Dashboard;
