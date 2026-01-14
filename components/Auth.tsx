import React, { useState } from 'react';
import { supabase } from '../lib/supabase.ts';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Vérifiez votre email pour confirmer l\'inscription !');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-[40px] shadow-2xl p-8 border-2 border-slate-200 animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-20 h-20 fire-gradient rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-600/20">
             <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">FireTrack Pro</h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Accès sécurisé opérationnel</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Email Professionnel</label>
            <input 
              type="email" 
              required
              className="w-full text-sm p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-red-500 transition-all text-slate-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mot de passe</label>
            <input 
              type="password" 
              required
              className="w-full text-sm p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-bold outline-none focus:border-red-500 transition-all text-slate-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-600 text-[10px] font-bold text-center uppercase tracking-tight">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full fire-gradient text-white py-5 rounded-3xl font-black uppercase tracking-widest shadow-xl shadow-red-600/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Chargement...' : (isSignUp ? 'Créer un compte' : 'Se connecter')}
          </button>
        </form>

        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full mt-6 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-red-600 transition-colors"
        >
          {isSignUp ? 'Déjà un compte ? Se connecter' : 'Nouveau ? Créer un compte'}
        </button>
      </div>
    </div>
  );
};

export default Auth;