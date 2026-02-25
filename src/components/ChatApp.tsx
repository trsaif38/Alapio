import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { MessageSquare, Phone, CircleDashed, Users, Star, Archive, Settings, User } from 'lucide-react';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  lastSeen?: any;
}

const ChatApp: React.FC = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('chats');

  useEffect(() => {
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      lastSeen: serverTimestamp(),
    }, { merge: true });

    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        if (data.uid !== user.uid) {
          usersData.push(data);
        }
      });
      setUsers(usersData);
      setLoadingUsers(false);
    });

    return unsubscribe;
  }, [user]);

  const navItems = [
    { id: 'chats', icon: <MessageSquare size={20} />, badge: 6 },
    { id: 'calls', icon: <Phone size={20} /> },
    { id: 'status', icon: <CircleDashed size={20} /> },
    { id: 'communities', icon: <Users size={20} /> },
  ];

  const bottomNavItems = [
    { id: 'starred', icon: <Star size={20} /> },
    { id: 'archived', icon: <Archive size={20} /> },
    { id: 'settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="flex w-full h-full max-w-[1600px] shadow-2xl bg-[#f0f2f5] overflow-hidden md:h-[95vh] md:rounded-lg border border-gray-300">
      {/* Leftmost Navigation Rail */}
      <div className="w-[60px] bg-[#f0f2f5] flex flex-col items-center py-4 border-r border-gray-300 flex-shrink-0">
        <div className="flex flex-col gap-4 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative p-2 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.icon}
              {item.badge && (
                <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-[#f0f2f5]">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        
        <div className="flex flex-col gap-4 mt-auto">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-2 rounded-lg transition-colors ${
                activeTab === item.id ? 'bg-gray-200 text-black' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.icon}
            </button>
          ))}
          <button className="p-0.5 rounded-full border border-gray-300 overflow-hidden">
             <img src={user?.photoURL || ''} alt="Profile" className="w-8 h-8 rounded-full" />
          </button>
        </div>
      </div>

      {/* Middle Sidebar (Chat List) */}
      <div className="w-full md:w-[400px] border-r border-gray-300 flex-shrink-0 bg-white">
        <Sidebar 
          users={users} 
          selectedUser={selectedUser} 
          onSelectUser={setSelectedUser} 
          loading={loadingUsers}
        />
      </div>

      {/* Main Chat Area */}
      <div className="hidden md:flex flex-1 bg-[#efeae2]">
        {selectedUser ? (
          <ChatWindow selectedUser={selectedUser} />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-center p-10 bg-[#f0f2f5]">
            <div className="w-64 h-64 mb-8 opacity-20">
               <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
            </div>
            <h2 className="text-3xl font-light text-[#41525d] mb-4">Alapio for Web</h2>
            <p className="text-[#667781] text-sm max-w-md">
              Send and receive messages without keeping your phone online.<br/>
              Use Alapio on up to 4 linked devices and 1 phone at the same time.
            </p>
            <div className="mt-auto flex items-center gap-2 text-[#8696a0] text-xs">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              End-to-end encrypted
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
