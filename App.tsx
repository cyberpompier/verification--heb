
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
    let entryStatus: HistoryEntry['status'] = 'info';
    if (newStatus === VehicleStatus.AVAILABLE) entryStatus = 'success';
    if (newStatus === VehicleStatus.MAINTENANCE) entryStatus = 'warning';
    if (newStatus === VehicleStatus.OUT_OF_SERVICE) entryStatus = 'danger';

    const historyEntry: HistoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      ...meta,
      type: 'status',
      status: entryStatus,
      description: `État mis à jour vers : ${newStatus}.`
    };

    setVehicles(prev => prev.map(v => 
      v.id === id ? { ...v, status: newStatus, history: [historyEntry, ...v.history] } : v
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
      status: 'info',
      description: `Nouvel équipement ajouté : ${equipment.name} (${equipment.quantity} unités).`
    };

    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { ...v, equipment: [...v.equipment, equipment], history: [historyEntry, ...v.history] } : v
    ));
    if (selectedVehicle?.id === vehicleId) {
      setSelectedVehicle(prev => prev ? { ...prev, equipment: [...prev.equipment, equipment], history: [historyEntry, ...prev.history] } : null);
    }
  };

  const handleUpdateEquipment = (vehicleId: string, equipmentId: string, updates: Partial<Equipment>) => {
    const currentVehicle = vehicles.find(v => v.id === vehicleId);
    const eqItem = currentVehicle?.equipment.find(e => e.id === equipmentId);
    const eqName = eqItem?.name || 'Équipement';
    const meta = getHistoryMeta();
    let historyEntry: HistoryEntry | null = null;
    
    if (updates.hasOwnProperty('anomaly') || (updates.hasOwnProperty('anomalyTags'))) {
      if (updates.anomaly === undefined && (!updates.anomalyTags || updates.anomalyTags.length === 0)) {
        historyEntry = {
          id: Math.random().toString(36).substr(2, 9), ...meta, type: 'equipment', status: 'success',
          description: `Anomalie résolue pour ${eqName}. Remise en service conforme.`
        };
      } else if (updates.anomaly || (updates.anomalyTags && updates.anomalyTags.length > 0)) {
        const tagsStr = updates.anomalyTags?.join(', ') || '';
        historyEntry = {
          id: Math.random().toString(36).substr(2, 9), ...meta, type: 'equipment', status: 'danger',
          description: `Anomalie signalée pour ${eqName}${tagsStr ? ' [' + tagsStr + ']' : ''} : ${updates.anomaly || 'Signalement sans texte'}`
        };
      }
    } else if (updates.lastChecked && Object.keys(updates).length === 1) {
      historyEntry = {
        id: Math.random().toString(36).substr(2, 9), ...meta, type: 'equipment', status: 'info',
        description: `Matériel vérifié : ${eqName}.`
      };
    } else if (updates.name || updates.quantity || updates.location) {
        historyEntry = {
            id: Math.random().toString(36).substr(2, 9), ...meta, type: 'note', status: 'info',
            description: `Mise à jour des informations de l'équipement : ${eqName}.`
        };
    }

    setVehicles(prev => prev.map(v => 
      v.id === vehicleId ? { 
            ...v, 
            equipment: v.equipment.map(e => e.id === equipmentId ? { ...e, ...updates } : e),
            history: historyEntry ? [historyEntry, ...v.history] : v.history
          } : v
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
    const fullEntry: HistoryEntry = { ...entry, ...meta, id: Math.random().toString(36).substr(2, 9) };
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, history: [fullEntry, ...v.history] } : v));
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
    <div className={`min-h-screen bg-slate-100 ${selectedVehicle ? 'h-screen' : 'pb-24'}`}>
      <nav className="fire-gradient text-white py-4 px-5 sticky top-0 z-[40] shadow-xl rounded-b-3xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">FireTrack Pro</h1>
            <p className="text-[9px] opacity-70 font-black uppercase tracking-widest mt-1">{currentUser}</p>
          </div>
          <button 
            onClick={triggerFleetAnalysis}
            disabled={isAnalyzing}
            className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2 shadow-lg active:scale-95 disabled:opacity-50 transition-all"
          >
            {isAnalyzing ? <div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full" /> : <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" /></svg>}
            <span>Audit IA</span>
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-4 px-4 relative z-10 pb-10">
        <div className="mb-6">
            <Dashboard vehicles={vehicles} />
        </div>

        {aiAnalysis && (
          <div className="mb-6 bg-slate-900 text-white rounded-3xl p-6 animate-scale-in shadow-2xl border-l-8 border-red-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <h3 className="text-[10px] font-black uppercase tracking-widest">Rapport de Situation</h3>
              </div>
              <button onClick={() => setAiAnalysis(null)} className="text-[10px] font-black uppercase opacity-40">Fermer</button>
            </div>
            <div className="text-sm leading-relaxed font-medium space-y-2 whitespace-pre-line text-slate-100">
              {aiAnalysis}
            </div>
          </div>
        )}

        <div className="mb-6">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Indicatif ou type d'engin..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white rounded-2xl py-4 pl-12 pr-4 border-2 border-slate-200 shadow-xl focus:ring-4 focus:ring-red-500/10 focus:border-red-600 transition-all text-sm font-bold placeholder:text-slate-300 text-slate-900"
            />
            <svg className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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

      {!selectedVehicle && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-white/10 flex items-center p-2 rounded-[32px] z-[30] shadow-2xl w-[90%] max-w-sm">
          <button className="flex-1 flex flex-col items-center py-3 text-red-500 transition-colors">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[8px] font-black uppercase mt-1">Parc</span>
          </button>
          <button className="flex-1 flex flex-col items-center py-3 text-white/40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2" /></svg>
            <span className="text-[8px] font-black uppercase mt-1">Alertes</span>
          </button>
          <button className="flex-1 flex flex-col items-center py-3 text-white/40">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" /></svg>
            <span className="text-[8px] font-black uppercase mt-1">Admin</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
