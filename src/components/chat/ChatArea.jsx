import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Hash, Lock, Plus, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MessageBubble from './MessageBubble';
import { format } from 'date-fns';

const ChatArea = ({ serverId, user, isFocusing = false, userRole, lastReadTime, onViewProfile, onMarkRead, onMentionClick, members = [] }) => {
    // --- STATE ---
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);

    // --- MENTION AUTOCOMPLETE STATE ---
    const [mentionMenuOpen, setMentionMenuOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [activeMentionIndex, setActiveMentionIndex] = useState(0);

    // --- REPLY STATE ---
    const [replyingTo, setReplyingTo] = useState(null);

    const inputRef = useRef(null);

    // --- REFS ---
    const messagesEndRef = useRef(null);
    const dividerTimeRef = useRef(lastReadTime); // Capture initial read time to freeze divider position

    // --- STRICT FOCUS MODE ---
    if (isFocusing) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full bg-[#0a0a0a]">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <Lock size={32} className="text-red-500" />
                </div>
                <h2 className="text-2xl font-serif-display text-white mb-2">Focus Mode Active</h2>
                <p className="text-white/40 max-w-xs text-sm leading-relaxed">
                    Chat is locked to help you stay in the zone. Finish your session to reconnect with your team.
                </p>
            </div>
        );
    }

    // --- FETCH MESSAGES & SUBSCRIBE ---
    useEffect(() => {
        if (!serverId) return;

        const fetchMessages = async () => {
            setIsLoading(true);
            // Fetch last 50 messages for this SERVER
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('server_id', serverId) // Filter by SERVER now
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error("Message Fetch Error:", error);
                return;
            }

            if (data) {
                const msgs = data.reverse();

                // Fetch Profiles
                const senderIds = [...new Set(msgs.map(m => m.sender_id))];
                if (senderIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, display_name, handle, photo_url, is_pro')
                        .in('id', senderIds);

                    // Map profiles to messages
                    const profileMap = {};
                    profiles?.forEach(p => profileMap[p.id] = p);

                    const enriched = msgs.map(m => {
                        const profile = profileMap[m.sender_id] || { display_name: 'Unknown', id: m.sender_id };
                        return {
                            ...m,
                            sender: {
                                ...profile,
                                displayName: profile.display_name,
                                photoURL: profile.photo_url,
                                isPro: profile.is_pro
                            }
                        };
                    });
                    setMessages(enriched);
                } else {
                    setMessages(msgs);
                }
            }
            setIsLoading(false);
        };

        fetchMessages();

        // REALTIME SUBSCRIPTION
        const channel = supabase
            .channel(`server_chat:${serverId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `server_id=eq.${serverId}`
                },
                async (payload) => {
                    const newMsg = payload.new;
                    // MARK AS READ INSTANTLY if this is the active server
                    if (onMarkRead && document.hasFocus()) {
                        onMarkRead(serverId);
                    }

                    let senderProfile = null;
                    if (newMsg.sender_id === user.uid) {
                        senderProfile = {
                            id: user.uid,
                            displayName: user.displayName || user.handle || 'You',
                            handle: user.handle, // Verify this is passed
                            photoURL: user.photoURL || user.user_metadata?.avatar_url,
                            isPro: user.isPro
                        };
                    } else {
                        // Fetch their profile
                        const { data } = await supabase.from('profiles').select('id, display_name, handle, photo_url, is_pro').eq('id', newMsg.sender_id).single();
                        if (data) {
                            senderProfile = {
                                ...data,
                                displayName: data.display_name,
                                photoURL: data.photo_url,
                                isPro: data.is_pro
                            };
                        }
                    }

                    const enrichedMsg = {
                        ...newMsg,
                        sender: senderProfile || { displayName: 'Unknown', id: newMsg.sender_id }
                    };

                    setMessages(prev => {
                        // Check if we already have this message (by ID)
                        if (prev.some(m => m.id === newMsg.id)) {
                            // Already exists (maybe swapped via optimistic logic), simple update if needed or ignore
                            return prev.map(m => m.id === newMsg.id ? enrichedMsg : m);
                        }

                        // Optimistic Update Handling for "Pending" messages from ME
                        // If this is a message from the current user, try to replace a pending message.
                        if (newMsg.sender_id === user.uid) {
                            const pendingIndex = prev.findIndex(m =>
                                m.isPending &&
                                m.content === enrichedMsg.content // Match by content for optimistic replacement
                            );

                            if (pendingIndex !== -1) {
                                // Replace pending with real message
                                const updated = [...prev];
                                updated[pendingIndex] = enrichedMsg;
                                return updated;
                            }
                        }

                        // If not a duplicate and no pending message was replaced, just append it.
                        return [...prev, enrichedMsg];
                    });
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'messages'
                },
                (payload) => {
                    // Remove deleted message from state
                    const deletedId = payload.old.id;
                    setMessages(prev => prev.filter(msg => msg.id !== deletedId));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [serverId, user]); // Removed unnecessary deps

    // --- SCROLL STATE ---
    const scrollContainerRef = useRef(null);
    const isAtBottomRef = useRef(true); // Default to auto-scroll
    const [showScrollDown, setShowScrollDown] = useState(false);

    // Track scroll position manually
    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        // Check if near bottom (e.g. within 100px)
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        isAtBottomRef.current = isNearBottom;
        setShowScrollDown(!isNearBottom);
    };

    // Jump to Original Message Handler
    const handleJumpToMessage = (msgId) => {
        if (!msgId) return;
        const el = document.getElementById(`msg-${msgId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add momentary highlight
            el.classList.add('bg-white/5', 'rounded-lg', 'transition-colors', 'duration-500');
            setTimeout(() => {
                el.classList.remove('bg-white/5');
            }, 1000);
        } else {
            // If message is too old and not loaded:
            // We can't jump. For now, we could show a toast or alert, or just do nothing.
            // Given limitations, maybe simple console log.
            console.log("Message not loaded in current view");
        }
    };

    // Scroll To Bottom Handler
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- MARK READ ON ACTIVE ---
    useEffect(() => {
        if (!isLoading && serverId && onMarkRead) {
            // Mark read immediately when chat opens/updates if focused
            if (document.hasFocus()) {
                onMarkRead(serverId);
            }

            // Also listen for focus events to mark read when user returns tab
            const handleFocus = () => onMarkRead(serverId);
            window.addEventListener('focus', handleFocus);
            return () => window.removeEventListener('focus', handleFocus);
        }
    }, [serverId, isLoading, onMarkRead, messages.length]);

    // SMART AUTO-SCROLL (New Messages)
    useEffect(() => {
        if (messages.length === 0) return;
        const lastMsg = messages[messages.length - 1];
        const isMe = lastMsg.sender_id === user.uid;

        // Scroll if it's MY message OR if I was already at the bottom
        if (isMe || isAtBottomRef.current) {
            // Use smooth for "alive" feel, but 'auto' can be snappier. User asked for polish.
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, user.uid]);

    // REPLY BANNER ADJUSTMENT
    useEffect(() => {
        if (replyingTo && isAtBottomRef.current) {
            // If replying and we were at bottom, scroll down to account for banner height constraint
            // Small delay to allow framer-motion to start expanding
            const timeout = setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return () => clearTimeout(timeout);
        }
    }, [replyingTo]);


    // Initial Scroll Effect (Only once on load)
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            const dividerEl = document.getElementById('chat-divider');
            if (dividerEl) {
                dividerEl.scrollIntoView({ behavior: 'auto', block: 'center' });
            } else {
                // Only scroll to bottom ONCE on fresh load
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading]);

    // --- HANDLERS ---


    // --- HANDLERS ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !serverId || isSending) return;

        setIsSending(true);
        const content = inputText.trim();
        setInputText(''); // Optimistic clear

        // Helper to strip existing reply quotes
        const getCleanContent = (msgContent) => {
            const match = msgContent.match(/^> @[\w_]+: .*?\n\n([\s\S]*)/);
            return match ? match[1] : msgContent;
        };

        // OPTIMISTIC UI: Add fake message immediately
        const tempId = 'temp-' + Date.now();

        let initialContent = content;
        if (replyingTo) {
            const cleanReplyContent = getCleanContent(replyingTo.content);
            initialContent = `> @${replyingTo.sender?.handle || 'user'}: ${cleanReplyContent}\n\n${content}`;
        }

        const optimisticMsg = {
            id: tempId,
            content: initialContent, // Use the formatted content
            sender_id: user.uid,
            created_at: new Date().toISOString(),
            isPending: true,
            reply_to_id: null, // Don't rely on this for UI since we are using text parsing now
            sender: {
                id: user.uid,
                displayName: user.displayName || user.handle || 'You',
                handle: user.handle,
                photoURL: user.photoURL || user.user_metadata?.avatar_url,
                isPro: user.isPro
            }
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            let errorToThrow = null;

            // Helper to merge sender info (since select() might not join profiles)
            const enhanceMessage = (msgData) => ({
                ...msgData,
                sender: {
                    id: user.uid,
                    displayName: user.displayName || user.handle || 'You',
                    handle: user.handle,
                    photoURL: user.photoURL || user.user_metadata?.avatar_url,
                    isPro: user.isPro
                }
            });

            if (replyingTo) {
                // 1. Try sending WITH reply_to_id
                const { data, error } = await supabase
                    .from('messages')
                    .insert({
                        content,
                        sender_id: user.uid,
                        server_id: serverId,
                        reply_to_id: replyingTo.id
                    })
                    .select() // Simple select
                    .single();

                if (error) {
                    // console.warn("Reply failed, retrying fallback...", error);
                    const cleanReplyContent = getCleanContent(replyingTo.content);
                    const quotedContent = `> @${replyingTo.sender?.handle || 'user'
                        }: ${cleanReplyContent} \n\n${content} `;

                    const { data: retryData, error: retryError } = await supabase
                        .from('messages')
                        .insert({
                            content: quotedContent,
                            sender_id: user.uid,
                            server_id: serverId
                            // OMIT reply_to_id
                        })
                        .select()
                        .single();

                    if (retryError) errorToThrow = retryError;
                    else if (retryData) {
                        setMessages(prev => prev.map(m => m.id === tempId ? enhanceMessage(retryData) : m));
                    }
                } else if (data) {
                    setMessages(prev => prev.map(m => m.id === tempId ? enhanceMessage(data) : m));
                }
            } else {
                // 2. Normal Send
                const { data, error } = await supabase
                    .from('messages')
                    .insert({
                        content,
                        sender_id: user.uid,
                        server_id: serverId
                    })
                    .select()
                    .single();

                if (error) errorToThrow = error;
                else if (data) {
                    setMessages(prev => prev.map(m => m.id === tempId ? enhanceMessage(data) : m));
                }
            }

            if (errorToThrow) throw errorToThrow;

        } catch (err) {
            console.error("Final Send Error:", err);
            setMessages(prev => prev.filter(m => m.id !== tempId));
            alert("Failed to send message: " + (err.message || 'Unknown error'));
            setInputText(content); // Restore on failure
        } finally {
            setIsSending(false);
        }
    };

    const handleDeleteMessage = async (msgId) => {
        // Confirmation handled by LiquidButton UI
        try {
            const { error } = await supabase
                .from('messages')
                .delete()
                .eq('id', msgId);

            if (error) throw error;
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete message");
        }
    };


    // --- MENTION LOGIC ---
    const handleInputChange = (e) => {
        const text = e.target.value;
        const cursorPosition = e.target.selectionStart;
        setInputText(text);

        // Detect @ mention pattern before cursor
        // Look for @ followed by characters that are NOT whitespace
        const textBeforeCursor = text.slice(0, cursorPosition);
        const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);

        if (match) {
            setMentionQuery(match[1].toLowerCase());
            setMentionMenuOpen(true);
            setActiveMentionIndex(0);
        } else {
            setMentionMenuOpen(false);
        }
    };

    const filteredMembers = members.filter(m => {
        const query = mentionQuery.toLowerCase();
        return (
            m.handle?.toLowerCase().includes(query) ||
            m.displayName?.toLowerCase().includes(query)
        );
    }).slice(0, 5); // Limit to 5 suggestions

    const handleMentionSelect = (selectedMember) => {
        const text = inputText;
        const cursorPosition = inputRef.current.selectionStart;
        const textBeforeCursor = text.slice(0, cursorPosition);
        const textAfterCursor = text.slice(cursorPosition);

        // Find the start of the mention
        const match = textBeforeCursor.match(/@([a-zA-Z0-9_]*)$/);
        if (match) {
            const start = match.index;
            const newText = textBeforeCursor.substring(0, start) +
                `@${selectedMember.handle.replace(/^@/, '')} ` +
                textAfterCursor;
            setInputText(newText);
            setMentionMenuOpen(false);

            // Restore focus and set cursor after space
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                    // const newCursorPos = start + selectedMember.handle.length + 2; // @ + space
                    // inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
                }
            }, 10);
        }
    };

    const handleKeyDown = (e) => {
        if (!mentionMenuOpen || filteredMembers.length === 0) return;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveMentionIndex(prev => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveMentionIndex(prev => (prev + 1) % filteredMembers.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            handleMentionSelect(filteredMembers[activeMentionIndex]);
        } else if (e.key === 'Escape') {
            setMentionMenuOpen(false);
        }
    };

    // --- REPLY HANDLERS ---
    const handleReply = (msg) => {
        setReplyingTo(msg);
        if (inputRef.current) inputRef.current.focus();
    };

    const handleCancelReply = () => {
        setReplyingTo(null);
    };

    // Wrap handleSendMessage to allow clearing reply state
    const handleSendWithReply = async (e) => {
        setReplyingTo(null); // Clear IMMEIDATELY for UI responsiveness
        await handleSendMessage(e);
    };

    // Helper (duplicated/hoisted for render)
    const getCleanContent = (msgContent) => {
        const match = msgContent?.match(/^> @[\w_]+: .*?\n\n([\s\S]*)/);
        return match ? match[1] : msgContent;
    };


    // --- RENDER ---
    return (
        <div className="flex flex-col h-full bg-[#111]">
            {/* CHANNEL HEADER */}
            <div className="h-12 border-b border-white/5 flex items-center px-6 shrink-0 bg-[#111]">
                <MessageCircle size={16} className="text-white/30 mr-2" />
                <span className="font-bold text-white text-sm">Server Chat</span>
            </div>

            {/* MESSAGES LIST */}
            <div
                className="flex-1 overflow-y-auto p-4 custom-scrollbar"
                ref={scrollContainerRef}
                onScroll={handleScroll}
            >
                {isLoading && messages.length === 0 ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="animate-spin text-white/20" />
                    </div>
                ) : (
                    <div className="flex flex-col justify-end min-h-full">
                        {messages.length === 0 ? (
                            <div className="text-center text-white/20 text-sm py-10">
                                Welcome to the server chat! 👋
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const prevMsg = messages[i - 1];
                                const isMe = msg.sender_id === user.uid;
                                // Show header if different sender or significant time gap (> 5 mins)
                                const showHeader = !prevMsg || prevMsg.sender_id !== msg.sender_id || (new Date(msg.created_at) - new Date(prevMsg.created_at) > 5 * 60 * 1000);

                                // DIVIDER LOGIC
                                const msgTime = new Date(msg.created_at);
                                const dividerThreshold = dividerTimeRef.current ? new Date(dividerTimeRef.current) : new Date(0);
                                // FIX: Don't show "New Messages" for MY own messages
                                const isNew = msgTime > dividerThreshold && !isMe;
                                const prevWasOld = prevMsg ? new Date(prevMsg.created_at) <= dividerThreshold : true;
                                const showDivider = isNew && prevWasOld && !isMe; // Double check !isMe

                                // PARENT MESSAGE LOOKUP
                                const parentMessage = msg.reply_to_id ? messages.find(m => m.id === msg.reply_to_id) : null;

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDivider && (
                                            <div id="chat-divider" className="flex items-center gap-4 my-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 1 }}>
                                                <div className="h-px bg-red-500/20 flex-1" />
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">New Messages</span>
                                                <div className="h-px bg-red-500/20 flex-1" />
                                            </div>
                                        )}
                                        {/* WRAPPER ID for Jumping */}
                                        <div id={`msg-${msg.id}`} className="w-full">
                                            <MessageBubble
                                                key={msg.id}
                                                message={msg}
                                                parentMessage={parentMessage} // Pass context
                                                isMe={msg.sender_id === user.uid}
                                                showHeader={showHeader}
                                                onDelete={handleDeleteMessage}
                                                onViewProfile={onViewProfile}
                                                onMentionClick={onMentionClick}
                                                onReply={handleReply} // Pass handler
                                                onJumpTo={handleJumpToMessage} // Pass jump handler
                                                isPending={msg.isPending}
                                                isMentioned={!isFocusing && msg.content?.includes(user?.handle)}
                                            />
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}

                {/* SCROLL TO BOTTOM BUTTON */}
                <AnimatePresence>
                    {showScrollDown && (
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            onClick={scrollToBottom}
                            className="absolute bottom-6 right-8 p-3 bg-[#222] border border-white/10 rounded-full text-white/70 hover:text-white shadow-xl hover:bg-[#333] transition-colors z-20"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M12 5v14M19 12l-7 7-7-7" />
                            </svg>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            {/* INPUT AREA */}
            <div className="p-4 bg-[#111] shrink-0 relative">
                {/* REPLY CONTEXT BANNER */}
                <AnimatePresence>
                    {replyingTo && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: 10, height: 0 }}
                            className="bg-[#1a1a1a] border border-white/10 rounded-t-xl overflow-hidden mb-[-1px] relative z-10"
                        >
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                <div className="flex flex-col border-l-2 border-white/30 pl-3">
                                    <span className="text-xs font-bold text-white mb-0.5">
                                        Replying to {replyingTo.sender?.displayName || 'Unknown'}
                                    </span>
                                    <span className="text-white/40 block whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">
                                        {getCleanContent(replyingTo.content)}
                                    </span>
                                </div>
                                <button
                                    onClick={handleCancelReply}
                                    className="p-1 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
                                >
                                    <Plus size={16} className="rotate-45" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* MENTION MENU */}
                <AnimatePresence>
                    {mentionMenuOpen && filteredMembers.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-4 mb-2 w-64 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
                        >
                            <div className="px-3 py-2 bg-white/5 text-[10px] font-bold text-white/40 uppercase tracking-wider border-b border-white/5">
                                Suggestions
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {filteredMembers.map((member, i) => (
                                    <button
                                        key={member.uid || member.id} // Handle fallback key
                                        onClick={() => handleMentionSelect(member)}
                                        className={`w - full flex items - center gap - 3 px - 3 py - 2 text - left transition - colors ${i === activeMentionIndex ? 'bg-white/10' : 'hover:bg-white/5'
                                            } `}
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0">
                                            {member.avatarUrl ? (
                                                <img src={member.avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white/50 text-xs font-bold">
                                                    {(member.displayName || 'U')[0].toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold text-white truncate">{member.displayName}</span>
                                            <span className="text-xs text-white/40 truncate">{member.handle}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <form
                    onSubmit={handleSendWithReply} // Use wrapper
                    className="relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-white/30 transition-colors"
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            // Forward to handler logic if menu open
                            if (mentionMenuOpen) handleKeyDown(e);
                        }}
                        placeholder="Message..."
                        className="flex-1 bg-transparent text-white text-sm px-4 py-3 outline-none placeholder:text-white/20"
                    />
                    <button
                        type="submit"
                        disabled={!inputText.trim() || isSending}
                        className="p-2 mr-1 text-white/50 hover:text-white disabled:opacity-30 disabled:hover:text-white/50 transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatArea;
