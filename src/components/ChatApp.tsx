import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ProfileView from './ProfileView';
import CallModal, { CallInfo } from './CallModal';
import { useAuth } from '../context/AuthContext';
import { db, rtdb } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { ref, set, get, onValue, query as rtdbQuery, orderByChild, equalTo, child, remove } from 'firebase/database';
import { AnimatePresence } from 'motion/react';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  lastSeen?: any;
  contacts?: string[]; // Array of UIDs
  status?: string;
  bio?: string;
  isPremium?: boolean;
}

const ChatApp: React.FC = () => {
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showProfile, setShowProfile] = useState(false);
  const [activeCall, setActiveCall] = useState<CallInfo | null>(null);

  // Listen for incoming calls
  useEffect(() => {
    if (!user || !rtdb) return;

    const callRef = ref(rtdb, `calls/${user.uid}`);
    const unsubscribe = onValue(callRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        if (data.status === 'ended' || data.status === 'rejected') {
          setActiveCall(null);
          // Auto-remove the call record after a short delay
          setTimeout(() => remove(callRef), 3000);
          return;
        }
        setActiveCall({ ...data, isIncoming: data.callerId !== user.uid });
      } else {
        setActiveCall(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleStartCall = async (targetUser: UserProfile, type: 'audio' | 'video') => {
    if (!user || !rtdb) return;

    const callData: CallInfo = {
      callerId: user.uid,
      callerName: user.displayName || 'User',
      callerPhoto: user.photoURL || '',
      receiverId: targetUser.uid,
      receiverName: targetUser.displayName,
      receiverPhoto: targetUser.photoURL,
      type,
      status: 'ringing',
      isIncoming: false,
    };

    setActiveCall(callData);
    // Set for both users to track
    await set(ref(rtdb, `calls/${targetUser.uid}`), callData);
    await set(ref(rtdb, `calls/${user.uid}`), callData);
  };

  const handleAcceptCall = async () => {
    if (!activeCall || !user || !rtdb) return;
    
    const updatedCall = { ...activeCall, status: 'accepted' as const };
    setActiveCall(updatedCall);
    
    await set(ref(rtdb, `calls/${activeCall.callerId}`), updatedCall);
    await set(ref(rtdb, `calls/${activeCall.receiverId}`), updatedCall);
  };

  const handleRejectCall = async () => {
    if (!activeCall || !user || !rtdb) return;
    
    const targetId = activeCall.isIncoming ? activeCall.callerId : activeCall.receiverId;
    await remove(ref(rtdb, `calls/${user.uid}`));
    await set(ref(rtdb, `calls/${targetId}`), { ...activeCall, status: 'rejected' });
    setActiveCall(null);
  };

  const handleEndCall = async () => {
    if (!activeCall || !user || !rtdb) return;
    
    const targetId = activeCall.isIncoming ? activeCall.callerId : activeCall.receiverId;
    await remove(ref(rtdb, `calls/${user.uid}`));
    await set(ref(rtdb, `calls/${targetId}`), { ...activeCall, status: 'ended' });
    setActiveCall(null);
  };

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize current user and listen for contacts using RTDB
  useEffect(() => {
    if (!user || !rtdb) return;

    const userRef = ref(rtdb, `users/${user.uid}`);
    
    const initializeUser = async () => {
      try {
        // Update RTDB
        await set(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email?.toLowerCase() || '',
          lastSeen: Date.now(),
          status: 'Available',
          bio: 'Hey there! I am using Alapio.',
          isPremium: true 
        });

        // Keep Firestore in sync for now if needed, but primary is RTDB
        const firestoreRef = doc(db, 'users', user.uid);
        await setDoc(firestoreRef, {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email?.toLowerCase() || '',
          lastSeen: serverTimestamp(),
          status: 'Available',
          bio: 'Hey there! I am using Alapio.',
          isPremium: true 
        }, { merge: true });
      } catch (error: any) {
        console.error("Error initializing user:", error);
      }
    };

    initializeUser();

    // Listen to current user's document for contacts in RTDB
    const unsubscribe = onValue(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const contactUids = userData.contacts || [];
        
        if (contactUids.length === 0) {
          setUsers([]);
          setLoadingUsers(false);
          return;
        }

        try {
          // Fetch all contacts details from RTDB
          const contactsData: UserProfile[] = [];
          for (const uid of contactUids) {
            const contactSnap = await get(ref(rtdb, `users/${uid}`));
            if (contactSnap.exists()) {
              contactsData.push(contactSnap.val() as UserProfile);
            }
          }
          setUsers(contactsData);
        } catch (error) {
          console.error("Error fetching contacts:", error);
        } finally {
          setLoadingUsers(false);
        }
      } else {
        setLoadingUsers(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddUserByEmail = async (email: string) => {
    if (!user || !email) return;
    if (!rtdb) {
      alert("ডাটাবেস কানেক্ট করা নেই। দয়া করে VITE_FIREBASE_DATABASE_URL সেট করুন।");
      return;
    }
    
    const targetEmail = email.toLowerCase().trim();
    console.log("Searching for:", targetEmail);

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout")), 15000)
    );

    try {
      const usersRef = ref(rtdb, 'users');
      let targetUser: UserProfile | null = null;

      const searchPromise = (async () => {
        // Try indexed query first
        try {
          const emailQuery = rtdbQuery(usersRef, orderByChild('email'), equalTo(targetEmail));
          const querySnapshot = await get(emailQuery);
          
          if (querySnapshot.exists()) {
            const data = querySnapshot.val();
            const keys = Object.keys(data);
            return data[keys[0]] as UserProfile;
          }
        } catch (indexError: any) {
          console.warn("Index not ready, using fallback scan...");
          const allUsersSnap = await get(usersRef);
          if (allUsersSnap.exists()) {
            const allUsers = allUsersSnap.val();
            const userCount = Object.keys(allUsers).length;
            console.log(`Scanning through ${userCount} users manually...`);
            for (const key in allUsers) {
              if (allUsers[key].email?.toLowerCase() === targetEmail) {
                return allUsers[key] as UserProfile;
              }
            }
          }
        }
        return null;
      })();

      // Race between search and timeout
      targetUser = await Promise.race([searchPromise, timeoutPromise]) as UserProfile | null;
      
      if (!targetUser) {
        alert(`ইউজার পাওয়া যায়নি। \n\n"${targetEmail}" এই জিমেইল অথবা নাম্বার দিয়ে এই অ্যাপে এখনো রেজিস্ট্রেশন করা হয়নি।`);
        return;
      }

      if (targetUser.uid === user.uid) {
        alert("আপনি নিজেকে অ্যাড করতে পারবেন না!");
        return;
      }

      // 2. Update RTDB contacts list immediately (Mutual addition)
      const userRef = ref(rtdb, `users/${user.uid}`);
      const targetRef = ref(rtdb, `users/${targetUser.uid}`);
      
      const [userSnap, targetSnap] = await Promise.all([
        get(userRef),
        get(targetRef)
      ]);

      const currentContacts = userSnap.exists() ? (userSnap.val().contacts || []) : [];
      const targetContacts = targetSnap.exists() ? (targetSnap.val().contacts || []) : [];
      
      // Add target to my contacts
      if (!currentContacts.includes(targetUser.uid)) {
        await set(child(userRef, 'contacts'), [...currentContacts, targetUser.uid]);
      }
      
      // Add me to target's contacts
      if (!targetContacts.includes(user.uid)) {
        await set(child(targetRef, 'contacts'), [...targetContacts, user.uid]);
      }

      // 3. Update local state and select user IMMEDIATELY
      setUsers(prev => {
        const exists = prev.find(u => u.uid === targetUser!.uid);
        if (exists) return prev;
        return [targetUser!, ...prev];
      });

      setSelectedUser(targetUser);
      setShowProfile(false);
      
      console.log("Successfully found and selected user:", targetUser.displayName);
      
    } catch (error: any) {
      console.error("Search error:", error);
      alert("সার্চ করার সময় একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }
  };

  const handleAddUserByUid = async (targetUid: string) => {
    if (!user || !targetUid || !rtdb) return;
    if (targetUid === user.uid) return;

    try {
      const targetSnap = await get(ref(rtdb, `users/${targetUid}`));
      if (targetSnap.exists()) {
        const targetUser = targetSnap.val() as UserProfile;
        
        const userRef = ref(rtdb, `users/${user.uid}`);
        const targetRef = ref(rtdb, `users/${targetUid}`);
        
        const [userSnap, targetUserSnap] = await Promise.all([
          get(userRef),
          get(targetRef)
        ]);

        const currentContacts = userSnap.exists() ? (userSnap.val().contacts || []) : [];
        const targetContacts = targetUserSnap.exists() ? (targetUserSnap.val().contacts || []) : [];
        
        // Add target to my contacts
        if (!currentContacts.includes(targetUid)) {
          await set(child(userRef, 'contacts'), [...currentContacts, targetUid]);
        }
        
        // Add me to target's contacts
        if (!targetContacts.includes(user.uid)) {
          await set(child(targetRef, 'contacts'), [...targetContacts, user.uid]);
        }

        setUsers(prev => {
          const exists = prev.find(u => u.uid === targetUser.uid);
          if (exists) return prev;
          return [targetUser, ...prev];
        });
        
        setSelectedUser(targetUser);
      }
    } catch (error) {
      console.error("UID add error:", error);
    }
  };

  return (
    <div className="flex flex-col w-full h-full max-w-[1600px] shadow-2xl bg-[#f0f2f5] overflow-hidden md:h-[95vh] md:rounded-lg border border-gray-300 relative">
      {!isOnline && (
        <div className="absolute top-0 left-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] py-1 px-4 text-center z-[110] flex items-center justify-center gap-2 border-b border-yellow-200">
          <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
          Computer not connected. Make sure you have an active internet connection.
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden">
        {/* Middle Sidebar (Chat List) - Hidden on mobile if chat is open */}
        <div className={`${selectedUser ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] border-r border-gray-300 flex-shrink-0 bg-white relative`}>
          {showProfile && <ProfileView onClose={() => setShowProfile(false)} />}
          <Sidebar 
            users={users} 
            selectedUser={selectedUser} 
            onSelectUser={setSelectedUser} 
            loading={loadingUsers}
            onAddUserByEmail={handleAddUserByEmail}
            onAddUserByUid={handleAddUserByUid}
            onProfileClick={() => setShowProfile(true)}
          />
        </div>

        {/* Main Chat Area - Visible on mobile if chat is open */}
        <div className={`${selectedUser ? 'flex' : 'hidden md:flex'} flex-1 bg-[#efeae2]`}>
          {selectedUser ? (
            <ChatWindow 
              selectedUser={selectedUser} 
              onBack={() => setSelectedUser(null)} 
              onStartCall={handleStartCall}
            />
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
      <AnimatePresence>
        {activeCall && (
          <CallModal 
            call={activeCall}
            onAccept={handleAcceptCall}
            onReject={handleRejectCall}
            onEnd={handleEndCall}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatApp;
