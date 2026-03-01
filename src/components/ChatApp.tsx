import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ProfileView from './ProfileView';
import CallModal, { CallInfo } from './CallModal';
import { useAuth } from '../context/AuthContext';
import { db, rtdb } from '../lib/firebase';
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import { ref, set, get, onValue, query as rtdbQuery, orderByChild, equalTo, child, remove, update } from 'firebase/database';
import { AnimatePresence } from 'motion/react';
import { MessageSquare } from 'lucide-react';

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
  isGroup?: boolean;
  members?: string[];
  id?: string;
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
    
    // Load cached contacts from localStorage for instant UI
    const cachedContacts = localStorage.getItem(`contacts_${user.uid}`);
    if (cachedContacts) {
      try {
        setUsers(JSON.parse(cachedContacts));
        setLoadingUsers(false);
      } catch (e) {
        console.error("Error parsing cached contacts", e);
      }
    }
    
    const initializeUser = async () => {
      try {
        // Use update instead of set to preserve contacts and other existing fields
        await update(userRef, {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
          email: user.email?.toLowerCase() || '',
          lastSeen: Date.now(),
          status: 'Available',
          bio: 'Hey there! I am using Alapio.',
          isPremium: true 
        });

        // Keep Firestore in sync
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

    // Listen to current user's document for contacts and groups in RTDB
    const unsubscribe = onValue(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const contactUids = userData.contacts || [];
        
        try {
          // Fetch all contacts details from RTDB
          const contactsData: UserProfile[] = [];
          for (const uid of contactUids) {
            const contactSnap = await get(ref(rtdb, `users/${uid}`));
            if (contactSnap.exists()) {
              contactsData.push(contactSnap.val() as UserProfile);
            }
          }

          // Fetch groups where user is a member
          const groupsRef = ref(rtdb, 'groups');
          const groupsSnap = await get(groupsRef);
          if (groupsSnap.exists()) {
            const allGroups = groupsSnap.val();
            for (const key in allGroups) {
              const group = allGroups[key] as UserProfile;
              if (group.members?.includes(user.uid)) {
                // Use group ID as UID for consistency in selection
                contactsData.push({ ...group, uid: group.id as string });
              }
            }
          }

          setUsers(contactsData);
          // Cache to localStorage
          localStorage.setItem(`contacts_${user.uid}`, JSON.stringify(contactsData));
        } catch (error) {
          console.error("Error fetching contacts/groups:", error);
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
    <div className="flex h-screen bg-black overflow-hidden font-sans selection:bg-blue-600/30">
      <div className={`${selectedUser ? 'hidden md:block' : 'block'} w-full md:w-[400px] border-r border-white/5 shadow-2xl z-20`}>
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

      <div className={`${!selectedUser ? 'hidden md:flex' : 'flex'} flex-1 flex-col relative bg-black`}>
        {selectedUser ? (
          <ChatWindow 
            selectedUser={selectedUser} 
            onBack={() => setSelectedUser(null)} 
            onStartCall={handleStartCall}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-repeat">
            <div className="w-24 h-24 bg-blue-600/10 rounded-[2.5rem] flex items-center justify-center mb-8 border-2 border-dashed border-blue-600/20 animate-pulse">
              <MessageSquare size={40} className="text-blue-600" />
            </div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight uppercase italic">Select a conversation</h2>
            <p className="text-white/40 max-w-sm text-sm font-medium leading-relaxed">
              Choose a contact or group from the sidebar to start a secure, encrypted conversation.
            </p>
            <div className="mt-12 flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 backdrop-blur-md">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em]">System Online & Secure</span>
            </div>
          </div>
        )}
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
