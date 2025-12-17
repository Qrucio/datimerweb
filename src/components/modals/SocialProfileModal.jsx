
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Coffee, TrendingUp, ChevronLeft, ChevronRight, ChevronDown, Calendar as CalendarIcon, X, Flame } from 'lucide-react';
import ProfileCard from '../profile/ProfileCard';
import { supabase } from '../../lib/supabase';
import CloseButton from '../ui/CloseButton';

// --- HELPERS (Copied from App.jsx to ensure portability) ---

const isSameDay = (d1, d2) => {
    return d1.getDate() === d2.getDate() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getFullYear() === d2.getFullYear();
};

const formatDateId = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDetailedDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return `${m}m ${s}s`;
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}h ${remM}m`;
};

// --- SUB-COMPONENTS (Stats UI) ---

const FriendStatCard = ({ label, value, icon: Icon, delay = 0, isHero = false, highlight = false }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.3 }}
        className={`relative flex flex-col justify-between p-5 rounded-2xl overflow-hidden group 
      ${isHero ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 col-span-2' : 'bg-black/20 border border-white/5 hover:border-white/10 transition-colors'} 
      ${highlight ? 'ring-1 ring-white/20 bg-white/5' : ''}`
        }
    >
        <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
            <div className={`p-1.5 rounded-lg ${isHero ? 'bg-white/10 text-white' : 'bg-white/5 text-white/20 group-hover:text-white/50 transition-colors'}`}>
                <Icon size={isHero ? 18 : 14} />
            </div>
        </div>
        <div className={`mt-4 font-mono font-light tracking-wide text-white z-10 ${isHero ? 'text-3xl' : 'text-xl'}`}>
            {value}
        </div>
        {isHero && <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />}
    </motion.div>
);

const FriendStreakCard = ({ streak }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
        className="col-span-2 relative overflow-hidden rounded-2xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#1a0c00] to-black/40 group"
    >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
        <div className="flex items-center justify-between relative z-10">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">Current Streak</span>
                </div>
                <div className="text-4xl font-serif-display text-white flex items-baseline gap-1">
                    {streak} <span className="text-sm font-sans text-white/40 font-medium">days</span>
                </div>
            </div>
            <motion.div
                animate={{ scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 10px rgba(249,115,22,0.4))", "drop-shadow(0 0 20px rgba(249,115,22,0.7))", "drop-shadow(0 0 10px rgba(249,115,22,0.4))"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-orange-500"
            >
                <Flame size={48} fill="currentColor" fillOpacity={0.2} strokeWidth={1.5} />
            </motion.div>
        </div>
    </motion.div>
);

const FriendHistoryCalendar = ({ historyData, currentMonth, setCurrentMonth, selectedDate, onSelectDate, isExpanded, setIsExpanded }) => {
    const [viewMode, setViewMode] = useState('days');
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

    const handlePrevMonth = (e) => { e?.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); };
    const handleNextMonth = (e) => { e?.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); };

    const handlePrevDay = (e) => {
        e?.stopPropagation();
        const prev = new Date(selectedDate);
        prev.setDate(prev.getDate() - 1);
        onSelectDate(prev);
        if (prev.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1));
    };
    const handleNextDay = (e) => {
        e?.stopPropagation();
        const next = new Date(selectedDate);
        next.setDate(next.getDate() + 1);
        onSelectDate(next);
        if (next.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    };

    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
    const allSlots = [...blanks, ...days];

    return (
        <motion.div layout className={`w-full bg-white/5 border border-white/5 rounded-3xl overflow-hidden relative transition-colors duration-300 ${isExpanded ? 'p-6' : 'p-4 hover:bg-white/10 cursor-pointer'}`} onClick={() => !isExpanded && setIsExpanded(true)}>
            <AnimatePresence mode="popLayout" initial={false}>
                {isExpanded ? (
                    <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'days' ? 'months' : 'days'); }} className="text-lg font-serif-display text-white hover:text-white/80 transition-colors flex items-center gap-2">
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </button>
                            <div className="flex gap-1">
                                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-2"><ChevronDown size={18} className="rotate-180" /></button>
                            </div>
                        </div>
                        {viewMode === 'days' ? (
                            <div className="animate-fade-in">
                                <div className="grid grid-cols-7 mb-2">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} className="text-center text-[10px] font-bold text-white/20 py-2">{d}</div>))}</div>
                                <div className="grid grid-cols-7 gap-y-2">
                                    {allSlots.map((date, i) => {
                                        if (!date) return <div key={i} />;
                                        const dateId = formatDateId(date);
                                        const data = historyData[dateId];
                                        const hasData = data && data.dailyFocusTime > 0;
                                        const isSelected = selectedDate && formatDateId(selectedDate) === dateId;
                                        const isToday = formatDateId(new Date()) === dateId;
                                        const intensity = hasData ? Math.min(data.dailyFocusTime / (4 * 3600), 1) : 0;

                                        return (
                                            <div key={i} className="flex justify-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSelectDate(date); }}
                                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 relative group 
                            ${isSelected ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110 z-10' : ''} 
                            ${!isSelected && hasData ? 'text-white hover:bg-white/10' : ''} 
                            ${!isSelected && !hasData ? 'text-white/20 hover:text-white/50' : ''} 
                            ${isToday && !isSelected ? 'border border-white/20' : ''}`}
                                                >
                                                    {!isSelected && hasData && <div className="absolute inset-0 bg-white rounded-full opacity-10" style={{ opacity: 0.1 + (intensity * 0.2) }} />}
                                                    {!isSelected && hasData && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />}
                                                    {date.getDate()}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 gap-3 animate-fade-in">
                                {monthNames.map((m, i) => (
                                    <button key={m} onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1)); setViewMode('days'); }} className={`p-3 rounded-xl text-sm font-medium transition-colors ${currentMonth.getMonth() === i ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>
                                        {m.substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/10 rounded-full text-white"><CalendarIcon size={18} /></div>
                            <div><p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Selected Date</p><h4 className="text-lg font-serif-display text-white">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h4></div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handlePrevDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                            <button onClick={handleNextDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                            <div className="w-px h-4 bg-white/10 mx-2"></div>
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"><span>Expand</span><ChevronDown size={14} /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// --- MAIN COMPONENT ---

const SocialProfileModal = ({ isOpen, onClose, user, currentUser, onAddFriend, onMessage, onProfileUpdate }) => {
    // TABS
    const [activeTab, setActiveTab] = useState('today');

    // STATS STATE
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [historyData, setHistoryData] = useState({});
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);
    const [profileData, setProfileData] = useState(user || {});

    // Sync profile data when user prop changes
    useEffect(() => {
        setProfileData(user || {});
    }, [user]);

    // FETCH DATA & REALTIME
    useEffect(() => {
        const targetId = user?.id || user?.uid;

        if (isOpen && targetId) {

            // 1. Listen to Profile Changes
            const channel = supabase.channel(`profile_${targetId}`)
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${targetId}` },
                    (payload) => {
                        const newP = payload.new;
                        setProfileData(prev => ({
                            ...prev,
                            displayName: newP.display_name,
                            handle: newP.handle,
                            photoURL: newP.photo_url,
                            isPro: newP.is_pro,
                            timerState: newP.timer_state,
                            about: newP.about,
                            stats: newP.stats || {},
                            lastActive: newP.last_active,
                            streak: newP.stats?.currentStreak || 0
                        }));
                    }
                )
                .subscribe();

            // 2. Fetch History
            const fetchHistory = async () => {
                try {
                    const { data, error } = await supabase
                        .from('history')
                        .select('*')
                        .eq('user_id', targetId)
                        .order('date_id', { ascending: false })
                        .limit(100);

                    if (error) {
                        console.error("Error fetching history:", error);
                        throw error;
                    }

                    if (data) {
                        const historyMap = {};
                        data.forEach(row => {
                            historyMap[row.date_id] = row.data || {
                                dailyFocusTime: row.focus_time,
                                dailyBreakTime: row.break_time,
                                dailySessions: row.sessions
                            };
                        });
                        setHistoryData(historyMap);
                    }
                } catch (e) {
                    console.log("History access restricted or failed", e);
                }
            };

            // 3. Fetch Full Profile (if missing data)
            const fetchProfile = async () => {
                // Optimisation: If it's ME, use local currentUser state first!
                if (currentUser && (currentUser.uid === targetId || currentUser.id === targetId)) {
                    setProfileData(prev => ({ ...prev, ...currentUser, stats: currentUser.stats || {} }));
                    // We typically don't need to fetch from DB if we have rich local state, 
                    // but doing so ensures we are in sync with what OTHERS see.
                }

                try {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', targetId)
                        .single();

                    if (data) {
                        setProfileData(prev => ({
                            ...prev,
                            displayName: data.display_name,
                            handle: data.handle,
                            photoURL: data.photo_url,
                            isPro: data.is_pro,
                            timerState: data.timer_state,
                            about: data.about,
                            stats: data.stats || {},
                            lastActive: data.last_active,
                            streak: data.stats?.currentStreak || 0
                        }));
                    }
                } catch (e) {
                    console.error("Profile fetch failed", e);
                }
            };

            fetchHistory();
            fetchProfile();
            return () => { supabase.removeChannel(channel); };
        }
    }, [isOpen, user]);

    // STATS LOGIC
    const getStats = () => {
        const s = profileData.stats || {};
        const lastUpdateTimestamp = profileData.timerState?.lastUpdated || 0;
        const isDataFromToday = isSameDay(new Date(lastUpdateTimestamp), new Date());

        if (!isDataFromToday) {
            return {
                dailyFocusTime: 0,
                dailyBreakTime: 0,
                dailySessions: 0,
                currentStreak: s.currentStreak ?? profileData.streak ?? 0
            };
        }

        return {
            dailyFocusTime: s.dailyFocusTime ?? profileData.todayFocusTime ?? 0,
            dailyBreakTime: s.dailyBreakTime ?? 0,
            dailySessions: s.dailySessions ?? 0,
            currentStreak: s.currentStreak ?? profileData.streak ?? 0
        };
    };

    const currentStats = getStats();

    const getSelectedStats = () => {
        const dateId = formatDateId(selectedDate);
        const todayId = formatDateId(new Date());
        if (dateId === todayId) return currentStats;
        return historyData[dateId] || { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0 };
    };

    const selectedStats = getSelectedStats();

    return (
        <AnimatePresence>
            {isOpen && user && (
                <>
                    {/* BACKDROP */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
                    />

                    {/* MODAL WRAPPER */}
                    <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none p-2 md:p-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
                            className="w-full max-w-6xl h-[90vh] md:h-[80vh] flex flex-col md:flex-row gap-6 md:gap-8 pointer-events-auto"
                        >

                            {/* --- LEFT COLUMN: PROFILE CARD --- */}
                            <div className="w-full md:w-[380px] shrink-0 flex flex-col">
                                <ProfileCard
                                    user={profileData}
                                    currentUser={currentUser}
                                    onClose={null} // Don't show close button on card itself
                                    isSelf={currentUser?.uid === profileData.id || currentUser?.id === profileData.id} // Robust ID check
                                    onAddFriend={onAddFriend}
                                    onMessage={onMessage}
                                    onProfileUpdate={(updates) => {
                                        setProfileData(prev => ({ ...prev, ...updates }));
                                        if (onProfileUpdate) onProfileUpdate(updates);
                                    }}
                                />
                            </div>

                            {/* --- RIGHT COLUMN: STATS DASHBOARD --- */}
                            <div className="flex-1 bg-[#111] border border-white/10 rounded-[32px] overflow-hidden flex flex-col shadow-2xl relative">

                                {/* Header Actions (Close) */}
                                <div className="absolute top-6 right-6 z-20">
                                    <CloseButton onClick={onClose} />
                                </div>

                                {/* Header with Tabs */}
                                <div className="px-8 pt-8 pb-6 border-b border-white/5 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-2xl font-serif-display text-white mb-1">Performance</h3>
                                        <p className="text-sm text-white/40">Focus statistics and history</p>
                                    </div>
                                    <div className="bg-white/5 rounded-full p-1 flex gap-1 border border-white/5 mr-12">
                                        {['today', 'history'].map(view => (
                                            <button
                                                key={view}
                                                onClick={() => setActiveTab(view)}
                                                className={`relative px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${activeTab === view ? 'text-black' : 'text-white/40 hover:text-white'}`}
                                            >
                                                {activeTab === view && (
                                                    <motion.div
                                                        layoutId="tabPill"
                                                        className="absolute inset-0 bg-white rounded-full shadow-lg z-[-1]"
                                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                    />
                                                )}
                                                {view}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Content Scroll Area */}
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                                    <AnimatePresence mode="wait">
                                        {activeTab === 'today' ? (
                                            <motion.div
                                                key="today"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                            >
                                                <FriendStatCard label="Focus Today" value={formatDetailedDuration(currentStats.dailyFocusTime || 0)} icon={Zap} isHero={true} />
                                                <FriendStatCard label="Break Time" value={formatDetailedDuration(currentStats.dailyBreakTime || 0)} icon={Coffee} delay={0.1} />
                                                <FriendStatCard label="Sessions" value={currentStats.dailySessions || 0} icon={TrendingUp} delay={0.15} />
                                                <FriendStreakCard streak={currentStats.currentStreak || 0} />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="history"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                transition={{ duration: 0.15 }}
                                                className="flex flex-col gap-6"
                                            >
                                                <FriendHistoryCalendar
                                                    historyData={historyData}
                                                    currentMonth={currentMonth}
                                                    setCurrentMonth={setCurrentMonth}
                                                    selectedDate={selectedDate}
                                                    onSelectDate={setSelectedDate}
                                                    isExpanded={isCalendarExpanded}
                                                    setIsExpanded={setIsCalendarExpanded}
                                                />

                                                <div className="space-y-4">
                                                    <div className="flex items-center gap-3 border-t border-white/10 pt-6">
                                                        <h4 className="font-serif-display text-lg text-white">
                                                            {!isCalendarExpanded ? "Overview" : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                                        </h4>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                        <FriendStatCard label="Focus Time" value={formatDetailedDuration(selectedStats.dailyFocusTime || 0)} icon={Zap} highlight />
                                                        <FriendStatCard label="Break Time" value={formatDetailedDuration(selectedStats.dailyBreakTime || 0)} icon={Coffee} />
                                                        <FriendStatCard label="Sessions" value={selectedStats.dailySessions || 0} icon={TrendingUp} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default SocialProfileModal;
