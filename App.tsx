
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, VehicleStatus, Equipment, HistoryEntry, UserProfile } from './types.ts';
import { INITIAL_VEHICLES } from './constants.ts';
import Dashboard from './components/Dashboard.tsx';
import VehicleCard from './components/VehicleCard.tsx';
import VehicleDetails from './components/VehicleDetails.tsx';
import VehicleForm from './components/VehicleForm.tsx';
import ProfileEditor from './components/ProfileEditor.tsx';
import { analyzeFleetStatus } from './services/geminiService.ts';

type View = 'fleet' | 'alerts' | 'admin';

const App: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [activeView, setActiveView] = useState<View>('fleet');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: 'u1',
    firstName: 'John',
    lastName: 'Miller',
    grade: 'Lieutenant',
    assignment: 'Caserne Centre',
    email: 'j.miller@pompiers.gouv.fr',
    avatarUrl: 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?auto=format&fit=crop&q=80&w=200'
  });

  const currentUserDisplayName = `${userProfile.grade} ${userProfile.lastName}`;

  // New state for modal context
  const [initialDetailsTab, setInitialDetailsTab] = useState<'info' | 'inventory' | 'history'>('info');
  const [highlightedEquipmentId, setHighlightedEquipmentId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedVehicle || isAddingVehicle || isEditingProfile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedVehicle, isAddingVehicle, isEditingProfile]);

  const filteredVehicles = vehicles.filter(v => 
    v.callSign.toLowerCase().includes(searchTerm.toLowerCase()) || 
    v.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get all anomalies across the fleet for the alerts view
  const fleetAnomalies = useMemo(() => {
    const alerts: { vehicle: Vehicle; equipment: Equipment }[] = [];
    vehicles.forEach(v => {
      v.equipment.forEach(e => {
        if (e.anomaly || (e.anomalyTags && e.anomalyTags.length > 0)) {
          alerts.push({ vehicle: v, equipment: e });
        }
      });
    });
    return alerts;
  }, [vehicles]);

  const getHistoryMeta = () => {
    const now = new Date();
    return {
      date: now.toISOString().split('T')[0],
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      performedBy: currentUserDisplayName
    };
  };

  const handleAddVehicle = (newVehicleData: Omit<Vehicle, 'id' | 'equipment' | 'history'>) => {
    const meta = getHistoryMeta();
    const newVehicle: Vehicle = {
      ...newVehicleData,
      id: Math.random().toString(36).substr(2, 9),
      equipment: [],
      history: [{
        id: Math.random().toString(36).substr(2, 9),
        ...meta,
        type: 'status',
        status: 'success',
        description: "Mise en service initiale de l'engin."
      }]
    };
    setVehicles(prev => [newVehicle, ...prev]);
    setIsAddingVehicle(false);
    setActiveView('fleet');
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

  const openVehicleDetails = (vehicle: Vehicle, tab: 'info' | 'inventory' | 'history' = 'info', eqId: string | null = null) => {
    setInitialDetailsTab(tab);
    setHighlightedEquipmentId(eqId);
    setSelectedVehicle(vehicle);
  };

  return (
    <div className={`min-h-screen bg-slate-100 ${selectedVehicle || isAddingVehicle || isEditingProfile ? 'h-screen' : 'pb-32'}`}>
      <nav className="fire-gradient text-white py-4 px-5 sticky top-0 z-[40] shadow-xl rounded-b-3xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center space-x-3 text-left active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shadow-lg bg-white/10">
              <img src={userProfile.avatarUrl} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">FireTrack Pro</h1>
              <p className="text-[9px] opacity-70 font-black uppercase tracking-widest mt-1">{currentUserDisplayName}</p>
            </div>
          </button>
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
        {activeView === 'fleet' && (
          <div className="animate-fade-in">
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
                <VehicleCard key={vehicle.id} vehicle={vehicle} onSelect={(v) => openVehicleDetails(v)} />
              ))}
            </div>
          </div>
        )}

        {activeView === 'alerts' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center justify-between px-2">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900">Alertes Matériel</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Anomalies signalées sur la flotte</p>
              </div>
              <div className="px-4 py-2 bg-orange-100 rounded-2xl">
                <span className="text-lg font-black text-orange-600 leading-none">{fleetAnomalies.length}</span>
              </div>
            </div>

            {fleetAnomalies.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                  <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2" /></svg>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aucune alerte critique</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {fleetAnomalies.map(({ vehicle, equipment }) => (
                  <button 
                    key={equipment.id} 
                    onClick={() => openVehicleDetails(vehicle, 'inventory', equipment.id)}
                    className="bg-white p-5 rounded-[32px] border-2 border-orange-200 shadow-xl shadow-orange-600/5 text-left active:scale-[0.98] transition-all hover:border-orange-400"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {equipment.thumbnailUrl ? 
                          <img src={equipment.thumbnailUrl} className="w-full h-full object-cover" /> : 
                          <svg className="w-8 h-8 text-orange-200" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" /></svg>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{equipment.name}</h3>
                          <span className="text-[9px] font-black text-white bg-slate-900 px-2.5 py-1 rounded-xl uppercase leading-none">{vehicle.callSign}</span>
                        </div>
                        <div className="mt-1 flex items-center space-x-2">
                          <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded border border-orange-100">⚠️ {equipment.anomalyTags?.join(', ') || 'Signalement'}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase truncate">Empl : {equipment.location}</span>
                        </div>
                        <p className="mt-2 text-[11px] font-medium text-slate-600 line-clamp-2 leading-tight">
                          {equipment.anomaly || 'Aucune description détaillée.'}
                        </p>
                        {equipment.reportedBy && (
                          <div className="mt-3 flex items-center space-x-2 border-t border-slate-50 pt-2">
                             <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center">
                                <svg className="w-2.5 h-2.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/></svg>
                             </div>
                             <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Signalé par : {equipment.reportedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'admin' && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-8 rounded-[40px] border-2 border-slate-200 shadow-xl text-center">
              <div className="w-24 h-24 bg-red-100 rounded-[32px] flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" /></svg>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Gestion du Parc</h2>
              <p className="text-sm text-slate-500 font-medium mb-8">Administrez les véhicules de secours et les accès personnels.</p>
              
              <button 
                onClick={() => setIsAddingVehicle(true)}
                className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center space-x-3 shadow-2xl active:scale-95 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="4" strokeLinecap="round"/></svg>
                <span>Ajouter un nouvel engin</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <AdminActionCard 
                label="Personnels" 
                onClick={() => setIsEditingProfile(true)}
                icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>} 
              />
              <AdminActionCard 
                label="Configuration" 
                icon={<svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" /></svg>} 
              />
            </div>
          </div>
        )}
      </main>

      {selectedVehicle && (
        <VehicleDetails 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
          currentUser={currentUserDisplayName}
          onUpdateStatus={handleUpdateStatus}
          onUpdateVehicleImage={handleUpdateVehicleImage}
          onAddEquipment={handleAddEquipment}
          onUpdateEquipment={handleUpdateEquipment}
          onAddHistoryEntry={handleAddHistoryEntry}
          initialTab={initialDetailsTab}
          highlightEquipmentId={highlightedEquipmentId}
        />
      )}

      {isAddingVehicle && (
        <VehicleForm 
          onSave={handleAddVehicle}
          onCancel={() => setIsAddingVehicle(false)}
        />
      )}

      {isEditingProfile && (
        <ProfileEditor 
          profile={userProfile}
          onSave={(updated) => { setUserProfile(updated); setIsEditingProfile(false); }}
          onCancel={() => setIsEditingProfile(false)}
        />
      )}

      {!selectedVehicle && !isAddingVehicle && !isEditingProfile && (
        <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl border border-white/10 flex items-center p-2 rounded-[32px] z-[30] shadow-2xl w-[90%] max-w-sm">
          <button 
            onClick={() => setActiveView('fleet')}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${activeView === 'fleet' ? 'text-red-500' : 'text-white/40'}`}
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
            <span className="text-[8px] font-black uppercase mt-1">Parc</span>
          </button>
          <button 
            onClick={() => setActiveView('alerts')}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${activeView === 'alerts' ? 'text-red-500' : 'text-white/40'}`}
          >
            <div className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" strokeWidth="2" /></svg>
              {fleetAnomalies.length > 0 && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-slate-900" />
              )}
            </div>
            <span className="text-[8px] font-black uppercase mt-1">Alertes</span>
          </button>
          <button 
            onClick={() => setActiveView('admin')}
            className={`flex-1 flex flex-col items-center py-3 transition-colors ${activeView === 'admin' ? 'text-red-500' : 'text-white/40'}`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" /></svg>
            <span className="text-[8px] font-black uppercase mt-1">Admin</span>
          </button>
        </nav>
      )}
    </div>
  );
};

const AdminActionCard: React.FC<{ label: string; icon: React.ReactNode; onClick?: () => void }> = ({ label, icon, onClick }) => (
  <button 
    onClick={onClick}
    className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-sm flex flex-col items-center justify-center hover:border-red-100 transition-all active:scale-95"
  >
    <div className="text-slate-400 mb-2">{icon}</div>
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{label}</span>
  </button>
);

export default App;
