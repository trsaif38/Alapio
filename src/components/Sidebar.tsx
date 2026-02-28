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
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false);

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
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 flex flex-col gap-2 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onProfileClick}
              className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
            >
              <img src={user?.photoURL || ''} alt="My Profile" className="w-full h-full object-cover" />
            </button>
            <h1 className="text-2xl font-bold text-[#111b21]">Chats</h1>
          </div>
          <div className="flex items-center gap-3 text-[#54656f]">
            <button 
              onClick={() => setIsScannerOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Scan QR Code"
            >
              <Scan size={20} />
            </button>
            <button 
              onClick={() => setIsQRModalOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="My QR Code"
            >
              <QrCode size={20} />
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
                className={`p-2 rounded-full transition-colors ${isPlusMenuOpen ? 'bg-gray-200 text-black' : 'hover:bg-gray-100'}`}
                title="Add"
              >
                <Plus size={20} />
              </button>
              
              {isPlusMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-2 animate-in fade-in zoom-in duration-200">
                  <button 
                    onClick={() => {
                      setIsPlusMenuOpen(false);
                      setIsNewContactModalOpen(true);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111b21]"
                  >
                    <UserIcon size={18} className="text-[#54656f]" />
                    New Contact
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`p-2 rounded-full transition-colors ${isMoreMenuOpen ? 'bg-gray-200 text-black' : 'hover:bg-gray-100'}`}
                title="More"
              >
                <MoreVertical size={20} />
              </button>

              {isMoreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-100 z-50 py-2 animate-in fade-in zoom-in duration-200">
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Navigation</div>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111b21]">
                    <Phone size={18} className="text-[#54656f]" />
                    Calls
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111b21]">
                    <CircleDashed size={18} className="text-[#54656f]" />
                    Status
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111b21]">
                    <Users size={18} className="text-[#54656f]" />
                    Communities
                  </button>
                  
                  <div className="h-[1px] bg-gray-100 my-2"></div>
                  <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Messages</div>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111b21]">
                    <Star size={18} className="text-[#54656f]" />
                    Starred Messages
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111b21]">
                    <Archive size={18} className="text-[#54656f]" />
                    Archived Chats
                  </button>
                  
                  <div className="h-[1px] bg-gray-100 my-2"></div>
                  <button className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-[#111b21]">
                    <Settings size={18} className="text-[#54656f]" />
                    Settings
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left hover:bg-red-50 flex items-center gap-3 text-sm text-red-600 font-medium"
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
      <div className="px-4 py-2">
        <div className="bg-[#f0f2f5] rounded-lg flex items-center px-3 py-1.5">
          <Search size={18} className="text-[#54656f] mr-3" />
          <input 
            type="text" 
            placeholder="Search or start a new chat" 
            className="bg-transparent border-none outline-none text-sm w-full text-[#3b4a54] placeholder:text-[#667781]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilter === filter 
                ? 'bg-[#e7fce3] text-[#008069]' 
                : 'bg-[#f0f2f5] text-[#54656f] hover:bg-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
        <button className="p-1 text-[#54656f] hover:bg-gray-100 rounded-full ml-auto">
          <ChevronDown size={16} />
        </button>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar mt-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884]"></div>
            <p className="text-sm text-[#667781]">Loading contacts...</p>
          </div>
        ) : (
          <>
            {filteredUsers.map((u) => (
              <div 
                key={u.uid}
                onClick={() => onSelectUser(u)}
                className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors ${selectedUser?.uid === u.uid ? 'bg-[#f0f2f5]' : ''}`}
              >
                <div className="relative">
                  <img src={u.photoURL} alt={u.displayName} className="w-12 h-12 rounded-full mr-3" />
                  <div className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0 border-b border-gray-100 pb-3">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-[17px] font-normal text-[#111b21] truncate">{u.displayName}</h3>
                    <span className="text-xs text-[#667781]">Yesterday</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-[#667781] truncate">Click to start chatting...</p>
                    <ChevronDown size={16} className="text-[#8696a0] opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <div className="p-10 text-center text-[#667781] text-sm">
                No contacts found
              </div>
            )}
          </>
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
    </div>
  );
};

export default Sidebar;
