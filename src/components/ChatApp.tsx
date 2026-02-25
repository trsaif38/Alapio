import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';

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

  useEffect(() => {
    if (!user) return;

    // Save/Update current user profile in Firestore
    const userRef = doc(db, 'users', user.uid);
    setDoc(userRef, {
      uid: user.uid,
      displayName: user.displayName,
      photoURL: user.photoURL,
      email: user.email,
      lastSeen: serverTimestamp(),
    }, { merge: true });

    // Listen for all users
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
    });

    return unsubscribe;
  }, [user]);

  return (
    <div className="flex w-full h-full max-w-[1600px] shadow-2xl bg-white overflow-hidden md:h-[95vh] md:rounded-lg">
      <div className="w-full md:w-[400px] border-r border-[#e9edef] flex-shrink-0">
        <Sidebar 
          users={users} 
          selectedUser={selectedUser} 
          onSelectUser={setSelectedUser} 
        />
      </div>
      <div className="hidden md:flex flex-1 bg-[#f0f2f5]">
        {selectedUser ? (
          <ChatWindow selectedUser={selectedUser} />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full text-center p-10">
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
