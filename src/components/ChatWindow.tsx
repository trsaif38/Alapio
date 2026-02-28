import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from './ChatApp';
import { useAuth } from '../context/AuthContext';
import { db, storage, rtdb } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ref as rtdbRef, push, set, onValue, query as rtdbQuery, orderByChild } from 'firebase/database';
import { Send, Paperclip, Smile, Mic, MoreVertical, Search, Video, Phone, Plus, ChevronDown, ArrowLeft } from 'lucide-react';
import MessageItem from './MessageItem';

interface ChatWindowProps {
  selectedUser: UserProfile;
  onBack?: () => void;
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

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedUser, onBack }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setIsUploading(true);
    try {
      const sRef = storageRef(storage, `chats/${Date.now()}_${file.name}`);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);

      const chatId = [user.uid, selectedUser.uid].sort().join('_');
      const chatRef = rtdbRef(rtdb, `messages/${chatId}`);
      const newMessageRef = push(chatRef);
      
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
        fileName: file.name,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
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
          <div className="flex items-center border border-gray-300 rounded-lg bg-white/50 px-2 py-1 hover:bg-white transition-colors cursor-pointer">
            <Video size={18} className="mr-2" />
            <span className="text-sm font-medium mr-2">Call</span>
            <ChevronDown size={14} />
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
          <input 
            type="text" 
            placeholder="Type a message" 
            className="w-full bg-white rounded-lg px-4 py-2 outline-none text-[#3b4a54] text-sm shadow-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </form>

        <div className="text-[#54656f]">
          {inputText.trim() ? (
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <Send 
                size={24} 
                className="text-[#00a884]" 
                onClick={() => handleSendMessage()}
              />
            </button>
          ) : (
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
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
