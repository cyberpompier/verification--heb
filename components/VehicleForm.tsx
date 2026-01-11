
import React, { useState } from 'react';
import { Vehicle, VehicleType, VehicleStatus } from '../types';

interface VehicleFormProps {
  onSave: (vehicle: Omit<Vehicle, 'id' | 'equipment' | 'history'>) => void;
  onCancel: () => void;
}

const VehicleForm: React.FC<VehicleFormProps> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    callSign: '',
    type: 'Fourgon Pompe-Tonne (FPT)',
    location: '',
    mileage: 0,
    crewCapacity: 6,
    lastService: new Date().toISOString().split('T')[0],
    imageUrl: 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?auto=format&fit=crop&q=80&w=600',
    status: VehicleStatus.AVAILABLE
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClasses = "w-full text-sm p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 text-slate-900 transition-all";
  const labelClasses = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="fixed inset-0 bg-black/80 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-lg h-[90vh] sm:h-auto sm:max-h-[90vh] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl animate-slide-up">
        
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Nouvel Engin</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Enregistrement dans le parc</p>
          </div>
          <button onClick={onCancel} className="p-2.5 bg-slate-100 rounded-2xl text-slate-500 active:scale-90 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className={labelClasses}>Indicatif Radio</label>
              <input 
                type="text" 
                placeholder="Ex: FPT 42, EPA 17..." 
                required 
                className={inputClasses}
                value={formData.callSign}
                onChange={e => setFormData({...formData, callSign: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Type d'Engin</label>
                <input 
                  type="text" 
                  placeholder="Ex: FPT, EPA, VSR..." 
                  required 
                  className={inputClasses}
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                />
              </div>
              <div>
                <label className={labelClasses}>Secteur / Caserne</label>
                <input 
                  type="text" 
                  placeholder="Caserne Nord..." 
                  required 
                  className={inputClasses}
                  value={formData.location}
                  onChange={e => setFormData({...formData, location: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Kilométrage (km)</label>
                <input 
                  type="number" 
                  required 
                  className={inputClasses}
                  value={formData.mileage}
                  onChange={e => setFormData({...formData, mileage: parseInt(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className={labelClasses}>Capacité Équipage</label>
                <input 
                  type="number" 
                  required 
                  className={inputClasses}
                  value={formData.crewCapacity}
                  onChange={e => setFormData({...formData, crewCapacity: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Date de dernière révision</label>
              <input 
                type="date" 
                required 
                className={inputClasses}
                value={formData.lastService}
                onChange={e => setFormData({...formData, lastService: e.target.value})}
              />
            </div>

            <div>
              <label className={labelClasses}>URL de l'image (Unsplash ou autre)</label>
              <input 
                type="text" 
                placeholder="https://..." 
                className={inputClasses}
                value={formData.imageUrl}
                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
              />
              <div className="mt-4 rounded-3xl overflow-hidden h-32 border-2 border-slate-100 bg-slate-50">
                <img src={formData.imageUrl} alt="Aperçu" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=600')} />
              </div>
            </div>
          </div>
        </form>

        <div className="p-6 bg-white border-t border-slate-100">
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="w-full bg-red-600 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all"
          >
            Intégrer l'engin au parc
          </button>
        </div>
      </div>
    </div>
  );
};

export default VehicleForm;
