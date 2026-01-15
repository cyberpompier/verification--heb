
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Vehicle, VehicleStatus, Equipment, HistoryEntry, EquipmentDocument, UserRole } from '../types';

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  currentUser: string;
  userRole: UserRole;
  onUpdateStatus: (id: string, status: VehicleStatus) => void;
  onUpdateVehicleImage: (id: string, newImageUrl: string) => void;
  onAddEquipment: (vehicleId: string, equipment: Equipment) => void;
  onRemoveEquipment: (vehicleId: string, equipmentId: string) => void;
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
  vehicle, onClose, currentUser, userRole, onUpdateStatus, onUpdateVehicleImage,
  onAddEquipment, onRemoveEquipment, onUpdateEquipment, onAddHistoryEntry,
  initialTab = 'info', highlightEquipmentId = null
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'inventory' | 'history'>(initialTab);
  const [isAdding, setIsAdding] = useState(false);
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [editingEqIdForImage, setEditingEqIdForImage] = useState<string | null>(null);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
  
  // History Filter State
  const [historyFilter, setHistoryFilter] = useState<'all' | 'anomalie' | 'verification' | 'divers'>('all');

  // Reporting State
  const [reportingEqId, setReportingEqId] = useState<string | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [reportTags, setReportTags] = useState<string[]>([]);
  const [reportQuantity, setReportQuantity] = useState<number>(1);

  // States for new document form
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const isAdmin = userRole === UserRole.ADMIN;
  const isReader = userRole === UserRole.READER;
  const canModify = userRole === UserRole.ADMIN || userRole === UserRole.OPERATOR;

  const today = new Date().toISOString().split('T')[0];
  const equipmentFileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [newEq, setNewEq] = useState<Omit<Equipment, 'id'>>({
    name: '', category: '', location: '', quantity: 1, condition: 'Bon',
    lastChecked: today, notes: '', thumbnailUrl: '', videoUrl: '', manualUrl: '', documents: []
  });

  const [editEqForm, setEditEqForm] = useState<Partial<Equipment>>({});

  const [newLog, setNewLog] = useState<{
    type: HistoryEntry['type']; description: string; date: string; equipmentId?: string;
  }>({ type: 'note', description: '', date: today, equipmentId: '' });

  const totalItems = vehicle.equipment.length;
  const verifiedItems = vehicle.equipment.filter(e => e.lastChecked === today).length;
  const progressPercentage = totalItems === 0 ? 0 : Math.round((verifiedItems / totalItems) * 100);

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
    if (selectedLocation) items = items.filter(item => item.location === selectedLocation);
    return items.sort((a, b) => {
      const aChecked = a.lastChecked === today;
      const bChecked = b.lastChecked === today;
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
  }, [vehicle.equipment, equipmentSearch, selectedLocation, today]);

  // Sorting and Filtering History
  const sortedAndFilteredHistory = useMemo(() => {
    // 1. Sort by Date Descending (Newest first)
    const sorted = [...vehicle.history].sort((a, b) => {
      const timeA = new Date(`${a.date}T${a.timestamp || '00:00'}`).getTime();
      const timeB = new Date(`${b.date}T${b.timestamp || '00:00'}`).getTime();
      return timeB - timeA;
    });

    // 2. Filter
    if (historyFilter === 'anomalie') {
      return sorted.filter(h => 
        h.status === 'warning' || 
        h.status === 'danger' || 
        h.type === 'maintenance' || 
        h.type === 'equipment'
      );
    }
    if (historyFilter === 'verification') {
      return sorted.filter(h => 
        h.type === 'status' && 
        h.status !== 'warning' && 
        h.status !== 'danger'
      );
    }
    if (historyFilter === 'divers') {
      return sorted.filter(h => h.type === 'note');
    }
    
    return sorted;
  }, [vehicle.history, historyFilter]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newEq.name) return;
    
    // Add Equipment
    onAddEquipment(vehicle.id, { ...newEq, id: '' } as Equipment);

    // Add History Entry for "Divers"
    onAddHistoryEntry(vehicle.id, {
      type: 'note',
      status: 'info',
      description: `AJOUT INVENTAIRE : ${newEq.name} (x${newEq.quantity}) ajouté à ${newEq.location}.`,
      date: today
    });

    setIsAdding(false);
    setNewEq({ name: '', category: '', location: '', quantity: 1, condition: 'Bon', lastChecked: today, notes: '', thumbnailUrl: '', videoUrl: '', manualUrl: '', documents: [] });
    setDocName('');
    setDocUrl('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canModify || !editingEqId) return;
    onUpdateEquipment(vehicle.id, editingEqId, editEqForm);
    setEditingEqId(null);
    setDocName('');
    setDocUrl('');
  };

  const handleDeleteSubmit = () => {
    if (!isAdmin || !editingEqId) return;
    if (window.confirm('Confirmer la suppression définitive de cet équipement ?')) {
        const item = vehicle.equipment.find(e => e.id === editingEqId);
        onRemoveEquipment(vehicle.id, editingEqId);
        
        // Add History Entry for "Divers" (Retrait)
        if (item) {
             onAddHistoryEntry(vehicle.id, {
                type: 'note',
                status: 'info',
                description: `RETRAIT INVENTAIRE : ${item.name} retiré du véhicule.`,
                date: today
             });
        }
        setEditingEqId(null);
        setEditEqForm({});
    }
  };

  const startEditing = (item: Equipment) => {
    if (!canModify) return;
    setEditingEqId(item.id);
    setEditEqForm(item);
    setIsAdding(false);
  };

  const handleVerifyItem = (itemId: string) => {
    const item = vehicle.equipment.find(e => e.id === itemId);
    if (!item) return;

    const isAlreadyChecked = item.lastChecked === today;
    
    // Update the item
    onUpdateEquipment(vehicle.id, itemId, { lastChecked: today });

    // Automatic Log if this verification completes the 100%
    if (!isAlreadyChecked) {
      // Calculate new verified count. (verifiedItems is based on props, so it doesn't include the current one yet)
      const newVerifiedCount = verifiedItems + 1;
      
      if (newVerifiedCount === totalItems && totalItems > 0) {
        onAddHistoryEntry(vehicle.id, {
          type: 'status',
          status: 'success',
          description: 'VÉRIFICATION COMPLÈTE - Inventaire validé à 100%.',
          date: today
        });
      }
    }
  };

  const handleAddDoc = () => {
    if (!docName || !docUrl) return;
    const newDoc: EquipmentDocument = {
      id: Date.now().toString(),
      name: docName,
      url: docUrl,
      type: 'pdf'
    };
    if (editingEqId) {
       setEditEqForm(prev => ({...prev, documents: [...(prev.documents || []), newDoc]}));
    } else {
       setNewEq(prev => ({...prev, documents: [...(prev.documents || []), newDoc]}));
    }
    setDocName('');
    setDocUrl('');
  };

  const handleRemoveDoc = (docId: string) => {
     if (editingEqId) {
        setEditEqForm(prev => ({...prev, documents: (prev.documents || []).filter(d => d.id !== docId)}));
     } else {
        setNewEq(prev => ({...prev, documents: (prev.documents || []).filter(d => d.id !== docId)}));
     }
  };

  const handleEquipmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (editingEqIdForImage) {
            // Updating from list view
            onUpdateEquipment(vehicle.id, editingEqIdForImage, { thumbnailUrl: base64 });
            setEditingEqIdForImage(null);
        } else if (editingEqId) {
            // Updating inside edit form
            setEditEqForm(prev => ({ ...prev, thumbnailUrl: base64 }));
        } else {
            // Updating inside add form
            setNewEq(prev => ({ ...prev, thumbnailUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Reporting Handlers
  const handleOpenReport = (item: Equipment) => {
    if (reportingEqId === item.id) {
        setReportingEqId(null);
    } else {
        setReportingEqId(item.id);
        setReportDescription(item.anomaly || "");
        setReportTags(item.anomalyTags || []);
        setReportQuantity(1);
        setExpandedDocId(null);
    }
  };

  const handleReportSubmit = (itemId: string) => {
    const isMissing = reportTags.includes('MANQUANT');
    const quantityText = isMissing ? ` (Qté: ${reportQuantity})` : '';
    // We incorporate the quantity into the description so it persists
    // Si pas de description et pas de tags, on considère que c'est vide
    const finalDescription = reportDescription ? `${reportDescription}${quantityText}` : "";

    const originalItem = vehicle.equipment.find(e => e.id === itemId);
    const hadAnomaly = originalItem && (!!originalItem.anomaly || (originalItem.anomalyTags && originalItem.anomalyTags.length > 0));
    const hasNewAnomaly = finalDescription.length > 0 || reportTags.length > 0;
    const itemName = originalItem?.name || 'Matériel';

    onUpdateEquipment(vehicle.id, itemId, {
        anomaly: finalDescription,
        anomalyTags: reportTags,
        reportedBy: currentUser,
        lastChecked: today
    });
    
    // Create automatic history log
    if (hasNewAnomaly) {
       onAddHistoryEntry(vehicle.id, {
           date: new Date().toISOString().split('T')[0],
           type: 'equipment',
           status: 'warning',
           description: `ANOMALIE SIGNALÉE - ${itemName} : ${reportTags.join(', ')}${quantityText}. ${reportDescription}`,
           equipmentId: itemId
       });
    } else if (hadAnomaly && !hasNewAnomaly) {
        // Log pour le retour à la normale
        onAddHistoryEntry(vehicle.id, {
            date: new Date().toISOString().split('T')[0],
            type: 'maintenance',
            status: 'success',
            description: `RÉSOLUTION - ${itemName} : Retour à la normale (Anomalie levée).`,
            equipmentId: itemId
        });
    }

    setReportingEqId(null);
  };

  // Helper pour clôturer rapidement
  const handleQuickResolve = (itemId: string) => {
      const originalItem = vehicle.equipment.find(e => e.id === itemId);
      
      onUpdateEquipment(vehicle.id, itemId, {
          anomaly: "",
          anomalyTags: []
      });

      if (originalItem) {
          onAddHistoryEntry(vehicle.id, {
            date: new Date().toISOString().split('T')[0],
            type: 'maintenance',
            status: 'success',
            description: `RÉSOLUTION RAPIDE - ${originalItem.name} : Incident clôturé.`,
            equipmentId: itemId
        });
      }
      setReportingEqId(null);
  };

  const toggleReportTag = (tag: string) => {
    setReportTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const getYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const inputClasses = "w-full text-xs p-3 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-red-500 text-slate-900 transition-all placeholder:text-slate-400/80";
  const labelClasses = "block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1";

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
                      disabled={isReader}
                      onClick={() => onUpdateStatus(vehicle.id, status)} 
                      className={`py-4 px-3 rounded-2xl text-[11px] font-black border-2 transition-all shadow-sm ${vehicle.status === status ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'} ${isReader ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Inspection de l'inventaire</span>
                  <div className="flex items-baseline space-x-1">
                    <span className="text-xl font-black text-slate-900">{progressPercentage}%</span>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                   <div 
                     className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-700 ease-out" 
                     style={{ width: `${progressPercentage}%` }} 
                   />
                </div>
              </div>

              {/* Search and Action Bar */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <input type="text" placeholder="Rechercher..." value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} className="w-full text-xs py-3 pl-10 pr-4 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-red-600 transition-all font-bold shadow-sm" />
                    <svg className="w-4 h-4 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="3"/></svg>
                  </div>
                  {isAdmin && (
                    <button onClick={() => { setIsAdding(!isAdding); setEditingEqId(null); setEditingEqIdForImage(null); }} className={`p-3 rounded-2xl border-2 transition-all shadow-sm ${isAdding ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-red-600'}`}>
                      <svg className={`w-5 h-5 transition-transform ${isAdding ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="3"/></svg>
                    </button>
                  )}
                </div>

                {/* Location Tags - Horizontal Scroll */}
                <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
                    <button 
                      onClick={() => setSelectedLocation(null)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${!selectedLocation ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      Tout
                    </button>
                    {uniqueLocations.map(loc => (
                      <button 
                        key={loc}
                        onClick={() => setSelectedLocation(selectedLocation === loc ? null : loc)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2 ${selectedLocation === loc ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-200'}`}
                      >
                        {loc}
                      </button>
                    ))}
                </div>
              </div>

              {/* Formulaire d'ajout / édition style "PWA Clean" */}
              {(isAdding || editingEqId) && (
                <form onSubmit={editingEqId ? handleEditSubmit : handleAddSubmit} className="bg-white p-6 rounded-[32px] border-2 border-slate-900 shadow-xl space-y-5 animate-slide-up">
                  <h4 className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">{editingEqId ? 'ÉDITER MATÉRIEL' : 'NOUVEAU MATÉRIEL'}</h4>
                  
                  <div className="space-y-4">
                    {/* Image + Name Row */}
                    <div className="flex items-start gap-4">
                      {/* Image Uploader */}
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingEqIdForImage(null); // Ensure we are targeting form state
                          equipmentFileInputRef.current?.click();
                        }}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-300 hover:border-red-500 hover:text-red-500 transition-colors flex-shrink-0 overflow-hidden relative"
                      >
                         {(editingEqId ? editEqForm.thumbnailUrl : newEq.thumbnailUrl) ? (
                            <img src={editingEqId ? editEqForm.thumbnailUrl : newEq.thumbnailUrl} className="w-full h-full object-cover" />
                         ) : (
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5" /></svg>
                         )}
                      </button>
                      
                      {/* Name Input - Large */}
                      <div className="flex-1">
                        <input 
                            type="text" 
                            placeholder="Nom de l'équipement"
                            required 
                            className="w-full h-20 sm:h-24 text-lg p-4 rounded-3xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-red-500 text-slate-900 transition-all placeholder:text-slate-300"
                            value={editingEqId ? editEqForm.name : newEq.name} 
                            onChange={e => editingEqId ? setEditEqForm({...editEqForm, name: e.target.value}) : setNewEq({...newEq, name: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Category & Location */}
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        required 
                        placeholder="Catégorie"
                        className={inputClasses} 
                        value={editingEqId ? editEqForm.category : newEq.category} 
                        onChange={e => editingEqId ? setEditEqForm({...editEqForm, category: e.target.value}) : setNewEq({...newEq, category: e.target.value})} 
                      />
                      <input 
                        type="text" 
                        required 
                        placeholder="Emplacement"
                        className={inputClasses} 
                        value={editingEqId ? editEqForm.location : newEq.location} 
                        onChange={e => editingEqId ? setEditEqForm({...editEqForm, location: e.target.value}) : setNewEq({...newEq, location: e.target.value})} 
                      />
                    </div>

                    {/* Quantity & Video */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClasses}>QUANTITÉ</label>
                        <input 
                            type="number" 
                            required 
                            className={inputClasses} 
                            value={editingEqId ? editEqForm.quantity : newEq.quantity} 
                            onChange={e => editingEqId ? setEditEqForm({...editEqForm, quantity: parseInt(e.target.value)}) : setNewEq({...newEq, quantity: parseInt(e.target.value)})} 
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>VIDÉO (YOUTUBE URL)</label>
                        <input 
                            type="text" 
                            placeholder="https://youtube.com/..." 
                            className={inputClasses} 
                            value={editingEqId ? (editEqForm.videoUrl || '') : newEq.videoUrl} 
                            onChange={e => editingEqId ? setEditEqForm({...editEqForm, videoUrl: e.target.value}) : setNewEq({...newEq, videoUrl: e.target.value})} 
                        />
                      </div>
                    </div>

                    {/* Condition & State */}
                    <div>
                         <label className={labelClasses}>ÉTAT ACTUEL</label>
                         <select className={inputClasses} value={editingEqId ? editEqForm.condition : newEq.condition} onChange={e => editingEqId ? setEditEqForm({...editEqForm, condition: e.target.value as any}) : setNewEq({...newEq, condition: e.target.value as any})}>
                            <option>Bon</option><option>Moyen</option><option>Mauvais</option><option>À remplacer</option>
                         </select>
                    </div>
                    
                    {/* Notes Field (Added) */}
                    <div>
                        <label className={labelClasses}>NOTES / OBSERVATIONS</label>
                        <textarea 
                            className={inputClasses + " h-24 resize-none"} 
                            placeholder="Instructions particulières, détails..."
                            value={editingEqId ? (editEqForm.notes || '') : newEq.notes} 
                            onChange={e => editingEqId ? setEditEqForm({...editEqForm, notes: e.target.value}) : setNewEq({...newEq, notes: e.target.value})} 
                        />
                    </div>

                    {/* Documentation Section */}
                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
                        <label className={labelClasses}>DOCUMENTATION (MANUELS, PDF)</label>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <input 
                                type="text" 
                                placeholder="Nom du doc" 
                                className="w-full text-xs p-3 rounded-xl bg-white border-2 border-slate-200 font-bold outline-none focus:border-red-500"
                                value={docName}
                                onChange={e => setDocName(e.target.value)}
                            />
                            <input 
                                type="text" 
                                placeholder="URL du doc" 
                                className="w-full text-xs p-3 rounded-xl bg-white border-2 border-slate-200 font-bold outline-none focus:border-red-500"
                                value={docUrl}
                                onChange={e => setDocUrl(e.target.value)}
                            />
                        </div>
                        <button 
                            type="button" 
                            onClick={handleAddDoc} 
                            className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                        >
                            AJOUTER AU DOSSIER
                        </button>
                        
                        {/* List of added documents */}
                        <div className="mt-3 space-y-2">
                            {((editingEqId ? editEqForm.documents : newEq.documents) || []).map(doc => (
                                <div key={doc.id} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <div className="flex items-center space-x-2 overflow-hidden">
                                        <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" /></svg>
                                        <span className="text-[11px] font-bold text-slate-700 truncate">{doc.name}</span>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveDoc(doc.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center space-x-2">
                        <button type="button" onClick={() => { setIsAdding(false); setEditingEqId(null); }} className="text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-colors">Annuler</button>
                        {editingEqId && isAdmin && (
                            <button type="button" onClick={handleDeleteSubmit} className="text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 px-3 py-2 rounded-xl transition-colors">Supprimer</button>
                        )}
                      </div>
                      <button type="submit" className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-red-600/20">
                         {editingEqId ? 'ENREGISTRER' : 'ENREGISTRER'}
                      </button>
                  </div>
                </form>
              )}

              {/* Cards List */}
              <div className="space-y-4">
                {filteredAndSortedEquipment.map((item) => {
                  const isCheckedToday = item.lastChecked === today;
                  const hasAnomaly = !!item.anomaly || (item.anomalyTags && item.anomalyTags.length > 0);
                  const showDocs = expandedDocId === item.id;
                  const isReporting = reportingEqId === item.id;

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
                          {/* Badges Video/PDF/Docs - Condensed if expanded, otherwise detailed */}
                          {(!showDocs && !isReporting && (item.videoUrl || item.manualUrl || (item.documents && item.documents.length > 0))) && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {item.videoUrl && <span className="text-[8px] font-black text-red-600 uppercase flex items-center bg-red-50 px-2 py-1 rounded-lg border border-red-100"><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h16a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /><path fill="#fff" d="M14 10l-5 3V7l5 3z" /></svg>Vidéo</span>}
                              {item.manualUrl && <span className="text-[8px] font-black text-blue-600 uppercase flex items-center bg-blue-50 px-2 py-1 rounded-lg border border-blue-100"><svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>Notice</span>}
                              {item.documents?.length > 0 && <span className="text-[8px] font-black text-slate-600 uppercase flex items-center bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">+{item.documents.length} Docs</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <div className="flex flex-wrap gap-2">
                           
                           {/* SIGNALER Button */}
                           {canModify && (
                               <button 
                                 onClick={() => handleOpenReport(item)}
                                 className={`p-2.5 rounded-xl border border-slate-200 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center space-x-1 ${isReporting ? 'bg-orange-600 text-white border-orange-600' : hasAnomaly ? 'bg-red-600 text-white border-red-600 shadow-red-200 animate-pulse' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                               >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                 <span>SIGNALER</span>
                               </button>
                           )}

                           {/* DOCS Button */}
                           {(item.videoUrl || item.manualUrl || (item.documents && item.documents.length > 0) || item.notes) && (
                              <button 
                                onClick={() => { setExpandedDocId(showDocs ? null : item.id); setReportingEqId(null); }}
                                className={`p-2.5 rounded-xl border border-slate-200 font-black text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center space-x-1 ${showDocs ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <span>DOCS</span>
                              </button>
                           )}

                          {canModify && (
                            <button onClick={() => startEditing(item)} className="p-2.5 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 active:scale-90 transition-all shadow-sm"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                          )}
                        </div>
                        {canModify && (
                          <button onClick={() => handleVerifyItem(item.id)} className={`text-[10px] font-black px-6 py-2 rounded-xl border-2 transition-all shadow-sm ${isCheckedToday ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-red-600 text-red-600 active:scale-95'}`}>{isCheckedToday ? 'VÉRIFIÉ ✓' : 'VÉRIFIER'}</button>
                        )}
                      </div>

                      {/* Reporting Content */}
                      {isReporting && (
                        <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in bg-orange-50/30 -mx-5 px-5 pb-2">
                            <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {['SALE', 'ABÎMÉ', 'MANQUANT', 'INDISPONIBLE'].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleReportTag(tag)}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${reportTags.includes(tag) ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-orange-200'}`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                {reportTags.includes('MANQUANT') && (
                                  <div className="mb-3 bg-red-50 p-3 rounded-xl border border-red-100 flex items-center justify-between animate-fade-in">
                                     <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Quantité manquante</span>
                                     <div className="flex items-center bg-white rounded-lg border border-red-200 shadow-sm">
                                        <button
                                          onClick={() => setReportQuantity(q => Math.max(1, q - 1))}
                                          className="w-8 h-8 flex items-center justify-center text-red-600 font-bold active:bg-red-50 rounded-l-lg transition-colors"
                                        >
                                          -
                                        </button>
                                        <span className="w-8 text-center text-sm font-black text-slate-900">{reportQuantity}</span>
                                        <button
                                          onClick={() => setReportQuantity(q => q + 1)}
                                          className="w-8 h-8 flex items-center justify-center text-red-600 font-bold active:bg-red-50 rounded-r-lg transition-colors"
                                        >
                                          +
                                        </button>
                                     </div>
                                  </div>
                                )}
                                <textarea
                                    value={reportDescription}
                                    onChange={(e) => setReportDescription(e.target.value)}
                                    placeholder="Description de l'incident..."
                                    className="w-full text-xs p-3 rounded-xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-orange-500 min-h-[80px] text-slate-700 mb-3 resize-none"
                                />
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => handleReportSubmit(item.id)}
                                        className="flex-1 bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                                    >
                                        ENREGISTRER
                                    </button>
                                    {hasAnomaly && (
                                      <button
                                          onClick={() => handleQuickResolve(item.id)}
                                          className="flex-1 bg-green-600 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all border border-green-700"
                                      >
                                          CLÔTURER L'INCIDENT
                                      </button>
                                    )}
                                </div>
                            </div>
                        </div>
                      )}

                      {/* Expanded Content */}
                      {showDocs && (
                        <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in bg-slate-50/50 -mx-5 px-5 pb-2">
                           
                           {/* Notes Display */}
                           {item.notes && (
                             <div className="mb-4 bg-yellow-50 border border-yellow-100 p-3 rounded-xl shadow-sm">
                               <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest mb-1.5 flex items-center"><span className="mr-1">📝</span> Notes & Observations</p>
                               <p className="text-xs font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{item.notes}</p>
                             </div>
                           )}

                           {/* Video Embed */}
                           {item.videoUrl && getYoutubeId(item.videoUrl) && (
                              <div className="mb-4 rounded-2xl overflow-hidden shadow-lg border border-slate-200 bg-black aspect-video relative group">
                                <iframe 
                                  className="absolute inset-0 w-full h-full"
                                  src={`https://www.youtube.com/embed/${getYoutubeId(item.videoUrl)}`} 
                                  title="Video"
                                  frameBorder="0" 
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                  allowFullScreen
                                ></iframe>
                              </div>
                           )}

                           {/* Links List */}
                           <div className="space-y-2">
                              {item.manualUrl && (
                                <a href={item.manualUrl} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 transition-colors group shadow-sm">
                                   <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-slate-800 uppercase truncate">Manuel Utilisateur</p>
                                      <p className="text-[10px] text-slate-400 truncate opacity-70">Document principal</p>
                                   </div>
                                   <svg className="w-4 h-4 text-slate-300 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </a>
                              )}
                              {item.documents?.map(doc => (
                                <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-red-400 transition-colors group shadow-sm">
                                   <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <p className="text-xs font-black text-slate-800 uppercase truncate">{doc.name}</p>
                                      <p className="text-[10px] text-slate-400 truncate opacity-70">Document annexe</p>
                                   </div>
                                   <svg className="w-4 h-4 text-slate-300 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </a>
                              ))}
                           </div>
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
               <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registre de l'Engin</h4>
                 
                 {/* Filter Buttons */}
                 <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0">
                    {['all', 'anomalie', 'verification', 'divers'].map(filter => (
                        <button 
                            key={filter}
                            onClick={() => setHistoryFilter(filter as any)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex-shrink-0 ${historyFilter === filter ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                        >
                            {filter === 'all' ? 'Tout' : filter}
                        </button>
                    ))}
                 </div>

                 {canModify && <button onClick={() => setIsAddingLog(!isAddingLog)} className="text-[10px] font-black text-red-600 uppercase bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 active:scale-95 transition-all whitespace-nowrap self-start sm:self-auto">Ajouter Note</button>}
               </div>
               
               {isAddingLog && canModify && (
                  <form onSubmit={(e) => { e.preventDefault(); onAddHistoryEntry(vehicle.id, newLog); setIsAddingLog(false); setNewLog({...newLog, description: ''}); }} className="bg-white p-5 rounded-2xl border-2 border-slate-200 space-y-4 mb-8 animate-slide-up shadow-lg">
                    <textarea placeholder="Observation technique ou opérationnelle..." required className="w-full text-sm p-3 rounded-xl border border-slate-100 h-24 outline-none font-bold text-slate-900" value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} />
                    <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md active:scale-95">Publier</button>
                  </form>
               )}

               {sortedAndFilteredHistory.length === 0 ? (
                  <div className="text-center py-8">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucun événement pour ce filtre</p>
                  </div>
               ) : (
                  sortedAndFilteredHistory.map((entry) => (
                    <div key={entry.id} className="relative mb-8 group">
                        <div className="absolute -left-[1.35rem] top-1 group-hover:scale-125 transition-transform shadow-lg rounded-full z-10">
                            <div className={`w-6 h-6 rounded-full bg-white border-2 flex items-center justify-center ${entry.status === 'success' ? 'border-green-500' : entry.status === 'danger' ? 'border-red-500' : entry.status === 'warning' ? 'border-orange-500' : 'border-slate-900'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${entry.status === 'success' ? 'bg-green-500' : entry.status === 'danger' ? 'bg-red-500' : entry.status === 'warning' ? 'bg-orange-500' : 'bg-slate-900'}`} />
                            </div>
                        </div>
                        <div className={`p-5 rounded-3xl border-2 transition-all shadow-sm group-hover:shadow-md bg-white`}>
                          <div className="flex justify-between items-start mb-2">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{entry.date} <span className="mx-1">•</span> {entry.timestamp}</p>
                            {entry.type && (
                                <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase">{entry.type}</span>
                            )}
                          </div>
                          <p className="text-[12px] font-bold text-slate-900 leading-relaxed">{entry.description}</p>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200/50">
                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Signataire : {entry.performedBy}</p>
                          </div>
                        </div>
                    </div>
                  ))
               )}
            </div>
          )}
        </div>

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
