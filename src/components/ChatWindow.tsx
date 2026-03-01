import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from './ChatApp';
import { useAuth } from '../context/AuthContext';
import { db, storage, rtdb } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as rtdbRef, push, set, onValue, query as rtdbQuery, orderByChild, get } from 'firebase/database';
import { Send, Paperclip, Smile, Mic, MoreVertical, Search, Video, Phone, Plus, ChevronDown, ArrowLeft } from 'lucide-react';
import MessageItem from './MessageItem';

interface ChatWindowProps {
  selectedUser: UserProfile;
  onBack?: () => void;
  onStartCall?: (user: UserProfile, type: 'audio' | 'video') => void;
}

export interface Message {
  id: string;
  senderId: string;
  senderName?: string;
  receiverId: string;
  text: string;
  timestamp: any;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  fileUrl?: string;
  fileName?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedUser, onBack, onStartCall }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!user || !selectedUser || !rtdb) return;

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const chatRef = rtdbRef(rtdb, `messages/${chatId}`);
    
    const unsubscribe = onValue(chatRef, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((childSnapshot) => {
        msgs.push({ id: childSnapshot.key, ...childSnapshot.val() } as Message);
      });
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [user, selectedUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user || !rtdb) return;

    const text = inputText;
    setInputText('');

    const chatId = selectedUser.isGroup 
      ? selectedUser.uid 
      : [user.uid, selectedUser.uid].sort().join('_');
    const chatRef = rtdbRef(rtdb, `messages/${chatId}`);
    const newMessageRef = push(chatRef);
    
    // Ensure mutual contact addition on first message
    if (!selectedUser.isGroup) {
      const myContactsRef = rtdbRef(rtdb, `users/${user.uid}/contacts`);
      const theirContactsRef = rtdbRef(rtdb, `users/${selectedUser.uid}/contacts`);
      
      const [mySnap, theirSnap] = await Promise.all([
        get(myContactsRef),
        get(theirContactsRef)
      ]);
      
      const myContacts = mySnap.exists() ? (mySnap.val() as string[]) : [];
      const theirContacts = theirSnap.exists() ? (theirSnap.val() as string[]) : [];
      
      if (!myContacts.includes(selectedUser.uid)) {
        await set(myContactsRef, [...myContacts, selectedUser.uid]);
      }
      if (!theirContacts.includes(user.uid)) {
        await set(theirContactsRef, [...theirContacts, user.uid]);
      }
    }

    await set(newMessageRef, {
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      receiverId: selectedUser.uid,
      text,
      type: 'text',
      status: 'sent',
      timestamp: Date.now(),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !rtdb) return;
    uploadFile(file);
  };

  const uploadFile = async (file: File | Blob, customFileName?: string) => {
    if (!user || !rtdb) return;
    setIsUploading(true);
    try {
      const fileName = customFileName || (file instanceof File ? file.name : `audio_${Date.now()}.webm`);
      const sRef = storageRef(storage, `chats/${Date.now()}_${fileName}`);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      const chatId = selectedUser.isGroup 
        ? selectedUser.uid 
        : [user.uid, selectedUser.uid].sort().join('_');
      const chatRef = rtdbRef(rtdb, `messages/${chatId}`);
      const newMessageRef = push(chatRef);
      
      // Ensure mutual contact addition on first file message
      if (!selectedUser.isGroup) {
        const myContactsRef = rtdbRef(rtdb, `users/${user.uid}/contacts`);
        const theirContactsRef = rtdbRef(rtdb, `users/${selectedUser.uid}/contacts`);
        
        const [mySnap, theirSnap] = await Promise.all([
          get(myContactsRef),
          get(theirContactsRef)
        ]);
        
        const myContacts = mySnap.exists() ? (mySnap.val() as string[]) : [];
        const theirContacts = theirSnap.exists() ? (theirSnap.val() as string[]) : [];
        
        if (!myContacts.includes(selectedUser.uid)) {
          await set(myContactsRef, [...myContacts, selectedUser.uid]);
        }
        if (!theirContacts.includes(user.uid)) {
          await set(theirContactsRef, [...theirContacts, user.uid]);
        }
      }

      let type: Message['type'] = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      await set(newMessageRef, {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        receiverId: selectedUser.uid,
        text: '',
        type,
        status: 'sent',
        fileUrl: url,
        fileName: fileName,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        uploadFile(audioBlob, `voice_message_${Date.now()}.webm`);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full bg-black relative">
      {/* Header */}
      <div className="h-[70px] bg-[#111] px-6 flex items-center justify-between border-b border-white/5 shadow-xl z-10">
        <div className="flex items-center cursor-pointer">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-2 mr-3 hover:bg-white/5 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} className="text-white/60" />
            </button>
          )}
          <div className="relative">
            <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="w-11 h-11 rounded-2xl mr-4 object-cover border border-white/10 shadow-lg" />
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-[#111] rounded-full ${selectedUser.isGroup ? 'hidden' : ''}`}></div>
          </div>
          <div>
            <h3 className="text-white font-bold leading-tight tracking-tight">{selectedUser.displayName}</h3>
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
              {selectedUser.isGroup ? 'Group Chat' : 'Online'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-white/60">
          {!selectedUser.isGroup && (
            <>
              <button 
                onClick={() => onStartCall?.(selectedUser, 'video')}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-all hover:text-blue-600"
                title="Video Call"
              >
                <Video size={20} />
              </button>
              <button 
                onClick={() => onStartCall?.(selectedUser, 'audio')}
                className="p-2.5 hover:bg-white/5 rounded-xl transition-all hover:text-blue-600"
                title="Voice Call"
              >
                <Phone size={20} />
              </button>
              <div className="w-[1px] h-6 bg-white/5 mx-2"></div>
            </>
          )}
          <MoreVertical size={20} className="cursor-pointer hover:text-white transition-colors" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 md:px-12 md:py-8 space-y-4 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-repeat">
        {messages.map((msg) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            isOwn={msg.senderId === user?.uid} 
            senderName={msg.senderName}
            showSenderName={selectedUser.isGroup}
          />
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="bg-[#111] px-6 py-4 flex items-center gap-4 border-t border-white/5 shadow-2xl">
        <div className="flex items-center gap-2 text-white/40">
          <button className="p-2 hover:bg-white/5 rounded-xl transition-colors hover:text-blue-600">
            <Plus size={24} onClick={() => fileInputRef.current?.click()} />
          </button>
          <button className="p-2 hover:bg-white/5 rounded-xl transition-colors hover:text-blue-600">
            <Smile size={24} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
        </div>
        
        <form onSubmit={handleSendMessage} className="flex-1">
          {isRecording ? (
            <div className="flex items-center justify-between bg-black rounded-xl px-4 py-2.5 text-emerald-500 font-bold border border-emerald-500/30">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-xs uppercase tracking-widest">Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
              </div>
              <button 
                type="button" 
                onClick={stopRecording}
                className="text-emerald-500 hover:text-emerald-400 text-xs font-black uppercase tracking-tighter"
              >
                Cancel
              </button>
            </div>
          ) : (
            <input 
              type="text" 
              placeholder="Write a message..." 
              className="w-full bg-black rounded-xl px-4 py-2.5 outline-none text-white text-sm border border-white/5 focus:border-blue-600/50 transition-all placeholder:text-white/20"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          )}
        </form>

        <div className="text-white/60">
          {inputText.trim() ? (
            <button 
              className="w-11 h-11 bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95" 
              onClick={() => handleSendMessage()}
            >
              <Send size={20} />
            </button>
          ) : (
            <button 
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isRecording ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-white/5 hover:bg-white/10 text-white/40'}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>

      {isUploading && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#00a884]"></div>
            <span className="text-sm font-medium">Uploading file...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
