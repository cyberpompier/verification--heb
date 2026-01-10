
import React, { useState, useMemo, useRef } from 'react';
import { Vehicle, VehicleStatus, Equipment, HistoryEntry, EquipmentDocument } from '../types';

interface VehicleDetailsProps {
  vehicle: Vehicle;
  onClose: () => void;
  onUpdateStatus: (id: string, status: VehicleStatus) => void;
  onUpdateVehicleImage: (id: string, newImageUrl: string) => void;
  onAddEquipment: (vehicleId: string, equipment: Equipment) => void;
  onUpdateEquipment: (vehicleId: string, equipmentId: string, updates: Partial<Equipment>) => void;
  onAddHistoryEntry: (vehicleId: string, entry: Omit<HistoryEntry, 'id' | 'performedBy' | 'timestamp'>) => void;
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
  } catch (e) {
    return <>{text}</>;
  }
};

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ 
  vehicle, 
  onClose, 
  onUpdateStatus, 
  onUpdateVehicleImage,
  onAddEquipment, 
  onUpdateEquipment,
  onAddHistoryEntry
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'inventory' | 'history'>('info');
  const [isAdding, setIsAdding] = useState(false);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [reportingAnomalyId, setReportingAnomalyId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [tempAnomaly, setTempAnomaly] = useState("");
  const [tempMissingQty, setTempMissingQty] = useState(0);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [detailedEqId, setDetailedEqId] = useState<string | null>(null);
  
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  
  const [isAddingDocLink, setIsAddingDocLink] = useState(false);
  const [isAddingVideoLink, setIsAddingVideoLink] = useState(false);
  const [newLinkData, setNewLinkData] = useState({ name: '', url: '' });

  const vehicleFileInputRef = useRef<HTMLInputElement>(null);
  const equipmentFileInputRef = useRef<HTMLInputElement>(null);
  const docUploadRef = useRef<HTMLInputElement>(null);
  const videoUploadRef = useRef<HTMLInputElement>(null);
  
  const [editingEqIdForImage, setEditingEqIdForImage] = useState<string | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  
  const [newEq, setNewEq] = useState({
    name: '',
    category: '',
    quantity: 1,
    condition: 'Bon' as Equipment['condition'],
    lastChecked: today,
    notes: '',
    thumbnailUrl: ''
  });

  const [newLog, setNewLog] = useState<{
    type: HistoryEntry['type'];
    description: string;
    date: string;
    equipmentId?: string;
  }>({
    type: 'note',
    description: '',
    date: today,
    equipmentId: ''
  });

  const existingCategories = useMemo(() => {
    const cats = new Set(vehicle.equipment.map(e => e.category));
    return Array.from(cats).sort();
  }, [vehicle.equipment]);

  const filteredAndSortedEquipment = useMemo(() => {
    let items = [...vehicle.equipment];
    if (equipmentSearch.trim()) {
      const query = equipmentSearch.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [vehicle.equipment, equipmentSearch]);

  const selectedDetailedEq = useMemo(() => 
    vehicle.equipment.find(e => e.id === detailedEqId),
    [vehicle.equipment, detailedEqId]
  );

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEq.name || !newEq.category) return;
    const equipment: Equipment = {
      id: Math.random().toString(36).substr(2, 9),
      name: newEq.name,
      category: newEq.category,
      quantity: newEq.quantity,
      condition: newEq.condition,
      lastChecked: newEq.lastChecked || today,
      notes: newEq.notes,
      thumbnailUrl: newEq.thumbnailUrl,
      documents: []
    };
    onAddEquipment(vehicle.id, equipment);
    setIsAdding(false);
    setNewEq({ name: '', category: '', quantity: 1, condition: 'Bon', lastChecked: today, notes: '', thumbnailUrl: '' });
  };

  const handleAddLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.description) return;
    
    onAddHistoryEntry(vehicle.id, {
      date: newLog.date,
      type: newLog.type,
      description: newLog.description,
      equipmentId: newLog.type === 'equipment' ? newLog.equipmentId : undefined
    });
    
    setIsAddingLog(false);
    setNewLog({ type: 'note', description: '', date: today, equipmentId: '' });
  };

  const handleRefreshCheck = (eqId: string) => {
    onUpdateEquipment(vehicle.id, eqId, { lastChecked: today });
  };

  const handleSaveAnomaly = (eqId: string) => {
    const item = vehicle.equipment.find(e => e.id === eqId);
    if (!item) return;

    const newQuantity = Math.max(0, item.quantity - tempMissingQty);
    let finalAnomalyText = tempAnomaly;
    
    if (tempMissingQty > 0) {
      const missingPrefix = `${tempMissingQty} unité(s) manquante(s). `;
      finalAnomalyText = missingPrefix + (tempAnomaly || "Manquant signalé lors de la vérification.");
    }

    const updates: Partial<Equipment> = { 
      anomaly: finalAnomalyText || undefined, 
      lastChecked: today,
      quantity: newQuantity,
      condition: (finalAnomalyText || newQuantity < item.quantity) ? 'À remplacer' : 'Bon' 
    };
    
    onUpdateEquipment(vehicle.id, eqId, updates);
    setReportingAnomalyId(null);
    setTempAnomaly("");
    setTempMissingQty(0);
  };

  const handleSaveNote = (eqId: string) => {
    onUpdateEquipment(vehicle.id, eqId, { notes: tempNote });
    setEditingNoteId(null);
  };

  const handleVehicleImageClick = () => {
    vehicleFileInputRef.current?.click();
  };

  const handleVehicleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateVehicleImage(vehicle.id, reader.result as string);
        onAddHistoryEntry(vehicle.id, {
          date: today,
          type: 'note',
          description: "Photo du véhicule mise à jour."
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEquipmentThumbnailClick = (eqId?: string) => {
    setEditingEqIdForImage(eqId || null);
    equipmentFileInputRef.current?.click();
  };

  const handleEquipmentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (editingEqIdForImage) {
          onUpdateEquipment(vehicle.id, editingEqIdForImage, { thumbnailUrl: base64 });
        } else {
          setNewEq(prev => ({ ...prev, thumbnailUrl: base64 }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddDoc = (url: string, name: string = 'Document Manuel') => {
    if (!selectedDetailedEq || !url) return;
    const newDoc: EquipmentDocument = {
      id: Math.random().toString(36).substr(2, 9),
      name: name || "Ressource sans nom",
      url,
      type: url.toLowerCase().includes('.pdf') || url.startsWith('data:application/pdf') ? 'pdf' : 'link'
    };
    onUpdateEquipment(vehicle.id, selectedDetailedEq.id, {
      documents: [...(selectedDetailedEq.documents || []), newDoc]
    });
  };

  const handleRemoveDoc = (docId: string) => {
    if (!selectedDetailedEq) return;
    onUpdateEquipment(vehicle.id, selectedDetailedEq.id, {
      documents: (selectedDetailedEq.documents || []).filter(d => d.id !== docId)
    });
  };

  const handleUploadDoc = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleAddDoc(reader.result as string, file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedDetailedEq) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateEquipment(vehicle.id, selectedDetailedEq.id, { videoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const submitDocLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLinkData.url) {
      handleAddDoc(newLinkData.url, newLinkData.name || "Manuel Web");
      setNewLinkData({ name: '', url: '' });
      setIsAddingDocLink(false);
    }
  };

  const submitVideoLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (newLinkData.url && selectedDetailedEq) {
      onUpdateEquipment(vehicle.id, selectedDetailedEq.id, { videoUrl: newLinkData.url });
      setNewLinkData({ name: '', url: '' });
      setIsAddingVideoLink(false);
    }
  };

  const getHistoryIcon = (type: HistoryEntry['type']) => {
    switch(type) {
      case 'status': return <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg></div>;
      case 'maintenance': return <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/></svg></div>;
      case 'equipment': return <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1h3a1 1 0 110 2h-3v3h3a1 1 0 110 2h-3v3h3a1 1 0 110 2h-3v1a1 1 0 11-2 0v-1H5a1 1 0 110-2h3v-3H5a1 1 0 110-2h3V6H5a1 1 0 110-2h3V3a1 1 0 011-1z"/></svg></div>;
      default: return <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828zM4 16v4h4v-4H4z"/></svg></div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl overflow-hidden flex flex-col animate-slide-up relative shadow-2xl">
        
        {/* Modal Détails Techniques (nested) */}
        {selectedDetailedEq && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col animate-slide-up overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-200">
                  {selectedDetailedEq.thumbnailUrl ? (
                    <img src={selectedDetailedEq.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-gray-900 leading-tight uppercase tracking-tight text-sm">{selectedDetailedEq.name}</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Détails Ressources</p>
                </div>
              </div>
              <button onClick={() => { setDetailedEqId(null); setIsPlayingVideo(false); }} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8">
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manuels & PDF</h4>
                  <div className="flex items-center space-x-2">
                    {!isAddingDocLink && (
                      <button onClick={() => docUploadRef.current?.click()} className="text-[9px] font-black text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg">Uploader</button>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  {(selectedDetailedEq.documents || []).map(doc => (
                    <div key={doc.id} className="flex items-center p-3 rounded-xl border border-slate-100 bg-white shadow-sm">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center overflow-hidden">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 mr-3 flex-shrink-0">
                          {doc.type === 'pdf' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" strokeWidth="2"/></svg>}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 truncate">{doc.name}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Vidéo Formation</h4>
                {selectedDetailedEq.videoUrl ? (
                  <div className="rounded-2xl overflow-hidden bg-slate-900 shadow-xl relative aspect-video">
                    {isPlayingVideo ? (
                      selectedDetailedEq.videoUrl.startsWith('data:video') ? (
                        <video src={selectedDetailedEq.videoUrl} controls autoPlay className="w-full h-full object-contain" />
                      ) : (
                        <iframe src={`https://www.youtube.com/embed/${getYouTubeId(selectedDetailedEq.videoUrl)}?autoplay=1`} className="w-full h-full border-0" allow="autoplay" allowFullScreen></iframe>
                      )
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white bg-slate-800">
                        <button onClick={() => setIsPlayingVideo(true)} className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center mb-2 shadow-2xl"><svg className="w-6 h-6 ml-1 text-white fill-current" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.333-5.89a1.5 1.5 0 000-2.538L6.3 2.841z" /></svg></button>
                        <h5 className="font-black text-[9px] uppercase tracking-widest">Play</h5>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed rounded-2xl border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">Vidéo indisponible</div>
                )}
              </section>
            </div>
            
            <div className="p-4 bg-white border-t flex justify-center sticky bottom-0 z-10">
              <button onClick={() => { setDetailedEqId(null); setIsPlayingVideo(false); }} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest">Fermer</button>
            </div>
          </div>
        )}

        {/* Header Modale - Réduit sur mobile */}
        <div className="relative h-32 sm:h-48 shrink-0 group">
          <img src={vehicle.imageUrl} alt={vehicle.callSign} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={handleVehicleImageClick} className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full font-bold text-xs border border-white/30">Changer Photo</button>
            <input type="file" ref={vehicleFileInputRef} className="hidden" accept="image/*" onChange={handleVehicleFileChange} />
          </div>
          <div className="absolute bottom-4 left-5 text-white pointer-events-none">
            <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-none">{vehicle.callSign}</h2>
            <p className="opacity-80 text-[10px] sm:text-sm font-bold tracking-widest uppercase mt-1">{vehicle.type}</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors z-20"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>

        <input type="file" ref={equipmentFileInputRef} className="hidden" accept="image/*" onChange={handleEquipmentFileChange} />

        {/* Onglets Compacts */}
        <div className="flex border-b shrink-0 bg-gray-50 overflow-x-auto scrollbar-hide sticky top-0 z-10">
          <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Infos" />
          <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} label={`Inventaire (${vehicle.equipment.length})`} />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Historique" />
        </div>

        {/* Contenu Onglet Flexible */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white pb-safe">
          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in">
              <section>
                <div className="flex items-center space-x-2 mb-4"><div className="h-1 w-6 bg-red-600 rounded-full" /><h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">État Opérationnel</h4></div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {Object.values(VehicleStatus).map(status => (
                    <button key={status} onClick={() => onUpdateStatus(vehicle.id, status)} className={`py-2.5 px-3 rounded-xl text-[11px] font-bold border-2 transition-all ${vehicle.status === status ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'}`}>{status}</button>
                  ))}
                </div>
              </section>
              <section className="grid grid-cols-2 gap-3 sm:gap-4">
                <InfoBox label="Kilométrage" value={`${vehicle.mileage.toLocaleString()} km`} />
                <InfoBox label="Dernier Service" value={vehicle.lastService} />
                <InfoBox label="Localisation" value={vehicle.location} />
                <InfoBox label="Capacité" value={`${vehicle.crewCapacity} Pers.`} />
              </section>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Check-list Matériel</h4>
                <button onClick={() => setIsAdding(!isAdding)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center space-x-1 ${isAdding ? 'bg-gray-100 text-gray-600' : 'bg-red-600 text-white shadow-sm'}`}>
                   {isAdding ? <span>Annuler</span> : <><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5"/></svg><span>Ajouter</span></>}
                </button>
              </div>

              {!isAdding && (
                <div className="relative mb-3">
                  <input type="text" placeholder="Rechercher..." value={equipmentSearch} onChange={(e) => setEquipmentSearch(e.target.value)} className="w-full text-xs py-2 pl-9 pr-4 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500/20" />
                  <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2"/></svg>
                </div>
              )}

              {isAdding && (
                <form onSubmit={handleAddSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mb-4 animate-slide-up">
                  <div className="flex items-center space-x-3">
                    <button type="button" onClick={() => handleEquipmentThumbnailClick()} className="w-12 h-12 rounded-lg bg-gray-200 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden shrink-0">
                      {newEq.thumbnailUrl ? <img src={newEq.thumbnailUrl} className="w-full h-full object-cover" alt="" /> : <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg>}
                    </button>
                    <input type="text" placeholder="Nom l'article" required className="flex-1 text-xs p-2.5 rounded-lg border" value={newEq.name} onChange={e => setNewEq({...newEq, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input list="categories-list" type="text" placeholder="Catégorie" required className="w-full text-xs p-2 rounded-lg border" value={newEq.category} onChange={e => setNewEq({...newEq, category: e.target.value})} />
                    <input type="number" placeholder="Qté" required min="1" className="text-xs p-2 rounded-lg border" value={newEq.quantity} onChange={e => setNewEq({...newEq, quantity: parseInt(e.target.value) || 1})} />
                  </div>
                  <button type="submit" className="w-full bg-red-600 text-white py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Enregistrer</button>
                </form>
              )}

              <div className="space-y-3">
                {filteredAndSortedEquipment.map((item) => {
                  const isCheckedToday = item.lastChecked === today;
                  const hasAnomaly = !!item.anomaly;
                  
                  return (
                    <div key={item.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${hasAnomaly ? 'border-orange-200 bg-orange-50/5' : 'border-gray-100'}`}>
                      <div className="p-3 sm:p-4">
                        <div className="flex space-x-3 sm:space-x-4">
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shrink-0 relative cursor-pointer" onClick={() => handleEquipmentThumbnailClick(item.id)}>
                             {item.thumbnailUrl ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" /> : <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeWidth="2"/></svg>}
                             {hasAnomaly && <div className="absolute top-0 right-0 bg-orange-500 text-white p-0.5 rounded-bl-lg"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" /></svg></div>}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-1">
                               <div className="min-w-0">
                                 <h5 className="font-black text-slate-800 text-xs truncate"><Highlight text={item.name} search={equipmentSearch} /></h5>
                                 <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                               </div>
                               <div className="text-right flex-shrink-0">
                                 <span className="text-[10px] font-black text-slate-900">Qté: {item.quantity}</span>
                                 <div className={`text-[8px] font-black mt-1 px-1.5 py-0.5 rounded-full ${isCheckedToday ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>{isCheckedToday ? 'VÉRIFIÉ' : 'À VÉRIFIER'}</div>
                               </div>
                            </div>

                            {hasAnomaly && (
                              <div className="mt-2 bg-orange-50/80 border border-orange-100 rounded-lg p-2 flex items-start space-x-2">
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-orange-600 uppercase tracking-tighter">Anomalie</p>
                                    <p className="text-[10px] text-orange-900 font-medium truncate">{item.anomaly}</p>
                                 </div>
                                 <button onClick={() => onUpdateEquipment(vehicle.id, item.id, { anomaly: undefined, condition: 'Bon' })} className="text-[9px] font-black text-orange-500 uppercase">Effacer</button>
                              </div>
                            )}

                            {item.notes && !editingNoteId && (
                               <p className="mt-2 text-[10px] text-slate-500 italic line-clamp-1">{item.notes}</p>
                            )}
                          </div>
                        </div>

                        {/* Actions Flexibles */}
                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between flex-wrap gap-2">
                           <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                              <button onClick={() => setDetailedEqId(item.id)} className="text-[9px] font-black text-slate-500 flex items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100 active:scale-95 transition-all"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth="2"/></svg>Infos</button>
                              <button onClick={() => { setReportingAnomalyId(item.id); setTempAnomaly(item.anomaly || ""); setTempMissingQty(0); }} className={`text-[9px] font-black flex items-center px-2 py-1.5 rounded-lg border active:scale-95 transition-all ${hasAnomaly ? 'text-orange-600 bg-orange-50 border-orange-100' : 'text-slate-500 bg-slate-50 border-slate-100'}`}><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth="2"/></svg>Alerte</button>
                              <button onClick={() => { setEditingNoteId(item.id); setTempNote(item.notes || ""); }} className="text-[9px] font-black text-slate-500 flex items-center bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100"><svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeWidth="2"/></svg>Note</button>
                           </div>

                           <button onClick={() => handleRefreshCheck(item.id)} className={`text-[9px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all flex items-center shadow-sm border ${isCheckedToday ? 'text-green-600 border-green-200 bg-green-50' : 'text-white border-red-600 bg-red-600 active:scale-95'}`}>
                              {isCheckedToday ? <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg> : null}
                              {isCheckedToday ? 'OK' : 'Valider'}
                           </button>
                        </div>

                        {/* Note Editor Overlay (Inline) */}
                        {editingNoteId === item.id && (
                          <div className="mt-3 bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2 animate-fade-in">
                             <textarea className="w-full text-xs p-2 border border-slate-200 rounded-lg h-16 outline-none" value={tempNote} onChange={e => setTempNote(e.target.value)} placeholder="Ajouter une note..." />
                             <div className="flex justify-end gap-2"><button onClick={() => setEditingNoteId(null)} className="text-[10px] font-bold text-slate-400">Annuler</button><button onClick={() => handleSaveNote(item.id)} className="text-[10px] font-black text-blue-600">Sauver</button></div>
                          </div>
                        )}

                        {/* Anomaly Editor Overlay (Inline - Compact) */}
                        {reportingAnomalyId === item.id && (
                          <div className="mt-3 bg-white p-3 rounded-2xl border-2 border-orange-200 animate-slide-up space-y-3 shadow-xl relative z-10">
                             <div className="flex justify-between items-center"><h6 className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Signalement d'anomalie</h6><button onClick={() => setReportingAnomalyId(null)} className="text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                             <textarea placeholder="Description rapide..." className="w-full text-xs p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-orange-500 outline-none h-14 bg-slate-50" value={tempAnomaly} onChange={(e) => setTempAnomaly(e.target.value)} autoFocus />
                             
                             <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unités manquantes</span>
                                <div className="flex items-center space-x-3">
                                  <button type="button" onClick={() => setTempMissingQty(prev => Math.max(0, prev - 1))} className="w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-400"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 12H4" strokeWidth="2"/></svg></button>
                                  <span className="text-xs font-black text-slate-800">{tempMissingQty}</span>
                                  <button type="button" onClick={() => setTempMissingQty(prev => Math.min(item.quantity, prev + 1))} className="w-6 h-6 flex items-center justify-center bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2"/></svg></button>
                                </div>
                             </div>

                             <button onClick={() => handleSaveAnomaly(item.id)} className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Valider l'anomalie</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-fade-in">
               <div className="flex justify-between items-center mb-4"><h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Journal Opérationnel</h4><button onClick={() => setIsAddingLog(!isAddingLog)} className={`px-2 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center space-x-1 ${isAddingLog ? 'bg-gray-100 text-gray-600' : 'bg-red-600 text-white'}`}><span>{isAddingLog ? 'Annuler' : 'Noter'}</span></button></div>
               {isAddingLog && (
                  <form onSubmit={handleAddLogSubmit} className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3 mb-4 animate-slide-up">
                    <div className="grid grid-cols-2 gap-2">
                      <select className="text-[11px] p-2 rounded-lg border outline-none" value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value as any, equipmentId: e.target.value === 'equipment' ? newLog.equipmentId : ''})}>
                        <option value="note">Note</option><option value="maintenance">Maintenance</option><option value="status">État</option><option value="equipment">Matériel</option>
                      </select>
                      <input type="date" required className="text-[11px] p-2 rounded-lg border outline-none" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                    </div>
                    <textarea placeholder="Description..." required className="w-full text-xs p-2 rounded-lg border h-16" value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} />
                    <button type="submit" className="w-full bg-red-600 text-white py-2 rounded-xl font-black text-[10px] uppercase shadow-md">Ajouter</button>
                  </form>
               )}
               <div className="relative pl-6 sm:pl-8">
                <div className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-slate-100" />
                <div className="space-y-6 relative">
                  {vehicle.history.map((entry) => (
                    <div key={entry.id} className="relative">
                      <div className="absolute -left-7 sm:-left-9 mt-1">{getHistoryIcon(entry.type)}</div>
                      <div className="flex flex-col">
                        <div className="flex justify-between items-start">
                           <span className="text-[8px] sm:text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">{entry.date} <span className="mx-1">•</span> {entry.timestamp}</span>
                           <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${entry.type === 'maintenance' ? 'bg-orange-50 text-orange-600' : entry.type === 'status' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-slate-500'}`}>{entry.type.substring(0, 4)}</span>
                        </div>
                        <p className="text-[11px] sm:text-xs text-slate-700 font-medium mt-1 leading-relaxed">{entry.description}</p>
                        <span className="text-[8px] font-bold text-slate-400 uppercase mt-1">Par : {entry.performedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`flex-1 py-3.5 text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap px-3 ${active ? 'text-red-600 border-b-2 border-red-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}>
    {label}
  </button>
);

const InfoBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</span>
    <span className="text-xs sm:text-sm font-black text-slate-800">{value}</span>
  </div>
);

export default VehicleDetails;
