import React, { useState } from 'react';
import { UserProfile } from './ChatApp';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { LogOut, Search, MessageSquare, MoreVertical, Filter, Plus, ChevronDown } from 'lucide-react';

interface SidebarProps {
  users: UserProfile[];
  selectedUser: UserProfile | null;
  onSelectUser: (user: UserProfile) => void;
  loading?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ users, selectedUser, onSelectUser, loading }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredUsers = users.filter(u => 
    (u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filters = ['All', 'Unread', 'Favorites'];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#111b21]">Chats</h1>
        <div className="flex items-center gap-4 text-[#54656f]">
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <Plus size={20} />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
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
    </div>
  );
};

export default Sidebar;
