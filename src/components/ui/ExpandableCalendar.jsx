import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ChevronDown, Calendar } from 'lucide-react';

const formatDateId = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ExpandableCalendar = ({
    selectedDate,
    onSelectDate,
    currentMonth,
    setCurrentMonth,
    isExpanded,
    setIsExpanded,
    data = {}, // Map of dateId -> boolean (or object) to show indicators
    renderDayContent // Optional custom renderer for day cells
}) => {
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

    const isTodaySelected = formatDateId(selectedDate) === formatDateId(new Date());

    const handleToday = (e) => {
        e?.stopPropagation();
        const now = new Date();
        onSelectDate(now);
        setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
        setViewMode('days');
    };

    const blanks = Array(firstDayOfMonth).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
    const allSlots = [...blanks, ...days];

    return (
        <motion.div
            layout
            className={`w-full bg-white/5 border border-white/5 rounded-3xl overflow-hidden relative transition-colors duration-500 ${isExpanded ? 'p-6' : 'p-4 hover:bg-white/10 cursor-pointer'}`}
            onClick={() => !isExpanded && setIsExpanded(true)}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isExpanded ? (
                    <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <button onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'days' ? 'months' : 'days'); }} className="text-lg font-serif-display text-white hover:text-white/80 transition-colors flex items-center gap-2">
                                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                                </button>
                                {!isTodaySelected && (
                                    <button onClick={handleToday} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-[11px] font-bold uppercase tracking-wider hover:bg-white/90 transition-all shadow-lg shadow-white/10 ml-2">
                                        <span className="hidden sm:inline">Jump to</span> Today
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-2"><ChevronDown size={18} className="rotate-180" /></button>
                            </div>
                        </div>
                        {viewMode === 'days' ? (
                            <div className="animate-fade-in">
                                <div className="grid grid-cols-7 mb-2">
                                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} className="text-center text-[10px] font-bold text-white/20 py-2">{d}</div>))}
                                </div>
                                <div className="grid grid-cols-7 gap-y-2">
                                    {allSlots.map((date, i) => {
                                        if (!date) return <div key={i} />;

                                        const dateId = formatDateId(date);
                                        // Check if data exists for this date. Could be simple boolean or object with more info (like intensity)
                                        const dayData = data[dateId];
                                        const hasData = !!dayData;

                                        // Intensity for heatmap style if 'dailyFocusTime' is present (legacy support for UnifiedSettingsModal)
                                        const intensity = (dayData && typeof dayData === 'object' && dayData.dailyFocusTime)
                                            ? Math.min(dayData.dailyFocusTime / (4 * 3600), 1)
                                            : (hasData ? 1 : 0);

                                        const isSelected = selectedDate && formatDateId(selectedDate) === dateId;
                                        const isToday = formatDateId(new Date()) === dateId;

                                        return (
                                            <div key={i} className="flex justify-center">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); onSelectDate(date); setIsExpanded(false); }}
                                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 relative group 
                            ${isSelected ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110 z-10' : ''} 
                            ${!isSelected && hasData ? 'text-white hover:bg-white/10' : ''} 
                            ${!isSelected && !hasData ? 'text-white/20 hover:text-white/50' : ''} 
                            ${isToday && !isSelected ? 'border border-white/20' : ''}`}
                                                >
                                                    {!isSelected && hasData && (
                                                        <div className="absolute inset-0 bg-white rounded-full opacity-10" style={{ opacity: 0.1 + (intensity * 0.2) }} />
                                                    )}
                                                    {!isSelected && hasData && (
                                                        <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />
                                                    )}
                                                    {/* If custom renderer provided, use it, otherwise show date */}
                                                    {renderDayContent ? renderDayContent(date, dayData, isSelected) : date.getDate()}
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
                    <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/10 rounded-full text-white"><Calendar size={18} /></div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Selected Date</p>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-lg font-serif-display text-white">
                                        {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </h4>
                                    {!isTodaySelected && (
                                        <button onClick={handleToday} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black text-[10px] font-bold uppercase tracking-wider hover:bg-white/90 transition-all shadow-lg shadow-white/10 ml-2">
                                            <span className="hidden sm:inline">Jump to</span> Today
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={handlePrevDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Previous Day"><ChevronLeft size={16} /></button>
                            <button onClick={handleNextDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Next Day"><ChevronRight size={16} /></button>
                            <div className="w-px h-4 bg-white/10 mx-2"></div>
                            <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors">
                                <span>Expand</span><ChevronDown size={14} />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ExpandableCalendar;
