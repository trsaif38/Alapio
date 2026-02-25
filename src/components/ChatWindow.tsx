import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from './ChatApp';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, where, or, and } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Paperclip, Smile, Mic, MoreVertical, Search, Image as ImageIcon, FileText, Video, Music } from 'lucide-react';
import MessageItem from './MessageItem';

interface ChatWindowProps {
  selectedUser: UserProfile;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  fileUrl?: string;
  fileName?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ selectedUser }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !selectedUser) return;

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    
    // In a real app, you'd probably use a 'chats' collection with 'messages' subcollection
    // For simplicity, we'll use a flat 'messages' collection with a combined chatId or sender/receiver fields
    const q = query(
      collection(db, 'messages'),
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        msgs.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(msgs);
    });

    return unsubscribe;
  }, [user, selectedUser]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user) return;

    const text = inputText;
    setInputText('');

    const chatId = [user.uid, selectedUser.uid].sort().join('_');
    
    await addDoc(collection(db, 'messages'), {
      chatId,
      senderId: user.uid,
      receiverId: selectedUser.uid,
      text,
      type: 'text',
      timestamp: serverTimestamp(),
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `chats/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      const chatId = [user.uid, selectedUser.uid].sort().join('_');
      
      let type: Message['type'] = 'file';
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';

      await addDoc(collection(db, 'messages'), {
        chatId,
        senderId: user.uid,
        receiverId: selectedUser.uid,
        text: '',
        type,
        fileUrl: url,
        fileName: file.name,
        timestamp: serverTimestamp(),
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
      <div className="h-[60px] bg-[#f0f2f5] px-4 flex items-center justify-between border-l border-[#d1d7db]">
        <div className="flex items-center cursor-pointer">
          <img src={selectedUser.photoURL} alt={selectedUser.displayName} className="w-10 h-10 rounded-full mr-3" />
          <div>
            <h3 className="text-[#111b21] font-medium leading-tight">{selectedUser.displayName}</h3>
            <span className="text-xs text-[#667781]">online</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[#54656f]">
          <Search size={20} className="cursor-pointer" />
          <MoreVertical size={20} className="cursor-pointer" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-2 custom-scrollbar bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} isOwn={msg.senderId === user?.uid} />
        ))}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-4">
        <div className="flex items-center gap-4 text-[#54656f]">
          <Smile size={26} className="cursor-pointer" />
          <div className="relative">
            <Paperclip 
              size={24} 
              className="cursor-pointer rotate-45" 
              onClick={() => fileInputRef.current?.click()}
            />
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </div>
        </div>
        
        <form onSubmit={handleSendMessage} className="flex-1">
          <input 
            type="text" 
            placeholder="Type a message" 
            className="w-full bg-white rounded-lg px-4 py-2.5 outline-none text-[#3b4a54] text-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </form>

        <div className="text-[#54656f]">
          {inputText.trim() ? (
            <Send 
              size={24} 
              className="cursor-pointer text-[#00a884]" 
              onClick={() => handleSendMessage()}
            />
          ) : (
            <Mic size={24} className="cursor-pointer" />
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
