import React from 'react';
import { Message } from './ChatWindow';
import { format } from 'date-fns';
import { FileText, Download, Play, Music, Clock, Check, CheckCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
}

const MessageItem: React.FC<MessageItemProps> = ({ message, isOwn }) => {
  const getTime = () => {
    if (!message.timestamp) return '...';
    try {
      const date = typeof message.timestamp === 'number' 
        ? new Date(message.timestamp) 
        : (message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp));
      return format(date, 'h:mm a');
    } catch (e) {
      return '...';
    }
  };

  const time = getTime();

  const renderStatus = () => {
    if (!isOwn) return null;

    switch (message.status) {
      case 'sending':
        return <Clock size={12} className="text-[#667781]" />;
      case 'sent':
        return <Check size={14} className="text-[#667781]" />;
      case 'delivered':
        return <CheckCheck size={14} className="text-[#667781]" />;
      case 'read':
        return <CheckCheck size={14} className="text-[#53bdeb]" />;
      default:
        // Default to sent if no status is provided (for backward compatibility)
        return (
          <svg viewBox="0 0 16 11" width="16" height="11" fill="#53bdeb">
            <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063L8.666 9.88a.32.32 0 01-.484.032l-.358-.325a.32.32 0 00-.484.032l-.378.48a.418.418 0 00.036.54l1.32 1.267a.32.32 0 00.484-.034l6.272-8.048a.366.366 0 00-.064-.512zm-4.1 0l-.478-.372a.365.365 0 00-.51.063L4.566 9.88a.32.32 0 01-.484.032L1.892 7.77a.366.366 0 00-.516.005l-.423.433a.364.364 0 00.006.514l3.255 3.185a.32.32 0 00.484-.033l6.272-8.048a.365.365 0 00-.063-.51z" />
          </svg>
        );
    }
  };

  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="relative group">
            <img 
              src={message.fileUrl} 
              alt="Sent image" 
              className="max-w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
              loading="lazy"
            />
            <div className="absolute bottom-1 right-1 bg-black/30 px-1 rounded text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
              {time}
            </div>
          </div>
        );
      case 'video':
        return (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video src={message.fileUrl} className="max-w-full max-h-[300px]" controls />
          </div>
        );
      case 'audio':
        return (
          <div className="flex items-center gap-3 min-w-[200px] py-1">
            <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center text-white">
              <Music size={20} />
            </div>
            <audio src={message.fileUrl} controls className="h-8 flex-1" />
          </div>
        );
      case 'file':
        return (
          <a 
            href={message.fileUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 bg-black/5 rounded-lg hover:bg-black/10 transition-colors"
          >
            <div className="w-10 h-10 bg-[#7b8fa1] rounded-lg flex items-center justify-center text-white">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{message.fileName}</p>
              <p className="text-[10px] opacity-60 uppercase">Document</p>
            </div>
            <Download size={18} className="text-[#54656f]" />
          </a>
        );
      default:
        return <p className="text-[14.2px] leading-relaxed break-words">{message.text}</p>;
    }
  };

  return (
    <div className={cn("flex w-full mb-1", isOwn ? 'justify-end' : 'justify-start')}>
      <div 
        className={cn(
          "max-w-[85%] md:max-w-[65%] rounded-lg px-2 py-1.5 shadow-sm relative",
          isOwn 
            ? 'bg-[#d9fdd3] rounded-tr-none message-bubble-own' 
            : 'bg-white rounded-tl-none message-bubble-other'
        )}
      >
        <div className="pr-12">
          {renderContent()}
        </div>
        <div className="absolute bottom-1 right-2 flex items-center gap-1">
          <span className="text-[10px] text-[#667781] uppercase">{time}</span>
          {renderStatus()}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
