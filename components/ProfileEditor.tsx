
import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';

interface ProfileEditorProps {
  profile: UserProfile;
  onSave: (updatedProfile: UserProfile) => void;
  onCancel: () => void;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ profile, onSave, onCancel }) => {
  const [formData, setFormData] = useState<UserProfile>({ ...profile });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, avatarUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const inputClasses = "w-full text-sm p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 text-slate-900 transition-all";
  const labelClasses = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1";

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-lg h-[92vh] sm:h-auto sm:max-h-[90vh] sm:rounded-[40px] overflow-hidden flex flex-col shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-slate-900 leading-none">Mon Profil</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Édition des informations personnelles</p>
          </div>
          <button onClick={onCancel} className="p-2.5 bg-slate-100 rounded-2xl text-slate-500 active:scale-90 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className="relative group">
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-100 shadow-xl relative">
                <img src={formData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white"
                >
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeWidth="2" /><path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeWidth="2" /></svg>
                </button>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliquer pour changer la photo</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClasses}>Prénom</label>
                <input 
                  type="text" 
                  required 
                  className={inputClasses}
                  value={formData.firstName}
                  onChange={e => setFormData({...formData, firstName: e.target.value})}
                />
              </div>
              <div>
                <label className={labelClasses}>Nom</label>
                <input 
                  type="text" 
                  required 
                  className={inputClasses}
                  value={formData.lastName}
                  onChange={e => setFormData({...formData, lastName: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className={labelClasses}>Grade</label>
              <input 
                type="text" 
                placeholder="Ex: Lieutenant, Sergent-Chef..." 
                required 
                className={inputClasses}
                value={formData.grade}
                onChange={e => setFormData({...formData, grade: e.target.value})}
              />
            </div>

            <div>
              <label className={labelClasses}>Affectation / Caserne</label>
              <input 
                type="text" 
                placeholder="Ex: Caserne Centre, État-Major..." 
                required 
                className={inputClasses}
                value={formData.assignment}
                onChange={e => setFormData({...formData, assignment: e.target.value})}
              />
            </div>

            <div>
              <label className={labelClasses}>Adresse Email Professionnelle</label>
              <input 
                type="email" 
                required 
                className={inputClasses}
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
            </div>

            <div>
              <label className={labelClasses}>URL de l'avatar (alternative)</label>
              <input 
                type="text" 
                placeholder="https://..." 
                className={inputClasses}
                value={formData.avatarUrl.startsWith('data:') ? '' : formData.avatarUrl}
                onChange={e => setFormData({...formData, avatarUrl: e.target.value})}
              />
            </div>
          </div>
        </form>

        <div className="p-6 bg-white border-t border-slate-100 flex flex-col space-y-3">
          <button 
            type="submit" 
            onClick={handleSubmit}
            className="w-full bg-slate-900 text-white py-5 rounded-3xl text-sm font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            Enregistrer les modifications
          </button>
          <button 
            type="button" 
            onClick={onCancel}
            className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;
