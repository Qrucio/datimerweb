import React from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import Avatar from '../Avatar';
import LiquidButton from '../ui/LiquidButton';

const MessageBubble = ({ message, isMe, showHeader = true, onDelete, onViewProfile }) => {
    // message: { id, content, created_at, sender: { ...profile } }

    // Safely handle timestamp
    const timestamp = new Date(message.created_at);
    const timeString = format(timestamp, 'h:mm a');

    return (
        <div className={`flex gap-3 relative group/msg ${isMe ? 'flex-row-reverse' : 'flex-row'} mb-1`}>
            {/* Avatar */}
            <div className={`shrink-0 w-8 h-8 ${showHeader ? 'opacity-100' : 'opacity-0 h-0'}`}>
                {showHeader && (
                    <div
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onViewProfile && onViewProfile(message.sender)}
                    >
                        <Avatar userData={message.sender} size="sm" />
                    </div>
                )}
            </div>

            <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                {showHeader && (
                    <div className={`flex items-baseline gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <span
                            className="text-xs font-bold text-white/90 cursor-pointer hover:underline"
                            onClick={() => onViewProfile && onViewProfile(message.sender)}
                        >
                            {message.sender?.display_name || 'Unknown'}
                        </span>
                        <span className="text-[10px] text-white/40">
                            {timeString}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-2 group/bubble">
                    {/* Delete Button (Liquid) */}
                    {isMe && onDelete && (
                        <div className="opacity-0 group-hover/msg:opacity-100 scale-75 transition-opacity duration-200">
                            <LiquidButton
                                icon={Trash2}
                                label="Delete?"
                                onConfirm={() => onDelete(message.id)}
                                variant="danger"
                                size="sm"
                            />
                        </div>
                    )}

                    <div
                        className={`
                            px-4 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap
                            ${isMe
                                ? 'bg-white text-black rounded-tr-sm'
                                : 'bg-white/10 text-white rounded-tl-sm hover:bg-white/15 transition-colors'
                            }
                        `}
                    >
                        {message.content}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
