import React, { useState } from 'react';
import { UserProfile } from './ChatApp';
import { useAuth } from '../context/AuthContext';
import { LogOut, Search, MessageSquare, MoreVertical, Filter, Plus, ChevronDown, Copy, User as UserIcon, QrCode, Scan, Phone, CircleDashed, Users, Star, Archive, Settings } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import QRCodeModal from './QRCodeModal';
import ScannerModal from './ScannerModal';
import NewContactModal from './NewContactModal';

import SettingsModal from './SettingsModal';
import CreateGroupModal from './CreateGroupModal';
import SwitchAccountModal from './SwitchAccountModal';

interface SidebarProps {
  users: UserProfile[];
  selectedUser: UserProfile | null;
  onSelectUser: (user: UserProfile) => void;
  loading?: boolean;
  onAddUserByEmail?: (email: string) => Promise<void>;
  onAddUserByUid?: (uid: string) => Promise<void>;
  onProfileClick?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ users, selectedUser, onSelectUser, loading, onAddUserByEmail, onAddUserByUid, onProfileClick }) => {
  const { user, accounts } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isSwitchAccountOpen, setIsSwitchAccountOpen] = useState(false);

  const handleAddEmail = async (email: string) => {
    if (onAddUserByEmail) {
      await onAddUserByEmail(email);
    }
  };

  const handleScanSuccess = (uid: string) => {
    if (onAddUserByUid) {
      onAddUserByUid(uid);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filters = ['All', 'Unread', 'Favorites'];

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="px-6 py-6 flex flex-col gap-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onProfileClick}
              className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/10 hover:border-blue-600 transition-all duration-300"
            >
              <img src={user?.photoURL || ''} alt="My Profile" className="w-full h-full object-cover" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight uppercase italic">Alapio</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              title="Scan QR Code"
            >
              <Scan size={20} />
            </button>
            <button 
              onClick={() => setIsQRModalOpen(true)}
              className="p-2 hover:bg-white/5 rounded-xl transition-colors"
              title="My QR Code"
            >
              <QrCode size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className={`p-2 rounded-xl transition-colors ${isPlusMenuOpen ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
                title="Add"
              >
                <Plus size={20} />
              </button>
              
              {isPlusMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-[#111] rounded-xl shadow-2xl border border-white/10 z-50 py-2 animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      setIsNewContactModalOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-sm text-white"
                  >
                    <UserIcon size={18} className="text-blue-600" />
                    New Contact
                  </button>
                  <button 
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      setIsCreateGroupOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-sm text-white"
                  >
                    <Users size={18} className="text-blue-600" />
                    Create Group
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`p-2 rounded-xl transition-colors ${isMoreMenuOpen ? 'bg-blue-600 text-white' : 'hover:bg-white/5'}`}
                title="More"
              >
                <MoreVertical size={20} />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-[#111] rounded-xl shadow-2xl border border-white/10 z-50 py-2 animate-in fade-in zoom-in duration-200">
                  <div className="px-4 py-2 text-xs font-bold text-white/20 uppercase tracking-wider">Navigation</div>
                  <button className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-sm text-white">
                    <Phone size={18} className="text-white/40" />
                    Calls
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-sm text-white">
                    <CircleDashed size={18} className="text-white/40" />
                    Status
                  </button>
                  
                  <div className="h-[1px] bg-white/5 my-2"></div>
                  <button 
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setIsSettingsOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-sm text-white"
                  >
                    <Settings size={18} className="text-white/40" />
                    Settings
                  </button>
                  {accounts.length > 1 && (
                    <button 
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        setIsSwitchAccountOpen(true);
                      }}
                      className="w-full px-4 py-2 text-left hover:bg-white/5 flex items-center gap-3 text-sm text-white"
                    >
                      <UserIcon size={18} className="text-white/40" />
                      Switch Account
                    </button>
                  )}
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left hover:bg-blue-600/10 flex items-center gap-3 text-sm text-blue-500 font-medium"
                  >
                    <LogOut size={18} />
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-4">
        <div className="bg-black rounded-xl flex items-center px-4 py-2.5 border border-white/5 focus-within:border-blue-600/50 transition-all">
          <Search size={18} className="text-white/20 mr-3" />
          <input 
            type="text" 
            placeholder="Search messages..." 
            className="bg-transparent border-none outline-none text-sm w-full text-white placeholder:text-white/20"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap ${
              activeFilter === filter 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-4 px-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-sm text-white/40">Loading contacts...</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredUsers.map((u) => (
              <div 
                key={u.uid}
                onClick={() => onSelectUser(u)}
                className={`flex items-center px-4 py-4 cursor-pointer rounded-2xl transition-all duration-200 group ${selectedUser?.uid === u.uid ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'hover:bg-white/5'}`}
              >
                <div className="relative">
                  <img src={u.photoURL} alt={u.displayName} className="w-12 h-12 rounded-2xl mr-4 object-cover border border-white/10" />
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-black rounded-full ${u.isGroup ? 'hidden' : ''}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`text-sm font-bold truncate ${selectedUser?.uid === u.uid ? 'text-white' : 'text-white/90'}`}>{u.displayName}</h3>
                    <span className={`text-[10px] font-medium ${selectedUser?.uid === u.uid ? 'text-white/60' : 'text-white/20'}`}>12:45 PM</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs truncate ${selectedUser?.uid === u.uid ? 'text-white/70' : 'text-white/40'}`}>
                      {u.isGroup ? 'Group Message' : 'Tap to open conversation'}
                    </p>
                    {selectedUser?.uid !== u.uid && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-10 text-center text-white/20 text-sm font-medium">
                No conversations found
              </div>
            )}
          </div>
        )}
      </div>

      <QRCodeModal 
        isOpen={isQRModalOpen} 
        onClose={() => setIsQRModalOpen(false)} 
      />
      <ScannerModal 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScanSuccess={handleScanSuccess}
      />
      <NewContactModal
        isOpen={isNewContactModalOpen}
        onClose={() => setIsNewContactModalOpen(false)}
        onAdd={handleAddEmail}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
      <CreateGroupModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        contacts={users.filter(u => !u.isGroup)}
      />
      <SwitchAccountModal 
        isOpen={isSwitchAccountOpen}
        onClose={() => setIsSwitchAccountOpen(false)}
      />
    </div>
  );
};

export default Sidebar;
