import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sliders, Palette, User, LogOut, Sparkles, Clock, Zap,
  Coffee, Flame, BarChart2, TrendingUp, Settings, Calendar,
  ChevronLeft, ChevronRight, ChevronDown, Crown, Copy, Check,
  Pencil, Loader2, Lock, AlertTriangle, ExternalLink, RefreshCw, Volume2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Avatar from '../Avatar';
import CloseButton from '../ui/CloseButton';
import ToggleRow from '../ui/ToggleRow';
import { FlowTag } from '../ui/FlowTag';
import ProfileCard from '../profile/ProfileCard';
import { ALARM_SOUNDS } from '../../utils/data';

const toggleStyles = `
  .toggle-switch {
    position: relative;
    width: 44px;
    height: 26px;
    background-color: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 9999px;
    transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
    cursor: pointer;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  .toggle-switch.on {
    background-color: rgba(52, 199, 89, 0.3);
    border-color: rgba(52, 199, 89, 0.4);
    box-shadow: 0 0 15px rgba(52, 199, 89, 0.2), inset 0 0 10px rgba(52, 199, 89, 0.1);
  }
  .toggle-knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    background: linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.8) 100%);
    border-radius: 50%;
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  }
  .toggle-switch.on .toggle-knob {
    transform: translateX(18px);
    background: #ffffff;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  }
  /* Liquid Glass Slider Styles (from videospeed/popup.css) */
  .modern-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 7px;
    background: #4a4a4e; /* Fallback/Track Color */
    border-radius: 18px;
    outline: none;
    opacity: 0.9;
    transition: opacity .2s;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
    cursor: pointer;
  }
  .modern-slider:hover {
    opacity: 1;
  }
  
  /* --- THUMB: Normal State (Solid White) --- */
  .modern-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 28px;
    height: 20px;
    background: #ffffff;
    border: none;
    border-radius: 18px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }
  
  /* --- THUMB: Active State (Liquid Glass) --- */
  .modern-slider:active::-webkit-slider-thumb {
    transform: scale(1.6);
    background: rgba(169, 89, 188, 0.1); /* Purple tint from reference */
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 
      inset 0 4px 6px rgba(255, 255, 255, 0.25), 
      inset 0 -4px 6px rgba(0, 0, 0, 0.1), 
      0 5px 15px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(1.5px);
  }

  .modern-slider::-moz-range-thumb {
    width: 28px;
    height: 20px;
    background: #ffffff;
    border: none;
    border-radius: 18px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  }

  .modern-slider:active::-moz-range-thumb {
    transform: scale(1.6);
    background: rgba(169, 89, 188, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.4);
    box-shadow: 
      inset 0 4px 6px rgba(255, 255, 255, 0.25), 
      inset 0 -4px 6px rgba(0, 0, 0, 0.1), 
      0 5px 15px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(1.5px);
  }
`;

// --- HELPER: DATE FORMATTER ---
const formatDateId = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- UPDATED TIME FORMATTER ---
const formatDuration = (totalSeconds) => {
  if (!totalSeconds) return "0m 0s";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
};

// --- HELPER: EXTRACT COLOR FROM IMAGE ---
const useDominantColor = (imageUrl) => {
  const [color, setColor] = useState("rgba(255, 255, 255, 0.1)");

  useEffect(() => {
    if (!imageUrl) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1;
        canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setColor(`rgba(${r}, ${g}, ${b}, 0.5)`);
      } catch (e) { }
    };
  }, [imageUrl]);

  return color;
};

// --- SETTING INPUT COMPONENT (MOVED OUTSIDE) ---
// This prevents re-rendering/loss of focus on every keystroke
const SettingInput = ({ label, value, onChange, onBlur, min, max }) => (
  <div className="flex items-center justify-between py-4 px-5 group hover:bg-white/5 transition-colors">
    <label className="text-white/80 text-sm font-medium group-hover:text-white transition-colors">{label}</label>
    <div className="relative flex items-center justify-center w-20 bg-black/20 rounded-lg border border-white/10 focus-within:border-white/30 transition-all shrink-0">
      <input
        type="number"
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        min={min}
        max={max}
        className="w-full bg-transparent text-white text-center font-mono text-sm py-1.5 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pl-1 pr-5"
      />
      <span className="absolute right-2.5 text-white/30 text-xs pointer-events-none select-none">
        {label.toLowerCase().includes('intervals') ? 'x' : 'm'}
      </span>
    </div>
  </div>
);



const StatCard = ({ label, value, icon: Icon, delay = 0, isHero = false, highlight = false }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.3 }} className={`relative flex flex-col justify-between p-5 rounded-2xl overflow-hidden group ${isHero ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 col-span-2' : 'bg-black/20 border border-white/5 hover:border-white/10 transition-colors'} ${highlight ? 'ring-1 ring-white/20 bg-white/5' : ''}`}>
    <div className="flex justify-between items-start z-10"><span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{label}</span><div className={`p-1.5 rounded-lg ${isHero ? 'bg-white/10 text-white' : 'bg-white/5 text-white/20 group-hover:text-white/50 transition-colors'}`}><Icon size={isHero ? 18 : 14} /></div></div>
    <div className={`mt-4 font-mono font-light tracking-wide text-white z-10 ${isHero ? 'text-3xl' : 'text-xl'}`}>{value}</div>
    {isHero && <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />}
  </motion.div>
);

const StreakCard = ({ streak, active = false }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }} className={`col-span-2 relative overflow-hidden rounded-2xl p-6 border group ${active ? 'border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#1a0c00] to-black/40' : 'border-white/5 bg-gradient-to-br from-white/5 via-[#0A0A0A] to-black/40'}`}>
    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_top_right,${active ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.05)'},transparent_50%)]`} />
    <div className="flex items-center justify-between relative z-10">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'text-orange-400/80' : 'text-white/30'}`}>Current Streak</span>
        </div>
        <div className={`text-4xl font-serif-display flex items-baseline gap-1 ${active ? 'text-white' : 'text-white/50'}`}>
          {streak} <span className="text-sm font-sans text-white/40 font-medium">days</span>
        </div>
      </div>
      <motion.div
        animate={active ? { scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 10px rgba(249,115,22,0.4))", "drop-shadow(0 0 20px rgba(249,115,22,0.7))", "drop-shadow(0 0 10px rgba(249,115,22,0.4))"] } : { scale: 1, filter: "none" }}
        transition={active ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
        className={active ? "text-orange-500" : "text-white/10"}
      >
        <Flame size={48} fill="currentColor" fillOpacity={active ? 0.2 : 0} strokeWidth={1.5} />
      </motion.div>
    </div>
  </motion.div>
);

const HistoryCalendar = ({ historyData, currentMonth, setCurrentMonth, selectedDate, onSelectDate, isExpanded, setIsExpanded }) => {
  const [viewMode, setViewMode] = useState('days');
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const handlePrevMonth = (e) => { e?.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)); };
  const handleNextMonth = (e) => { e?.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)); };
  const handlePrevDay = (e) => { e?.stopPropagation(); const prev = new Date(selectedDate); prev.setDate(prev.getDate() - 1); onSelectDate(prev); if (prev.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(prev.getFullYear(), prev.getMonth(), 1)); };
  const handleNextDay = (e) => { e?.stopPropagation(); const next = new Date(selectedDate); next.setDate(next.getDate() + 1); onSelectDate(next); if (next.getMonth() !== currentMonth.getMonth()) setCurrentMonth(new Date(next.getFullYear(), next.getMonth(), 1)); };
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i + 1));
  const allSlots = [...blanks, ...days];

  return (
    <motion.div layout className={`w-full bg-white/5 border border-white/5 rounded-3xl overflow-hidden relative transition-colors duration-300 ${isExpanded ? 'p-6' : 'p-4 hover:bg-white/10 cursor-pointer'}`} onClick={() => !isExpanded && setIsExpanded(true)} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
      <AnimatePresence mode="popLayout" initial={false}>
        {isExpanded ? (
          <motion.div key="expanded" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <div className="flex justify-between items-center mb-6">
              <button onClick={(e) => { e.stopPropagation(); setViewMode(viewMode === 'days' ? 'months' : 'days'); }} className="text-lg font-serif-display text-white hover:text-white/80 transition-colors flex items-center gap-2">{monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</button>
              <div className="flex gap-1">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={18} /></button>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronRight size={18} /></button>
                <button onClick={(e) => { e.stopPropagation(); setIsExpanded(false); }} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-2"><ChevronDown size={18} className="rotate-180" /></button>
              </div>
            </div>
            {viewMode === 'days' ? (
              <div className="animate-fade-in">
                <div className="grid grid-cols-7 mb-2">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (<div key={i} className="text-center text-[10px] font-bold text-white/20 py-2">{d}</div>))}</div>
                <div className="grid grid-cols-7 gap-y-2">{allSlots.map((date, i) => { if (!date) return <div key={i} />; const dateId = formatDateId(date); const data = historyData[dateId]; const hasData = data && data.dailyFocusTime > 0; const isSelected = selectedDate && formatDateId(selectedDate) === dateId; const isToday = formatDateId(new Date()) === dateId; const intensity = hasData ? Math.min(data.dailyFocusTime / (4 * 3600), 1) : 0; return (<div key={i} className="flex justify-center"><button onClick={(e) => { e.stopPropagation(); onSelectDate(date); setIsExpanded(false); }} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 relative group ${isSelected ? 'bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110 z-10' : ''} ${!isSelected && hasData ? 'text-white hover:bg-white/10' : ''} ${!isSelected && !hasData ? 'text-white/20 hover:text-white/50' : ''} ${isToday && !isSelected ? 'border border-white/20' : ''}`}>{!isSelected && hasData && <div className="absolute inset-0 bg-white rounded-full opacity-10" style={{ opacity: 0.1 + (intensity * 0.2) }} />}{!isSelected && hasData && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.8)]" />}{date.getDate()}</button></div>); })}</div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 animate-fade-in">{monthNames.map((m, i) => (<button key={m} onClick={(e) => { e.stopPropagation(); setCurrentMonth(new Date(currentMonth.getFullYear(), i, 1)); setViewMode('days'); }} className={`p-3 rounded-xl text-sm font-medium transition-colors ${currentMonth.getMonth() === i ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}>{m.substring(0, 3)}</button>))}</div>
            )}
          </motion.div>
        ) : (
          <motion.div key="collapsed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex items-center justify-between">
            <div className="flex items-center gap-4"><div className="p-2 bg-white/10 rounded-full text-white"><Calendar size={18} /></div><div><p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Selected Date</p><h4 className="text-lg font-serif-display text-white">{selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</h4></div></div>
            <div className="flex items-center gap-1"><button onClick={handlePrevDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Previous Day"><ChevronLeft size={16} /></button><button onClick={handleNextDay} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Next Day"><ChevronRight size={16} /></button><div className="w-px h-4 bg-white/10 mx-2"></div><button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors"><span>Expand</span><ChevronDown size={14} /></button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- MODERN ARC-INSPIRED MEMBERSHIP CARD ---
// (UserProfileCard removed)

// --- MAIN MODAL COMPONENT ---
const MasterCustomizeView = ({ onNavigate }) => (
  <div className="space-y-4 max-w-2xl animate-fade-in">
    <div>
      <h3 className="text-2xl font-serif-display text-white mb-1">Customize</h3>
      <p className="text-white/50 text-sm">Personalize your focus environment.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <button onClick={() => onNavigate('customize-background')} className="group relative p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-3xl transition-all text-left overflow-hidden">
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Palette size={20} />
          </div>
          <h4 className="text-lg font-bold text-white mb-1">Background</h4>
          <p className="text-xs text-white/50">Choose from curated scenes and gradients.</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      <button onClick={() => onNavigate('customize-clock')} className="group relative p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-3xl transition-all text-left overflow-hidden">
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Clock size={20} />
          </div>
          <h4 className="text-lg font-bold text-white mb-1">Clock Style</h4>
          <p className="text-xs text-white/50">Customize typography and layout.</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>

      {/* <button onClick={() => onNavigate('customize-sound')} className="group relative p-6 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-3xl transition-all text-left overflow-hidden md:col-span-2">
        <div className="relative z-10">
          <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Volume2 size={20} />
          </div>
          <h4 className="text-lg font-bold text-white mb-1">Timer Sound</h4>
          <p className="text-xs text-white/50">Select alarm sounds and volume.</p>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </button> */}
    </div>
  </div>
);

const UnifiedSettingsModal = ({
  isOpen, onClose, user, signOut, settings, setSettings,
  handleSettingsSave, handleBackgroundChange, backgrounds = [],
  isPro = false, stats = {}, onOpenPro, initialTab = 'preferences', onReplayOnboarding
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [expandedSections, setExpandedSections] = useState({ customize: true });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      // Ensure parents are expanded if a child is initially selected (logic can be enhanced)
      if (initialTab.startsWith('customize')) setExpandedSections(prev => ({ ...prev, customize: true }));
    }
  }, [isOpen, initialTab]);

  const [statsView, setStatsView] = useState('today');
  const [historyData, setHistoryData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  // --- SETTING HANDLERS ---
  const updateSetting = (key, value) => {
    // Whitelist numeric keys
    const numericKeys = ['focus', 'shortBreak', 'longBreak', 'pomosBeforeLongBreak'];

    if (numericKeys.includes(key)) {
      if (value === '') {
        setSettings(prev => ({ ...prev, [key]: '' }));
        return;
      }
      const val = parseInt(value, 10);
      if (!isNaN(val)) {
        const newSettings = { ...settings, [key]: val };
        setSettings(newSettings);
        if (handleSettingsSave) handleSettingsSave(newSettings);
        return;
      }
    }

    // For everything else (strings, booleans, etc.)
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    if (handleSettingsSave) handleSettingsSave(newSettings);
  };

  const handleBlur = (key, defaultValue) => {
    const val = settings[key];
    if (val === '' || val === 0 || isNaN(val)) {
      const newSettings = { ...settings, [key]: defaultValue };
      setSettings(newSettings);
      if (handleSettingsSave) handleSettingsSave(newSettings);
    }
  };


  const toggleSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));
  const toggleSection = (id) => setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));

  const contentVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, y: -5, transition: { duration: 0.15, ease: "easeIn" } }
  };

  // --- MOBILE DETECTION ---
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const modalVariants = isMobile ? {
    hidden: { opacity: 0, y: '100%' },
    visible: { opacity: 1, y: 0, transition: { type: "tween", duration: 0.3, ease: "easeOut" } },
    exit: { opacity: 0, y: '100%', transition: { type: "tween", duration: 0.2, ease: "easeIn" } }
  } : {
    hidden: { opacity: 0, scale: 0.95, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", bounce: 0, duration: 0.25 } },
    exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }
  };

  useEffect(() => {
    if (activeTab === 'stats' && statsView === 'history' && user) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const { data, error } = await supabase
            .from('history')
            .select('*')
            .eq('user_id', user.uid)
            .order('date_id', { ascending: false })
            .limit(100);

          if (data) {
            const historyMap = {};
            data.forEach(item => {
              historyMap[item.date_id] = item.data || {
                dailyFocusTime: item.focus_time,
                dailyBreakTime: item.break_time,
                dailySessions: item.sessions
              };
            });

            const todayId = formatDateId(new Date());
            if (stats && stats.dailyFocusTime > 0) {
              historyMap[todayId] = { ...stats, date: new Date() };
            }
            setHistoryData(historyMap);
          }
        } catch (e) { console.error("Failed to load history", e); } finally { setLoadingHistory(false); }
      };
      fetchHistory();
    }
  }, [activeTab, statsView, user, stats]);

  const getSelectedStats = () => {
    const dateId = formatDateId(selectedDate);
    if (dateId === formatDateId(new Date())) return stats;
    return historyData[dateId] || { dailyFocusTime: 0, dailyBreakTime: 0, dailySessions: 0 };
  };
  const selectedStats = getSelectedStats();

  const tabs = [
    { id: 'preferences', label: 'Preferences', icon: Sliders, description: 'Timer & workflow' },
    {
      id: 'customize', label: 'Customize', icon: Palette, description: 'Look & feel',
      children: [
        { id: 'customize-background', label: 'Background' },
        { id: 'customize-clock', label: 'Clock Style' },
        // { id: 'customize-sound', label: 'Timer Sound' }
      ]
    },
    { id: 'stats', label: 'Stats', icon: BarChart2, description: 'Track progress' },
    { id: 'account', label: 'Account', icon: User, description: 'Profile & subscription' }
  ];
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style>{toggleStyles}</style>
          {/* Backdrop */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" />

          <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none md:p-4">
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="w-full md:max-w-5xl h-[100dvh] md:h-[80vh] bg-[#0A0A0A] border-none md:border border-white/10 rounded-none md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto relative"
            >

              {/* === MOBILE HEADER === */}
              <div className="md:hidden flex flex-col bg-[#0F0F0F] border-b border-white/5 shrink-0 z-20">
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="text-2xl font-serif-display text-white tracking-tight">Settings</h2>
                  <div className="flex items-center gap-3">
                    {user && (
                      <button onClick={() => setActiveTab('account')} className="relative w-10 h-10 flex items-center justify-center transition-all duration-300">
                        {activeTab === 'account' && (<motion.div layoutId="mobileTabPill" className="absolute inset-0 bg-white rounded-full z-0 shadow-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />)}
                        <div className="relative z-10 scale-90"><Avatar userData={user} isPro={isPro} size="sm" /></div>
                      </button>
                    )}
                    <CloseButton onClick={onClose} />
                  </div>
                </div>
                {/* Mobile Nav - simplified for now, hierarchy might be tricky on mobile so keeping flat-ish or parent only */}
                <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                  {tabs.filter(t => t.id !== 'account').map((tab) => {
                    const isActive = activeTab === tab.id || activeTab.startsWith(tab.id + '-');
                    const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex items-center justify-center gap-1.5 py-2.5 rounded-xl transition-all duration-300 ${isActive ? 'text-black' : 'text-white/60 bg-white/5'}`}>
                        {isActive && <motion.div layoutId="mobileTabPill" className="absolute inset-0 bg-white rounded-xl z-0 shadow-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                        <span className="relative z-10 flex items-center gap-1.5"><Icon size={15} strokeWidth={2.5} /><span className="text-xs font-bold tracking-wide">{tab.label}</span></span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* === DESKTOP SIDEBAR (COMPACT) === */}
              <div className="hidden md:flex w-64 bg-[#0F0F0F] border-r border-white/5 p-4 flex-col shrink-0 relative">
                <div className="flex mb-6 items-center gap-3 px-2">
                  <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]"><Settings size={14} className="text-black" /></div>
                  <h2 className="text-lg font-serif-display text-white tracking-tight">Settings</h2>
                </div>
                <nav className="flex flex-col gap-1 flex-1 w-full overflow-y-auto custom-scrollbar">
                  {tabs.slice(0, 3).map((tab) => {
                    const isSelected = activeTab === tab.id || (tab.children && activeTab.startsWith(tab.id + '-'));
                    const isExpanded = expandedSections[tab.id];
                    const Icon = tab.icon;

                    return (
                      <div key={tab.id} className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.children) toggleSection(tab.id);
                          }}
                          className={`relative px-3 py-2.5 rounded-xl text-left transition-all duration-200 group flex items-center justify-between ${isSelected && !tab.children ? 'text-black' : isSelected ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                        >
                          {/* Only show pill on parent if active AND no children (or if logic demands it, but here we want pill on children when children are active)
                              Actually, user wants "flow through". So if a child is active, maybe the Parent shouldn't have the pill, but the child should.
                              But the parent "Appearance" is also a clickable page.
                              Let's just put the pill on the exact active item.
                          */}
                          {activeTab === tab.id && <motion.div layoutId="activeTabPill" className={`absolute inset-0 bg-white z-0 rounded-xl ${tab.children ? 'bg-white/10' : ''}`} transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                          <div className="relative z-10 flex items-center gap-3">
                            <Icon size={18} className={activeTab === tab.id && !tab.children ? "text-black" : "group-hover:scale-105 transition-transform"} />
                            <span className="text-sm font-bold tracking-wide">{tab.label}</span>
                          </div>
                          {tab.children && (
                            <ChevronDown size={14} className={`relative z-10 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${isSelected ? 'text-white/70' : 'text-white/30'}`} />
                          )}
                        </button>

                        {/* Sub-items */}
                        <AnimatePresence>
                          {tab.children && isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden flex flex-col gap-0.5 ml-9 border-l border-white/10 pl-2"
                            >
                              {tab.children.map(child => {
                                const isChildActive = activeTab === child.id;
                                return (
                                  <button
                                    key={child.id}
                                    onClick={() => setActiveTab(child.id)}
                                    className={`relative text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isChildActive ? 'text-black' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
                                  >
                                    {isChildActive && <motion.div layoutId="activeTabPill" className="absolute inset-0 bg-white z-0 rounded-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                                    <span className="relative z-10">{child.label}</span>
                                  </button>
                                )
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </nav>

                {user && (
                  <div className="mt-auto flex flex-col gap-2 w-full flex-shrink-0 pt-4 border-t border-white/5">
                    {!isPro && (
                      <button onClick={onOpenPro} className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border border-cyan-500/30 flex items-center justify-between gap-3 group transition-all">
                        <div className="flex items-center gap-2.5"><div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform"><Crown size={12} strokeWidth={2.5} /></div><span className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest leading-none">Get Flow</span></div>
                      </button>
                    )}
                    <button onClick={() => setActiveTab('account')} className={`flex items-center gap-3 p-2 rounded-xl border transition-all text-left group w-full ${activeTab === 'account' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                      <div className="relative"><Avatar userData={user} isPro={isPro} size="xs" /></div>
                      <div className="overflow-hidden min-w-0 flex-1"><p className={`text-xs font-bold truncate ${activeTab === 'account' ? 'text-white' : 'text-white/80'}`}>{user.displayName || 'User'}</p></div>
                    </button>

                    {/* Dev Tools (Localhost Only) */}
                    {typeof window !== 'undefined' && window.location.hostname === 'localhost' && (
                      <div className="p-2 mt-2 border-t border-white/10 select-none">
                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-widest mb-1.5">Dev: Trigger Pro Modal</p>
                        <div className="grid grid-cols-3 gap-1">
                          {['notes', 'arcade', 'ambience', 'music', 'settings', 'personalities'].map(src => (
                            <button
                              key={src}
                              onClick={(e) => { e.stopPropagation(); onOpenPro(src); }}
                              className="px-1.5 py-1 bg-white/5 hover:bg-white/10 hover:text-white rounded text-[8px] text-white/40 uppercase tracking-wider text-center border border-white/5 transition-colors"
                              title={`Trigger ${src} feature modal`}
                            >
                              {src.slice(0, 3)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <CloseButton onClick={onClose} className="hidden md:flex absolute top-6 right-6 z-50" />

              {/* === CONTENT AREA === */}
              <div className="flex-1 p-5 md:p-12 overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-[#0A0A0A]">
                <AnimatePresence mode="wait">
                  {activeTab === 'preferences' && (
                    <motion.div key="pref" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-2xl">
                      <section>
                        <h3 className="text-xl md:text-2xl font-serif-display text-white mb-2 pt-2 pb-1 leading-normal">Timer Configuration</h3>
                        <div className="flex flex-col bg-white/5 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                          <SettingInput label="Focus Duration" value={settings.focus} onChange={(e) => updateSetting('focus', e.target.value)} onBlur={() => handleBlur('focus', 25)} min={1} max={120} />
                          <SettingInput label="Short Break" value={settings.shortBreak} onChange={(e) => updateSetting('shortBreak', e.target.value)} onBlur={() => handleBlur('shortBreak', 5)} min={1} max={30} />
                          <SettingInput label="Long Break" value={settings.longBreak} onChange={(e) => updateSetting('longBreak', e.target.value)} onBlur={() => handleBlur('longBreak', 15)} min={5} max={60} />
                          <SettingInput label="Intervals" value={settings.pomosBeforeLongBreak} onChange={(e) => updateSetting('pomosBeforeLongBreak', e.target.value)} onBlur={() => handleBlur('pomosBeforeLongBreak', 4)} min={1} max={10} />
                        </div>
                      </section>
                      <section>
                        <h3 className="text-xl md:text-2xl font-serif-display text-white mb-2 pt-2 pb-1 leading-normal">Automation</h3>
                        <div className="grid grid-cols-1 gap-2">
                          <ToggleRow label="Auto-start Breaks" description="Start break timer automatically when focus ends." checked={settings.autoStartBreaks} onChange={(val) => toggleSetting('autoStartBreaks', val)} icon={Clock} />
                          <ToggleRow label="Auto-start Focus" description="Start next focus session automatically when break ends." checked={settings.autoStartWork} onChange={(val) => toggleSetting('autoStartWork', val)} icon={Zap} />
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeTab === 'customize' && (
                    <motion.div key="cust-master" variants={contentVariants} initial="hidden" animate="visible" exit="exit">
                      <MasterCustomizeView onNavigate={setActiveTab} />
                    </motion.div>
                  )}

                  {activeTab === 'customize-background' && (
                    <motion.div key="cust-bg" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setActiveTab('customize')} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                        <div><h3 className="text-xl md:text-2xl font-serif-display text-white mb-0 leading-normal">Background</h3></div>
                      </div>

                      {/* Opacity Slider */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-4 mb-6">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                            Brightness
                          </label>
                          <span className="text-white font-mono text-xs">{Math.round((settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.05"
                          value={settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5}
                          onChange={(e) => updateSetting('backgroundOpacity', parseFloat(e.target.value))}
                          style={{
                            background: `linear-gradient(to right, white 0%, white ${((settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5) - 0.1) / 0.9 * 100}%, #4a4a4e ${((settings.backgroundOpacity !== undefined ? settings.backgroundOpacity : 0.5) - 0.1) / 0.9 * 100}%, #4a4a4e 100%)`
                          }}
                          className="modern-slider"
                        />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-4 pb-12">
                        {backgrounds.map((bg, idx) => {
                          const src = bg.src || bg; const id = bg.id || idx; const isActive = settings.background === src; const isVideo = src.match(/\.(mp4|webm)$/i);
                          const credit = bg.credit;
                          return (
                            <button key={id} onClick={() => handleBackgroundChange(src)} className={`relative aspect-[9/16] md:aspect-video rounded-2xl overflow-hidden group transition-all duration-300 cursor-default ${isActive ? 'ring-2 ring-[var(--accent-pill)] ring-offset-2 ring-offset-[var(--bg-modal)] scale-[1.02]' : 'hover:scale-105 ring-1 ring-[var(--border-subtle)]'}`}>
                              {isVideo ? (<video src={src} className="w-full h-full object-cover" muted loop autoPlay playsInline />) : (<img src={src} alt="bg" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />)}
                              {isVideo && (<div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" /><span className="text-[9px] font-bold text-white/90 uppercase tracking-widest leading-none pt-[1px]">Animated</span></div>)}
                              {isActive && (<div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">Active</div></div>)}
                              {credit && (<div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"><a href={credit.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 px-2 py-1 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-bold text-white/80 hover:text-white uppercase tracking-wider transition-colors"><span>{credit.name}</span><ExternalLink size={8} /></a></div>)}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'customize-clock' && (
                    <motion.div key="cust-clock" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setActiveTab('customize')} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                        <div><h3 className="text-xl md:text-2xl font-serif-display text-white mb-0 leading-normal">Clock Style</h3></div>
                      </div>

                      {/* LIVE PREVIEW CARD */}
                      <div className="w-full aspect-video md:aspect-[21/9] bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center relative overflow-hidden group">
                        {/* Background Preview */}
                        {(settings.background && (settings.background.includes('.mp4') || settings.background.includes('.webm'))) ? (
                          <video
                            src={settings.background}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover opacity-20 z-0"
                          />
                        ) : (
                          <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: `url(${settings.background})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        )}

                        <div className={`relative z-10 transition-all duration-300 leading-none tracking-tight
                             ${(settings.clockType || 'default') === 'default' ? 'font-clock' : ''}
                             ${settings.clockType === 'sans' ? 'font-clock-sans' : ''}
                             ${settings.clockType === 'serif' ? 'font-clock-serif' : ''}
                             ${settings.clockType === 'mono' ? 'font-clock-mono' : ''}
                             ${settings.clockType === 'display' ? 'font-clock-display' : ''}
                             ${settings.clockType === 'digital' ? 'font-clock-digital' : ''}
                             ${settings.clockType === 'pixel' ? 'font-clock-pixel' : ''}
                             ${settings.clockType === 'cyber' ? 'font-clock-cyber' : ''}
                             ${settings.clockType === 'hand' ? 'font-clock-hand' : ''}
                             ${settings.clockType === 'block' ? 'font-clock-block' : ''}
                             ${settings.clockType === 'elegant' ? 'font-clock-elegant' : ''}
                             ${settings.clockType === 'neon' ? 'font-clock-neon' : ''}
                             ${settings.clockType === 'round' ? 'font-clock-round' : ''}
                             ${(settings.clockStyle || 'solid') === 'outline' ? 'text-transparent' : 'text-white'}
                           `}
                          style={{
                            fontSize: settings.clockSize === 'small' ? '3rem' : settings.clockSize === 'medium' ? '5rem' : settings.clockSize === 'giant' ? '9rem' : (settings.clockSize === 'mammoth' ? '11rem' : '7rem'),
                            WebkitTextStroke: (settings.clockStyle === 'outline') ? '2px rgba(255,255,255,0.9)' : '0px',
                          }}
                        >
                          {settings.focus || 25}:00
                        </div>

                        <div className="absolute bottom-3 left-0 right-0 text-center text-[10px] text-white/30 uppercase tracking-widest font-bold">Preview</div>
                      </div>

                      <div className="space-y-6">
                        {/* TYPEFACE SELECTOR -> Renamed to FONT & Collapsible */}
                        <div className="space-y-3">
                          <button
                            onClick={() => toggleSection('font')}
                            className="flex items-center justify-between w-full text-xs font-bold text-white/40 uppercase tracking-widest pl-1 hover:text-white transition-colors"
                          >
                            <span>Font</span>
                            <ChevronDown size={14} className={`transition-transform duration-300 ${expandedSections.font ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {(expandedSections.font ?? true) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                  {[
                                    { id: 'default', label: 'Default', class: 'font-clock' },
                                    { id: 'sans', label: 'San Francisco', class: 'font-clock-sans' },
                                    { id: 'serif', label: 'Playfair', class: 'font-clock-serif pb-1' },
                                    { id: 'mono', label: 'Space Mono', class: 'font-clock-mono text-xs' },
                                    { id: 'display', label: 'Syne', class: 'font-clock-display font-extrabold' },
                                    { id: 'pixel', label: '8-Bit', class: 'font-clock-pixel text-[10px]' },
                                    { id: 'cyber', label: 'Cyberpunk', class: 'font-clock-cyber font-bold' },
                                    { id: 'block', label: 'Impact', class: 'font-clock-block tracking-wide' },
                                    { id: 'elegant', label: 'Vogue', class: 'font-clock-elegant italic' },
                                    { id: 'hand', label: 'Marker', class: 'font-clock-hand text-sm' },
                                    { id: 'neon', label: 'Neon', class: 'font-clock-neon text-[10px]' },
                                    { id: 'round', label: 'Pop', class: 'font-clock-round' },
                                  ].map(font => (
                                    <button
                                      key={font.id}
                                      onClick={() => updateSetting('clockType', font.id)}
                                      className={`h-20 rounded-2xl border flex flex-col items-center justify-center transition-all ${settings.clockType === font.id || (!settings.clockType && font.id === 'default') ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/60 hover:text-white hover:bg-white/10'}`}
                                      title={font.label}
                                    >
                                      <span className={`text-2xl mb-1 ${font.class}`}>{settings.focus || 25}:00</span>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* SIZE SELECTOR - Reverted to Grid/Button Style */}
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Size</label>
                            <div className="grid grid-cols-5 gap-2 bg-white/5 p-1 rounded-xl border border-white/5">
                              {['small', 'medium', 'large', 'giant', 'mammoth'].map((size, idx) => (
                                <button
                                  key={size}
                                  onClick={() => updateSetting('clockSize', size)}
                                  className={`relative group h-full py-3 rounded-lg flex items-center justify-center overflow-hidden transition-all duration-300 ${settings.clockSize === size || (!settings.clockSize && size === 'large') ? 'bg-white text-black shadow-md' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
                                  title={size.charAt(0).toUpperCase() + size.slice(1)}
                                >
                                  {/* Visual representation of size */}
                                  <div className={`rounded-full bg-current transition-all duration-500`}
                                    style={{
                                      width: `${6 + (idx * 3)}px`,
                                      height: `${6 + (idx * 3)}px`,
                                      opacity: settings.clockSize === size ? 1 : 0.6
                                    }}
                                  />
                                </button>
                              ))}
                            </div>
                            <div className="flex justify-between px-1">
                              <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Small</span>
                              <span className="text-[9px] text-white/30 uppercase font-bold tracking-widest">Mammoth</span>
                            </div>
                          </div>

                          {/* STYLE TOGGLE */}
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-white/40 uppercase tracking-widest pl-1">Style</label>
                            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 relative h-[52px]">
                              {['solid', 'outline'].map(style => (
                                <button
                                  key={style}
                                  onClick={() => updateSetting('clockStyle', style)}
                                  className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all relative z-10 ${settings.clockStyle === style || (!settings.clockStyle && style === 'solid') ? 'text-black' : 'text-white/40 hover:text-white'}`}
                                >
                                  {style}
                                  {(settings.clockStyle === style || (!settings.clockStyle && style === 'solid')) && <motion.div layoutId="stylePill" className="absolute inset-0 bg-white rounded-lg -z-10 shadow-sm" transition={{ type: "spring", bounce: 0.15, duration: 0.4 }} />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'customize-sound' && (
                    <motion.div key="cust-sound" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      <div className="flex items-center gap-2 mb-4">
                        <button onClick={() => setActiveTab('customize')} className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                        <div><h3 className="text-xl md:text-2xl font-serif-display text-white mb-0 leading-normal">Timer Sound</h3></div>
                      </div>

                      {/* Volume Slider */}
                      <div className="bg-white/5 border border-white/5 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                          <label className="text-sm font-bold text-white/60 uppercase tracking-widest flex items-center gap-2">
                            <Volume2 size={14} /> Alarm Volume
                          </label>
                          <span className="text-white font-mono">{Math.round((settings.alarmVolume !== undefined ? settings.alarmVolume : 0.5) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={settings.alarmVolume !== undefined ? settings.alarmVolume : 0.5}
                          onChange={(e) => {
                            const vol = parseFloat(e.target.value);
                            setSettings(prev => ({ ...prev, alarmVolume: vol }));
                          }}
                          style={{
                            // Use the fill color #b200e9 from reference, or match app theme? 
                            // Reference: background: linear-gradient(to right, #b200e9 var(--fill-percentage), #4a4a4e var(--fill-percentage));
                            // I will use white for the fill to keep it clean as per original request, but use #4a4a4e for the empty track to match reference.
                            background: `linear-gradient(to right, white 0%, white ${(settings.alarmVolume !== undefined ? settings.alarmVolume : 0.5) * 100}%, #4a4a4e ${(settings.alarmVolume !== undefined ? settings.alarmVolume : 0.5) * 100}%, #4a4a4e 100%)`
                          }}
                          className="modern-slider"
                        />
                      </div>

                      {/* Sound Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ALARM_SOUNDS.map((sound) => {
                          const isSelected = (settings.alarmSound || 'digital') === sound.id;
                          return (
                            <button
                              key={sound.id}
                              onClick={() => {
                                setSettings(prev => ({ ...prev, alarmSound: sound.id }));
                                // Preview sound
                                const audio = new Audio(sound.src);
                                audio.volume = settings.alarmVolume !== undefined ? settings.alarmVolume : 0.5;
                                audio.play().catch(e => console.error("Preview failed", e));
                              }}
                              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isSelected
                                ? 'bg-white text-black border-white'
                                : 'bg-white/5 border-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                                }`}
                            >
                              <span className="font-medium">{sound.title}</span>
                              {isSelected && <div className="p-1 bg-black/10 rounded-full"><Check size={14} strokeWidth={3} /></div>}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'stats' && (
                    <motion.div key="stats" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl pb-12 flex flex-col h-full">
                      <div className="flex flex-col items-start gap-4 mb-8">
                        <div><h3 className="text-xl md:text-2xl font-serif-display text-white mb-0 pt-2 pb-1 leading-normal">Your Progress</h3><p className="text-white/50 text-sm">{statsView === 'today' ? "Today's activity." : "Travel through time."}</p></div>
                        <div className="flex p-1 bg-white/5 rounded-full border border-white/5 relative">{['today', 'history'].map(view => (<button key={view} onClick={() => setStatsView(view)} className={`relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${statsView === view ? 'text-black' : 'text-white/40 hover:text-white'}`}>{statsView === view && (<motion.div layoutId="statsViewPill" className="absolute inset-0 bg-white rounded-full shadow-lg z-[-1]" transition={{ type: "spring", stiffness: 500, damping: 30 }} />)}{view}</button>))}</div>
                      </div>
                      <AnimatePresence mode="wait">
                        {statsView === 'today' ? (
                          <motion.div key="view-today" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4"><StatCard label="Total Focus Time" value={formatDuration(stats.dailyFocusTime || 0)} icon={Zap} isHero={true} /><StatCard label="Break Time" value={formatDuration(stats.dailyBreakTime || 0)} icon={Coffee} delay={0.1} /><StatCard label="Sessions Completed" value={stats.dailySessions || 0} icon={TrendingUp} delay={0.15} /><StreakCard streak={stats.currentStreak || 0} active={(stats.dailyFocusTime > 0 || stats.dailySessions > 0)} /></motion.div>
                        ) : (
                          <motion.div key="view-history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-col gap-6"><HistoryCalendar historyData={historyData} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} isExpanded={isCalendarExpanded} setIsExpanded={setIsCalendarExpanded} /><motion.div layout className="space-y-4"><div className="flex items-center gap-3 border-t border-white/10 pt-6"><h4 className="font-serif-display text-lg text-white">{!isCalendarExpanded ? "Stats Overview" : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><StatCard label="Focus Time" value={formatDuration(selectedStats.dailyFocusTime || 0)} icon={Zap} highlight /><StatCard label="Break Time" value={formatDuration(selectedStats.dailyBreakTime || 0)} icon={Coffee} /><StatCard label="Sessions" value={selectedStats.dailySessions || 0} icon={TrendingUp} /></div></motion.div></motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {activeTab === 'account' && (
                    <motion.div key="acc" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="h-full flex flex-col items-center justify-center p-0 md:p-4">
                      {user && !user.isAnonymous ? (
                        <div className="w-full max-w-md flex flex-col gap-4">
                          <ProfileCard user={user} currentUser={user} isSelf={true} />
                          <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} onClick={signOut} className="w-full h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-all hover:-translate-y-0.5 focus:ring-4 focus:ring-white/5 outline-none group border border-white/10" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))" }}><LogOut size={14} className="text-white/40 group-hover:text-white transition-colors" /><span>Sign Out</span></motion.button>
                        </div>
                      ) : (
                        <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 dashed flex flex-col items-center justify-center w-full max-w-lg aspect-video">
                          <User size={48} className="text-white/30 mb-4" />
                          <p className="text-white/50 mb-6 font-medium">Guest Mode Active</p>
                          <p className="text-white/30 text-sm mb-8 max-w-xs">Sign in to save your progress, customize your handle, and access social features.</p>
                          <button onClick={signOut} className="px-8 py-3 bg-white text-black rounded-full font-bold text-sm tracking-wide uppercase hover:scale-105 transition-transform shadow-lg shadow-white/10">
                            Sign In / Register
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UnifiedSettingsModal;