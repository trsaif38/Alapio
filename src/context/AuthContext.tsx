import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '../lib/firebase';

interface Account {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accounts: Account[];
  addAccount: () => Promise<void>;
  switchAccount: (uid: string) => Promise<void>;
  removeAccount: (uid: string) => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  accounts: [],
  addAccount: async () => {},
  switchAccount: async () => {},
  removeAccount: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    const savedAccounts = localStorage.getItem('alapio_accounts');
    if (savedAccounts) {
      setAccounts(JSON.parse(savedAccounts));
    }
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setAccounts(prev => {
          const exists = prev.find(a => a.uid === currentUser.uid);
          if (exists) return prev;
          if (prev.length >= 10) return prev;
          
          const newAccounts = [...prev, {
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'User',
            photoURL: currentUser.photoURL || '',
            email: currentUser.email || ''
          }];
          localStorage.setItem('alapio_accounts', JSON.stringify(newAccounts));
          return newAccounts;
        });
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const addAccount = async () => {
    await signOut(auth);
    // The UI will redirect to login because user becomes null
  };

  const switchAccount = async (uid: string) => {
    // In a real app, we'd need to re-authenticate. 
    // For this demo, we'll sign out and let them pick the account.
    // If we had stored tokens, we could try to sign in with them.
    await signOut(auth);
  };

  const removeAccount = (uid: string) => {
    const newAccounts = accounts.filter(a => a.uid !== uid);
    setAccounts(newAccounts);
    localStorage.setItem('alapio_accounts', JSON.stringify(newAccounts));
  };

  return (
    <AuthContext.Provider value={{ user, loading, accounts, addAccount, switchAccount, removeAccount }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
