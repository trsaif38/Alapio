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

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    const chatRef = rtdbRef(rtdb, `messages/${chatId}`);
    const newMessageRef = push(chatRef);
    
    // Ensure mutual contact addition on first message
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

    await set(newMessageRef, {
      senderId: user.uid,
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

      const chatId = [user.uid, selectedUser.uid].sort().join('_');
      const chatRef = rtdbRef(rtdb, `messages/${chatId}`);
      const newMessageRef = push(chatRef);
      
      // Ensure mutual contact addition on first file message
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

      let type: Message['type'] = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      await set(newMessageRef, {
        senderId: user.uid,
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
    <div className="flex flex-col w-full h-full bg-[#efeae2] relative">
      {/* Header */}
      <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between border-l border-gray-300">
        <div className="flex items-center cursor-pointer">
          {onBack && (
            <button 
              onClick={onBack}
              className="md:hidden p-2 mr-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ArrowLeft size={20} className="text-[#54656f]" />
            </button>
          )}
          <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="w-10 h-10 rounded-full mr-3" />
          <div>
            <h3 className="text-[#111b21] font-medium leading-tight">{selectedUser.displayName}</h3>
            <span className="text-xs text-[#667781]">online</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[#54656f]">
          <div 
            onClick={() => onStartCall?.(selectedUser, 'video')}
            className="flex items-center border border-gray-300 rounded-lg bg-white/50 px-2 py-1 hover:bg-white transition-colors cursor-pointer"
          >
            <Video size={18} className="mr-2" />
            <span className="text-sm font-medium mr-2">Video Call</span>
          </div>
          <div 
            onClick={() => onStartCall?.(selectedUser, 'audio')}
            className="flex items-center border border-gray-300 rounded-lg bg-white/50 px-2 py-1 hover:bg-white transition-colors cursor-pointer"
          >
            <Phone size={18} className="mr-2" />
            <span className="text-sm font-medium mr-2">Call</span>
          </div>
          <div className="w-[1px] h-6 bg-gray-300 mx-1"></div>
          <Search size={20} className="cursor-pointer hover:text-black" />
          <MoreVertical size={20} className="cursor-pointer hover:text-black" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:px-16 md:py-6 space-y-2 custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} isOwn={msg.senderId === user?.uid} />
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3">
        <div className="flex items-center gap-3 text-[#54656f]">
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <Plus size={24} onClick={() => fileInputRef.current?.click()} />
          </button>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
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
            <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2 text-[#00a884] font-medium animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span>Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</span>
              </div>
              <button 
                type="button" 
                onClick={stopRecording}
                className="text-red-500 hover:text-red-600 font-bold"
              >
                STOP
              </button>
            </div>
          ) : (
            <input 
              type="text" 
              placeholder="Type a message" 
              className="w-full bg-white rounded-lg px-4 py-2 outline-none text-[#3b4a54] text-sm shadow-sm"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          )}
        </form>

        <div className="text-[#54656f]">
          {inputText.trim() ? (
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors" onClick={() => handleSendMessage()}>
              <Send 
                size={24} 
                className="text-[#00a884]" 
              />
            </button>
          ) : (
            <button 
              className={`p-2 rounded-full transition-colors ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-gray-200'}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              <Mic size={24} />
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
