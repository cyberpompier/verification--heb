
import React, { useState, useEffect } from 'react';
import { Vehicle, VehicleStatus, Equipment, HistoryEntry } from './types.ts';
import { INITIAL_VEHICLES } from './constants.ts';
import Dashboard from './components/Dashboard.tsx';
import VehicleCard from './components/VehicleCard.tsx';
import VehicleDetails from './components/VehicleDetails.tsx';
import { analyzeFleetStatus } from './services/geminiService.ts';

const App: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState('Lieutenant Miller');

  // Empêcher le scroll du body quand la modale est ouverte
  useEffect(() => {
    if (selectedVehicle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedVehicle]);

  const filteredVehicles = vehicles.filter(v => 
    v.callSign.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getHistoryMeta = () => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      performedBy: currentUser
    };
  };

  const handleUpdateStatus = (id: string, newStatus: VehicleStatus) => {
    const meta = getHistoryMeta();
    const historyEntry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      ...meta,
      type: 'status',
      description: `État mis à jour vers : ${newStatus}.`
    };

    setVehicles(prev => prev.map(v => 
      v.id === id 
        ? { ...v, status: newStatus, history: [historyEntry, ...v.history] } 
        : v
    ));
    if (selectedVehicle?.id === id) {
      setSelectedVehicle(prev => prev ? { ...prev, status: newStatus, history: [historyEntry, ...prev.history] } : null);
    }
  };

  const handleUpdateVehicleImage = (id: string, newImageUrl: string) => {
    setVehicles(prev => prev.map(v => v.id === id ? { ...v, imageUrl: newImageUrl } : v));
    if (selectedVehicle?.id === id) {
      setSelectedVehicle(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
    }
  };

  const handleAddEquipment = (vehicleId: string, equipment: Equipment) => {
    const meta = getHistoryMeta();
    const historyEntry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      ...meta,
      type: 'equipment',
      description: `Nouvel équipement ajouté : ${equipment.name} (${equipment.quantity} unités).`
    };

    setVehicles(prev => prev.map(v => 
      v.id === vehicleId 
        ? { ...v, equipment: [...v.equipment, equipment], history: [historyEntry, ...v.history] } 
        : v
    ));
    if (selectedVehicle?.id === vehicleId) {
      setSelectedVehicle(prev => prev ? { ...prev, equipment: [...prev.equipment, equipment], history: [historyEntry, ...prev.history] } : null);
    }
  };

  const handleUpdateEquipment = (vehicleId: string, equipmentId: string, updates: Partial<Equipment>) => {
    const eqName = selectedVehicle?.equipment.find(e => e.id === equipmentId)?.name || 'Équipement';
    const meta = getHistoryMeta();
    
    let historyEntry: HistoryEntry | null = null;
    if (updates.lastChecked && Object.keys(updates).length === 1) {
      historyEntry = {
        id: Math.random().toString(36).substr(2, 9),
        ...meta,
        type: 'equipment',
        description: `Condition de ${eqName} vérifiée.`
      };
    } else if (updates.anomaly) {
       historyEntry = {
        id: Math.random().toString(36).substr(2, 9),
        ...meta,
        type: 'equipment',
        description: `Anomalie signalée pour ${eqName} : ${updates.anomaly}`
      };
    }

    setVehicles(prev => prev.map(v => 
      v.id === vehicleId 
        ? { 
            ...v, 
            equipment: v.equipment.map(e => e.id === equipmentId ? { ...e, ...updates } : e),
            history: historyEntry ? [historyEntry, ...v.history] : v.history
          } 
        : v
    ));
    if (selectedVehicle?.id === vehicleId) {
      setSelectedVehicle(prev => prev ? { 
        ...prev, 
        equipment: prev.equipment.map(e => e.id === equipmentId ? { ...e, ...updates } : e),
        history: historyEntry ? [historyEntry, ...prev.history] : prev.history
      } : null);
    }
  };

  const handleAddHistoryEntry = (vehicleId: string, entry: Omit<HistoryEntry, 'id' | 'performedBy' | 'timestamp'>) => {
    const meta = getHistoryMeta();
    const fullEntry: HistoryEntry = {
      ...entry,
      ...meta,
      id: Math.random().toString(36).substr(2, 9)
    };
    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { ...v, history: [fullEntry, ...v.history] } : v
    ));
    if (selectedVehicle?.id === vehicleId) {
      setSelectedVehicle(prev => prev ? { ...prev, history: [fullEntry, ...prev.history] } : null);
    }
  };

  const triggerFleetAnalysis = async () => {
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const result = await analyzeFleetStatus(vehicles);
      setAiAnalysis(result);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 ${selectedVehicle ? 'h-screen' : 'pb-20 md:pb-8'}`}>
      {/* Header compact et fixe */}
      <nav className="fire-gradient text-white pt-3 pb-3 px-4 sticky top-0 z-[40] shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-black tracking-tighter uppercase leading-none">FireTrack Pro</h1>
            <p className="text-[8px] opacity-70 font-bold uppercase tracking-widest mt-0.5">{currentUser}</p>
          </div>
          <div className="flex items-center space-x-2">
             <select 
               className="bg-white/10 text-white text-[9px] font-bold py-1 px-1.5 rounded-lg outline-none border border-white/20"
               value={currentUser}
               onChange={(e) => setCurrentUser(e.target.value)}
             >
                <option value="Lieutenant Miller" className="text-gray-900">LT Miller</option>
                <option value="Capitaine Rogers" className="text-gray-900">Cap. Rogers</option>
                <option value="Commandant Watson" className="text-gray-900">Cmd. Watson</option>
             </select>
             <button 
                onClick={triggerFleetAnalysis}
                disabled={isAnalyzing}
                className="bg-white text-red-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center space-x-1 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <div className="animate-spin h-3 w-3 border-2 border-red-200 border-t-red-600 rounded-full" />
                ) : (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" /></svg>
                )}
                <span>Audit</span>
              </button>
          </div>
        </div>
      </nav>

      {/* Zone de transition rouge (décorative) */}
      <div className="fire-gradient h-16 w-full relative -mt-1" />

      {/* Contenu principal décalé vers le haut */}
      <main className="max-w-4xl mx-auto -mt-12 px-3 sm:px-6 relative z-10 pb-20">
        <Dashboard vehicles={vehicles} />

        {aiAnalysis && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-4 animate-fade-in shadow-sm">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-[9px] font-black text-blue-800 uppercase tracking-widest">Conseiller IA</h3>
            </div>
            <div className="text-blue-900 text-[11px] sm:text-xs leading-relaxed font-medium">
              {aiAnalysis}
            </div>
            <button onClick={() => setAiAnalysis(null)} className="mt-2 text-[9px] font-black text-blue-700 uppercase hover:underline">Fermer l'audit</button>
          </div>
        )}

        <div className="mb-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Rechercher indicatif ou type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white rounded-xl py-2.5 pl-10 pr-4 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm text-sm"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {filteredVehicles.map(vehicle => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} onSelect={setSelectedVehicle} />
          ))}
        </div>
      </main>

      {selectedVehicle && (
        <VehicleDetails 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
          onUpdateStatus={handleUpdateStatus}
          onUpdateVehicleImage={handleUpdateVehicleImage}
          onAddEquipment={handleAddEquipment}
          onUpdateEquipment={handleUpdateEquipment}
          onAddHistoryEntry={handleAddHistoryEntry}
        />
      )}

      {/* Navigation basse masquée quand la modale est ouverte */}
      {!selectedVehicle && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 flex justify-around items-center p-2 md:hidden z-[30] shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
          <NavItem active label="Parc" icon={<svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>} />
          <NavItem label="Alertes" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>} />
          <NavItem label="Admin" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>} />
        </nav>
      )}
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <button className={`flex flex-col items-center py-1 flex-1 transition-colors ${active ? 'text-red-600' : 'text-gray-400'}`}>
    {icon}
    <span className="text-[8px] font-black uppercase tracking-widest mt-1">{label}</span>
  </button>
);

export default App;