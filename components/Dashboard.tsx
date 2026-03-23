
import React, { useState, useMemo } from 'react';
import { Vehicle, VehicleStatus } from '../types.ts';

interface DashboardProps {
  vehicles: Vehicle[];
}

const Dashboard: React.FC<DashboardProps> = ({ vehicles }) => {
  const [showVerifiedModal, setShowVerifiedModal] = useState(false);

  // Get current date in UTC to match how it's saved in App.tsx
  const today = new Date().toISOString().split('T')[0];

  const verifiedVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.history?.some(h => h.date === today && h.description.includes('VÉRIFICATION COMPLÈTE'))
    );
  }, [vehicles, today]);

  const stats = {
    total: vehicles.length,
    available: vehicles.filter(v => v.status === VehicleStatus.AVAILABLE).length,
    maintenance: vehicles.filter(v => v.status === VehicleStatus.MAINTENANCE).length,
    outOnCall: vehicles.filter(v => v.status === VehicleStatus.OUT_ON_CALL).length,
    verifiedToday: verifiedVehicles.length,
  };

  return (
    <div className="space-y-4 mb-4">
      {/* Numerical Stats - Force 4 compact columns with improved legibility */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Flotte" value={stats.total} color="text-slate-900" />
        <StatCard label="Dispo" value={stats.available} color="text-green-600" />
        <StatCard label="Maint." value={stats.maintenance} color="text-orange-600" />
        <StatCard label="Inter." value={stats.outOnCall} color="text-red-600" />
      </div>

      <div 
        onClick={() => setShowVerifiedModal(true)}
        className="bg-white p-4 rounded-2xl shadow-md border border-slate-100 flex items-center justify-between cursor-pointer transition-all hover:border-blue-300 hover:shadow-lg active:scale-[0.98]"
      >
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Vérifications du jour</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Engins contrôlés aujourd'hui</p>
          </div>
        </div>
        <div className="text-2xl font-black text-blue-600">
          {stats.verifiedToday}
        </div>
      </div>

      {showVerifiedModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowVerifiedModal(false)}>
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl animate-scale-in flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <h2 className="text-lg font-black uppercase tracking-tighter text-slate-900">Vérifiés Aujourd'hui</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.verifiedToday} engin(s)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVerifiedModal(false)}
                className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm border border-slate-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
              {verifiedVehicles.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-sm font-bold text-slate-500">Aucun engin vérifié aujourd'hui.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {verifiedVehicles.map(v => {
                    const verificationEntry = v.history?.find(h => h.date === today && h.description.includes('VÉRIFICATION COMPLÈTE'));
                    return (
                      <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                            {v.imageUrl ? (
                              <img src={v.imageUrl} alt={v.callSign} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{v.callSign}</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{v.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase tracking-widest inline-block mb-1">
                            Vérifié
                          </div>
                          {verificationEntry && (
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              à {verificationEntry.timestamp} par {verificationEntry.performedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="p-3 sm:p-4 rounded-2xl shadow-md border border-slate-100 bg-white flex flex-col items-center justify-center transition-all active:scale-95 hover:border-slate-200">
    <span className={`text-xl sm:text-2xl font-black leading-none mb-1 ${color}`}>{value}</span>
    <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-slate-500 text-center">{label}</span>
  </div>
);

export default Dashboard;
