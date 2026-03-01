import React, { useState, useEffect } from 'react';
import { X, Camera, Edit2, Check, ShieldCheck, Star, Info, Mail, Calendar, Copy } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, rtdb } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, get, update } from 'firebase/database';

interface ProfileViewProps {
  onClose: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('Hey there! I am using Alapio.');
  const [status, setStatus] = useState('Available');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !rtdb) return;

    const fetchProfile = async () => {
      try {
        const userRef = ref(rtdb, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          setDisplayName(data.displayName || user.displayName || '');
          setBio(data.bio || 'Hey there! I am using Alapio.');
          setStatus(data.status || 'Available');
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleUpdateName = async () => {
    if (!user || !displayName.trim() || !rtdb) return;
    try {
      const userRef = ref(rtdb, `users/${user.uid}`);
      await update(userRef, { displayName: displayName.trim() });
      
      // Sync with Firestore if needed
      await updateDoc(doc(db, 'users', user.uid), { displayName: displayName.trim() });
      
      setIsEditingName(false);
    } catch (error) {
      console.error("Error updating name:", error);
    }
  };

  const handleUpdateBio = async () => {
    if (!user || !rtdb) return;
    try {
      const userRef = ref(rtdb, `users/${user.uid}`);
      await update(userRef, { bio: bio.trim() });
      
      // Sync with Firestore if needed
      await updateDoc(doc(db, 'users', user.uid), { bio: bio.trim() });
      
      setIsEditingBio(false);
    } catch (error) {
      console.error("Error updating bio:", error);
    }
  };

  if (loading) return null;

  return (
    <div className="absolute inset-0 bg-black z-[120] flex flex-col animate-in slide-in-from-left duration-300 text-white">
      {/* Header */}
      <div className="h-[110px] bg-black border-b border-white/5 text-white flex items-end px-6 pb-4">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60">
            <X size={24} />
          </button>
          <h2 className="text-xl font-black uppercase italic tracking-tight">Profile</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-black custom-scrollbar">
        {/* Profile Picture */}
        <div className="flex flex-col items-center py-10 bg-black border-b border-white/5">
          <div className="relative group cursor-pointer">
            <img 
              src={user?.photoURL || ''} 
              alt="Profile" 
              className="w-48 h-48 rounded-[2.5rem] object-cover border-4 border-blue-600/20 shadow-2xl shadow-blue-600/10" 
            />
            <div className="absolute inset-0 bg-black/60 rounded-[2.5rem] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={32} className="text-blue-600" />
              <span className="text-[10px] mt-2 uppercase font-black tracking-widest">Change Photo</span>
            </div>
            {/* Premium Badge */}
            <div className="absolute -bottom-2 -right-2 bg-blue-600 p-3 rounded-2xl shadow-xl border-4 border-black">
              <Star size={20} className="text-white fill-current" />
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-2">
            <span className="bg-blue-600/10 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-xl flex items-center gap-2 uppercase tracking-[0.2em] border border-blue-600/20">
              <ShieldCheck size={14} />
              Verified Account
            </span>
          </div>
        </div>

        {/* Name Section */}
        <div className="mt-4 bg-[#0a0a0a] px-8 py-6 border-y border-white/5">
          <label className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">Your Name</label>
          <div className="flex items-center justify-between mt-3">
            {isEditingName ? (
              <div className="flex-1 flex items-center border-b border-blue-600 pb-2">
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-lg font-bold text-white"
                  autoFocus
                />
                <button onClick={handleUpdateName} className="text-blue-600 ml-2 p-1 hover:bg-blue-600/10 rounded-lg transition-all">
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-xl font-black italic text-white">{displayName}</span>
                <button onClick={() => setIsEditingName(true)} className="text-white/20 hover:text-blue-600 transition-colors">
                  <Edit2 size={20} />
                </button>
              </>
            )}
          </div>
          <p className="text-[10px] text-white/20 mt-4 font-medium leading-relaxed">
            This is not your username or pin. This name will be visible to your Alapio contacts.
          </p>
        </div>

        {/* Bio Section */}
        <div className="mt-4 bg-[#0a0a0a] px-8 py-6 border-y border-white/5">
          <label className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em]">About</label>
          <div className="flex items-center justify-between mt-3">
            {isEditingBio ? (
              <div className="flex-1 flex items-center border-b border-blue-600 pb-2">
                <input 
                  type="text" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-lg font-bold text-white"
                  autoFocus
                />
                <button onClick={handleUpdateBio} className="text-blue-600 ml-2 p-1 hover:bg-blue-600/10 rounded-lg transition-all">
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-lg font-bold text-white/80">{bio}</span>
                <button onClick={() => setIsEditingBio(true)} className="text-white/20 hover:text-blue-600 transition-colors">
                  <Edit2 size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-4 bg-[#0a0a0a] px-8 py-8 border-y border-white/5 mb-12">
          <div className="space-y-8">
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Mail className="text-blue-600" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Email Address</p>
                <p className="text-sm text-white font-bold">{user?.email}</p>
              </div>
              <button 
                onClick={() => {
                  if (user?.email) {
                    navigator.clipboard.writeText(user.email);
                    alert("Email copied to clipboard!");
                  }
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/20 hover:text-blue-600"
                title="Copy Email"
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Member Since</p>
                <p className="text-sm text-white font-bold">February 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                <Info className="text-emerald-500" size={20} />
              </div>
              <div>
                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">Account Status</p>
                <p className="text-sm text-emerald-500 font-black uppercase italic tracking-tighter">Active & Verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
