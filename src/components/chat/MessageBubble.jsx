import React from 'react';
import { format } from 'date-fns';
import { Trash2, Reply } from 'lucide-react';
import Avatar from '../Avatar';
import LiquidButton from '../ui/LiquidButton';

const MessageBubble = ({ message, isMe, showHeader, onDelete, onViewProfile, onMarkRead, onReply, replyContext, parentMessage, isPending, isMentioned, onMentionClick, onJumpTo }) => {
    // message: { id, content, created_at, sender: { ...profile } }

    // Safely handle timestamp
    const timeString = format(new Date(message.created_at), 'p');

    // Parse content to detect mention pattern if missing
    // We already passed isMentioned, but we want to render the text segments.
    // Basic mention regex: @followed by characters

    // Fallback: If parentMessage is passed, use it as replyContext
    let effectiveReplyContext = replyContext || parentMessage;

    // DETECT FALLBACK REPLY (Quoted text)
    // Pattern: > @handle: message content\n\nActual message
    const fallbackReplyMatch = message.content.match(/^> @([\w_]+): (.*?)\n\n([\s\S]*)/);
    let displayContent = message.content;

    if (!effectiveReplyContext && fallbackReplyMatch) {
        // Construct a fake parent message from the text fallback
        effectiveReplyContext = {
            sender: { displayName: fallbackReplyMatch[1], handle: '@' + fallbackReplyMatch[1] },
            content: fallbackReplyMatch[2]
        };
        displayContent = fallbackReplyMatch[3];
    }

    // Determine context for "me"
    const isMyMessage = isMe;

    return (
        <div className={`flex gap-3 relative group/msg ${isMyMessage ? 'flex-row-reverse' : 'flex-row'} mb-1 ${isPending ? 'opacity-70 saturate-50' : 'opacity-100'}`}>
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

            <div className={`flex flex-col max-w-[70%] ${isMyMessage ? 'items-end' : 'items-start'}`}>
                {showHeader && (
                    <div className={`flex items-baseline gap-2 mb-1 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}>
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

                <div className="flex flex-col group/bubble relative">
                    {/* REPLY CONTEXT (WhatsApp Style) - Renders for both Schema & Fallback */}
                    {effectiveReplyContext && (
                        <div
                            className={`mb-1 text-xs p-2 rounded-lg border-l-4 select-none transition-all ${(effectiveReplyContext.id || message.reply_to_id) ? 'cursor-pointer' : 'cursor-default'
                                } ${isMyMessage
                                    ? 'bg-[#00000020] border-white/40 text-white/80'
                                    : 'bg-[#ffffff10] border-white/40 text-white/80'
                                }`}
                            onClick={(e) => {
                                e.stopPropagation();
                                const targetId = effectiveReplyContext.id || message.reply_to_id;
                                if (onJumpTo && targetId) {
                                    onJumpTo(targetId);
                                }
                            }}
                        >
                            <span className="font-bold block mb-0.5 text-[10px] text-white/60">
                                {effectiveReplyContext.sender?.displayName || effectiveReplyContext.sender?.handle || 'Unknown'}
                            </span>
                            <span className="line-clamp-1 italic opacity-90">
                                {effectiveReplyContext.content}
                            </span>
                        </div>
                    )}

                    {/* Parse content for mentions */}
                    <div className="relative">
                        {/* Actions container (Reply + Delete) - MOVED INSIDE and relative to THIS bubble */}
                        <div className={`absolute top-1/2 -translate-y-1/2 ${isMyMessage ? 'right-full mr-3' : 'left-full ml-3'} flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200`}>
                            {/* Reply Button */}
                            {onReply && (
                                <button
                                    onClick={() => onReply(message)}
                                    className="p-1.5 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                    title="Reply"
                                >
                                    <Reply size={14} />
                                </button>
                            )}

                            {/* Delete Button */}
                            {isMe && onDelete && (
                                <button
                                    onClick={() => onDelete(message.id)}
                                    className="p-1.5 rounded-full hover:bg-red-500/10 text-white/40 hover:text-red-500 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>

                        <div
                            className={`
                                px-4 py-2 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap
                                ${isMyMessage
                                    ? 'bg-white text-black rounded-tr-sm shadow-sm'
                                    : isMentioned
                                        ? 'bg-blue-500/20 text-blue-100 border border-blue-500/20 rounded-tl-sm hover:bg-blue-500/30 transition-colors'
                                        : 'bg-white/10 text-white rounded-tl-sm hover:bg-white/15 transition-colors'
                                }
                            `}
                        >
                            {/* {message.content} */}
                            {displayContent.split(/(@[\w_]+)/g).map((part, i) => {
                                if (part.startsWith('@')) {
                                    // It's a mention?
                                    // We can verify if it's a valid user handle if we had the list, but for now just highlight pattern.
                                    // If it matches current user's handle (we need that prop), maybe style differently?
                                    // For now, just bold and clickable.
                                    return (
                                        <span
                                            key={i}
                                            className={`font-bold cursor-pointer hover:underline opacity-90 ${isMentioned && !isMyMessage ? 'text-blue-200' : ''
                                                }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onMentionClick) {
                                                    onMentionClick(part);
                                                }
                                            }}
                                        >
                                            {part}
                                        </span>
                                    );
                                }
                                return part;
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
