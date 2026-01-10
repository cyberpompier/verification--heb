
import React from 'react';
import { Vehicle, VehicleStatus } from '../types.ts';

interface VehicleCardProps {
  vehicle: Vehicle;
  onSelect: (v: Vehicle) => void;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle, onSelect }) => {
  const getStatusColor = (status: VehicleStatus) => {
    switch (status) {
      case VehicleStatus.AVAILABLE: return 'bg-green-500';
      case VehicleStatus.OUT_ON_CALL: return 'bg-red-500';
      case VehicleStatus.MAINTENANCE: return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div 
      onClick={() => onSelect(vehicle)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-xl transition-all duration-300 relative overflow-hidden group flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative h-40 w-full overflow-hidden">
        <img 
          src={vehicle.imageUrl} 
          alt={vehicle.callSign}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <h3 className="text-xl font-black text-white tracking-tight">
            {vehicle.callSign}
          </h3>
          <p className="text-xs text-white/80 font-medium uppercase tracking-wider">{vehicle.type}</p>
        </div>
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-black text-white uppercase shadow-lg ${getStatusColor(vehicle.status)}`}>
          {vehicle.status}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Secteur</span>
            <span className="font-bold text-gray-700 truncate block">{vehicle.location}</span>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Kilométrage</span>
            <span className="font-bold text-gray-700 block">{vehicle.mileage.toLocaleString()} km</span>
          </div>
        </div>
        
        <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-[10px] font-bold text-gray-400">Dernière révision : {vehicle.lastService}</span>
          <div className="flex -space-x-1">
             <div className="w-5 h-5 rounded-full bg-red-100 border-2 border-white flex items-center justify-center">
                <span className="text-[8px] font-bold text-red-600">{vehicle.equipment.length}</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;