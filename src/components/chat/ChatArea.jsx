import React, { useState, useEffect, useRef } from 'react';
import { Send, Hash, Lock, Plus, Loader2, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MessageBubble from './MessageBubble';
import { format } from 'date-fns';

const ChatArea = ({ serverId, user, isFocusing = false, userRole, lastReadTime, onViewProfile, onMarkRead }) => {
    // --- STATE ---
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);

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
                        const updated = [...prev, enrichedMsg];
                        return updated;
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

    // --- SMART SCROLL LOGIC ---
    useEffect(() => {
        if (isLoading || messages.length === 0) return;

        const lastMsg = messages[messages.length - 1];
        const isMyMessage = lastMsg?.sender_id === user.uid;

        // 1. Initial Load: Scroll to Divider OR Bottom
        if (!messagesEndRef.current) return;

        const dividerEl = document.getElementById('chat-divider');

        // If we just loaded everything, check if we need to go to divider
        // We can use a ref to track "initial scroll done"

        // Simple heuristic: If the user just sent a message, scroll to bottom.
        if (isMyMessage) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        // If it's a new message from OTHERS:
        // Ideally we only scroll if we are already at bottom. 
        // For now, to stop "jumping", we will ONLY auto-scroll on initial load (to divider) or if I send a message.
        // User has to scroll down for others' messages if they are scrolling up?
        // Standard behavior: Auto-scroll if near bottom.

        // For simplicity requested by user: "Stop scrolling up".
        // Use a flag for "isInitialLoad"
    }, [messages, isLoading, user.uid]);

    // Initial Scroll Effect
    useEffect(() => {
        if (!isLoading && messages.length > 0) {
            const dividerEl = document.getElementById('chat-divider');
            if (dividerEl) {
                dividerEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                if (messagesEndRef.current) {
                    messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
                }
            }
        }
    }, [isLoading]); // Run once when loading finishes


    // --- HANDLERS ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !serverId || isSending) return;

        setIsSending(true);
        const content = inputText.trim();
        setInputText(''); // Optimistic clear

        try {
            const { error } = await supabase
                .from('messages')
                .insert({
                    content,
                    sender_id: user.uid,
                    server_id: serverId, // Direct server_id (No channel)
                    // channel_id is now omitted
                });

            if (error) throw error;
        } catch (err) {
            console.error("Send Error:", err);
            alert("Failed to send message");
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


    // --- RENDER ---
    return (
        <div className="flex flex-col h-full bg-[#111]">
            {/* CHANNEL HEADER */}
            <div className="h-12 border-b border-white/5 flex items-center px-6 shrink-0 bg-[#111]">
                <MessageCircle size={16} className="text-white/30 mr-2" />
                <span className="font-bold text-white text-sm">Server Chat</span>
            </div>

            {/* MESSAGES LIST */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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

                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDivider && (
                                            <div id="chat-divider" className="flex items-center gap-4 my-6 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 1 }}>
                                                <div className="h-px bg-red-500/20 flex-1" />
                                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">New Messages</span>
                                                <div className="h-px bg-red-500/20 flex-1" />
                                            </div>
                                        )}
                                        <MessageBubble
                                            message={msg}
                                            isMe={isMe}
                                            showHeader={showHeader}
                                            onDelete={handleDeleteMessage}
                                            onViewProfile={onViewProfile}
                                        />
                                    </React.Fragment>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* INPUT AREA */}
            <div className="p-4 bg-[#111] shrink-0">
                <form
                    onSubmit={handleSendMessage}
                    className="relative flex items-center bg-white/5 border border-white/10 rounded-xl focus-within:border-white/30 transition-colors"
                >
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
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
