import React, { useState } from 'react';
import { X, User, Bell, Shield, Trash2, Camera, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, update } from 'firebase/database';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, addAccount, accounts } = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('Hey there! I am using Alapio.');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !rtdb) return;
    setIsSaving(true);
    try {
      await update(ref(rtdb, `users/${user.uid}`), {
        displayName,
        bio
      });
      onClose();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAccount = async () => {
    if (accounts.length >= 10) {
      alert("Maximum 10 accounts allowed.");
      return;
    }
    await addAccount();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-[#111] w-full max-w-md rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Settings</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              {/* Profile Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative group">
                    <img src={user?.photoURL || ''} alt="Profile" className="w-20 h-20 rounded-2xl object-cover border-2 border-blue-600/50" />
                    <div className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                      <Camera size={20} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{user?.displayName}</h3>
                    <p className="text-xs text-white/40">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Display Name</label>
                  <input 
                    type="text" 
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-600/50 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Bio</label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-600/50 outline-none transition-all resize-none h-24"
                  />
                </div>
              </div>

              {/* Other Settings */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-widest">Preferences</label>
                <div className="space-y-1">
                  <button 
                    onClick={handleAddAccount}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <UserPlus size={18} className="text-blue-600" />
                      <span className="text-sm text-white font-medium">Add Account</span>
                    </div>
                    <span className="text-[10px] text-white/20 font-bold">{accounts.length}/10</span>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <Bell size={18} className="text-blue-600" />
                      <span className="text-sm text-white font-medium">Notifications</span>
                    </div>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                      <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                    </div>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <Shield size={18} className="text-blue-600" />
                      <span className="text-sm text-white font-medium">Privacy & Security</span>
                    </div>
                  </button>
                  <button className="w-full flex items-center justify-between p-4 hover:bg-blue-500/5 rounded-2xl transition-all group">
                    <div className="flex items-center gap-3">
                      <Trash2 size={18} className="text-blue-500" />
                      <span className="text-sm text-blue-500 font-medium">Delete Account</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 bg-black border-t border-white/5 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white/40 hover:bg-white/5 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl text-sm font-black uppercase tracking-tight shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SettingsModal;
