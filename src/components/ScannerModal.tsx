import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  useEffect(() => {
    if (!isOpen) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        onScanSuccess(decodedText);
        scanner.clear();
        onClose();
      },
      (error) => {
        // console.warn(error);
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [isOpen, onClose, onScanSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-[#111] rounded-[2rem] w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-white/10 transform animate-in zoom-in duration-200">
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black">
          <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Scan QR Code</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-white/60">
            <X size={24} />
          </button>
        </div>
        <div className="p-6">
          <div id="reader" className="w-full rounded-2xl overflow-hidden border-2 border-blue-600/20"></div>
        </div>
        <div className="p-6 bg-black border-t border-white/5 text-center text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">
          Point your camera at an Alapio QR code
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;
