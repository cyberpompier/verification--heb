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
  } catch (e) { return <>{text}</>; }
};

const VehicleDetails: React.FC<VehicleDetailsProps> = ({ 
  vehicle, onClose, onUpdateStatus, onUpdateVehicleImage,
  onAddEquipment, onUpdateEquipment, onAddHistoryEntry
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'inventory' | 'history'>('info');
  const [isAdding, setIsAdding] = useState(false);
  const [editingEqId, setEditingEqId] = useState<string | null>(null);
  const [isAddingLog, setIsAddingLog] = useState(false);
  const [reportingAnomalyId, setReportingAnomalyId] = useState<string | null>(null);
  const [tempAnomaly, setTempAnomaly] = useState("");
  const [tempMissingQty, setTempMissingQty] = useState(0);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [detailedEqId, setDetailedEqId] = useState<string | null>(null);
  const [editingEqIdForImage, setEditingEqIdForImage] = useState<string | null>(null);

  const equipmentFileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split('T')[0];
  
  const [newEq, setNewEq] = useState<Omit<Equipment, 'id'>>({
    name: '', category: '', quantity: 1, condition: 'Bon',
    lastChecked: today, notes: '', thumbnailUrl: '', videoUrl: '', documents: []
  });

  const [editEqForm, setEditEqForm] = useState<Partial<Equipment>>({});
  const [newDoc, setNewDoc] = useState({ name: '', url: '' });

  const [newLog, setNewLog] = useState<{
    type: HistoryEntry['type']; description: string; date: string; equipmentId?: string;
  }>({ type: 'note', description: '', date: today, equipmentId: '' });

  const filteredAndSortedEquipment = useMemo(() => {
    let items = [...vehicle.equipment];
    if (equipmentSearch.trim()) {
      const query = equipmentSearch.toLowerCase();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
      );
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [vehicle.equipment, equipmentSearch]);

  const selectedDetailedEq = useMemo(() => 
    vehicle.equipment.find(e => e.id === detailedEqId),
    [vehicle.equipment, detailedEqId]
  );

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    let videoId = null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      videoId = match[2];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEq.name || !newEq.category) return;
    onAddEquipment(vehicle.id, {
      ...newEq,
      id: Math.random().toString(36).substr(2, 9),
      documents: newEq.documents || []
    });
    setIsAdding(false);
    setNewEq({ name: '', category: '', quantity: 1, condition: 'Bon', lastChecked: today, notes: '', thumbnailUrl: '', videoUrl: '', documents: [] });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEqId || !editEqForm.name) return;
    onUpdateEquipment(vehicle.id, editingEqId, editEqForm);
    setEditingEqId(null);
  };

  const handleAddLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLog.description) return;
    onAddHistoryEntry(vehicle.id, newLog);
    setIsAddingLog(false);
    setNewLog({ type: 'note', description: '', date: today, equipmentId: '' });
  };

  const addDocumentToForm = (isEditing: boolean) => {
    if (!newDoc.name || !newDoc.url) return;
    const doc: EquipmentDocument = { id: Math.random().toString(36).substr(2, 5), name: newDoc.name, url: newDoc.url, type: 'link' };
    
    if (isEditing) {
      setEditEqForm(prev => ({ ...prev, documents: [...(prev.documents || []), doc] }));
    } else {
      setNewEq(prev => ({ ...prev, documents: [...(prev.documents || []), doc] }));
    }
    setNewDoc({ name: '', url: '' });
  };

  const removeDocumentFromForm = (docId: string, isEditing: boolean) => {
    if (isEditing) {
      setEditEqForm(prev => ({ ...prev, documents: prev.documents?.filter(d => d.id !== docId) }));
    } else {
      setNewEq(prev => ({ ...prev, documents: prev.documents?.filter(d => d.id !== docId) }));
    }
  };

  const handleSaveAnomaly = (eqId: string) => {
    const item = vehicle.equipment.find(e => e.id === eqId);
    if (!item) return;
    const newQuantity = Math.max(0, item.quantity - tempMissingQty);
    let finalAnomalyText = tempAnomaly;
    if (tempMissingQty > 0) finalAnomalyText = `${tempMissingQty} manquant(s). ${tempAnomaly}`;
    onUpdateEquipment(vehicle.id, eqId, { 
      anomaly: finalAnomalyText || undefined, 
      lastChecked: today, 
      quantity: newQuantity,
      condition: (finalAnomalyText || newQuantity < item.quantity) ? 'À remplacer' : 'Bon' 
    });
    setReportingAnomalyId(null);
    setTempAnomaly("");
    setTempMissingQty(0);
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

  const getHistoryIcon = (type: HistoryEntry['type']) => {
    switch(type) {
      case 'status': return <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-2h2v2zm0-4H9V5h2v4z"/></svg></div>;
      case 'maintenance': return <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"/></svg></div>;
      default: return <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 00-2.828 0z"/></svg></div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl h-[92vh] sm:h-auto sm:max-h-[85vh] sm:rounded-3xl overflow-hidden flex flex-col animate-slide-up shadow-2xl relative">
        
        {/* Header Compact Principal */}
        <div className="relative h-28 sm:h-40 flex-shrink-0 group">
          <img src={vehicle.imageUrl} alt={vehicle.callSign} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute bottom-3 left-4 text-white">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-none">{vehicle.callSign}</h2>
            <p className="opacity-70 text-[9px] sm:text-xs font-bold uppercase tracking-widest mt-0.5">{vehicle.type}</p>
          </div>
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-black/30 backdrop-blur-md rounded-full text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </div>

        {/* Navigation Onglets */}
        <div className="flex border-b bg-gray-50 flex-shrink-0 overflow-x-auto scrollbar-hide sticky top-0 z-10">
          <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Infos" />
          <TabButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} label={`Inventaire (${vehicle.equipment.length})`} />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} label="Journal" />
        </div>

        {/* Contenu principal défilant */}
        <div className="flex-1 overflow-y-auto p-4 bg-white pb-6">
          {activeTab === 'info' && (
            <div className="space-y-6 animate-fade-in">
              <section>
                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Statut Actuel</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(VehicleStatus).map(status => (
                    <button key={status} onClick={() => onUpdateStatus(vehicle.id, status)} className={`py-2 px-3 rounded-lg text-[16px] md:text-[10px] font-bold border transition-all ${vehicle.status === status ? 'bg-red-50 border-red-500 text-red-700 shadow-sm' : 'bg-white border-gray-100 text-gray-400'}`}>{status}</button>
                  ))}
                </div>
              </section>
              <section className="grid grid-cols-2 gap-3">
                <InfoBox label="Kilométrage" value={`${vehicle.mileage.toLocaleString()} km`} />
                <InfoBox label="Localisation" value={vehicle.location} />
              </section>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-1">
                <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Check-list</h4>
                <button 
                  onClick={() => { setIsAdding(!isAdding); setEditingEqId(null); }} 
                  className="text-[9px] font-black px-2 py-1 rounded bg-red-600 text-white uppercase"
                >
                  {isAdding ? 'Annuler' : 'Ajouter'}
                </button>
              </div>

              {(!isAdding && !editingEqId) && (
                <div className="relative mb-2">
                  <input type="text" placeholder="Filtrer..." value={equipmentSearch} onChange={e => setEquipmentSearch(e.target.value)} className="w-full text-[16px] md:text-xs py-2 pl-8 pr-4 bg-gray-50 border border-gray-100 rounded-lg outline-none" />
                  <svg className="w-3.5 h-3.5 text-gray-300 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth="2.5"/></svg>
                </div>
              )}

              {/* Formulaire AJOUT */}
              {isAdding && (
                <form onSubmit={handleAddSubmit} className="bg-slate-50 p-3 rounded-xl border-2 border-red-100 space-y-3 mb-4 animate-slide-up">
                  <div className="flex items-center space-x-3">
                    <button type="button" onClick={() => triggerImageUpload()} className="w-14 h-14 bg-white border border-dashed border-red-300 rounded-lg flex items-center justify-center overflow-hidden">
                      {newEq.thumbnailUrl ? <img src={newEq.thumbnailUrl} className="w-full h-full object-cover" /> : <svg className="w-5 h-5 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeWidth="2.5"/></svg>}
                    </button>
                    <div className="flex-1">
                      <input type="text" placeholder="Nom de l'équipement" required className="w-full text-[16px] md:text-xs p-2 rounded-md border" value={newEq.name} onChange={e => setNewEq({...newEq, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Catégorie" required className="text-[16px] md:text-xs p-2 rounded-md border" value={newEq.category} onChange={e => setNewEq({...newEq, category: e.target.value})} />
                    <input type="number" placeholder="Qté" required min="1" className="text-[16px] md:text-xs p-2 rounded-md border" value={newEq.quantity} onChange={e => setNewEq({...newEq, quantity: parseInt(e.target.value) || 1})} />
                  </div>
                  <input type="text" placeholder="Lien Vidéo (YouTube...)" className="w-full text-[16px] md:text-xs p-2 rounded-md border" value={newEq.videoUrl || ''} onChange={e => setNewEq({...newEq, videoUrl: e.target.value})} />
                  
                  <div className="bg-white p-2 rounded-lg border border-red-50 space-y-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Documents & PDFs</span>
                    {(newEq.documents || []).map(d => (
                      <div key={d.id} className="flex justify-between items-center bg-slate-50 p-1.5 rounded text-[9px] border">
                        <span className="truncate font-bold text-slate-600">{d.name}</span>
                        <button type="button" onClick={() => removeDocumentFromForm(d.id, false)} className="text-red-500 font-bold px-1">×</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <input type="text" placeholder="Nom du doc" className="text-[16px] md:text-[9px] p-1.5 border rounded" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} />
                      <input type="text" placeholder="URL du fichier" className="text-[16px] md:text-[9px] p-1.5 border rounded" value={newDoc.url} onChange={e => setNewDoc({...newDoc, url: e.target.value})} />
                    </div>
                    <button type="button" onClick={() => addDocumentToForm(false)} className="w-full py-1 text-[8px] font-black uppercase text-red-600 bg-red-50 rounded border border-red-100">+ Lier un document</button>
                  </div>

                  <textarea placeholder="Notes (facultatif)" className="w-full text-[16px] md:text-xs p-2 rounded-md border h-14" value={newEq.notes} onChange={e => setNewEq({...newEq, notes: e.target.value})} />
                  <button type="submit" className="w-full bg-red-600 text-white py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-md">Créer l'équipement</button>
                </form>
              )}

              {/* Formulaire ÉDITION */}
              {editingEqId && (
                <form onSubmit={handleEditSubmit} className="bg-blue-50 p-3 rounded-xl border-2 border-blue-100 space-y-3 mb-4 animate-slide-up">
                  <div className="flex justify-between items-center mb-1">
                    <h5 className="text-[8px] font-black text-blue-600 uppercase">Modification</h5>
                    <button type="button" onClick={() => setEditingEqId(null)} className="text-[8px] font-black text-gray-400 uppercase">Fermer</button>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button type="button" onClick={() => triggerImageUpload(editingEqId)} className="w-14 h-14 bg-white border border-blue-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {editEqForm.thumbnailUrl ? <img src={editEqForm.thumbnailUrl} className="w-full h-full object-cover" /> : <svg className="w-5 h-5 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h14a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2"/></svg>}
                    </button>
                    <div className="flex-1">
                      <input type="text" placeholder="Nom" required className="w-full text-[16px] md:text-xs p-2 rounded-md border" value={editEqForm.name} onChange={e => setEditEqForm({...editEqForm, name: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Catégorie" required className="text-[16px] md:text-xs p-2 rounded-md border" value={editEqForm.category} onChange={e => setEditEqForm({...editEqForm, category: e.target.value})} />
                    <input type="number" placeholder="Qté" required min="1" className="text-[16px] md:text-xs p-2 rounded-md border" value={editEqForm.quantity} onChange={e => setEditEqForm({...editEqForm, quantity: parseInt(e.target.value) || 1})} />
                  </div>
                  <input type="text" placeholder="Lien Vidéo" className="w-full text-[16px] md:text-xs p-2 rounded-md border" value={editEqForm.videoUrl || ''} onChange={e => setEditEqForm({...editEqForm, videoUrl: e.target.value})} />

                  <div className="bg-white p-2 rounded-lg border border-blue-50 space-y-2">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Gestion Documents</span>
                    {(editEqForm.documents || []).map(d => (
                      <div key={d.id} className="flex justify-between items-center bg-slate-50 p-1.5 rounded text-[9px] border">
                        <span className="truncate font-bold text-slate-600">{d.name}</span>
                        <button type="button" onClick={() => removeDocumentFromForm(d.id, true)} className="text-red-500 font-bold px-1">×</button>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      <input type="text" placeholder="Nom" className="text-[16px] md:text-[9px] p-1.5 border rounded" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} />
                      <input type="text" placeholder="Lien" className="text-[16px] md:text-[9px] p-1.5 border rounded" value={newDoc.url} onChange={e => setNewDoc({...newDoc, url: e.target.value})} />
                    </div>
                    <button type="button" onClick={() => addDocumentToForm(true)} className="w-full py-1 text-[8px] font-black uppercase text-blue-600 bg-blue-50 rounded border border-blue-100">+ Ajouter document</button>
                  </div>

                  <textarea placeholder="Notes" className="w-full text-[16px] md:text-xs p-2 rounded-md border h-14" value={editEqForm.notes} onChange={e => setEditEqForm({...editEqForm, notes: e.target.value})} />
                  <button type="submit" className="w-full bg-blue-600 text-white py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest shadow-md">Enregistrer les modifs</button>
                </form>
              )}

              <div className="space-y-3">
                {filteredAndSortedEquipment.map((item) => {
                  const isCheckedToday = item.lastChecked === today;
                  const hasAnomaly = !!item.anomaly;
                  return (
                    <div key={item.id} className={`border rounded-xl p-3 transition-all ${hasAnomaly ? 'border-orange-200 bg-orange-50/10' : 'border-gray-50 bg-gray-50/30'}`}>
                      <div className="flex items-start space-x-3">
                        <div className="w-12 h-12 rounded-lg bg-white border border-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {item.thumbnailUrl ? <img src={item.thumbnailUrl} className="w-full h-full object-cover" /> : <svg className="w-5 h-5 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M20 7l-8-4-8 4m16 0l-8 4" strokeWidth="2"/></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div className="truncate pr-2">
                              <h5 className="font-black text-slate-800 text-[11px] truncate uppercase"><Highlight text={item.name} search={equipmentSearch} /></h5>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <span className="text-[10px] font-black text-slate-900">Qté: {item.quantity}</span>
                              <div className={`text-[7px] font-black mt-1 px-1 py-0.5 rounded ${isCheckedToday ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>{isCheckedToday ? 'VÉRIFIÉ' : 'À VÉRIFIER'}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {hasAnomaly && (
                        <div className="mt-2 bg-orange-50 border border-orange-100 rounded-lg p-2 flex justify-between items-center">
                          <p className="text-[9px] text-orange-800 font-bold truncate pr-2"><span className="uppercase text-orange-600 mr-1">Alerte:</span>{item.anomaly}</p>
                          <button onClick={() => onUpdateEquipment(vehicle.id, item.id, { anomaly: undefined, condition: 'Bon' })} className="text-[8px] font-black text-orange-500 uppercase flex-shrink-0">Effacer</button>
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button onClick={() => { setReportingAnomalyId(item.id); setTempAnomaly(item.anomaly || ""); }} className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1.5 rounded border">Signaler</button>
                          <button onClick={() => { setEditingEqId(item.id); setEditEqForm(item); setIsAdding(false); }} className="text-[8px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-1.5 rounded border border-blue-100">Éditer</button>
                          <button onClick={() => setDetailedEqId(item.id)} className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1.5 rounded border">Infos</button>
                        </div>
                        <button onClick={() => onUpdateEquipment(vehicle.id, item.id, { lastChecked: today })} className={`text-[9px] font-black px-3 py-1.5 rounded-lg border transition-all ${isCheckedToday ? 'border-green-200 text-green-600 bg-green-50' : 'bg-red-600 border-red-600 text-white shadow-sm active:scale-95'}`}>{isCheckedToday ? 'OK' : 'Valider'}</button>
                      </div>

                      {reportingAnomalyId === item.id && (
                        <div className="mt-3 bg-white p-3 rounded-xl border-2 border-orange-200 space-y-2 animate-slide-up">
                          <textarea placeholder="Description de l'anomalie..." className="w-full text-[16px] md:text-[10px] p-2 bg-slate-50 border rounded-lg h-12 outline-none" value={tempAnomaly} onChange={e => setTempAnomaly(e.target.value)} />
                          <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase">
                            <span>Manquants</span>
                            <div className="flex items-center space-x-2">
                              <button type="button" onClick={() => setTempMissingQty(Math.max(0, tempMissingQty - 1))} className="w-5 h-5 bg-slate-50 border rounded flex items-center justify-center">-</button>
                              <span className="text-[10px] text-slate-800">{tempMissingQty}</span>
                              <button type="button" onClick={() => setTempMissingQty(Math.min(item.quantity, tempMissingQty + 1))} className="w-5 h-5 bg-slate-50 border rounded flex items-center justify-center">+</button>
                            </div>
                          </div>
                          <button onClick={() => handleSaveAnomaly(item.id)} className="w-full bg-slate-900 text-white py-2 rounded-lg text-[9px] font-black uppercase shadow-lg">Valider</button>
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
               <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-100" />
               <div className="flex justify-between items-center mb-2"><h4 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Journal</h4><button onClick={() => setIsAddingLog(!isAddingLog)} className="text-[9px] font-black text-red-600 uppercase">Ajouter</button></div>
               {isAddingLog && (
                  <form onSubmit={handleAddLogSubmit} className="bg-slate-50 p-3 rounded-lg border-2 border-slate-200 space-y-2 animate-slide-up">
                    <textarea placeholder="Note rapide..." className="w-full text-[16px] md:text-[10px] p-2 rounded border h-16 outline-none" value={newLog.description} onChange={e => setNewLog({...newLog, description: e.target.value})} />
                    <button type="submit" className="w-full bg-slate-900 text-white py-1.5 rounded text-[9px] font-black uppercase tracking-widest shadow-sm">Publier</button>
                  </form>
               )}
               {vehicle.history.map((entry) => (
                 <div key={entry.id} className="relative mb-6">
                    <div className="absolute -left-[1.35rem] top-0">{getHistoryIcon(entry.type)}</div>
                    <div>
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{entry.date} <span className="mx-1">•</span> {entry.timestamp}</p>
                      <p className="text-[10px] text-slate-700 font-medium leading-tight mt-0.5">{entry.description}</p>
                      <p className="text-[7px] font-bold text-slate-400 uppercase mt-1">Par : {entry.performedBy}</p>
                    </div>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Détails Ressources Overlay (STABILISÉ POUR ÉVITER SUPERPOSITION) */}
        {selectedDetailedEq && (
          <div className="absolute inset-0 z-[120] bg-white flex flex-col animate-slide-up">
            {/* Header Fixe de l'overlay */}
            <div className="p-3 border-b flex justify-between items-center bg-white flex-shrink-0">
              <h3 className="text-[10px] font-black uppercase tracking-widest truncate mr-4">{selectedDetailedEq.name}</h3>
              <button 
                onClick={() => setDetailedEqId(null)} 
                className="p-1.5 bg-gray-100 rounded-full text-gray-400 active:bg-gray-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenu Défilant de l'overlay */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white">
               <section>
                 <h4 className="text-[9px] font-black text-slate-400 uppercase mb-3">Statut & Notes</h4>
                 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-black uppercase text-slate-400">Condition</span>
                      <span className="text-[9px] font-black text-slate-800 uppercase">{selectedDetailedEq.condition}</span>
                    </div>
                    {selectedDetailedEq.notes && (
                      <p className="mt-2 text-[10px] text-slate-600 leading-relaxed border-t border-slate-100 pt-2">{selectedDetailedEq.notes}</p>
                    )}
                 </div>
               </section>

               <section>
                 <h4 className="text-[9px] font-black text-slate-400 uppercase mb-3">Vidéo de Formation</h4>
                 {selectedDetailedEq.videoUrl ? (
                   <div className="space-y-3">
                     {getYouTubeEmbedUrl(selectedDetailedEq.videoUrl) ? (
                       <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-md border-2 border-slate-100">
                         <iframe 
                           src={getYouTubeEmbedUrl(selectedDetailedEq.videoUrl)!} 
                           className="w-full h-full" 
                           allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                           allowFullScreen
                         />
                       </div>
                     ) : (
                       <div className="bg-slate-50 p-4 rounded-xl text-center border">
                          <p className="text-[9px] font-bold text-slate-500 mb-2 truncate">{selectedDetailedEq.videoUrl}</p>
                          <a href={selectedDetailedEq.videoUrl} target="_blank" className="inline-block bg-red-600 text-white text-[9px] px-6 py-2 rounded-full font-black uppercase shadow-lg">Lancer le lien externe</a>
                       </div>
                     )}
                   </div>
                 ) : (
                   <div className="py-8 text-center bg-slate-50 border-2 border-dashed rounded-xl text-[9px] font-black text-slate-300 uppercase">Aucune vidéo associée</div>
                 )}
               </section>

               <section>
                 <h4 className="text-[9px] font-black text-slate-400 uppercase mb-3">Documentation technique</h4>
                 {(selectedDetailedEq.documents || []).length === 0 ? (
                   <div className="py-8 text-center bg-slate-50 border-2 border-dashed rounded-xl text-[9px] font-black text-slate-300 uppercase italic">Aucun document</div>
                 ) : (
                   <div className="space-y-2">
                     {selectedDetailedEq.documents.map(doc => (
                       <a key={doc.id} href={doc.url} target="_blank" className="flex items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm">
                         <svg className="w-4 h-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" strokeWidth="2"/></svg>
                         <span className="truncate">{doc.name}</span>
                       </a>
                     ))}
                   </div>
                 )}
               </section>
            </div>

            {/* Pied de page Fixe de l'overlay */}
            <div className="p-3 border-t bg-slate-50 flex-shrink-0">
              <button 
                onClick={() => setDetailedEqId(null)} 
                className="w-full bg-slate-900 text-white py-3 rounded-xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-transform"
              >
                Retour à l'inventaire
              </button>
            </div>
          </div>
        )}

        <input type="file" ref={equipmentFileInputRef} className="hidden" accept="image/*" onChange={handleEquipmentFileChange} />
      </div>
    </div>
  );
};

const TabButton: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button onClick={onClick} className={`flex-1 py-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'text-red-600 border-b-2 border-red-600 bg-white font-bold' : 'text-slate-400'}`}>
    {label}
  </button>
);

const InfoBox: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">{label}</span>
    <span className="text-[11px] font-black text-slate-800">{value}</span>
  </div>
);

export default VehicleDetails;