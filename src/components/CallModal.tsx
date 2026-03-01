import React, { useEffect, useState, useRef } from 'react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CallInfo {
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  receiverName: string;
  receiverPhoto: string;
  type: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended';
  isIncoming: boolean;
}

interface CallModalProps {
  call: CallInfo;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
}

const CallModal: React.FC<CallModalProps> = ({ call, onAccept, onReject, onEnd }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let timer: any;
    if (call.status === 'accepted') {
      timer = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [call.status]);

  useEffect(() => {
    if (call.status === 'accepted' && call.type === 'video') {
      // In a real app, we would setup WebRTC here.
      // For this demo, we'll just show the local camera.
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Camera access denied", err));
    }
  }, [call.status, call.type]);

  const formatDuration = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const otherPerson = call.isIncoming 
    ? { name: call.callerName, photo: call.callerPhoto }
    : { name: call.receiverName, photo: call.receiverPhoto };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className={`relative bg-[#111b21] rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 ${isFullScreen ? 'w-full h-full' : 'w-full max-w-md aspect-[9/16] md:aspect-video'}`}>
        
        {/* Video Background */}
        {call.status === 'accepted' && call.type === 'video' && (
          <div className="absolute inset-0 bg-black">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover opacity-50"
            />
            {/* Local Preview */}
            <div className="absolute top-4 right-4 w-32 aspect-[9/16] bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-gray-700">
                  <VideoOff size={24} className="text-white/50" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-between p-8 z-10">
          
          {/* Top Info */}
          <div className="text-center mt-12">
            <div className="relative inline-block mb-6">
              <img 
                src={otherPerson.photo} 
                alt={otherPerson.name} 
                className={`w-32 h-32 rounded-full border-4 border-[#00a884] shadow-xl transition-all duration-500 ${call.status === 'ringing' ? 'animate-pulse scale-110' : ''}`}
              />
              {call.status === 'ringing' && (
                <div className="absolute inset-0 rounded-full border-4 border-[#00a884] animate-ping opacity-50" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{otherPerson.name}</h2>
            <p className="text-[#00a884] font-medium tracking-wider uppercase text-sm">
              {call.status === 'ringing' 
                ? (call.isIncoming ? 'Incoming Call...' : 'Calling...') 
                : (call.status === 'accepted' ? formatDuration(duration) : 'Ending...')}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-8 w-full mb-12">
            
            {call.status === 'ringing' ? (
              <div className="flex items-center justify-center gap-16">
                <button 
                  onClick={onReject}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90"
                >
                  <PhoneOff size={32} />
                </button>
                {call.isIncoming && (
                  <button 
                    onClick={onAccept}
                    className="w-16 h-16 bg-[#00a884] hover:bg-[#008f6f] rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90 animate-bounce"
                  >
                    {call.type === 'video' ? <Video size={32} /> : <Phone size={32} />}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-6 w-full">
                <div className="flex items-center justify-center gap-8">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                  >
                    {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>
                  
                  {call.type === 'video' && (
                    <button 
                      onClick={() => setIsVideoOff(!isVideoOff)}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                      {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                    </button>
                  )}

                  <button 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    {isFullScreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                  </button>
                </div>

                <button 
                  onClick={onEnd}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-90"
                >
                  <PhoneOff size={32} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default CallModal;
