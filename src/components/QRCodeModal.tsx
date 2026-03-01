import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  if (!isOpen || !user) return null;

  const qrValue = user.uid;

  const handleSave = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `alapio_qr_${user.displayName?.replace(/\s+/g, '_').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
      <div className="bg-[#111] rounded-[2rem] w-full max-w-sm overflow-hidden flex flex-col shadow-2xl border border-white/10">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black">
          <h2 className="text-xl font-black text-white uppercase tracking-tight italic">My QR Code</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 flex flex-col items-center gap-8">
          <div className="bg-white p-6 rounded-[2rem] shadow-2xl shadow-blue-600/10 border-4 border-blue-600/20">
            <QRCodeCanvas 
              id="qr-canvas"
              ref={canvasRef}
              value={qrValue} 
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>
          
          <div className="text-center space-y-1">
            <h3 className="text-2xl font-black text-white italic">{user.displayName}</h3>
            <p className="text-xs text-blue-600 font-black uppercase tracking-widest">{user.email}</p>
          </div>

          <div className="flex gap-4 w-full">
            <button 
              className="flex-1 flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-4 rounded-2xl font-black uppercase tracking-tight transition-all active:scale-95"
              onClick={handleSave}
            >
              <Download size={18} className="text-blue-600" />
              Save
            </button>
            <button 
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-tight transition-all shadow-lg shadow-blue-600/20 active:scale-95"
              onClick={() => alert("Sharing options opened!")}
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
        </div>
        
        <div className="p-6 bg-black border-t border-white/5 text-center text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">
          Your QR code is private. Only share it with people you trust.
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
