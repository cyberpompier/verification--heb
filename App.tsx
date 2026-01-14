
import React, { useState, useEffect, useMemo } from 'react';
import { Vehicle, VehicleStatus, Equipment, HistoryEntry, UserProfile, UserRole } from './types.ts';
import Dashboard from './components/Dashboard.tsx';
import VehicleCard from './components/VehicleCard.tsx';
import VehicleDetails from './components/VehicleDetails.tsx';
import VehicleForm from './components/VehicleForm.tsx';
import ProfileEditor from './components/ProfileEditor.tsx';
import Auth from './components/Auth.tsx';
import { analyzeFleetStatus } from './services/geminiService.ts';
import { supabase, TABLES } from './lib/supabase.ts';

type View = 'fleet' | 'alerts' | 'admin';

// --- MAPPING FUNCTIONS ---

const mapProfileFromDB = (data: any): UserProfile => ({
  id: data.id,
  firstName: data.first_name || '',
  lastName: data.last_name || '',
  grade: data.grade || 'Sapeur',
  assignment: data.assignment || 'Non affecté',
  email: data.email || '',
  avatarUrl: data.avatar_url || 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=200',
  role: (data.role as UserRole) || UserRole.OPERATOR
});

const mapProfileToDB = (profile: UserProfile) => ({
  id: profile.id,
  first_name: profile.firstName,
  last_name: profile.lastName,
  grade: profile.grade,
  assignment: profile.assignment,
  email: profile.email,
  avatar_url: profile.avatarUrl,
  role: profile.role
});

const mapEquipmentFromDB = (data: any): Equipment => ({
  id: data.id,
  name: data.name,
  category: data.category,
  location: data.location,
  quantity: data.quantity,
  lastChecked: data.last_checked,
  condition: data.condition,
  notes: data.notes,
  anomaly: data.anomaly,
  anomalyTags: data.anomaly_tags || [],
  reportedBy: data.reported_by,
  thumbnailUrl: data.thumbnail_url,
  manualUrl: data.manual_url,
  videoUrl: data.video_url,
  documents: data.documents || []
});

const mapEquipmentToDB = (eq: Partial<Equipment>, vehicleId?: string) => ({
  ...(vehicleId && { vehicle_id: vehicleId }),
  name: eq.name,
  category: eq.category,
  location: eq.location,
  quantity: eq.quantity,
  last_checked: eq.lastChecked,
  condition: eq.condition,
  notes: eq.notes,
  anomaly: eq.anomaly,
  anomaly_tags: eq.anomalyTags,
  reported_by: eq.reportedBy,
  thumbnail_url: eq.thumbnailUrl,
  manual_url: eq.manualUrl,
  video_url: eq.videoUrl,
  documents: eq.documents
});

const mapHistoryFromDB = (data: any): HistoryEntry => ({
  id: data.id,
  date: data.date,
  timestamp: data.timestamp,
  type: data.type,
  status: data.status,
  description: data.description,
  performedBy: data.performed_by,
  equipmentId: data.equipment_id
});

const mapVehicleFromDB = (data: any): Vehicle => ({
  id: data.id,
  callSign: data.call_sign,
  type: data.type,
  status: data.status,
  mileage: data.mileage,
  location: data.location,
  lastService: data.last_service,
  crewCapacity: data.crew_capacity,
  imageUrl: data.image_url,
  equipment: (data.equipment || []).map(mapEquipmentFromDB),
  history: (data.history || []).map(mapHistoryFromDB)
});

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isFirstConnection, setIsFirstConnection] = useState(false);
  const [activeView, setActiveView] = useState<View>('fleet');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const isAdmin = userProfile?.role === UserRole.ADMIN;
  const isReader = userProfile?.role === UserRole.READER;
  const canPerformChecks = userProfile?.role === UserRole.ADMIN || userProfile?.role === UserRole.OPERATOR;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setUserProfile(null);
        setVehicles([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur profil:', error);
    } else if (data) {
      const profile = mapProfileFromDB(data);
      setUserProfile(profile);
      if (profile.lastName === 'Pompier' && profile.firstName === 'Utilisateur') {
        setIsEditingProfile(true);
        setIsFirstConnection(true);
      }
    } else {
      const defaultProfile: UserProfile = {
        id: userId,
        firstName: 'Utilisateur',
        lastName: 'Pompier',
        grade: 'Sapeur',
        assignment: 'Non affecté',
        email: session?.user?.email || '',
        avatarUrl: 'https://images.unsplash.com/photo-1600486913747-55e5470d6f40?w=200',
        role: UserRole.OPERATOR
      };
      setUserProfile(defaultProfile);
      await supabase.from(TABLES.PROFILES).upsert(mapProfileToDB(defaultProfile));
      setIsEditingProfile(true);
      setIsFirstConnection(true);
    }
    fetchVehicles();
  };

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.VEHICLES)
        .select(`
          *,
          equipment: ${TABLES.EQUIPMENT} (*),
          history: ${TABLES.HISTORY} (*)
        `)
        .order('call_sign', { ascending: true });

      if (error) throw error;
      const mappedVehicles = (data || []).map(mapVehicleFromDB);
      setVehicles(mappedVehicles);
      
      // Mettre à jour le véhicule sélectionné s'il est ouvert
      if (selectedVehicle) {
        const updated = mappedVehicles.find(v => v.id === selectedVehicle.id);
        if (updated) setSelectedVehicle(updated);
      }
    } catch (err) {
      console.error('Erreur chargement engins:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    try {
      const dbData = mapProfileToDB(updatedProfile);
      const { error } = await supabase
        .from(TABLES.PROFILES)
        .update(dbData)
        .eq('id', updatedProfile.id);
      
      if (error) throw error;
      setUserProfile(updatedProfile);
      setIsEditingProfile(false);
      setIsFirstConnection(false);
    } catch (err) {
      console.error('Erreur sauvegarde profil:', err);
      alert('Erreur lors de la sauvegarde du profil.');
    }
  };

  const handleSaveVehicle = async (vehicleData: any) => {
    if (!isAdmin) return;
    try {
      const dbVehicleData = {
        call_sign: vehicleData.callSign,
        type: vehicleData.type,
        status: vehicleData.status,
        mileage: vehicleData.mileage,
        location: vehicleData.location,
        last_service: vehicleData.lastService,
        crew_capacity: vehicleData.crewCapacity,
        image_url: vehicleData.imageUrl
      };

      const { error } = await supabase
        .from(TABLES.VEHICLES)
        .insert([dbVehicleData]);
      
      if (error) throw error;
      fetchVehicles();
      setIsAddingVehicle(false);
    } catch (err) {
      console.error('Erreur ajout véhicule:', err);
    }
  };

  const handleAddEquipment = async (vehicleId: string, equipment: Equipment) => {
    if (!isAdmin) return;
    try {
      const dbEq = mapEquipmentToDB(equipment, vehicleId);
      const { error } = await supabase.from(TABLES.EQUIPMENT).insert([dbEq]);
      if (error) throw error;
      fetchVehicles();
    } catch (err) {
      console.error('Erreur ajout matériel:', err);
    }
  };

  const handleRemoveEquipment = async (vehicleId: string, equipmentId: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from(TABLES.EQUIPMENT).delete().eq('id', equipmentId);
      if (error) throw error;
      fetchVehicles();
    } catch (err) {
      console.error('Erreur suppression matériel:', err);
    }
  };

  const handleUpdateEquipment = async (vehicleId: string, equipmentId: string, updates: Partial<Equipment>) => {
    if (!canPerformChecks) return;
    try {
      const dbUpdates = mapEquipmentToDB(updates);
      const { error } = await supabase.from(TABLES.EQUIPMENT).update(dbUpdates).eq('id', equipmentId);
      if (error) throw error;
      fetchVehicles();
    } catch (err) {
      console.error('Erreur mise à jour matériel:', err);
    }
  };

  const handleAddHistoryEntry = async (vehicleId: string, entry: Omit<HistoryEntry, 'id' | 'performedBy' | 'timestamp'>) => {
    if (!canPerformChecks) return;
    try {
      const meta = getHistoryMeta();
      const dbEntry = {
        vehicle_id: vehicleId,
        date: entry.date,
        timestamp: meta.timestamp,
        type: entry.type,
        status: entry.status || 'info',
        description: entry.description,
        performed_by: meta.performed_by,
        equipment_id: entry.equipmentId
      };
      const { error } = await supabase.from(TABLES.HISTORY).insert([dbEntry]);
      if (error) throw error;
      fetchVehicles();
    } catch (err) {
      console.error('Erreur ajout historique:', err);
    }
  };

  const currentUserDisplayName = userProfile ? `${userProfile.grade} ${userProfile.lastName}` : 'Chargement...';

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

  const fleetAnomalies = useMemo(() => {
    const alerts: { vehicle: Vehicle; equipment: Equipment }[] = [];
    vehicles.forEach(v => {
      v.equipment?.forEach(e => {
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
      performed_by: currentUserDisplayName
    };
  };

  const handleUpdateStatus = async (id: string, newStatus: VehicleStatus) => {
    if (!canPerformChecks) return;
    const meta = getHistoryMeta();
    let entryStatus: HistoryEntry['status'] = 'info';
    if (newStatus === VehicleStatus.AVAILABLE) entryStatus = 'success';
    if (newStatus === VehicleStatus.MAINTENANCE) entryStatus = 'warning';
    if (newStatus === VehicleStatus.OUT_OF_SERVICE) entryStatus = 'danger';

    const historyEntry = {
      vehicle_id: id,
      date: meta.date,
      timestamp: meta.timestamp,
      type: 'status',
      status: entryStatus,
      description: `État mis à jour vers : ${newStatus}.`,
      performed_by: meta.performed_by
    };

    await supabase.from(TABLES.VEHICLES).update({ status: newStatus }).eq('id', id);
    await supabase.from(TABLES.HISTORY).insert([historyEntry]);
    fetchVehicles();
  };

  const triggerFleetAnalysis = async () => {
    if (!isAdmin) return;
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initialisation opérationnelle...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-slate-100 ${selectedVehicle || isAddingVehicle || isEditingProfile ? 'h-screen' : 'pb-32'}`}>
      <nav className="fire-gradient text-white py-4 px-5 sticky top-0 z-[40] shadow-xl rounded-b-3xl">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center space-x-3 text-left active:scale-95 transition-transform"
          >
            <div className="w-10 h-10 rounded-full border-2 border-white/20 overflow-hidden shadow-lg bg-white/10">
              <img src={userProfile?.avatarUrl} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tighter uppercase leading-none">FireTrack Pro</h1>
              <p className="text-[9px] opacity-70 font-black uppercase tracking-widest mt-1">{currentUserDisplayName} • {userProfile?.role}</p>
            </div>
          </button>
          <div className="flex items-center space-x-2">
            {isAdmin && (
              <button 
                onClick={triggerFleetAnalysis}
                disabled={isAnalyzing}
                className="bg-white/20 backdrop-blur-md text-white border border-white/30 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase flex items-center space-x-2 shadow-lg active:scale-95 disabled:opacity-50 transition-all"
              >
                {isAnalyzing ? <div className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full" /> : <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3.005 3.005 0 013.75-2.906z" /></svg>}
                <span>Audit IA</span>
              </button>
            )}
            <button onClick={handleLogout} className="p-2 bg-black/20 rounded-xl text-white active:scale-90 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
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
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'admin' && isAdmin && (
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
          </div>
        )}
      </main>

      {selectedVehicle && (
        <VehicleDetails 
          vehicle={selectedVehicle} 
          onClose={() => setSelectedVehicle(null)} 
          currentUser={currentUserDisplayName}
          userRole={userProfile?.role || UserRole.READER}
          onUpdateStatus={handleUpdateStatus}
          onUpdateVehicleImage={() => {}} 
          onAddEquipment={handleAddEquipment} 
          onRemoveEquipment={handleRemoveEquipment}
          onUpdateEquipment={handleUpdateEquipment} 
          onAddHistoryEntry={handleAddHistoryEntry} 
          initialTab={initialDetailsTab}
          highlightEquipmentId={highlightedEquipmentId}
        />
      )}

      {isAddingVehicle && isAdmin && (
        <VehicleForm onSave={handleSaveVehicle} onCancel={() => setIsAddingVehicle(false)} />
      )}

      {isEditingProfile && userProfile && (
        <ProfileEditor 
          profile={userProfile} 
          onSave={handleSaveProfile} 
          onCancel={() => !isFirstConnection && setIsEditingProfile(false)}
          isFirstSetup={isFirstConnection}
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
          {isAdmin && (
            <button 
              onClick={() => setActiveView('admin')}
              className={`flex-1 flex flex-col items-center py-3 transition-colors ${activeView === 'admin' ? 'text-red-500' : 'text-white/40'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeWidth="2" /></svg>
              <span className="text-[8px] font-black uppercase mt-1">Admin</span>
            </button>
          )}
        </nav>
      )}
    </div>
  );
};

export default App;
