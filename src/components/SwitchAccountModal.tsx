import React from 'react';
import { X, User, LogOut, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SwitchAccountModal: React.FC<SwitchAccountModalProps> = ({ isOpen, onClose }) => {
  const { user, accounts, switchAccount, removeAccount } = useAuth();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-[#111] w-full max-w-md rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl"
        >
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-black">
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Switch Account</h2>
            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60">
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {accounts.map((account) => (
              <div 
                key={account.uid}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${account.uid === user?.uid ? 'bg-blue-600/10 border-blue-600/50' : 'bg-black border-white/5 hover:border-white/20'}`}
              >
                <div 
                  className="flex items-center gap-4 cursor-pointer flex-1"
                  onClick={() => {
                    if (account.uid !== user?.uid) {
                      switchAccount(account.uid);
                      onClose();
                    }
                  }}
                >
                  <div className="relative">
                    <img src={account.photoURL} alt={account.displayName} className="w-12 h-12 rounded-xl object-cover border border-white/10" />
                    {account.uid === user?.uid && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center border-2 border-black">
                        <Check size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{account.displayName}</h3>
                    <p className="text-[10px] text-white/40 font-medium">{account.email}</p>
                  </div>
                </div>
                
                {account.uid !== user?.uid && (
                  <button 
                    onClick={() => removeAccount(account.uid)}
                    className="p-2 hover:bg-blue-500/10 text-blue-500/40 hover:text-blue-500 rounded-lg transition-all"
                    title="Remove Account"
                  >
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            ))}

            {accounts.length === 0 && (
              <div className="text-center py-10 text-white/20 text-sm font-medium">
                No other accounts found.
              </div>
            )}
          </div>

          <div className="p-6 bg-black border-t border-white/5">
            <button 
              onClick={onClose}
              className="w-full px-4 py-3 rounded-xl text-sm font-black uppercase tracking-tight text-white/40 hover:bg-white/5 transition-all"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default SwitchAccountModal;
