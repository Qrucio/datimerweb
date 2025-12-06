import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Sliders, Palette, User, LogOut, Sparkles, Clock, Zap,
  Coffee, Flame, BarChart2, TrendingUp, Settings, Calendar,
  ChevronLeft, ChevronRight, ChevronDown, Crown, Copy, Check,
  Pencil, Loader2, Lock, AlertTriangle, ExternalLink
} from 'lucide-react';
import {
  getFirestore, collection, query, orderBy, getDocs, limit,
  where, doc, getDoc, writeBatch, onSnapshot
} from "firebase/firestore";

// --- 0. INJECTED CSS FOR THE TOGGLE ---
const toggleStyles = `
  .theme-checkbox {
    --toggle-size: 10px;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 6.25em;
    height: 3.125em;
    background: linear-gradient(to right, #fff 50%, #000 50%) no-repeat; 
    background-size: 205%;
    background-position: 100%;
    -webkit-transition: 0.4s;
    -o-transition: 0.4s;
    transition: 0.4s;
    border-radius: 99em;
    position: relative;
    cursor: pointer;
    font-size: var(--toggle-size);
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.15);
    margin-right: 2px;
  }
  .theme-checkbox::before {
    content: "";
    width: 2.25em;
    height: 2.25em;
    position: absolute;
    top: 0.438em;
    left: 0.438em;
    background: linear-gradient(to right, #000 50%, #fff 50%) no-repeat; 
    background-size: 205%;
    background-position: 100%;
    border-radius: 50%;
    -webkit-transition: 0.4s;
    -o-transition: 0.4s;
    transition: 0.4s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  }
  .theme-checkbox:checked::before {
    left: calc(100% - 2.25em - 0.438em);
    background-position: 0;
  }
  .theme-checkbox:checked {
    background-position: 0;
    border-color: #fff;
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
        // Draw the image resized to 1x1 pixel to get average color
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        setColor(`rgba(${r}, ${g}, ${b}, 0.5)`); // Higher opacity for visibility
      } catch (e) {
        console.warn("Could not extract color (likely CORS)", e);
      }
    };
  }, [imageUrl]);

  return color;
};

// --- INPUT COMPONENTS ---
const SettingInput = ({ label, value, onChange, min, max }) => (
  <div className="flex items-center justify-between py-3 group">
    <label className="text-white/70 text-xs md:text-sm font-medium group-hover:text-white transition-colors truncate pr-2">{label}</label>
    <div className="relative flex items-center justify-center w-20 md:w-24 bg-white/5 rounded-xl border border-white/10 focus-within:border-white/30 transition-all hover:bg-white/10 shrink-0">
      <input type="number" value={value} onChange={onChange} min={min} max={max} className="w-full bg-transparent text-white text-center font-mono text-sm py-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pl-2 pr-6" />
      <span className="absolute right-3 text-white/30 text-xs pointer-events-none select-none">{label.toLowerCase().includes('intervals') ? 'x' : 'm'}</span>
    </div>
  </div>
);

const AestheticToggle = ({ label, description, checked, onChange, icon: Icon }) => (
  <div onClick={() => onChange(!checked)} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-all cursor-pointer select-none active:scale-[0.99]">
    <div className="flex items-center gap-4 pr-4 overflow-hidden">
      <div className={`p-2 rounded-xl transition-colors duration-300 shrink-0 ${checked ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>
        <Icon size={18} strokeWidth={checked ? 2.5 : 2} />
      </div>
      <div className="min-w-0">
        <h4 className={`text-sm font-bold transition-colors duration-300 truncate ${checked ? 'text-white' : 'text-white/60'}`}>{label}</h4>
        {description && <p className="text-white/30 text-[10px] leading-tight mt-0.5 truncate">{description}</p>}
      </div>
    </div>
    <input type="checkbox" className="theme-checkbox pointer-events-none" checked={checked} readOnly />
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

// --- USER PROFILE CARD (UPDATED) ---
const UserProfileCard = ({ user, isPro, signOut }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newHandle, setNewHandle] = useState("");
  const [handleStatus, setHandleStatus] = useState("idle"); // 'idle', 'checking', 'available', 'taken'
  const [statusMsg, setStatusMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [cooldownDays, setCooldownDays] = useState(0);

  // New State: Listen for the REAL handle
  const [displayHandle, setDisplayHandle] = useState(user?.handle || "");

  // Extract dominant color from profile picture for the background aura
  const dominantColor = useDominantColor(user?.photoURL);

  const db = getFirestore();

  // --- LISTENER FOR REAL-TIME HANDLE UPDATES ---
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, "publicProfiles", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.handle) {
          setDisplayHandle(data.handle);
        }
      }
    });
    return () => unsub();
  }, [user, db]);

  // Initialize edit input when opening edit mode
  useEffect(() => {
    if (isEditing) {
      setNewHandle(displayHandle.replace(/^@/, ''));
    }
  }, [isEditing, displayHandle]);

  // Check cooldown on mount/open
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
          if (diffDays < 14) {
            setCooldownDays(14 - diffDays);
          } else {
            setCooldownDays(0);
          }
        }
      } catch (e) { console.error("Cooldown check failed", e); }
    };

    if (isEditing) checkCooldown();
  }, [user, isEditing, db]);

  // Handle availability checker
  useEffect(() => {
    if (!isEditing) return;

    const checkAvailability = async () => {
      if (newHandle.length < 3) {
        setHandleStatus("idle");
        return;
      }

      // Don't check if it's same as current
      const currentClean = (displayHandle || "").replace(/^@/, '');
      if (newHandle.toLowerCase() === currentClean.toLowerCase()) {
        setHandleStatus("available");
        setStatusMsg("");
        return;
      }

      setHandleStatus("checking");

      try {
        const fullHandle = `@${newHandle}`;
        const q = query(
          collection(db, "publicProfiles"),
          where("handle_lowercase", "==", fullHandle.toLowerCase())
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          setHandleStatus("available");
          setStatusMsg("");
        } else {
          // Check if it's me
          if (snap.docs[0].id === user.uid) {
            setHandleStatus("available");
            setStatusMsg("");
          } else {
            setHandleStatus("taken");
            setStatusMsg("Taken");
          }
        }
      } catch (e) { console.error(e); }
    };

    const timer = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timer);
  }, [newHandle, isEditing, user, db, displayHandle]);


  const handleCopy = () => {
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
      batch.set(publicRef, {
        handle: fullHandle,
        handle_lowercase: fullHandle.toLowerCase()
      }, { merge: true });

      const privateRef = doc(db, "users", user.uid);
      batch.set(privateRef, {
        handle: fullHandle,
        lastHandleChange: Date.now()
      }, { merge: true });

      await batch.commit();

      // Update local state immediately for snappy feel
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="relative w-full max-w-sm aspect-[3/4] rounded-[32px] overflow-hidden shadow-2xl group select-none mx-auto border border-white/10"
    >
      {/* 1. BACKGROUND LAYER */}
      <div className="absolute inset-0 bg-[#161616]" /> {/* Base Charcoal */}

      {/* 2. DYNAMIC AURA BLOB (Matches PFP) */}
      <motion.div
        animate={{ backgroundColor: dominantColor }}
        transition={{ duration: 1 }}
        className="absolute -top-20 -left-20 w-96 h-96 rounded-full blur-[100px] opacity-50"
      />

      {/* 3. NOISE TEXTURE */}
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }} />

      {/* 4. CONTENT LAYER */}
      <div className="relative z-10 h-full flex flex-col p-8 justify-between">

        {/* HEADER: Avatar & Badge */}
        <div className="flex justify-between items-start">
          <div className="relative group/avatar">
            {/* Soft Glow Behind Avatar */}
            <div className={`absolute inset-0 blur-xl rounded-full opacity-0 group-hover/avatar:opacity-60 transition-opacity duration-700`} style={{ backgroundColor: dominantColor }} />

            {/* Avatar Circle - GOLD RING RESTORED */}
            <div className={`relative w-24 h-24 rounded-full p-[3px] overflow-hidden ${isPro ? 'bg-gradient-to-b from-yellow-300 via-yellow-500 to-yellow-700 shadow-[0_0_15px_rgba(234,179,8,0.5)]' : 'ring-1 ring-white/10 bg-gradient-to-br from-white/10 to-transparent'}`}>
              <div className="w-full h-full rounded-full border-2 border-black overflow-hidden relative">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex items-center justify-center">
                    <User size={32} className="text-white/20" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Membership Pill */}
          <div className={`
            px-3 py-1.5 rounded-full border flex items-center gap-2 backdrop-blur-md shadow-sm
            ${isPro ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200' : 'bg-white/5 border-white/10 text-white/50'}
          `}>
            {isPro ? (
              <>
                <Crown size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-yellow-400">Pro</span>
              </>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider">Free</span>
            )}
          </div>
        </div>

        {/* MIDDLE: Identity Info */}
        <div className="flex flex-col mt-auto mb-10">
          <h2 className="text-4xl font-serif-display text-white tracking-tight leading-tight mb-1 pb-1 drop-shadow-sm truncate">
            {user.displayName?.split(' ')[0] || "User"}
          </h2>

          <div className="flex flex-col gap-1 min-h-[50px]">
            {isEditing ? (
              // --- EDIT MODE ---
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-white/40 font-sans text-lg">@</span>
                  <input
                    autoFocus
                    value={newHandle}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 15);
                      setNewHandle(val);
                    }}
                    className={`bg-transparent border-b ${handleStatus === 'taken' ? 'border-red-500 text-red-200' : 'border-white/20 text-white'} outline-none w-full pb-1 font-sans font-medium tracking-wide placeholder-white/10`}
                    placeholder="username"
                  />
                  {handleStatus === 'checking' && <Loader2 size={16} className="animate-spin text-white/50" />}
                  {handleStatus === 'taken' && <AlertTriangle size={16} className="text-red-500" />}
                  {handleStatus === 'available' && <Check size={16} className="text-green-500" />}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-red-400 h-4">{statusMsg}</span>
                  <div className="flex gap-2">
                    <button onClick={() => { setIsEditing(false); setNewHandle(displayHandle.replace(/^@/, '')); }} className="text-[10px] uppercase font-bold text-white/40 hover:text-white px-2 py-1">Cancel</button>
                    <button
                      onClick={handleSave}
                      disabled={handleStatus !== 'available' || isSaving}
                      className={`text-[10px] uppercase font-bold px-3 py-1 rounded bg-white text-black transition-opacity ${handleStatus !== 'available' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                    >
                      {isSaving ? 'Saving' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // --- VIEW MODE (UPDATED: Click to Copy + Hover Tooltip) ---
              <>
                <div className="flex items-center gap-3 group/handle w-fit relative">
                  {/* THE HANDLE BUTTON */}
                  <button
                    onClick={handleCopy}
                    className="text-base text-white/90 font-medium tracking-wide font-sans hover:text-white transition-colors text-left relative"
                  >
                    {displayHandle || "@username"}
                  </button>

                  {/* HOVER POPUP (Message Popup) */}
                  <div className="absolute -top-8 left-0 px-2 py-1 bg-white text-black text-[10px] font-bold rounded opacity-0 group-hover/handle:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                    {copied ? "Copied!" : "Click to copy"}
                    {/* Tiny Triangle Arrow */}
                    <div className="absolute top-full left-4 -translate-x-1/2 border-4 border-transparent border-t-white" />
                  </div>

                  {/* EDIT BUTTON (Separate) */}
                  <button
                    onClick={() => setIsEditing(true)}
                    disabled={cooldownDays > 0}
                    className={`hover:text-white transition-colors ${cooldownDays > 0 ? 'text-white/10 cursor-not-allowed' : 'text-white/40'}`}
                  >
                    {cooldownDays > 0 ? <Lock size={12} /> : <Pencil size={12} />}
                  </button>
                </div>

                {/* Email */}
                <span className="text-xs text-white/40 font-sans tracking-wide truncate">
                  {user.email}
                </span>
              </>
            )}
          </div>
        </div>

        {/* FOOTER: Sign Out Button (CLEANED UP - No Glow) */}
        <button
          onClick={signOut}
          className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors duration-200"
        >
          <div className="flex items-center justify-center gap-2 py-4">
            <LogOut size={14} className="text-white/60 transition-colors" />
            <span className="text-xs font-bold text-white/60 uppercase tracking-widest transition-colors">
              Sign Out
            </span>
          </div>
        </button>

      </div>
    </motion.div>
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
          if (stats && stats.dailyFocusTime > 0) {
            data[todayId] = { ...stats, date: new Date() };
          }
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
  const updateSetting = (key, value) => { const val = typeof value === 'string' ? parseInt(value) || 0 : value; setSettings(prev => ({ ...prev, [key]: val })); };
  const tabs = [{ id: 'preferences', label: 'Preferences', icon: Sliders, description: 'Timer & workflow.' }, { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Look & feel.' }, { id: 'stats', label: 'Statistics', icon: BarChart2, description: 'Track progress.' }];
  const contentVariants = { hidden: { opacity: 0, x: 10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.15, ease: "easeOut" } }, exit: { opacity: 0, x: -10, transition: { duration: 0.1, ease: "easeIn" } } };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style>{toggleStyles}</style>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]" />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} transition={{ type: "spring", bounce: 0, duration: 0.25 }} className="w-full max-w-5xl h-[80vh] max-h-[800px] bg-[#0A0A0A] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto relative">
              <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all hover:rotate-90 active:scale-90"><X size={20} /></button>

              {/* SIDEBAR */}
              <div className="w-full md:w-72 bg-[#0F0F0F] border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-6 flex md:flex-col shrink-0 overflow-x-auto md:overflow-visible gap-4 md:gap-0 no-scrollbar items-center md:items-stretch">
                <div className="hidden md:flex mb-8 items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]"><Settings size={16} className="text-black" /></div>
                  <h2 className="text-xl font-serif-display text-white tracking-tight">Settings</h2>
                </div>
                <nav className="flex md:flex-col gap-2 flex-1 w-full">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id; const Icon = tab.icon;
                    return (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl text-left transition-all duration-300 group overflow-hidden flex-shrink-0 ${isActive ? 'text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        {isActive && <motion.div layoutId="activeTabPill" className="absolute inset-0 bg-white z-0 rounded-xl md:rounded-2xl" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                        <div className="relative z-10 flex items-center gap-3"><Icon size={20} className={isActive ? "text-black" : "group-hover:scale-110 transition-transform"} /><div className="hidden md:block"><span className="block font-bold text-sm">{tab.label}</span><span className={`text-xs ${isActive ? 'text-black/60' : 'text-white/40'}`}>{tab.description}</span></div><span className="block md:hidden font-bold text-sm">{tab.label}</span></div>
                      </button>
                    );
                  })}
                </nav>

                {/* --- SIDEBAR FOOTER --- */}
                {user && (
                  <div className="md:mt-auto flex items-center md:flex-col gap-3 w-auto md:w-full flex-shrink-0">
                    {!isPro && (
                      <button onClick={onOpenPro} className="w-8 h-8 md:w-full md:h-auto md:py-3 md:px-4 rounded-full md:rounded-2xl bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 hover:from-yellow-500/20 hover:to-yellow-600/20 border border-yellow-500/30 flex items-center justify-center md:justify-between gap-3 group transition-all" title="Upgrade to Pro">
                        <div className="flex items-center gap-3"><div className="w-8 h-8 md:w-6 md:h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center group-hover:scale-110 transition-transform"><Crown size={14} strokeWidth={2.5} /></div><div className="hidden md:flex flex-col items-start"><span className="text-yellow-400 text-xs font-bold uppercase tracking-widest leading-none">Get Pro</span><span className="text-yellow-500/50 text-[10px] leading-none mt-1">Unlock everything</span></div></div><div className="hidden md:block text-yellow-500/50 group-hover:text-yellow-400 group-hover:translate-x-1 transition-all"><ChevronRight size={14} /></div>
                      </button>
                    )}
                    <button onClick={() => setActiveTab('account')} className={`flex items-center gap-3 p-2 md:p-3 rounded-2xl border transition-all text-left group w-full ${activeTab === 'account' ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}>
                      <div className="relative">
                        {isPro && <div className="absolute -inset-[2px] rounded-full bg-gradient-to-br from-yellow-600 via-amber-400 to-yellow-600 opacity-60 blur-[1px] animate-pulse z-0" />}
                        {user.photoURL ? <img src={user.photoURL} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 object-cover relative z-10" /> : <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center text-white relative z-10"><User size={18} /></div>}
                      </div>
                      <div className="hidden md:block overflow-hidden min-w-0 flex-1"><p className={`text-sm font-bold truncate ${activeTab === 'account' ? 'text-white' : 'text-white/80'}`}>{user.displayName || 'User'}</p><p className="text-white/40 text-[10px] truncate group-hover:text-white/60 transition-colors">Manage Account</p></div>
                    </button>
                  </div>
                )}
              </div>

              {/* CONTENT AREA */}
              <div className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode="wait">
                  {activeTab === 'preferences' && (
                    <motion.div key="pref" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-2xl">
                      <section><h3 className="text-2xl font-serif-display text-white mb-3">Timer Configuration</h3><div className="p-4 bg-white/5 border border-white/5 rounded-3xl"><div className="grid grid-cols-2 gap-x-6 gap-y-1"><SettingInput label="Focus Duration" value={settings.focus} onChange={(e) => updateSetting('focus', e.target.value)} min={1} max={120} /><SettingInput label="Short Break" value={settings.shortBreak} onChange={(e) => updateSetting('shortBreak', e.target.value)} min={1} max={30} /><SettingInput label="Long Break" value={settings.longBreak} onChange={(e) => updateSetting('longBreak', e.target.value)} min={5} max={60} /><SettingInput label="Intervals" value={settings.pomosBeforeLongBreak} onChange={(e) => updateSetting('pomosBeforeLongBreak', e.target.value)} min={1} max={10} /></div></div></section>
                      <section><h3 className="text-2xl font-serif-display text-white mb-3">Automation</h3><div className="grid grid-cols-1 gap-2"><AestheticToggle label="Auto-start Breaks" description="Start break timer automatically when focus ends." checked={settings.autoStartBreaks} onChange={(val) => updateSetting('autoStartBreaks', val)} icon={Clock} /><AestheticToggle label="Auto-start Focus" description="Start next focus session automatically when break ends." checked={settings.autoStartWork} onChange={(val) => updateSetting('autoStartWork', val)} icon={Zap} /></div></section>
                    </motion.div>
                  )}

                  {activeTab === 'appearance' && (
                    <motion.div key="appear" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      <div><h3 className="text-2xl font-serif-display text-white mb-1">Environment</h3><p className="text-white/50 text-sm">Choose your focus atmosphere.</p></div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-12">
                        {backgrounds.map((bg, idx) => {
                          const src = bg.src || bg; const id = bg.id || idx; const isActive = settings.background === src; const isVideo = src.match(/\.(mp4|webm)$/i);
                          // Extract Credit Info
                          const credit = bg.credit;

                          return (
                            <button key={id} onClick={() => handleBackgroundChange(src)} className={`relative aspect-video rounded-2xl overflow-hidden group transition-all duration-300 ${isActive ? 'ring-2 ring-[var(--accent-pill)] ring-offset-2 ring-offset-[var(--bg-modal)] scale-[1.02]' : 'hover:scale-105 ring-1 ring-[var(--border-subtle)]'}`}>
                              {isVideo ? (<video src={src} className="w-full h-full object-cover" muted loop autoPlay playsInline />) : (<img src={src} alt="bg" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />)}
                              {isVideo && (<div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.8)]" /><span className="text-[9px] font-bold text-white/90 uppercase tracking-widest leading-none pt-[1px]">Animated</span></div>)}
                              {isActive && (<div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center"><div className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">Active</div></div>)}

                              {/* --- CREDIT BADGE --- */}
                              {credit && (
                                <div className="absolute bottom-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                  <a
                                    href={credit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()} // Stop background selection
                                    className="flex items-center gap-1.5 px-2 py-1 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-bold text-white/80 hover:text-white uppercase tracking-wider transition-colors"
                                  >
                                    <span>{credit.name}</span>
                                    <ExternalLink size={8} />
                                  </a>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'stats' && (
                    <motion.div key="stats" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl pb-12 flex flex-col h-full">
                      <div className="flex flex-col items-start gap-4 mb-8">
                        <div><h3 className="text-2xl font-serif-display text-white mb-1">Your Progress</h3><p className="text-white/50 text-sm">{statsView === 'today' ? "Today's activity." : "Travel through time."}</p></div>
                        <div className="flex p-1 bg-white/5 rounded-full border border-white/5 relative">{['today', 'history'].map(view => (<button key={view} onClick={() => setStatsView(view)} className={`relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-colors z-10 ${statsView === view ? 'text-black' : 'text-white/40 hover:text-white'}`}>{statsView === view && (<motion.div layoutId="statsViewPill" className="absolute inset-0 bg-white rounded-full shadow-lg z-[-1]" transition={{ type: "spring", stiffness: 500, damping: 30 }} />)}{view}</button>))}</div>
                      </div>
                      <AnimatePresence mode="wait">
                        {statsView === 'today' ? (
                          <motion.div key="view-today" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="grid grid-cols-2 gap-4"><StatCard label="Total Focus Time" value={formatDuration(stats.dailyFocusTime || 0)} icon={Zap} isHero={true} /><StatCard label="Break Time" value={formatDuration(stats.dailyBreakTime || 0)} icon={Coffee} delay={0.1} /><StatCard label="Sessions Completed" value={stats.dailySessions || 0} icon={TrendingUp} delay={0.15} /><StreakCard streak={stats.currentStreak || 0} /></motion.div>
                        ) : (
                          <motion.div key="view-history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }} className="flex flex-col gap-6"><HistoryCalendar historyData={historyData} currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} selectedDate={selectedDate} onSelectDate={setSelectedDate} isExpanded={isCalendarExpanded} setIsExpanded={setIsCalendarExpanded} /><motion.div layout className="space-y-4"><div className="flex items-center gap-3 border-t border-white/10 pt-6"><h4 className="font-serif-display text-lg text-white">{!isCalendarExpanded ? "Stats Overview" : selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h4></div><div className="grid grid-cols-2 md:grid-cols-3 gap-4"><StatCard label="Focus Time" value={formatDuration(selectedStats.dailyFocusTime || 0)} icon={Zap} highlight /><StatCard label="Break Time" value={formatDuration(selectedStats.dailyBreakTime || 0)} icon={Coffee} /><StatCard label="Sessions" value={selectedStats.dailySessions || 0} icon={TrendingUp} /></div></motion.div></motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {activeTab === 'account' && (
                    <motion.div key="acc" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="h-full flex flex-col items-center justify-center p-4">
                      {user ? (
                        // NEW ARC CARD COMPONENT
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