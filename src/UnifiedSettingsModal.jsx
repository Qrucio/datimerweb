import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sliders, Palette, User, LogOut, Sparkles, Clock, Zap, Coffee, Flame, BarChart2, TrendingUp, Settings } from 'lucide-react';

// --- 0. INJECTED CSS FOR THE TOGGLE (Fixed Colors & Clipping) ---
const toggleStyles = `
  .theme-checkbox {
    --toggle-size: 10px;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    width: 6.25em;
    height: 3.125em;
    /* TRACK: Left=White(ON), Right=Black(OFF) */
    background: linear-gradient(to right, #fff 50%, #000 50%) no-repeat; 
    background-size: 205%;
    background-position: 100%; /* Default: Right (Black) */
    -webkit-transition: 0.4s;
    -o-transition: 0.4s;
    transition: 0.4s;
    border-radius: 99em;
    position: relative;
    cursor: pointer;
    font-size: var(--toggle-size);
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.15);
    margin-right: 2px; /* Prevent clipping */
  }

  .theme-checkbox::before {
    content: "";
    width: 2.25em;
    height: 2.25em;
    position: absolute;
    top: 0.438em;
    left: 0.438em;
    /* KNOB: Left=Black(ON), Right=White(OFF) */
    background: linear-gradient(to right, #000 50%, #fff 50%) no-repeat;
    background-size: 205%;
    background-position: 100%; /* Default: Right (White) */
    border-radius: 50%;
    -webkit-transition: 0.4s;
    -o-transition: 0.4s;
    transition: 0.4s;
    box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  }

  .theme-checkbox:checked::before {
    left: calc(100% - 2.25em - 0.438em);
    background-position: 0; /* Checked: Left (Black) */
  }

  .theme-checkbox:checked {
    background-position: 0; /* Checked: Left (White) */
    border-color: #fff;
  }
`;

// --- 1. AESTHETIC NUMBER INPUT (Fixed Alignment) ---
const SettingInput = ({ label, value, onChange, min, max }) => (
  <div className="flex items-center justify-between py-3 group">
    <label className="text-white/70 text-xs md:text-sm font-medium group-hover:text-white transition-colors truncate pr-2">{label}</label>
    {/* RELATIVE Container ensures text stays inside */}
    <div className="relative flex items-center justify-center w-20 md:w-24 bg-white/5 rounded-xl border border-white/10 focus-within:border-white/30 transition-all hover:bg-white/10 shrink-0">
      <input
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        className="w-full bg-transparent text-white text-center font-mono text-sm py-2 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pl-2 pr-6" // Added padding for the unit text
      />
      <span className="absolute right-3 text-white/30 text-xs pointer-events-none select-none">
        {label.toLowerCase().includes('intervals') ? 'x' : 'm'}
      </span>
    </div>
  </div>
);

// --- 2. AESTHETIC TOGGLE ---
const AestheticToggle = ({ label, description, checked, onChange, icon: Icon }) => (
  <div 
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group hover:bg-white/10 transition-all cursor-pointer select-none active:scale-[0.99]"
  >
    <div className="flex items-center gap-4 pr-4 overflow-hidden">
      <div className={`p-2 rounded-xl transition-colors duration-300 shrink-0 ${checked ? 'bg-white text-black' : 'bg-white/5 text-white/40'}`}>
        <Icon size={18} strokeWidth={checked ? 2.5 : 2} />
      </div>
      <div className="min-w-0">
        <h4 className={`text-sm font-bold transition-colors duration-300 truncate ${checked ? 'text-white' : 'text-white/60'}`}>{label}</h4>
        {description && <p className="text-white/30 text-[10px] leading-tight mt-0.5 truncate">{description}</p>}
      </div>
    </div>

    {/* Input is read-only; controlled via parent div click */}
    <input 
      type="checkbox" 
      className="theme-checkbox pointer-events-none" 
      checked={checked} 
      readOnly 
    />
  </div>
);

// --- 3. ANIMATED STAT CARD ---
const StatCard = ({ label, value, icon: Icon, delay = 0, isHero = false }) => (
  <motion.div 
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`relative flex flex-col justify-between p-5 rounded-2xl overflow-hidden group ${isHero ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 col-span-2' : 'bg-black/20 border border-white/5 hover:border-white/10 transition-colors'}`}
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
    {isHero && (
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none" />
    )}
  </motion.div>
);

// --- 4. STREAK CARD ---
const StreakCard = ({ streak }) => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
    className="col-span-2 relative overflow-hidden rounded-2xl p-6 border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-[#1a0c00] to-black/40 group"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
    
    <div className="flex items-center justify-between relative z-10">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-orange-400/80 uppercase tracking-widest">Current Streak</span>
        </div>
        <div className="text-4xl font-serif-display text-white flex items-baseline gap-1">
          {streak} 
          <span className="text-sm font-sans text-white/40 font-medium">days</span>
        </div>
      </div>

      <motion.div 
        animate={{ 
          scale: [1, 1.15, 1],
          filter: ["drop-shadow(0 0 10px rgba(249,115,22,0.4))", "drop-shadow(0 0 20px rgba(249,115,22,0.7))", "drop-shadow(0 0 10px rgba(249,115,22,0.4))"]
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-orange-500"
      >
        <Flame size={48} fill="currentColor" fillOpacity={0.2} strokeWidth={1.5} />
      </motion.div>
    </div>
    
    <div className="mt-4 h-1 w-full bg-orange-900/20 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "100%" }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="h-full bg-gradient-to-r from-orange-600 to-yellow-500"
      />
    </div>
    <p className="text-[10px] text-orange-200/40 mt-2 font-medium">Keep the fire burning!</p>
  </motion.div>
);

// --- MAIN MODAL COMPONENT ---
const UnifiedSettingsModal = ({
  isOpen,
  onClose,
  user,
  signOut,
  settings,
  setSettings,
  handleSettingsSave,
  handleBackgroundChange,
  backgrounds = [],
  isPro = false,
  stats = {}
}) => {
  const [activeTab, setActiveTab] = useState('preferences');

  const updateSetting = (key, value) => {
    const val = typeof value === 'string' ? parseInt(value) || 0 : value;
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  const formatTimeWithSeconds = (totalSeconds) => {
    if (!totalSeconds) return "0s";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0 || parts.length === 0) parts.push(`${s}s`);
    
    return parts.join(' ');
  };

  const tabs = [
    { id: 'preferences', label: 'Preferences', icon: Sliders, description: 'Timer & workflow.' },
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Look & feel.' },
    { id: 'stats', label: 'Statistics', icon: BarChart2, description: 'Track progress.' },
  ];

  const contentVariants = {
    hidden: { opacity: 0, x: 10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25, ease: "easeOut" } },
    exit: { opacity: 0, x: -10, transition: { duration: 0.15, ease: "easeIn" } }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <style>{toggleStyles}</style>

          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              // RESPONSIVE LAYOUT: flex-col on mobile, flex-row on desktop. Taller height (80vh).
              className="w-full max-w-5xl h-[80vh] max-h-[800px] bg-[#0A0A0A] border border-white/10 rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto relative"
            >
              <button
                onClick={onClose}
                className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center text-white/50 hover:text-white transition-all hover:rotate-90 active:scale-90"
              >
                <X size={20} />
              </button>

              {/* --- SIDEBAR --- */}
              <div className="w-full md:w-72 bg-[#0F0F0F] border-b md:border-b-0 md:border-r border-white/5 p-4 md:p-6 flex md:flex-col shrink-0 overflow-x-auto md:overflow-visible gap-4 md:gap-0 no-scrollbar items-center md:items-stretch">
                
                {/* Header (Hidden on tiny mobile screens to save space if needed, or kept minimal) */}
                <div className="hidden md:flex mb-8 items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                    <Settings size={16} className="text-black" />
                  </div>
                  <h2 className="text-xl font-serif-display text-white tracking-tight">Settings</h2>
                </div>

                <nav className="flex md:flex-col gap-2 flex-1 w-full">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative p-3 md:p-4 rounded-xl md:rounded-2xl text-left transition-all duration-300 group overflow-hidden flex-shrink-0 ${isActive ? 'text-black' : 'text-white/60 hover:text-white hover:bg-white/5'}`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabPill"
                            className="absolute inset-0 bg-white z-0 rounded-xl md:rounded-2xl"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                          />
                        )}
                        <div className="relative z-10 flex items-center gap-3">
                          <Icon size={20} className={isActive ? "text-black" : "group-hover:scale-110 transition-transform"} />
                          <div className="hidden md:block">
                            <span className="block font-bold text-sm">{tab.label}</span>
                            <span className={`text-xs ${isActive ? 'text-black/60' : 'text-white/40'}`}>{tab.description}</span>
                          </div>
                          {/* Mobile Label only */}
                          <span className="block md:hidden font-bold text-sm">{tab.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                {/* USER PROFILE (Bottom of Sidebar on Desktop, End of scroll on Mobile) */}
                {user && (
                  <button
                    onClick={() => setActiveTab('account')}
                    className={`md:mt-auto flex items-center gap-3 p-2 md:p-3 rounded-2xl border transition-all text-left group flex-shrink-0
                      ${activeTab === 'account'
                        ? 'bg-white/10 border-white/20'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                      }`}
                  >
                    <div className="relative">
                      {isPro && (
                        <div className="absolute -inset-[2px] rounded-full bg-gradient-to-br from-yellow-600 via-amber-400 to-yellow-600 opacity-60 blur-[1px] animate-pulse" />
                      )}
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 object-cover relative z-10" />
                      ) : (
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/10 flex items-center justify-center text-white relative z-10"><User size={18} /></div>
                      )}
                    </div>
                    
                    <div className="hidden md:block overflow-hidden min-w-0 flex-1">
                      <p className={`text-sm font-bold truncate ${activeTab === 'account' ? 'text-white' : 'text-white/80'}`}>{user.displayName || 'User'}</p>
                      <p className="text-white/40 text-[10px] truncate group-hover:text-white/60 transition-colors">Manage Account</p>
                    </div>
                  </button>
                )}
              </div>

              {/* --- RIGHT CONTENT AREA --- */}
              <div className="flex-1 p-6 md:p-12 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode="wait">

                  {/* TAB 1: PREFERENCES */}
                  {activeTab === 'preferences' && (
                    <motion.div key="pref" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-2xl">
                      
                      {/* Section 1: Timer Config (GRID LAYOUT TO SAVE SPACE) */}
                      <section>
                        <h3 className="text-2xl font-serif-display text-white mb-3">Timer Configuration</h3>
                        <div className="p-4 bg-white/5 border border-white/5 rounded-3xl">
                          {/* 2-Column Grid for Inputs */}
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                            <SettingInput label="Focus Duration" value={settings.focus} onChange={(e) => updateSetting('focus', e.target.value)} min={1} max={120} />
                            <SettingInput label="Short Break" value={settings.shortBreak} onChange={(e) => updateSetting('shortBreak', e.target.value)} min={1} max={30} />
                            <SettingInput label="Long Break" value={settings.longBreak} onChange={(e) => updateSetting('longBreak', e.target.value)} min={5} max={60} />
                            <SettingInput label="Intervals" value={settings.pomosBeforeLongBreak} onChange={(e) => updateSetting('pomosBeforeLongBreak', e.target.value)} min={1} max={10} />
                          </div>
                        </div>
                      </section>

                      {/* Section 2: Automation */}
                      <section>
                        <h3 className="text-2xl font-serif-display text-white mb-3">Automation</h3>
                        <div className="grid grid-cols-1 gap-2">
                          <AestheticToggle label="Auto-start Breaks" description="Start break timer automatically when focus ends." checked={settings.autoStartBreaks} onChange={(val) => updateSetting('autoStartBreaks', val)} icon={Clock} />
                          <AestheticToggle label="Auto-start Focus" description="Start next focus session automatically when break ends." checked={settings.autoStartWork} onChange={(val) => updateSetting('autoStartWork', val)} icon={Zap} />
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {/* TAB 2: APPEARANCE */}
                  {activeTab === 'appearance' && (
                    <motion.div key="appear" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6">
                      <div>
                        <h3 className="text-2xl font-serif-display text-white mb-1">Environment</h3>
                        <p className="text-white/50 text-sm">Choose your focus atmosphere.</p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-12">
                        {backgrounds.map((bg, idx) => {
                          const src = bg.src || bg; 
                          const id = bg.id || idx;
                          const isActive = settings.background === src;
                          
                          return (
                            <button
                              key={id}
                              onClick={() => handleBackgroundChange(src)}
                              className={`relative aspect-video rounded-2xl overflow-hidden group transition-all duration-300 ${isActive ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-[1.02]' : 'hover:scale-105 ring-1 ring-white/10'}`}
                            >
                              {src.match(/\.(mp4|webm)$/i) ? (
                                <video src={src} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                              ) : (
                                <img src={src} alt="bg" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              )}
                              
                              {src.match(/\.(mp4|webm)$/i) && (
                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold text-white uppercase tracking-widest border border-white/10 z-10 pointer-events-none">
                                  Animated
                                </div>
                              )}

                              {isActive && (
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                                  <div className="bg-white text-black text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">Active</div>
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 3: STATS */}
                  {activeTab === 'stats' && (
                    <motion.div key="stats" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="max-w-3xl pb-12">
                      <div className="mb-6">
                        <h3 className="text-2xl font-serif-display text-white mb-1">Your Progress</h3>
                        <p className="text-white/50 text-sm">Today's activity.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <StatCard label="Total Focus Time" value={formatTimeWithSeconds(stats.dailyFocusTime || 0)} icon={Zap} isHero={true} />
                        <StatCard label="Break Time" value={formatTimeWithSeconds(stats.dailyBreakTime || 0)} icon={Coffee} delay={0.1} />
                        <StatCard label="Sessions Completed" value={stats.dailySessions || 0} icon={TrendingUp} delay={0.15} />
                        <StreakCard streak={stats.currentStreak || 0} />
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: ACCOUNT */}
                  {activeTab === 'account' && (
                    <motion.div key="acc" variants={contentVariants} initial="hidden" animate="visible" exit="exit" className="space-y-6 max-w-xl mx-auto h-full flex flex-col justify-center">
                      
                      {user ? (
                        <div className="bg-white/5 border border-white/10 rounded-[32px] p-10 flex flex-col items-center text-center space-y-8 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
                          
                          <div className="relative transform scale-125">
                            {isPro && (
                              <>
                                <div className="absolute -inset-[3px] rounded-full bg-gradient-to-br from-yellow-600 via-amber-400 to-yellow-600 opacity-50 blur-[4px] animate-pulse z-0" />
                                <div className="absolute -inset-[1.5px] rounded-full overflow-hidden z-0">
                                  <div className="w-[200%] h-[200%] absolute top-[-50%] left-[-50%] animate-[spin_4s_linear_infinite]" style={{ background: 'conic-gradient(transparent 0deg, #b45309 60deg, #fcd34d 180deg, #b45309 300deg, transparent 360deg)' }} />
                                </div>
                              </>
                            )}

                            <div className="w-24 h-24 rounded-full border-4 border-white/10 overflow-hidden bg-black shadow-2xl relative z-10">
                              {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User size={48} className="text-white/50 m-auto h-full" />}
                            </div>
                            <div className="absolute bottom-1 right-1 bg-green-500 p-2 rounded-full border-4 border-[#121212] z-20"></div>
                          </div>
                          
                          <div className="flex flex-col items-center">
                            <h2 className="text-3xl font-serif-display text-white">{user.displayName}</h2>
                            <p className="text-white/50 font-mono mt-1 text-sm">{user.email}</p>
                            
                            {isPro && (
                              <div className="mt-4 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <Sparkles size={10} /> PRO MEMBER
                              </div>
                            )}
                          </div>

                          <div className="w-full h-px bg-white/10" />

                          <div className="w-full">
                             <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                                <span className="text-white/50 text-xs uppercase tracking-widest font-bold">Joined</span>
                                <span className="text-white font-mono text-sm">
                                  {new Date(user.metadata.creationTime).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                             </div>
                          </div>

                          <button
                            onClick={signOut}
                            className="w-full py-4 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center justify-center gap-3 font-bold uppercase tracking-widest text-xs group"
                          >
                            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      ) : (
                        <div className="text-center p-12 bg-white/5 rounded-3xl border border-white/10 dashed flex flex-col items-center justify-center h-full">
                          <User size={48} className="text-white/30 mb-4" />
                          <p className="text-white/50">Please sign in to manage your account.</p>
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