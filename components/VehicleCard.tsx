
import React from 'react';
import { Vehicle, VehicleStatus } from '../types.ts';

interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect: (v: Vehicle) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onSelect }) => {
  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case VehicleStatus.AVAILABLE: return 'bg-green-600';
      case VehicleStatus.OUT_ON_CALL: return 'bg-red-600';
      case VehicleStatus.MAINTENANCE: return 'bg-orange-600';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div 
      onClick={() => onSelect(vehicle)}
      className="bg-white rounded-[32px] shadow-[0_10px_30px_-5px_rgba(0,0,0,0.08)] border-2 border-slate-200 cursor-pointer hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.15)] hover:border-red-200 transition-all duration-300 relative overflow-hidden group flex flex-col h-full active:scale-95"
    >
      {/* Image Container */}
      <div className="relative h-44 w-full overflow-hidden">
        <img 
          src={vehicle.imageUrl} 
          alt={vehicle.callSign}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/10 to-transparent" />
        <div className="absolute bottom-4 left-5">
          <h3 className="text-2xl font-black text-white tracking-tight leading-none uppercase">
            {vehicle.callSign}
          </h3>
          <p className="text-[10px] text-white/70 font-black uppercase tracking-[0.2em] mt-1.5">{vehicle.type}</p>
        </div>
        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase shadow-2xl border border-white/20 ${getStatusColor(vehicle.status)}`}>
          {vehicle.status}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Secteur</span>
            <span className="font-black text-slate-800 truncate block uppercase">{vehicle.location}</span>
          </div>
          <div className="space-y-1 text-right">
            <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Kilométrage</span>
            <span className="font-black text-slate-800 block">{vehicle.mileage.toLocaleString()} km</span>
          </div>
        </div>
        
        <div className="mt-5 pt-4 border-t-2 border-slate-50 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">Révision : {vehicle.lastService}</span>
          <div className="flex items-center space-x-2">
             <div className="px-2.5 py-1 rounded-lg bg-slate-900 text-white flex items-center space-x-1.5 shadow-md">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4" strokeWidth="3"/></svg>
                <span className="text-[10px] font-black">{vehicle.equipment.length}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;
