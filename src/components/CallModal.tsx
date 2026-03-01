import React, { useEffect, useState, useRef } from 'react';
import { Phone, Video, PhoneOff, Mic, MicOff, VideoOff, Maximize2, Minimize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { rtdb } from '../lib/firebase';
import { ref, onValue, set, push, onChildAdded, off } from 'firebase/database';

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

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

const CallModal: React.FC<CallModalProps> = ({ call, onAccept, onReject, onEnd }) => {
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

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
    if (call.status === 'accepted') {
      setupWebRTC();
    }
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (pc.current) {
        pc.current.close();
      }
    };
  }, [call.status]);

  const setupWebRTC = async () => {
    if (!rtdb) return;

    pc.current = new RTCPeerConnection(servers);
    
    // Get local media
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: call.type === 'video',
        audio: true
      });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));
    } catch (err) {
      console.error("Media access error:", err);
    }

    // Handle remote stream
    pc.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    const callId = [call.callerId, call.receiverId].sort().join('_');
    const signalRef = ref(rtdb, `signaling/${callId}`);

    // ICE Candidates
    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        const candidatesRef = ref(rtdb, `signaling/${callId}/candidates/${call.isIncoming ? 'receiver' : 'caller'}`);
        push(candidatesRef, event.candidate.toJSON());
      }
    };

    // Listen for remote ICE candidates
    const remoteCandidatesRef = ref(rtdb, `signaling/${callId}/candidates/${call.isIncoming ? 'caller' : 'receiver'}`);
    const candidateQueue: RTCIceCandidate[] = [];
    
    onChildAdded(remoteCandidatesRef, (snapshot) => {
      const candidate = new RTCIceCandidate(snapshot.val());
      if (pc.current?.remoteDescription) {
        pc.current.addIceCandidate(candidate).catch(e => console.error("Error adding ice candidate", e));
      } else {
        candidateQueue.push(candidate);
      }
    });

    const processQueuedCandidates = () => {
      while (candidateQueue.length > 0) {
        const candidate = candidateQueue.shift();
        if (candidate) {
          pc.current?.addIceCandidate(candidate).catch(e => console.error("Error adding queued ice candidate", e));
        }
      }
    };

    if (!call.isIncoming) {
      // Caller: Create Offer
      const offerDescription = await pc.current.createOffer();
      await pc.current.setLocalDescription(offerDescription);
      
      const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
      };
      await set(ref(rtdb, `signaling/${callId}/offer`), offer);

      // Listen for Answer
      onValue(ref(rtdb, `signaling/${callId}/answer`), async (snapshot) => {
        const data = snapshot.val();
        if (data && !pc.current?.currentRemoteDescription) {
          const answerDescription = new RTCSessionDescription(data);
          await pc.current?.setRemoteDescription(answerDescription);
          processQueuedCandidates();
        }
      });
    } else {
      // Receiver: Listen for Offer
      onValue(ref(rtdb, `signaling/${callId}/offer`), async (snapshot) => {
        const data = snapshot.val();
        if (data && !pc.current?.currentRemoteDescription) {
          const offerDescription = new RTCSessionDescription(data);
          await pc.current?.setRemoteDescription(offerDescription);
          
          const answerDescription = await pc.current?.createAnswer();
          await pc.current?.setLocalDescription(answerDescription);
          
          const answer = {
            sdp: answerDescription?.sdp,
            type: answerDescription?.type,
          };
          await set(ref(rtdb, `signaling/${callId}/answer`), answer);
          processQueuedCandidates();
        }
      });
    }
  };

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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
    >
      <div className={`relative bg-[#0f172a] rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-500 border border-white/10 ${isFullScreen ? 'w-full h-full' : 'w-full max-w-lg aspect-[9/16] md:aspect-video'}`}>
        
        {/* Video Background */}
        {call.status === 'accepted' && (
          <div className="absolute inset-0 bg-black">
            <video 
              ref={remoteVideoRef} 
              autoPlay 
              playsInline 
              className={`w-full h-full object-cover transition-opacity duration-1000 ${call.type === 'video' ? 'opacity-100' : 'opacity-0'}`}
            />
            {/* Local Preview */}
            <div className="absolute top-6 right-6 w-32 md:w-48 aspect-[9/16] bg-slate-900 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl z-20">
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : ''}`}
              />
              {isVideoOff && (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <VideoOff size={24} className="text-white/20" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-between p-12 z-10">
          
          {/* Top Info */}
          <div className="text-center mt-12">
            <div className="relative inline-block mb-8">
              <img 
                src={otherPerson.photo} 
                alt={otherPerson.name} 
                className={`w-32 h-32 md:w-40 md:h-40 rounded-[2.5rem] border-4 border-blue-500 shadow-2xl transition-all duration-700 object-cover ${call.status === 'ringing' ? 'animate-pulse scale-110' : 'scale-100'}`}
              />
              {call.status === 'ringing' && (
                <div className="absolute inset-0 rounded-[2.5rem] border-4 border-blue-500 animate-ping opacity-30" />
              )}
            </div>
            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">{otherPerson.name}</h2>
            <div className="px-4 py-1.5 bg-white/5 rounded-full inline-block backdrop-blur-md border border-white/10">
              <p className="text-blue-400 font-black tracking-[0.2em] uppercase text-[10px]">
                {call.status === 'ringing' 
                  ? (call.isIncoming ? 'Incoming Connection...' : 'Establishing Link...') 
                  : (call.status === 'accepted' ? formatDuration(duration) : 'Terminating...')}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col items-center gap-10 w-full mb-8">
            
            {call.status === 'ringing' ? (
              <div className="flex items-center justify-center gap-12">
                <button 
                  onClick={onReject}
                  className="w-20 h-20 bg-blue-900/50 hover:bg-blue-800 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-900/20 transition-all active:scale-90 border border-blue-500/30"
                >
                  <PhoneOff size={32} />
                </button>
                {call.isIncoming && (
                  <button 
                    onClick={onAccept}
                    className="w-20 h-20 bg-emerald-500 hover:bg-emerald-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20 transition-all active:scale-90 animate-bounce"
                  >
                    {call.type === 'video' ? <Video size={32} /> : <Phone size={32} />}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-8 w-full">
                <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={() => setIsMuted(!isMuted)}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isMuted ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  
                  {call.type === 'video' && (
                    <button 
                      onClick={() => setIsVideoOff(!isVideoOff)}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${isVideoOff ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'}`}
                    >
                      {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>
                  )}

                  <button 
                    onClick={() => setIsFullScreen(!isFullScreen)}
                    className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10"
                  >
                    {isFullScreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                  </button>
                </div>

                <button 
                  onClick={onEnd}
                  className="w-20 h-20 bg-blue-900/50 hover:bg-blue-800 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-900/20 transition-all active:scale-90 border border-blue-500/30"
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
