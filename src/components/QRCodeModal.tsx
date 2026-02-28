import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();

  if (!isOpen || !user) return null;

  // The QR code will contain the user's UID
  const qrValue = user.uid;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center bg-[#00a884] text-white">
          <h2 className="text-lg font-bold">My QR Code</h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center gap-6">
          <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100">
            <QRCodeSVG 
              value={qrValue} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-800">{user.displayName}</h3>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>

          <div className="flex gap-4 w-full">
            <button 
              className="flex-1 flex items-center justify-center gap-2 bg-[#f0f2f5] hover:bg-gray-200 py-2.5 rounded-lg font-medium transition-colors"
              onClick={() => alert("QR Code saved to gallery!")}
            >
              <Download size={18} />
              Save
            </button>
            <button 
              className="flex-1 flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#008f6f] text-white py-2.5 rounded-lg font-medium transition-colors"
              onClick={() => alert("Sharing options opened!")}
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 text-center text-xs text-gray-400">
          Your QR code is private. Only share it with people you trust.
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
