import React, { useState } from 'react';
import { UserProfile } from './ChatApp';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { LogOut, Search, MessageSquare, MoreVertical, Filter } from 'lucide-react';

interface SidebarProps {
  users: UserProfile[];
  selectedUser: UserProfile | null;
  onSelectUser: (user: UserProfile) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ users, selectedUser, onSelectUser }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between">
        <img 
          src={user?.photoURL || ''} 
          alt="Profile" 
          className="w-10 h-10 rounded-full cursor-pointer"
        />
        <div className="flex items-center gap-5 text-[#54656f]">
          <MessageSquare size={20} className="cursor-pointer" />
          <MoreVertical size={20} className="cursor-pointer" />
          <LogOut 
            size={20} 
            className="cursor-pointer hover:text-red-500 transition-colors" 
            onClick={() => auth.signOut()}
          />
        </div>
      </div>

      {/* Search */}
      <div className="p-2 bg-white flex items-center gap-2">
        <div className="flex-1 bg-[#f0f2f5] rounded-lg flex items-center px-3 py-1.5">
          <Search size={18} className="text-[#54656f] mr-3" />
          <input 
            type="text" 
            placeholder="Search or start new chat" 
            className="bg-transparent border-none outline-none text-sm w-full text-[#3b4a54] placeholder:text-[#667781]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Filter size={20} className="text-[#54656f] cursor-pointer" />
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredUsers.map((u) => (
          <div 
            key={u.uid}
            onClick={() => onSelectUser(u)}
            className={`flex items-center px-3 py-3 cursor-pointer hover:bg-[#f5f6f6] transition-colors border-b border-[#f0f2f5] ${selectedUser?.uid === u.uid ? 'bg-[#f0f2f5]' : ''}`}
          >
            <img src={u.photoURL} alt={u.displayName} className="w-12 h-12 rounded-full mr-3" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h3 className="text-[17px] font-normal text-[#111b21] truncate">{u.displayName}</h3>
                <span className="text-xs text-[#667781]">12:00 PM</span>
              </div>
              <p className="text-sm text-[#667781] truncate">Click to start chatting...</p>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="p-10 text-center text-[#667781] text-sm">
            No contacts found
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
