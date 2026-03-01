import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { LogIn, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login failed", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`This domain (${window.location.origin}) is not authorized in Firebase. Please add it to "Authorized domains" in Firebase Console.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError("Login was cancelled. Please try again and keep the popup window open until finished.");
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError("Login request was cancelled. Please try again.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError(`Login failed (${err.code || 'unknown'}): ${err.message || 'Please check your configuration or try again later.'}`);
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-[#111] rounded-[3rem] shadow-2xl max-w-md w-full mx-4 border border-white/10">
      <div className="w-24 h-24 bg-blue-600 rounded-[2rem] flex items-center justify-center mb-8 shadow-xl shadow-blue-600/20">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
        </svg>
      </div>
      <h1 className="text-4xl font-black text-white mb-2 uppercase italic tracking-tighter">Alapio</h1>
      <p className="text-white/40 mb-10 text-center text-sm font-medium leading-relaxed">Connect with friends and family instantly.<br />Sign in with Google to get started.</p>
      
      {error && (
        <div className="mb-8 p-4 bg-blue-600/10 border border-blue-600/20 rounded-2xl text-blue-400 text-xs font-bold flex items-start gap-3">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <button 
        onClick={handleLogin}
        className="flex items-center justify-center gap-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tight py-4 px-8 rounded-2xl transition-all shadow-xl shadow-blue-600/20 hover:shadow-blue-600/30 active:scale-95"
      >
        <LogIn size={20} />
        Sign in with Google
      </button>
      
      <div className="mt-10 text-[10px] text-white/20 font-black uppercase tracking-widest">
        Secure • Fast • Encrypted
      </div>
    </div>
  );
};

export default Login;
