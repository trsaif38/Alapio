import React, { useState } from 'react';
import { X, UserPlus, Mail } from 'lucide-react';

interface NewContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (email: string) => Promise<void>;
}

const NewContactModal: React.FC<NewContactModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setLoading(true);
      try {
        await onAdd(email.trim());
        setEmail('');
        onClose();
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-[#111] rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-white/10 transform animate-in zoom-in duration-200">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black">
          <div className="flex items-center gap-3">
            <UserPlus size={20} className="text-blue-600" />
            <h2 className="text-xl font-black text-white uppercase tracking-tight italic">New Contact</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60" disabled={loading}>
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <label htmlFor="email" className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Gmail Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input
                id="email"
                type="email"
                placeholder="example@gmail.com"
                className="w-full pl-12 pr-4 py-4 bg-black border border-white/5 rounded-2xl outline-none text-white focus:border-blue-600/50 transition-all disabled:opacity-50 placeholder:text-white/10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
                required
                disabled={loading}
              />
            </div>
            <p className="text-[10px] text-white/20 mt-1 font-medium leading-relaxed">
              Enter the Gmail address of the person you want to chat with.
            </p>
          </div>

          <div className="flex gap-4 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-4 rounded-2xl font-black uppercase tracking-tight text-white/40 hover:bg-white/5 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] px-4 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-tight shadow-lg shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Searching...
                </>
              ) : (
                'Add Contact'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewContactModal;
