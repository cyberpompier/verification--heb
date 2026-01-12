
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Vehicle, VehicleStatus, Equipment, HistoryEntry, EquipmentDocument } from '../types';

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  currentUser: string;
  onUpdateStatus: (id: string, status: VehicleStatus) => void;
  onUpdateVehicleImage: (id: string, newImageUrl: string) => void;
  onAddEquipment: (vehicleId: string, equipment: Equipment) => void;
  onUpdateEquipment: (vehicleId: string, equipmentId: string, updates: Partial<Equipment>) => void;
  onAddHistoryEntry: (vehicleId: string, entry: Omit<HistoryEntry, 'id' | 'performedBy' | 'timestamp'>) => void;
  initialTab?: 'info' | 'inventory' | 'history';
  highlightEquipmentId?: string | null;
}

const Highlight: React.FC<{ text: string; search: string }> = ({ text, search }) => {
  if (!search.trim()) return <>{text}</>;
  try {
    const parts = text.split(new RegExp(`(${search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) => 
          part.toLowerCase() === search.toLowerCase() 
            ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 border-b border-yellow-400 font-bold">{part}</mark> 
            : part
        )}
      </>
    );
  } catch (e) { return <>{text}</>; }
};

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ 
  vehicle, onClose, currentUser, onUpdateStatus, onUpdateVehicleImage,
  onAddEquipment, onUpdateEquipment, onAddHistoryEntry,
  initialTab = 'info', highlightEquipmentId = null
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'inventory' | 'history'>(initialTab);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [reportingAnomalyId, setReportingAnomalyId] = useState<string | null>(null);
  const [confirmClearAnomalyId, setConfirmClearAnomalyId] = useState<string | null>(null);
  const [tempAnomaly, setTempAnomaly] = useState("");
  const [tempAnomalyTags, setTempAnomalyTags] = useState<string[]>([]);
  const [tempMissingQuantity, setTempMissingQuantity] = useState(1);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [detailedEqId, setDetailedEqId] = useState<string | null>(null);
  const [editingEqIdForImage, setEditingEqIdForImage] = useState<string | null>(null);

  // Inspection Logic
  const startTimeRef = useRef(Date.now());
  const [showSummary, setShowSummary] = useState(false);
  const [summaryShown, setSummaryShown] = useState(false);
  const [inspectionDuration, setInspectionDuration] = useState("");

  const equipmentFileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const today = new Date().toISOString().split('T')[0];
  
  const [newEq, setNewEq] = useState<Omit<Equipment, 'id'>>({
    name: '', category: '', location: '', quantity: 1, condition: 'Bon',
    lastChecked: today, notes: '', thumbnailUrl: '', videoUrl: '', documents: []
  });

  const [editEqForm, setEditEqForm] = useState<Partial<Equipment>>({});
  const [newDoc, setNewDoc] = useState<{ name: string; url: string; type: EquipmentDocument['type'] }>({ name: '', url: '', type: 'link' });

  const [newLog, setNewLog] = useState<{
    type: HistoryEntry['type']; description: string; date: string; equipmentId?: string;
  }>({ type: 'note', description: '', date: today, equipmentId: '' });

  // Calculate Progress
  const totalItems = vehicle.equipment.length;
  const verifiedItems = vehicle.equipment.filter(e => e.lastChecked === today).length;
  const progressPercentage = totalItems === 0 ? 0 : Math.round((verifiedItems / totalItems) * 100);

  // Monitor progress for auto-popup
  useEffect(() => {
    if (progressPercentage === 100 && totalItems > 0 && !summaryShown) {
      const diff = Date.now() - startTimeRef.current;
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setInspectionDuration(`${minutes}m ${seconds}s`);
      setShowSummary(true);
      setSummaryShown(true);
    }
  }, [progressPercentage, totalItems, summaryShown]);

  // Auto-scroll to highlighted equipment when inventory tab is active
  useEffect(() => {
    if (activeTab === 'inventory' && highlightEquipmentId) {
      setTimeout(() => {
        const element = document.getElementById(`eq-${highlightEquipmentId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-red-500/50', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-red-500/50', 'ring-offset-2');
          }, 2000);
        }
      }, 300);
    }
  }, [activeTab, highlightEquipmentId]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set(vehicle.equipment.map(e => e.location));
    return Array.from(locs).filter(l => !!l).sort();
  }, [vehicle.equipment]);

  const filteredAndSortedEquipment = useMemo(() => {
    let items = [...vehicle.equipment];
    if (equipmentSearch.trim()) {
      const query = equipmentSearch.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    }
    if (selectedLocation) {
      items = items.filter(item => item.location === selectedLocation);
    }

    return items.sort((a, b) => {
      const aChecked = a.lastChecked === today;
      const bChecked = b.lastChecked === today;
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [vehicle.equipment, equipmentSearch, selectedLocation, today]);

  const anomaliesList = useMemo(() => {
    return vehicle.equipment.filter(e => e.anomaly || (e.anomalyTags && e.anomalyTags.length > 0));
  }, [vehicle.equipment]);

  const selectedDetailedEq = useMemo(() => 
    vehicle.equipment.find(e => e.id === detailedEqId),
    [vehicle.equipment, detailedEqId]
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEq.name || !newEq.category) return;
    onAddEquipment(vehicle.id, {
      ...newEq,
      id: Math.random().toString(36).substr(2, 9),
      documents: newEq.documents || []
    } as Equipment);
    setIsAdding(false);
    setNewEq({ name: '', category: '', location: '', quantity: 1, condition: 'Bon', lastChecked: today, notes: '', thumbnailUrl: '', videoUrl: '', documents: [] });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEqId || !editEqForm.name) return;
    onUpdateEquipment(vehicle.id, editingEqId, editEqForm);
    setEditingEqId(null);
    setEditEqForm({});
  };

  const startEditing = (item: Equipment) => {
    setEditingEqId(item.id);
    setEditEqForm(item);
    setIsAdding(false);
  };

  const addDocToForm = () => {
    if (!newDoc.name || !newDoc.url) return;
    const doc: EquipmentDocument = { ...newDoc, id: Math.random().toString(36).substr(2, 5) };
    if (editingEqId) {
      setEditEqForm(prev => ({ ...prev, documents: [...(prev.documents || []), doc] }));
    } else {
      setNewEq(prev => ({ ...prev, documents: [...(prev.documents || []), doc] }));
    }
    setNewDoc({ name: '', url: '', type: 'link' });
  };

  const removeDocFromForm = (id: string) => {
    if (editingEqId) {
      setEditEqForm(prev => ({ ...prev, documents: (prev.documents || []).filter(d => d.id !== id) }));
    } else {
      setNewEq(prev => ({ ...prev, documents: (prev.documents || []).filter(d => d.id !== id) }));
    }
  };

  const toggleAnomalyTag = (tag: string) => {
    setTempAnomalyTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSaveAnomaly = (eqId: string) => {
    let anomalyText = tempAnomaly;
    if (tempAnomalyTags.includes('Manquant')) {
      anomalyText = `[x${tempMissingQuantity} Manquant(s)] ${anomalyText}`.trim();
    }
    onUpdateEquipment(vehicle.id, eqId, { 
      anomaly: anomalyText || (tempAnomalyTags.length > 0 ? "Signalé" : undefined), 
      anomalyTags: tempAnomalyTags,
      reportedBy: currentUser,
      lastChecked: today,
      condition: 'À remplacer'
    });
    setReportingAnomalyId(null);
    setTempAnomaly("");
    setTempAnomalyTags([]);
    setTempMissingQuantity(1);
  };

  const handleEquipmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (editingEqIdForImage) {
            onUpdateEquipment(vehicle.id, editingEqIdForImage, { thumbnailUrl: base64 });
            setEditingEqIdForImage(null);
        } else if (editingEqId) {
            setEditEqForm(prev => ({ ...prev, thumbnailUrl: base64 }));
        } else {
            setNewEq(prev => ({ ...prev, thumbnailUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerImageUpload = (eqId: string | null = null) => {
    setEditingEqIdForImage(eqId);
    equipmentFileInputRef.current?.click();
  };

  const handleAddLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.description) return;
    onAddHistoryEntry(vehicle.id, newLog);
    setIsAddingLog(false);
    setNewLog({ type: 'note', description: '', date: today, equipmentId: '' });
  };

  const inputClasses = "w-full text-sm p-3 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold outline-none ring-red-500/20 focus:ring-2 focus:border-red-500 text-slate-900 placeholder-slate-400 transition-all";

  const getEntryColorClasses = (status?: string) => {
    switch (status) {
      case 'success': return 'border-green-300 bg-green-50/50 shadow-green-100';
      case 'danger': return 'border-red-300 bg-red-50/50 shadow-red-100';
      case 'warning': return 'border-orange-300 bg-orange-50/50 shadow-orange-100';
      case 'info': return 'border-blue-300 bg-blue-50/50 shadow-blue-100';
      default: return 'border-slate-200 bg-white shadow-slate-100';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-100 w-full max-w-xl h-[94vh] sm:h-auto sm:max-h-[88vh] sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
        
        {/* Header Photo */}
        <div className="relative h-28 sm:h-40 flex-shrink-0 group">
          <img src={vehicle.imageUrl} alt={vehicle.callSign} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
          <div className="absolute bottom-3 left-5 text-white">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none uppercase">{vehicle.callSign}</h2>
            <p className="opacity-70 text-[9px] sm:text-xs font-black uppercase tracking-[0.2em] mt-1">{vehicle.type}</p>
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-black/40 backdrop-blur-xl rounded-full text-white active:scale-90 transition-all border border-white/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-slate-200 flex-shrink-0 sticky top-0 z-10">
          <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Général" />
          <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} label={`Inventaire (${vehicle.equipment.length})`} />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Journal" />
        </div>

        {/* Main Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 bg-slate-100 pb-12">
          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in">
              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Disponibilité Actuelle</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(VehicleStatus).map(status => (
                    <button 
                      key={status} 
                      onClick={() => onUpdateStatus(vehicle.id, status)} 
                      className={`py-4 px-3 rounded-2xl text-[11px] font-black border-2 transition-all shadow-sm ${vehicle.status === status ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </section>
              <section className="grid grid-cols-2 gap-4">
                <InfoBox label="Kilométrage" value={`${vehicle.mileage.toLocaleString()} km`} />
                <InfoBox label="Secteur" value={vehicle.location} />
                <InfoBox label="Capacité" value={`${vehicle.crewCapacity} pers.`} />
                <InfoBox label="Révision" value={vehicle.lastService} />
              </section>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-5 animate-fade-in">
              {/* Progress Bar */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Progression de l'inspection</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xl font-black text-slate-900">{progressPercentage}%</span>
                    <span className="text-[10px] font-bold text-slate-400">({verifiedItems}/{totalItems})</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(220,38,38,0.4)]" 
                     style={{ width: `${progressPercentage}%` }} 
                   />
                </div>
              </div>

              {/* Search and Filters */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input type="text" placeholder="Rechercher..." value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} className="w-full text-xs py-3 pl-10 pr-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-red-600 transition-all font-bold shadow-sm text-slate-900" />
                    <svg className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
                  </div>
                  <button onClick={() => { setIsAdding(!isAdding); setEditingEqId(null); }} className={`p-3 rounded-2xl border-2 transition-all shadow-sm ${isAdding ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-red-600 hover:border-red-600'}`}>
                    <svg className={`w-5 h-5 transition-transform ${isAdding ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
                  </button>
                </div>

                {/* Location Tags Picker */}
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button 
                    onClick={() => setSelectedLocation(null)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 shadow-sm ${!selectedLocation ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                  >
                    Tous
                  </button>
                  {uniqueLocations.map(loc => (
                    <button 
                      key={loc}
                      onClick={() => setSelectedLocation(loc)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all border-2 shadow-sm ${selectedLocation === loc ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add/Edit Forms */}
              {(isAdding || editingEqId) && (
                <form onSubmit={editingEqId ? handleEditSubmit : handleAddSubmit} className="bg-white p-5 rounded-3xl border-2 border-slate-200 space-y-4 shadow-xl animate-slide-up">
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">{editingEqId ? 'Modifier matériel' : 'Nouveau matériel'}</h4>
                  
                  {/* Base Info */}
                  <div className="flex items-center space-x-4">
                    <button type="button" onClick={() => triggerImageUpload(editingEqId)} className="w-16 h-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center overflow-hidden active:bg-slate-100">
                      {(editingEqId ? editEqForm.thumbnailUrl : newEq.thumbnailUrl) ? 
                        <img src={editingEqId ? editEqForm.thumbnailUrl : newEq.thumbnailUrl} className="w-full h-full object-cover" /> : 
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
                      }
                    </button>
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="Nom de l'équipement" 
                        required 
                        className={inputClasses}
                        value={editingEqId ? (editEqForm.name || '') : newEq.name} 
                        onChange={e => editingEqId ? setEditEqForm({...editEqForm, name: e.target.value}) : setNewEq({...newEq, name: e.target.value})} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input 
                      type="text" 
                      placeholder="Catégorie" 
                      required 
                      className={inputClasses}
                      value={editingEqId ? (editEqForm.category || '') : newEq.category} 
                      onChange={e => editingEqId ? setEditEqForm({...editEqForm, category: e.target.value}) : setNewEq({...newEq, category: e.target.value})} 
                    />
                    
                    {/* Emplacement Selector & Creation */}
                    <div className="space-y-2">
                      <div className="relative group">
                        <input 
                          type="text" 
                          placeholder="Emplacement" 
                          required 
                          className={inputClasses}
                          value={editingEqId ? (editEqForm.location || '') : newEq.location} 
                          onChange={e => editingEqId ? setEditEqForm({...editEqForm, location: e.target.value}) : setNewEq({...newEq, location: e.target.value})} 
                        />
                        <svg className="w-4 h-4 text-slate-300 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                      
                      {uniqueLocations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                           {uniqueLocations.slice(0, 8).map(loc => (
                             <button
                                key={loc}
                                type="button"
                                onClick={() => editingEqId ? setEditEqForm({...editEqForm, location: loc}) : setNewEq({...newEq, location: loc})}
                                className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${
                                  (editingEqId ? editEqForm.location : newEq.location) === loc 
                                    ? 'bg-slate-900 border-slate-900 text-white' 
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                                }`}
                             >
                               {loc}
                             </button>
                           ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="flex flex-col">
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1">Quantité</label>
                        <input 
                            type="number" 
                            className={inputClasses}
                            value={editingEqId ? (editEqForm.quantity || 1) : newEq.quantity} 
                            onChange={e => editingEqId ? setEditEqForm({...editEqForm, quantity: parseInt(e.target.value) || 0}) : setNewEq({...newEq, quantity: parseInt(e.target.value) || 0})} 
                        />
                     </div>
                     <div className="flex flex-col">
                        <label className="text-[8px] font-black text-slate-400 uppercase mb-1">Vidéo (YouTube URL)</label>
                        <input 
                            type="text" 
                            placeholder="https://youtube.com/..."
                            className={inputClasses}
                            value={editingEqId ? (editEqForm.videoUrl || '') : newEq.videoUrl} 
                            onChange={e => editingEqId ? setEditEqForm({...editEqForm, videoUrl: e.target.value}) : setNewEq({...newEq, videoUrl: e.target.value})} 
                        />
                     </div>
                  </div>

                  {/* Documents Section */}
                  <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-100">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Documentation (Manuels, PDF)</h5>
                    <div className="space-y-2">
                       {(editingEqId ? (editEqForm.documents || []) : (newEq.documents || [])).map(doc => (
                         <div key={doc.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
                           <span className="text-xs font-bold truncate max-w-[150px] text-slate-900">{doc.name}</span>
                           <button type="button" onClick={() => removeDocFromForm(doc.id)} className="text-red-500 p-1 hover:bg-red-50 rounded transition-colors"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg></button>
                         </div>
                       ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Nom du doc" className="text-xs p-2 rounded-lg border border-slate-200 font-bold text-slate-900 bg-white outline-none focus:border-slate-400" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} />
                      <input type="text" placeholder="URL du doc" className="text-xs p-2 rounded-lg border border-slate-200 font-bold text-slate-900 bg-white outline-none focus:border-slate-400" value={newDoc.url} onChange={e => setNewDoc({...newDoc, url: e.target.value})} />
                    </div>
                    <button type="button" onClick={addDocToForm} className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md active:scale-95 transition-all">Ajouter au dossier</button>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => { setIsAdding(false); setEditingEqId(null); }} className="text-slate-500 font-black uppercase text-[10px] px-4 py-2 hover:text-slate-800 transition-colors">Annuler</button>
                    <button type="submit" className="bg-red-600 text-white py-4 px-10 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all">Enregistrer</button>
                  </div>
                </form>
              )}

              {/* Equipment Cards List */}
              <div className="space-y-4">
                {filteredAndSortedEquipment.map((item) => {
                  const isCheckedToday = item.lastChecked === today;
                  const hasAnomaly = !!item.anomaly || (item.anomalyTags && item.anomalyTags.length > 0);
                  return (
                    <div id={`eq-${item.id}`} key={item.id} className={`bg-white rounded-[28px] p-5 border-2 transition-all duration-300 shadow-md ${hasAnomaly ? 'border-orange-400 ring-2 ring-orange-50' : 'border-slate-200'} ${isCheckedToday ? 'opacity-80' : 'hover:border-red-300 active:shadow-lg'}`}>
                      <div className="flex items-start space-x-4">
                        <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {item.thumbnailUrl ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4" strokeWidth="2"/></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h5 className="font-black text-slate-900 text-[14px] uppercase tracking-tight truncate"><Highlight text={item.name} search={equipmentSearch} /></h5>
                            <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-xl">x{item.quantity}</span>
                          </div>
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{item.category}</span>
                            <span className="text-[8px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded border border-red-100">📍 {item.location}</span>
                          </div>
                        </div>
                      </div>

                      {hasAnomaly && (
                        <div className="mt-4 bg-orange-600 text-white p-3.5 rounded-2xl flex justify-between items-center shadow-lg shadow-orange-600/10">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="text-[10px] font-black uppercase tracking-wide truncate">⚠️ {item.anomaly || 'Alerte Matériel'}</p>
                            {item.reportedBy && <p className="text-[8px] font-black uppercase opacity-70 mt-1">Par : {item.reportedBy}</p>}
                          </div>
                          <button onClick={() => setConfirmClearAnomalyId(item.id)} className="flex-shrink-0 text-[10px] font-black text-orange-600 bg-white px-4 py-2 rounded-xl uppercase active:scale-95 transition-transform shadow-sm">Rétablir</button>
                        </div>
                      )}

                      {/* Actions Footer */}
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => startEditing(item)} 
                            className="p-2.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-90 transition-all shadow-sm"
                            title="Modifier"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button 
                            onClick={() => { setReportingAnomalyId(item.id); setTempAnomaly(item.anomaly || ""); setTempAnomalyTags(item.anomalyTags || []); }} 
                            className="text-[9px] font-black text-slate-500 uppercase bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-colors border border-slate-200 shadow-sm"
                          >
                            Signaler
                          </button>
                          <button onClick={() => setDetailedEqId(item.id)} className="text-[9px] font-black text-blue-600 uppercase bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors border border-blue-100 shadow-sm">Docs</button>
                        </div>
                        <button 
                          onClick={() => onUpdateEquipment(vehicle.id, item.id, { lastChecked: today })} 
                          className={`text-[10px] font-black px-6 py-2 rounded-xl border-2 transition-all shadow-sm ${isCheckedToday ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-red-600 text-red-600 active:scale-95'}`}
                        >
                          {isCheckedToday ? 'VÉRIFIÉ ✓' : 'VÉRIFIER'}
                        </button>
                      </div>

                      {reportingAnomalyId === item.id && (
                        <div className="mt-4 bg-slate-50 p-4 rounded-xl border-2 border-orange-200 space-y-4 animate-slide-up shadow-inner">
                          <div className="flex flex-wrap gap-2">
                            {['Sale', 'Abîmé', 'Manquant', 'Indisponible'].map(tag => (
                              <button key={tag} onClick={() => toggleAnomalyTag(tag)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${tempAnomalyTags.includes(tag) ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300 text-slate-400 shadow-sm'}`}>{tag}</button>
                            ))}
                          </div>
                          
                          {tempAnomalyTags.includes('Manquant') && (
                            <div className="bg-white p-3 rounded-xl border border-orange-100 flex items-center justify-between animate-fade-in">
                              <span className="text-[10px] font-black text-slate-400 uppercase">Quantité manquante</span>
                              <div className="flex items-center space-x-4">
                                <button 
                                  onClick={() => setTempMissingQuantity(Math.max(1, tempMissingQuantity - 1))}
                                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-600 active:scale-90"
                                >-</button>
                                <span className="text-sm font-black text-slate-900 w-4 text-center">{tempMissingQuantity}</span>
                                <button 
                                  onClick={() => setTempMissingQuantity(Math.min(item.quantity, tempMissingQuantity + 1))}
                                  className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-black text-slate-600 active:scale-90"
                                >+</button>
                              </div>
                            </div>
                          )}

                          <textarea placeholder="Description de l'incident..." className="w-full text-xs p-3 bg-white border-2 border-slate-100 rounded-xl h-20 outline-none font-bold shadow-inner text-slate-900" value={tempAnomaly} onChange={e => setTempAnomaly(e.target.value)} />
                          <button onClick={() => handleSaveAnomaly(item.id)} className="w-full bg-slate-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform">Enregistrer le rapport</button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4 animate-fade-in pl-6 relative">
               <div className="absolute left-3 top-0 bottom-0 w-1 bg-slate-200 rounded-full" />
               <div className="flex justify-between items-center mb-6">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registre de l'Engin</h4>
                 <button onClick={() => setIsAddingLog(!isAddingLog)} className="text-[10px] font-black text-red-600 uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 active:scale-95 transition-all">Ajouter Note</button>
               </div>
               
               {isAddingLog && (
                  <form onSubmit={handleAddLogSubmit} className="bg-white p-5 rounded-2xl border-2 border-slate-200 space-y-4 mb-8 animate-slide-up shadow-lg">
                    <textarea placeholder="Observation technique ou opérationnelle..." required className="w-full text-sm p-3 rounded-xl border border-slate-100 h-24 outline-none font-bold text-slate-900" value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} />
                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95">Publier</button>
                  </form>
               )}

               {vehicle.history.map((entry) => (
                 <div key={entry.id} className="relative mb-8 group">
                    <div className="absolute -left-[1.35rem] top-1 group-hover:scale-125 transition-transform shadow-lg rounded-full z-10">
                        <div className={`w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center ${entry.status === 'success' ? 'border-green-500' : entry.status === 'danger' ? 'border-red-500' : entry.status === 'warning' ? 'border-orange-500' : 'border-slate-900'}`}>
                           <div className={`w-1.5 h-1.5 rounded-full ${entry.status === 'success' ? 'bg-green-500' : entry.status === 'danger' ? 'bg-red-500' : entry.status === 'warning' ? 'bg-orange-500' : 'bg-slate-900'}`} />
                        </div>
                    </div>
                    <div className={`p-5 rounded-3xl border-2 transition-all shadow-sm group-hover:shadow-md ${getEntryColorClasses(entry.status)}`}>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{entry.date} <span className="mx-1">•</span> {entry.timestamp}</p>
                        {entry.status && <span className={`w-2 h-2 rounded-full ${entry.status === 'success' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : entry.status === 'danger' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : entry.status === 'warning' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]'}`} />}
                      </div>
                      <p className="text-[12px] font-bold text-slate-900 leading-relaxed">{entry.description}</p>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Signataire : {entry.performedBy}</p>
                        <span className="text-[7px] font-black text-slate-400 uppercase">{entry.type}</span>
                      </div>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmClearAnomalyId && (
          <div className="absolute inset-0 z-[200] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-8 animate-fade-in text-center">
            <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl animate-scale-in border-4 border-white/20">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <h3 className="font-black text-2xl uppercase tracking-tighter mb-4 text-slate-900 leading-none">Rétablissement</h3>
              <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">Confirmez-vous que ce matériel est désormais 100% conforme pour l'intervention ?</p>
              <div className="space-y-3">
                <button onClick={() => { onUpdateEquipment(vehicle.id, confirmClearAnomalyId, { anomaly: undefined, anomalyTags: [], reportedBy: undefined, condition: 'Bon', lastChecked: today }); setConfirmClearAnomalyId(null); }} className="w-full bg-green-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-green-600/20 active:scale-95 transition-all">Valider la conformité</button>
                <button onClick={() => setConfirmClearAnomalyId(null)} className="w-full py-4 text-slate-400 font-black uppercase text-[10px]">Annuler</button>
              </div>
            </div>
          </div>
        )}

        {/* Inspection Summary Modal */}
        {showSummary && (
          <div className="absolute inset-0 z-[200] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl animate-scale-in overflow-hidden relative border-4 border-white/20">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-red-600" />
                
                <div className="text-center mb-8">
                   <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
                      <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                   </div>
                   <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Vérification Terminée</h2>
                   <div className="inline-flex items-center space-x-2 bg-slate-100 px-4 py-2 rounded-xl">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <span className="text-[11px] font-black uppercase text-slate-600">Temps passé : {inspectionDuration}</span>
                   </div>
                </div>

                <div className="space-y-4 mb-8">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Rapport d'anomalies</h4>
                  <div className="max-h-48 overflow-y-auto space-y-3 pr-2 scrollbar-hide">
                    {anomaliesList.length === 0 ? (
                      <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-2xl border border-green-100">
                         <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                         </div>
                         <span className="text-sm font-black text-green-800">R.A.S - Matériel Conforme</span>
                      </div>
                    ) : (
                      anomaliesList.map(eq => (
                        <div key={eq.id} className="flex items-start space-x-3 p-3 bg-orange-50 rounded-2xl border border-orange-100">
                           <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <span className="text-xs">⚠️</span>
                           </div>
                           <div className="flex-1">
                              <p className="text-xs font-black text-slate-900 uppercase">{eq.name}</p>
                              <p className="text-[10px] font-medium text-orange-800 mt-1 leading-tight">{eq.anomalyTags?.join(', ') || 'Signalement'}: {eq.anomaly}</p>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button onClick={() => setShowSummary(false)} className="w-full bg-slate-900 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-slate-800">
                   Terminer l'inspection
                </button>
             </div>
          </div>
        )}

        {/* Detailed Item Modal */}
        {selectedDetailedEq && (
          <div className="absolute inset-0 z-[120] bg-slate-50 flex flex-col animate-slide-up">
            <div className="p-4 border-b bg-white flex items-center shadow-md z-10">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center overflow-hidden mr-4">
                {selectedDetailedEq.thumbnailUrl ? <img src={selectedDetailedEq.thumbnailUrl} className="w-full h-full object-cover" /> : <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4" strokeWidth="2"/></svg>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-black uppercase tracking-tight text-slate-900 truncate">{selectedDetailedEq.name}</h3>
                <span className="text-[9px] font-black text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded-lg border border-red-100">📍 {selectedDetailedEq.location}</span>
              </div>
              <button onClick={() => setDetailedEqId(null)} className="p-3 bg-slate-100 rounded-2xl text-slate-500 active:scale-90 transition-all ml-2 shadow-sm border border-slate-200"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
               <section className="bg-white p-5 rounded-3xl border-2 border-slate-200 shadow-sm">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Documentation Technique</h4>
                 <div className="grid grid-cols-2 gap-4">
                    {(selectedDetailedEq.documents || []).length > 0 ? (
                      selectedDetailedEq.documents?.map(doc => (
                        <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center hover:bg-slate-100 transition-colors">
                           <svg className="w-6 h-6 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.707 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                           <span className="text-[10px] font-black uppercase text-slate-900 leading-tight">{doc.name}</span>
                        </a>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-4 text-slate-300 text-[10px] font-black uppercase">Aucun document disponible</div>
                    )}
                 </div>
               </section>
               <section>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest">Tutoriel Opérationnel</h4>
                 {selectedDetailedEq.videoUrl ? (
                   <div className="aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-200">
                     <iframe 
                      src={`https://www.youtube.com/embed/${selectedDetailedEq.videoUrl.split('v=')[1]?.split('&')[0] || selectedDetailedEq.videoUrl.split('/').pop()}`} 
                      className="w-full h-full" 
                      allowFullScreen 
                     />
                   </div>
                 ) : (
                   <div className="py-12 text-center bg-white border-2 border-dashed border-slate-300 rounded-3xl text-[10px] font-black text-slate-300 uppercase tracking-widest">Aucune vidéo disponible</div>
                 )}
               </section>
            </div>
            <div className="p-5 border-t bg-white sticky bottom-0"><button onClick={() => setDetailedEqId(null)} className="w-full bg-slate-900 text-white py-5 rounded-3xl text-[11px] font-black uppercase tracking-widest shadow-2xl active:scale-95 transition-all">Fermer</button></div>
          </div>
        )}

        <input type="file" ref={equipmentFileInputRef} className="hidden" accept="image/*" onChange={handleEquipmentFileChange} />
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`flex-1 py-5 text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'text-red-600 border-b-4 border-red-600 bg-slate-50 font-black' : 'text-slate-400 hover:text-slate-600'}`}>
    {label}
  </button>
);

const InfoBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm">
    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</span>
    <span className="text-[13px] font-black text-slate-900 uppercase truncate block">{value}</span>
  </div>
);

export default VehicleDetails;
