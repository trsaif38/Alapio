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
    <div className="absolute inset-0 bg-white z-[120] flex flex-col animate-in slide-in-from-left duration-300">
      {/* Header */}
      <div className="h-[110px] bg-[#008069] text-white flex items-end px-6 pb-4">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
          <h2 className="text-xl font-medium">Profile</h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#f0f2f5] custom-scrollbar">
        {/* Profile Picture */}
        <div className="flex flex-col items-center py-8 bg-white shadow-sm">
          <div className="relative group cursor-pointer">
            <img 
              src={user?.photoURL || ''} 
              alt="Profile" 
              className="w-48 h-48 rounded-full object-cover border-4 border-gray-50 shadow-lg" 
            />
            <div className="absolute inset-0 bg-black/30 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={32} />
              <span className="text-xs mt-1 uppercase font-bold">Change Profile Photo</span>
            </div>
            {/* Premium Badge */}
            <div className="absolute bottom-4 right-4 bg-gradient-to-tr from-yellow-400 to-yellow-600 p-2 rounded-full shadow-lg border-2 border-white">
              <Star size={20} className="text-white fill-current" />
            </div>
          </div>
          
          <div className="mt-4 flex items-center gap-2">
            <span className="bg-yellow-100 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase tracking-wider">
              <ShieldCheck size={12} />
              Premium Member
            </span>
          </div>
        </div>

        {/* Name Section */}
        <div className="mt-4 bg-white px-8 py-4 shadow-sm">
          <label className="text-xs text-[#008069] font-medium uppercase tracking-wider">Your Name</label>
          <div className="flex items-center justify-between mt-2">
            {isEditingName ? (
              <div className="flex-1 flex items-center border-b-2 border-[#008069] pb-1">
                <input 
                  type="text" 
                  value={displayName} 
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex-1 outline-none text-lg"
                  autoFocus
                />
                <button onClick={handleUpdateName} className="text-[#008069] ml-2">
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-lg text-[#111b21]">{displayName}</span>
                <button onClick={() => setIsEditingName(true)} className="text-[#8696a0] hover:text-[#008069]">
                  <Edit2 size={20} />
                </button>
              </>
            )}
          </div>
          <p className="text-xs text-[#667781] mt-4">
            This is not your username or pin. This name will be visible to your Alapio contacts.
          </p>
        </div>

        {/* Bio Section */}
        <div className="mt-4 bg-white px-8 py-4 shadow-sm">
          <label className="text-xs text-[#008069] font-medium uppercase tracking-wider">About</label>
          <div className="flex items-center justify-between mt-2">
            {isEditingBio ? (
              <div className="flex-1 flex items-center border-b-2 border-[#008069] pb-1">
                <input 
                  type="text" 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  className="flex-1 outline-none text-lg"
                  autoFocus
                />
                <button onClick={handleUpdateBio} className="text-[#008069] ml-2">
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <>
                <span className="text-lg text-[#111b21]">{bio}</span>
                <button onClick={() => setIsEditingBio(true)} className="text-[#8696a0] hover:text-[#008069]">
                  <Edit2 size={20} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-4 bg-white px-8 py-6 shadow-sm mb-8">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Mail className="text-[#8696a0]" size={20} />
              <div className="flex-1">
                <p className="text-xs text-[#8696a0]">Email</p>
                <p className="text-sm text-[#111b21]">{user?.email}</p>
              </div>
              <button 
                onClick={() => {
                  if (user?.email) {
                    navigator.clipboard.writeText(user.email);
                    alert("Email copied to clipboard!");
                  }
                }}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-[#008069]"
                title="Copy Email"
              >
                <Copy size={18} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <Calendar className="text-[#8696a0]" size={20} />
              <div>
                <p className="text-xs text-[#8696a0]">Member Since</p>
                <p className="text-sm text-[#111b21]">February 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Info className="text-[#8696a0]" size={20} />
              <div>
                <p className="text-xs text-[#8696a0]">Account Status</p>
                <p className="text-sm text-emerald-600 font-bold">Active & Verified</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
