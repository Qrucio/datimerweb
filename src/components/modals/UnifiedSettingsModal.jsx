import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sliders, Palette, User, LogOut, Sparkles, Clock, Zap,
  Coffee, Flame, BarChart2, TrendingUp, Settings, Calendar,
  ChevronLeft, ChevronRight, ChevronDown, Crown, Copy, Check,
  Pencil, Loader2, Lock, AlertTriangle, ExternalLink, RefreshCw
} from 'lucide-react';
import {
  getFirestore, collection, query, orderBy, getDocs, limit,
  where, doc, getDoc, writeBatch, onSnapshot
} from "firebase/firestore";
import { DEV_USER_IDS } from '../../utils/data'; // Import DEV_USER_IDS
import Avatar from '../Avatar';
import CloseButton from '../ui/CloseButton';
import ToggleRow from '../ui/ToggleRow';
import { FlowTag } from '../ui/FlowTag';

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

const StreakCard = ({ streak }) => (
  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1, type: "spring", stiffness: 300 }} className="col-span-2 relative overflow-hidden rounded-2xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#1a0c00] to-black/40 group">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
    <div className="flex items-center justify-between relative z-10">
      <div><div className="flex items-center gap-2 mb-1"><span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">Current Streak</span></div><div className="text-4xl font-serif-display text-white flex items-baseline gap-1">{streak} <span className="text-sm font-sans text-white/40 font-medium">days</span></div></div>
      <motion.div animate={{ scale: [1, 1.15, 1], filter: ["drop-shadow(0 0 10px rgba(249,115,22,0.4))", "drop-shadow(0 0 20px rgba(249,115,22,0.7))", "drop-shadow(0 0 10px rgba(249,115,22,0.4))"] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="text-orange-500"><Flame size={48} fill="currentColor" fillOpacity={0.2} strokeWidth={1.5} /></motion.div>
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
const UserProfileCard = ({ user, isPro, signOut }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [handleStatus, setHandleStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [cooldownDays, setCooldownDays] = useState(0);
  const [displayHandle, setDisplayHandle] = useState(user?.handle || "");
  const [rotation, setRotation] = useState(0);
  const dominantColor = useDominantColor(user?.photoURL);
  const db = getFirestore();

  const themes = useMemo(() => [
    { name: 'Warm Amber', gradient: "from-[#7A3B19] via-[#B95A2A] to-[#E8A15A]", glow: "rgba(185, 90, 42, 0.5)" },
    { name: 'Rich Berry', gradient: "from-[#461934] via-[#7A2E56] to-[#C77BA7]", glow: "rgba(122, 46, 86, 0.5)" },
    { name: 'Ocean Night', gradient: "from-[#06283D] via-[#0F4C75] to-[#3A7CA5]", glow: "rgba(15, 76, 117, 0.5)" },
    { name: 'Forest Deep', gradient: "from-[#053826] via-[#0B6B58] to-[#2BAE9D]", glow: "rgba(11, 107, 88, 0.5)" },
    { name: 'Graphite Cocoa', gradient: "from-[#0C0A0B] via-[#2B2324] to-[#5C4B4C]", glow: "rgba(92, 75, 76, 0.5)" },
  ], []);

  const roles = useMemo(() => ["Persistent Scholar", "Steady Achiever", "Focused Builder", "Flow State Explorer"], []);
  const [themeIndex, setThemeIndex] = useState(0);
  const [roleIndex, setRoleIndex] = useState(0);
  const currentTheme = themes[themeIndex];
  const currentRole = roles[roleIndex];

  useEffect(() => {
    if (user?.uid) {
      let hash = 0;
      for (let i = 0; i < user.uid.length; i++) {
        hash = user.uid.charCodeAt(i) + ((hash << 5) - hash);
      }
      setThemeIndex(Math.abs(hash) % themes.length);
      setRoleIndex(Math.abs(hash) % roles.length);
    }
  }, [user, themes.length, roles.length]);

  const handleRefresh = (e) => {
    e.stopPropagation();
    setRotation(prev => prev + 360);
    setThemeIndex(prev => (prev + 1) % themes.length);
    setRoleIndex(prev => (prev + 1) % roles.length);
  };

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "publicProfiles", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.handle) setDisplayHandle(data.handle);
      }
    });
    return () => unsub();
  }, [user, db]);

  useEffect(() => {
    if (isEditing) setNewHandle(displayHandle.replace(/^@/, ''));
  }, [isEditing, displayHandle]);

  useEffect(() => {
    const checkCooldown = async () => {
      if (!user) return;
      const DEV_IDS = ['cmxtLQPCqkfhkhNQZ04ZlXjCPbV2', 'QHlFAC3H34fiIVT2LaWlAoOrjmH2'];
      if (DEV_IDS.includes(user.uid)) {
        setCooldownDays(0);
        return;
      }
      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        if (userSnap.exists()) {
          const lastChange = userSnap.data().lastHandleChange || 0;
          const now = Date.now();
          const diffTime = Math.abs(now - lastChange);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays < 14) setCooldownDays(14 - diffDays);
          else setCooldownDays(0);
        }
      } catch (e) { console.error("Cooldown check failed", e); }
    };
    if (isEditing) checkCooldown();
  }, [user, isEditing, db]);

  useEffect(() => {
    if (!isEditing) return;
    const checkAvailability = async () => {
      if (newHandle.length < 3) { setHandleStatus("idle"); return; }
      const currentClean = (displayHandle || "").replace(/^@/, '');
      if (newHandle.toLowerCase() === currentClean.toLowerCase()) { setHandleStatus("available"); setStatusMsg(""); return; }
      setHandleStatus("checking");
      try {
        const fullHandle = `@${newHandle}`;
        const q = query(collection(db, "publicProfiles"), where("handle_lowercase", "==", fullHandle.toLowerCase()));
        const snap = await getDocs(q);
        if (snap.empty) { setHandleStatus("available"); setStatusMsg(""); }
        else {
          if (snap.docs[0].id === user.uid) { setHandleStatus("available"); setStatusMsg(""); }
          else { setHandleStatus("taken"); setStatusMsg("Taken"); }
        }
      } catch (e) { console.error(e); }
    };
    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [newHandle, isEditing, user, db, displayHandle]);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (displayHandle) {
      navigator.clipboard.writeText(displayHandle);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSave = async () => {
    if (handleStatus !== 'available' || newHandle.length < 3) return;
    setIsSaving(true);
    try {
      const fullHandle = `@${newHandle}`;
      const batch = writeBatch(db);
      const publicRef = doc(db, "publicProfiles", user.uid);
      batch.set(publicRef, { handle: fullHandle, handle_lowercase: fullHandle.toLowerCase() }, { merge: true });
      const privateRef = doc(db, "users", user.uid);
      batch.set(privateRef, { handle: fullHandle, lastHandleChange: Date.now() }, { merge: true });
      await batch.commit();
      setDisplayHandle(fullHandle);
      setIsEditing(false);
      setCooldownDays(14);
    } catch (e) {
      console.error("Save failed", e);
      setStatusMsg("Error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-8 w-full">
      <div className="relative group perspective-1000 w-full max-w-[420px]">
        <motion.div animate={{ backgroundColor: currentTheme.glow }} transition={{ duration: 0.8 }} className="absolute -inset-4 rounded-[40px] blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity duration-700 pointer-events-none" />
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 15 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 25 }} className="relative w-full aspect-[3/4] min-w-[360px] rounded-[28px] overflow-hidden shadow-2xl group select-none border border-white/10 bg-[#161616] flex flex-col p-8 font-sans">
          <div className="absolute inset-0 bg-[#161616]" />
          <AnimatePresence mode='wait'>
            <motion.div key={currentTheme.name} initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} className={`absolute -top-[20%] -left-[20%] w-[160%] h-[160%] rounded-full bg-gradient-to-br ${currentTheme.gradient} blur-[90px] opacity-80`} />
          </AnimatePresence>
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-[radial-gradient(closest-side,rgba(255,255,255,0.08),transparent_40%)] blur-[40px]" />
          <div className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />
          <div className="relative z-10 h-full flex flex-col justify-between w-full">
            <div className="flex justify-between items-start gap-4 w-full shrink-0">

              {/* UNIFIED AVATAR COMPONENT */}
              <div className="relative group/avatar shrink-0">
                <Avatar
                  userData={user}
                  photoURL={user.photoURL}
                  name={user.displayName}
                  isPro={isPro}
                  size="xl"
                />
              </div>

              {/* FLOW BADGE / FREE PILL */}
              <div className="flex items-center gap-2">
                <div className={`px-2 py-1 rounded-full flex items-center gap-2 backdrop-blur-md shadow-sm transition-all ${isPro ? 'bg-transparent border-none p-0' : 'bg-white/10 border border-white/10 px-3 py-1.5 text-white/60'}`}>
                  {isPro ? (
                    <div className="flex items-center gap-2 bg-black/20 rounded-full pr-3 pl-1 py-1 border border-white/10 backdrop-blur-md">
                      <FlowTag isDev={user?.uid && DEV_USER_IDS.includes(user.uid)} className="h-6 w-auto object-contain drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]" alt="Flow" />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 font-bold text-xs uppercase tracking-widest font-sans">Flow Member</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider">Free Plan</span>
                  )}
                </div>
                <button onClick={handleRefresh} className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/20 text-white/40 hover:text-white transition-all backdrop-blur-md border border-white/5 hover:border-white/20 flex items-center justify-center" title="Refresh Card Style">
                  <motion.div animate={{ rotate: rotation }} transition={{ type: "spring", stiffness: 200, damping: 15 }}><RefreshCw size={14} /></motion.div>
                </button>
              </div>
            </div>

            {/* BODY */}
            <div className="flex flex-col flex-1 justify-center gap-2.5 w-full my-6">
              <h2 className="text-[36px] font-bold leading-[1.02] tracking-[-0.01em] text-white drop-shadow-sm font-sans">{user.displayName?.split(' ')[0] || "User"}</h2>
              <div className="w-9 h-px bg-white/10 my-1.5" />
              <AnimatePresence mode='wait'>
                <motion.div key={currentRole} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 5 }} transition={{ duration: 0.3 }} className="text-[11px] uppercase tracking-[0.18em] font-semibold text-white/80 font-sans">{currentRole}</motion.div>
              </AnimatePresence>
              <div className="h-3" />
              <div className="flex flex-col gap-1 min-h-[44px]">
                {isEditing ? (
                  <div className="flex flex-col gap-1 w-full max-w-[200px]">
                    <div className="flex items-center border-b border-white/20 pb-1"><span className="text-white/40 text-sm mr-1">@</span><input autoFocus value={newHandle} onChange={(e) => setNewHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15))} className={`bg-transparent border-none outline-none text-sm font-semibold text-white w-full placeholder-white/20`} placeholder="username" />{handleStatus === 'checking' && <Loader2 size={12} className="animate-spin text-white/50" />}{handleStatus === 'available' && <Check size={12} className="text-green-400" />}{handleStatus === 'taken' && <AlertTriangle size={12} className="text-red-400" />}</div>
                    <div className="flex justify-between items-center mt-1"><span className="text-[9px] text-red-400 h-3">{statusMsg}</span><div className="flex gap-2"><button onClick={() => setIsEditing(false)} className="text-[9px] text-white/40 hover:text-white uppercase font-bold">Cancel</button><button onClick={handleSave} disabled={handleStatus !== 'available' || isSaving} className={`text-[9px] uppercase font-bold ${handleStatus === 'available' ? 'text-green-400 hover:text-green-300' : 'text-white/20 cursor-not-allowed'}`}>Save</button></div></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 group/handle w-fit relative">
                      <button onClick={handleCopy} className="text-[14px] text-white font-semibold tracking-wide font-sans shadow-black drop-shadow-sm hover:text-white/80 transition-colors text-left">{displayHandle || "@username"}</button>
                      <button onClick={() => setIsEditing(true)} disabled={cooldownDays > 0} className={`opacity-0 group-hover/handle:opacity-100 transition-opacity p-1 rounded hover:bg-white/10 ${cooldownDays > 0 ? 'text-white/20 cursor-not-allowed' : 'text-white/40 hover:text-white'}`}>{cooldownDays > 0 ? <Lock size={10} /> : <Pencil size={10} />}</button>
                      <div className="absolute left-full ml-2 opacity-0 transition-opacity duration-300 pointer-events-none">{copied && <span className="text-[10px] text-green-400 font-bold bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-md">Copied</span>}</div>
                    </div>
                    <span className="text-[12px] text-white/50 font-normal font-sans tracking-wide">{user.email}</span>
                  </>
                )}
              </div>
            </div>
            <div className="absolute bottom-8 right-8 pointer-events-none select-none"><div className="bg-white/5 rounded-lg p-2 backdrop-blur-sm border border-white/5"><img src="/logo/altimerblack.png" alt="Altimer Logo" className="w-10 opacity-70" /></div></div>
          </div>
        </motion.div>
      </div>
      <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }} onClick={signOut} className="w-full max-w-[420px] h-12 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 hover:text-white transition-all hover:-translate-y-0.5 focus:ring-4 focus:ring-white/5 outline-none group border border-white/10" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.04))" }}><LogOut size={14} className="text-white/40 group-hover:text-white transition-colors" /><span>Sign Out</span></motion.button>
    </div>
  );
};

// --- MAIN MODAL COMPONENT ---
const UnifiedSettingsModal = ({
  isOpen, onClose, user, signOut, settings, setSettings,
  handleSettingsSave, handleBackgroundChange, backgrounds = [],
  isPro = false, stats = {}, onOpenPro
}) => {
  const [activeTab, setActiveTab] = useState('preferences');
  const [statsView, setStatsView] = useState('today');
  const [historyData, setHistoryData] = useState({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(true);

  // --- SETTING HANDLERS ---
  const updateSetting = (key, value) => {
    if (value === '') { setSettings(prev => ({ ...prev, [key]: '' })); return; }
    const val = parseInt(value, 10);
    if (!isNaN(val)) { setSettings(prev => ({ ...prev, [key]: val })); }
  };

  const handleBlur = (key, defaultValue) => {
    const val = settings[key];
    if (val === '' || val === 0 || isNaN(val)) { setSettings(prev => ({ ...prev, [key]: defaultValue })); }
  };

  const toggleSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const contentVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
    exit: { opacity: 0, y: -5, transition: { duration: 0.15, ease: "easeIn" } }
  };

  useEffect(() => {
    if (activeTab === 'stats' && statsView === 'history' && user) {
      const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
          const db = getFirestore();
          const historyRef = collection(db, 'users', user.uid, 'history');
          const q = query(historyRef, orderBy('date', 'desc'), limit(100));
          const snapshot = await getDocs(q);
          const data = {};
          snapshot.forEach(doc => { data[doc.id] = doc.data(); });
          const todayId = formatDateId(new Date());
          if (stats && stats.dailyFocusTime > 0) { data[todayId] = { ...stats, date: new Date() }; }
          setHistoryData(data);
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
    { id: 'preferences', label: 'Preferences', icon: Sliders, description: 'Timer & workflow.' },
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Look & feel.' },
    { id: 'stats', label: 'Stats', icon: BarChart2, description: 'Track progress.' },
    { id: 'account', label: 'Account', icon: User, description: 'Profile & subscription.' }
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
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0, duration: 0.25 }}
              className="w-full md:max-w-5xl h-[100dvh] md:h-[80vh] bg-[#0A0A0A] border-none md:border border-white/10 rounded-none md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto relative"
            >

              {/* === MOBILE HEADER === */}
              <div className="md:hidden flex flex-col bg-[#0F0F0F] border-b border-white/5 shrink-0 z-20">
                {/* Row 1: Title & Controls */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <h2 className="text-2xl font-serif-display text-white tracking-tight">Settings</h2>
                  <div className="flex items-center gap-3">
                    {/* Account Avatar */}
                    {user && (
                      <button
                        onClick={() => setActiveTab('account')}
                        className="relative w-10 h-10 flex items-center justify-center transition-all duration-300"
                      >
                        {activeTab === 'account' && (
                          <motion.div layoutId="mobileTabPill" className="absolute inset-0 bg-white rounded-full z-0 shadow-lg" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />
                        )}
                        <div className="relative z-10 scale-90"><Avatar userData={user} isPro={isPro} size="sm" /></div>
                      </button>
                    )}
                    {/* Close Button */}
                    <CloseButton onClick={onClose} />
                  </div>
                </div>

                {/* Row 2: Navigation Grid (RESTORED TO "PERFECT" STATE) */}
                <div className="grid grid-cols-3 gap-2 px-4 pb-4">
                  {tabs.filter(t => t.id !== 'account').map((tab) => {
                    const isActive = activeTab === tab.id;
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

              {/* === DESKTOP SIDEBAR === */}
              <div className="hidden md:flex w-72 bg-[#0F0F0F] border-r border-white/5 p-6 flex-col shrink-0 relative">
                <div className="flex mb-8 items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]"><Settings size={16} className="text-black" /></div>
                  <h2 className="text-xl font-serif-display text-white tracking-tight">Settings</h2>
                </div>
                <nav className="flex flex-col gap-2 flex-1 w-full">
                  {tabs.slice(0, 3).map((tab) => {
                    const isActive = activeTab === tab.id; const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative p-4 rounded-2xl text-left transition-all duration-300 group overflow-hidden flex-shrink-0 ${isActive ? 'text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        {isActive && <motion.div layoutId="activeTabPill" className="absolute inset-0 bg-white z-0 rounded-2xl" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                        <div className="relative z-10 flex items-center gap-3"><Icon size={20} className={isActive ? "text-black" : "group-hover:scale-110 transition-transform"} /><div><span className="block font-bold text-sm">{tab.label}</span><span className={`text-xs ${isActive ? 'text-black/60' : 'text-white/40'}`}>{tab.description}</span></div></div>
                      </button>
                    );
                  })}
                </nav>
                {user && (
                  <div className="mt-auto flex flex-col gap-3 w-full flex-shrink-0">
                    {!isPro && (
                      <button onClick={onOpenPro} className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 hover:from-cyan-500/20 hover:to-blue-600/20 border border-cyan-500/30 flex items-center justify-between gap-3 group transition-all">
                        <div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform"><Crown size={14} strokeWidth={2.5} /></div><div className="flex flex-col items-start"><span className="text-cyan-400 text-xs font-bold uppercase tracking-widest leading-none">Get Flow</span><span className="text-cyan-500/50 text-[10px] leading-none mt-1">Unlock everything</span></div></div><div className="text-cyan-500/50 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all"><ChevronRight size={14} /></div>
                      </button>
                    )}
                    <button onClick={() => setActiveTab('account')} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group w-full ${activeTab === 'account' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                      <div className="relative"><Avatar userData={user} isPro={isPro} size="sm" /></div>
                      <div className="overflow-hidden min-w-0 flex-1"><p className={`text-sm font-bold truncate ${activeTab === 'account' ? 'text-white' : 'text-white/80'}`}>{user.displayName || 'User'}</p><p className="text-white/40 text-[10px] truncate group-hover:text-white/60 transition-colors">Manage Account</p></div>
                    </button>
                  </div>
                )}
              </div>
              <CloseButton onClick={onClose} className="hidden md:flex absolute top-6 right-6" />

              {/* === CONTENT AREA === */}
              <div className="flex-1 p-5 md:p-12 overflow-y-auto overflow-x-hidden custom-scrollbar relative bg-[#0A0A0A]">
                <AnimatePresence mode="wait">
                  {activeTab === 'preferences' && (
                    <motion.div key="pref" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-2xl">
                      <section>
                        <h3 className="text-xl md:text-2xl font-serif-display text-white mb-3">Timer Configuration</h3>
                        {/* CHANGED: Vertical List Layout (Apple Style) */}
                        <div className="flex flex-col bg-white/5 border border-white/5 rounded-3xl overflow-hidden divide-y divide-white/5">
                          <SettingInput label="Focus Duration" value={settings.focus} onChange={(e) => updateSetting('focus', e.target.value)} onBlur={() => handleBlur('focus', 25)} min={1} max={120} />
                          <SettingInput label="Short Break" value={settings.shortBreak} onChange={(e) => updateSetting('shortBreak', e.target.value)} onBlur={() => handleBlur('shortBreak', 5)} min={1} max={30} />
                          <SettingInput label="Long Break" value={settings.longBreak} onChange={(e) => updateSetting('longBreak', e.target.value)} onBlur={() => handleBlur('longBreak', 15)} min={5} max={60} />
                          <SettingInput label="Intervals" value={settings.pomosBeforeLongBreak} onChange={(e) => updateSetting('pomosBeforeLongBreak', e.target.value)} onBlur={() => handleBlur('pomosBeforeLongBreak', 4)} min={1} max={10} />
                        </div>
                      </section>
                      <section>
                        <h3 className="text-xl md:text-2xl font-serif-display text-white mb-3">Automation</h3>
                        <div className="grid grid-cols-1 gap-2">
                          <ToggleRow label="Auto-start Breaks" description="Start break timer automatically when focus ends." checked={settings.autoStartBreaks} onChange={(val) => toggleSetting('autoStartBreaks', val)} icon={Clock} />
                          <ToggleRow label="Auto-start Focus" description="Start next focus session automatically when break ends." checked={settings.autoStartWork} onChange={(val) => toggleSetting('autoStartWork', val)} icon={Zap} />


                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeTab === 'appearance' && (
                    <motion.div key="appear" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      <div><h3 className="text-xl md:text-2xl font-serif-display text-white mb-1">Environment</h3><p className="text-white/50 text-sm">Choose your focus atmosphere.</p></div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pb-12">
                        {backgrounds.map((bg, idx) => {
                          const src = bg.src || bg; const id = bg.id || idx; const isActive = settings.background === src; const isVideo = src.match(/\.(mp4|webm)$/i);
                          const credit = bg.credit;
                          return (
                            <button key={id} onClick={() => handleBackgroundChange(src)} className={`relative aspect-video rounded-2xl overflow-hidden group transition-all duration-300 ${isActive ? 'ring-2 ring-[var(--accent-pill)] ring-offset-2 ring-offset-[var(--bg-modal)] scale-[1.02]' : 'hover:scale-105 ring-1 ring-[var(--border-subtle)]'}`}>
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

                  {activeTab === 'stats' && (
                    <motion.div key="stats" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl pb-12 flex flex-col h-full">
                      <div className="flex flex-col items-start gap-4 mb-8">
                        <div><h3 className="text-xl md:text-2xl font-serif-display text-white mb-1">Your Progress</h3><p className="text-white/50 text-sm">{statsView === 'today' ? "Today's activity." : "Travel through time."}</p></div>
                        <div className="flex p-1 bg-white/5 rounded-full border border-white/5 relative">{['today', 'history'].map(view => (<button key={view} onClick={() => setStatsView(view)} className={`relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${statsView === view ? 'text-black' : 'text-white/40 hover:text-white'}`}>{statsView === view && (<motion.div layoutId="statsViewPill" className="absolute inset-0 bg-white rounded-full shadow-lg z-[-1]" transition={{ type: "spring", stiffness: 500, damping: 30 }} />)}{view}</button>))}</div>
                      </div>
                      <AnimatePresence mode="wait">
                        {statsView === 'today' ? (
                          <motion.div key="view-today" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="grid grid-cols-1 sm:grid-cols-2 gap-4"><StatCard label="Total Focus Time" value={formatDuration(stats.dailyFocusTime || 0)} icon={Zap} isHero={true} /><StatCard label="Break Time" value={formatDuration(stats.dailyBreakTime || 0)} icon={Coffee} delay={0.1} /><StatCard label="Sessions Completed" value={stats.dailySessions || 0} icon={TrendingUp} delay={0.15} /><StreakCard streak={stats.currentStreak || 0} /></motion.div>
                        ) : (
                          <motion.div key="view-history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-col gap-6"><HistoryCalendar historyData={historyData} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} isExpanded={isCalendarExpanded} setIsExpanded={setIsCalendarExpanded} /><motion.div layout className="space-y-4"><div className="flex items-center gap-3 border-t border-white/10 pt-6"><h4 className="font-serif-display text-lg text-white">{!isCalendarExpanded ? "Stats Overview" : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><StatCard label="Focus Time" value={formatDuration(selectedStats.dailyFocusTime || 0)} icon={Zap} highlight /><StatCard label="Break Time" value={formatDuration(selectedStats.dailyBreakTime || 0)} icon={Coffee} /><StatCard label="Sessions" value={selectedStats.dailySessions || 0} icon={TrendingUp} /></div></motion.div></motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {activeTab === 'account' && (
                    <motion.div key="acc" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="h-full flex flex-col items-center justify-center p-0 md:p-4">
                      {user ? (
                        <UserProfileCard user={user} isPro={isPro} signOut={signOut} />
                      ) : (
                        <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 dashed flex flex-col items-center justify-center w-full max-w-lg aspect-video"><User size={48} className="text-white/30 mb-4" /><p className="text-white/50">Please sign in to manage your account.</p></div>
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