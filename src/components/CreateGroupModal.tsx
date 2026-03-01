import React, { useState } from 'react';
import { X, Users, Camera, Check, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from './ChatApp';
import { useAuth } from '../context/AuthContext';
import { rtdb } from '../lib/firebase';
import { ref, push, set } from 'firebase/database';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: UserProfile[];
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({ isOpen, onClose, contacts }) => {
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const toggleMember = (uid: string) => {
    setSelectedMembers(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleCreate = async () => {
    if (!user || !rtdb || !groupName.trim() || selectedMembers.length === 0) return;
    setIsCreating(true);
    try {
      const groupsRef = ref(rtdb, 'groups');
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key;

      const groupData = {
        id: groupId,
        name: groupName,
        photoURL: `https://picsum.photos/seed/${groupName}/200/200`,
        members: [user.uid, ...selectedMembers],
        createdBy: user.uid,
        createdAt: Date.now(),
        isGroup: true
      };

      await set(newGroupRef, groupData);

      // Add group to each member's contact list (or a separate groups list)
      // For simplicity, we'll just store the group in the 'groups' collection
      // and the Sidebar will fetch groups the user is a member of.

      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Create Group</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="flex flex-col items-center gap-6">
                <div className="w-28 h-28 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center border-2 border-dashed border-blue-600/30 relative group cursor-pointer">
                  <Camera size={32} className="text-blue-600" />
                  <div className="absolute inset-0 bg-black/60 rounded-[2.5rem] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <span className="text-[10px] text-white font-black uppercase tracking-widest">Upload</span>
                  </div>
                </div>
                <div className="w-full space-y-3">
                  <label className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Group Name</label>
                  <input 
                    type="text" 
                    placeholder="Enter group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-black border border-white/5 rounded-2xl px-4 py-4 text-sm text-white focus:border-blue-600/50 outline-none transition-all placeholder:text-white/10"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Select Members ({selectedMembers.length})</label>
                </div>
                
                <div className="bg-black rounded-2xl flex items-center px-4 py-3 border border-white/5 focus-within:border-blue-600/50 transition-all">
                  <Search size={18} className="text-white/20 mr-3" />
                  <input 
                    type="text" 
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:text-white/20"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                  {filteredContacts.map(contact => (
                    <div 
                      key={contact.uid}
                      onClick={() => toggleMember(contact.uid)}
                      className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${selectedMembers.includes(contact.uid) ? 'bg-blue-600/10 border border-blue-600/20' : 'hover:bg-white/5 border border-white/5'}`}
                    >
                      <div className="flex items-center gap-4">
                        <img src={contact.photoURL} alt={contact.displayName} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                        <span className="text-sm text-white font-bold">{contact.displayName}</span>
                      </div>
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${selectedMembers.includes(contact.uid) ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'border border-white/10'}`}>
                        {selectedMembers.includes(contact.uid) && <Check size={16} />}
                      </div>
                    </div>
                  ))}
                  {filteredContacts.length === 0 && (
                    <div className="text-center py-8 text-white/20 text-[10px] font-black uppercase tracking-widest">No contacts found</div>
                  )}
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
                onClick={handleCreate}
                disabled={isCreating || !groupName.trim() || selectedMembers.length === 0}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-3 rounded-xl text-sm font-black uppercase tracking-tight shadow-lg shadow-blue-600/20 transition-all active:scale-95"
              >
                {isCreating ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CreateGroupModal;
