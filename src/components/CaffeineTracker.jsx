import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coffee, Trash2, Activity, Moon, Plus, Search, ArrowLeft, Settings, ChevronUp, ChevronDown } from 'lucide-react';
import CloseButton from './ui/CloseButton';
import Slider from './ui/Slider';

// --- CONSTANTS ---
const HALF_LIFE_HOURS = 5;
const SLEEP_THRESHOLD_MG = 50;
const GRAPH_STEPS = 288; // 5 min resolution

const DRINK_TYPES = [
    { id: 'espresso', label: 'Espresso', mg: 63, icon: '☕', tags: ['shot', 'strong'] },
    { id: 'coffee', label: 'Coffee (8oz)', mg: 95, icon: '🥤', tags: ['regular', 'drip'] },
    { id: 'tea', label: 'Black Tea', mg: 47, icon: '🍵', tags: ['leaf', 'hot'] },
    { id: 'green', label: 'Green Tea', mg: 28, icon: '🌿', tags: ['leaf', 'healthy'] },
    { id: 'energy', label: 'Energy Drink', mg: 150, icon: '⚡', tags: ['can', 'carbonated'] },
    { id: 'soda', label: 'Soda', mg: 34, icon: '🥤', tags: ['sweet', 'fizzy'] },
    { id: 'mega', label: 'Pre-Workout', mg: 250, icon: '💪', tags: ['gym', 'intense'] },
    { id: 'matcha', label: 'Matcha', mg: 70, icon: '🍵', tags: ['green', 'powder'] },
    { id: 'latte', label: 'Latte', mg: 63, icon: '🥛', tags: ['milk', 'espresso'] },
    { id: 'coldbrew', label: 'Cold Brew', mg: 200, icon: '🧊', tags: ['strong', 'cold'] },
];

const formatTimeDisplay = (timeStr) => {
    if (!timeStr) return "--:--";
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export default function CaffeineTracker({ isOpen, onClose }) {
    // --- STATE ---
    const [logs, setLogs] = useState(() => {
        try {
            const saved = localStorage.getItem('zen_caffeine_logs');
            return saved ? JSON.parse(saved) : [];
        } catch (e) { return []; }
    });

    const [isSetupDone, setIsSetupDone] = useState(() => !!localStorage.getItem('zen_caffeine_setup_done'));
    const [userWeight, setUserWeight] = useState(() => localStorage.getItem('zen_user_weight') || "");
    const [bedtimeStr, setBedtimeStr] = useState(() => localStorage.getItem('zen_user_bedtime') || "23:00");
    const [now, setNow] = useState(Date.now());

    // Navigation: 'dashboard', 'settings', 'select-drink', 'configure-drink'
    const [view, setView] = useState('dashboard');
    const [selectedDrinkTemplate, setSelectedDrinkTemplate] = useState(null);

    useEffect(() => { localStorage.setItem('zen_caffeine_logs', JSON.stringify(logs)); }, [logs]);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000 * 30);
        return () => clearInterval(interval);
    }, []);

    // --- MATH ENGINE ---
    const getRemainingMg = (log, targetTime) => {
        const sipDelay = (log.sippingDuration || 0) * 60 * 1000 / 2;
        const peakTime = log.timestamp + sipDelay;

        if (targetTime < log.timestamp) return 0;
        if (targetTime < peakTime) return log.amount;

        const elapsedHours = (targetTime - peakTime) / (1000 * 60 * 60);
        return log.amount * Math.pow(0.5, elapsedHours / HALF_LIFE_HOURS);
    };

    const currentLevel = useMemo(() => {
        return logs.reduce((acc, log) => acc + getRemainingMg(log, now), 0);
    }, [logs, now]);

    const handleSetupComplete = () => {
        if (!userWeight) return;
        localStorage.setItem('zen_user_weight', userWeight);
        localStorage.setItem('zen_user_bedtime', bedtimeStr);
        localStorage.setItem('zen_caffeine_setup_done', 'true');
        setIsSetupDone(true);
    };

    const addLog = (drink, offsetMinutes, sippingMinutes, customTimeStr) => {
        let timestamp;
        if (customTimeStr) {
            const [cH, cM] = customTimeStr.split(':').map(Number);
            const d = new Date(now);
            d.setHours(cH, cM, 0, 0);
            if (d.getTime() > now + (2 * 60 * 60 * 1000)) d.setDate(d.getDate() - 1);
            timestamp = d.getTime();
        } else {
            timestamp = now - (offsetMinutes * 60 * 1000);
        }

        const newLog = {
            id: Date.now().toString(),
            amount: drink.mg,
            label: drink.label,
            icon: drink.icon,
            timestamp: timestamp,
            sippingDuration: sippingMinutes || 0
        };
        setLogs(prev => [newLog, ...prev].sort((a, b) => b.timestamp - a.timestamp));
        setView('dashboard');
        setSelectedDrinkTemplate(null);
    };

    const deleteLog = (id) => setLogs(prev => prev.filter(l => l.id !== id));

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-6"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] md:h-[90vh] relative"
            >
                <AnimatePresence mode="wait">
                    {!isSetupDone ? (
                        <SetupScreen
                            userWeight={userWeight}
                            setUserWeight={setUserWeight}
                            bedtimeStr={bedtimeStr}
                            setBedtimeStr={setBedtimeStr}
                            onComplete={handleSetupComplete}
                        />
                    ) : view === 'dashboard' ? (
                        <Dashboard
                            onClose={onClose}
                            logs={logs}
                            currentLevel={currentLevel}
                            bedtimeStr={bedtimeStr}
                            now={now}
                            getRemainingMg={getRemainingMg}
                            onDeleteLog={deleteLog}
                            onAddClick={() => setView('select-drink')}
                            onSettingsClick={() => setView('settings')}
                        />
                    ) : view === 'settings' ? (
                        <SettingsView
                            onBack={() => setView('dashboard')}
                            userWeight={userWeight}
                            setUserWeight={(val) => { setUserWeight(val); localStorage.setItem('zen_user_weight', val); }}
                            bedtimeStr={bedtimeStr}
                            setBedtimeStr={(val) => { setBedtimeStr(val); localStorage.setItem('zen_user_bedtime', val); }}
                        />
                    ) : view === 'select-drink' ? (
                        <DrinkSelector
                            onBack={() => setView('dashboard')}
                            onSelect={(drink) => {
                                setSelectedDrinkTemplate(drink);
                                setView('configure-drink');
                            }}
                        />
                    ) : (
                        <DrinkConfigurator
                            drink={selectedDrinkTemplate}
                            onBack={() => setView('select-drink')}
                            onConfirm={addLog}
                        />
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
}

// =========================================
//  1. SETUP SCREEN (Initial Calib)
// =========================================
const SetupScreen = ({ userWeight, setUserWeight, bedtimeStr, setBedtimeStr, onComplete }) => (
    <motion.div
        key="setup"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="flex-1 flex flex-col items-center justify-center p-8 text-center h-full overflow-y-auto"
    >
        <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-6 ring-1 ring-amber-500/30">
            <Activity size={40} className="text-amber-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">Calibration</h2>
        <p className="text-white/40 text-sm max-w-xs mx-auto mb-10 leading-relaxed">
            Configure your biometrics to enable accurate metabolic decay tracking.
        </p>

        <div className="w-full max-w-xs space-y-6">
            <div>
                <label className="text-[10px] uppercase font-bold text-white/40 block mb-2">Body Weight (kg)</label>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center">
                    <input
                        type="number"
                        autoFocus
                        placeholder="--"
                        value={userWeight}
                        onChange={(e) => setUserWeight(e.target.value)}
                        className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder-white/10"
                    />
                    <span className="text-white/20 font-bold">KG</span>
                </div>
            </div>

            <div>
                <label className="text-[10px] uppercase font-bold text-white/40 block mb-2">Sleep Schedule</label>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <CustomTimeInput value={bedtimeStr} onChange={setBedtimeStr} />
                </div>
            </div>
        </div>

        <button
            onClick={onComplete}
            disabled={!userWeight}
            className={`mt-10 w-full max-w-xs py-4 rounded-xl font-bold text-sm transition-all ${userWeight ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
        >
            Initialize System
        </button>
    </motion.div>
);

// =========================================
//  2. SETTINGS VIEW (New)
// =========================================
const SettingsView = ({ onBack, userWeight, setUserWeight, bedtimeStr, setBedtimeStr }) => (
    <motion.div
        key="settings"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 50 }}
        className="flex flex-col h-full bg-[#0a0a0a]"
    >
        <div className="p-6 flex items-center gap-4 shrink-0 border-b border-white/10">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                <ArrowLeft size={20} />
            </button>
            <h2 className="text-lg font-bold text-white">Settings</h2>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
            {/* Weight Section */}
            <div>
                <label className="text-xs uppercase font-bold text-white/40 block mb-4">Body Metrics</label>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Activity size={24} className="text-white/40" />
                        <span className="text-sm font-bold text-white">Weight</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                        <input
                            type="number"
                            value={userWeight}
                            onChange={(e) => setUserWeight(e.target.value)}
                            className="bg-transparent w-16 text-right text-2xl font-bold text-white outline-none border-b border-transparent focus:border-white/20 transition-colors"
                        />
                        <span className="text-white/40 text-xs font-bold">KG</span>
                    </div>
                </div>
            </div>

            {/* Sleep Section */}
            <div>
                <label className="text-xs uppercase font-bold text-white/40 block mb-4">Sleep Schedule</label>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Moon size={24} className="text-white/40" />
                        <span className="text-sm font-bold text-white">Target Bedtime</span>
                    </div>
                    <div className="flex justify-center py-4">
                        <CustomTimePicker value={bedtimeStr} onChange={setBedtimeStr} />
                    </div>
                </div>
            </div>
        </div>
    </motion.div>
);

// =========================================
//  3. DASHBOARD
// =========================================
const Dashboard = ({ onClose, logs, currentLevel, bedtimeStr, now, getRemainingMg, onDeleteLog, onAddClick, onSettingsClick }) => {

    return (
        <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col h-full relative"
        >
            {/* HEADER */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#0a0a0a] z-20 shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Coffee size={20} className="text-amber-500" />
                        Caffeine Sync
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={onSettingsClick} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors">
                        <Settings size={20} />
                    </button>
                    <CloseButton onClick={onClose} />
                </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 pb-32">

                {/* STATS */}
                <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-1 block">Caffeine Level</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-clock font-bold tracking-tighter text-white">
                                {Math.round(currentLevel)}
                            </span>
                            <span className="text-xl text-white/40 font-medium">mg</span>
                        </div>
                    </div>
                </div>

                {/* GRAPH */}
                <div className="w-full aspect-[16/10] md:aspect-[21/9] bg-white/[0.02] rounded-3xl border border-white/10 relative overflow-hidden p-0 group">
                    <InteractiveGraph
                        logs={logs}
                        now={now}
                        bedtimeStr={bedtimeStr}
                        getRemainingMg={getRemainingMg}
                        sleepThreshold={SLEEP_THRESHOLD_MG}
                    />
                </div>

                {/* HISTORY LIST */}
                {logs.length > 0 && (
                    <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest">Intake History</h3>
                        </div>
                        <div className="space-y-2">
                            {logs.map(log => {
                                return (
                                    <div key={log.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group">
                                        <div className="flex items-center gap-4">
                                            <span className="text-2xl">{log.icon}</span>
                                            <div>
                                                <p className="text-sm text-white font-bold">{log.label}</p>
                                                <p className="text-xs text-white/40 font-medium flex items-center gap-2">
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {/* STRICTLY SHOW ORIGINAL AMOUNT */}
                                            <span className="block text-sm text-white font-bold">{log.amount}mg</span>

                                            <button onClick={() => onDeleteLog(log.id)} className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* FAB */}
            <div className="absolute bottom-6 right-6 z-30">
                <button
                    onClick={onAddClick}
                    className="w-14 h-14 rounded-full bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                >
                    <Plus size={28} strokeWidth={2.5} />
                </button>
            </div>
        </motion.div>
    )
};

// =========================================
//  4. INTERACTIVE GRAPH (DOTTED LINES)
// =========================================
const InteractiveGraph = ({ logs, now, bedtimeStr, getRemainingMg, sleepThreshold }) => {
    const containerRef = useRef(null);
    const cursorLineRef = useRef(null);
    const cursorLabelRef = useRef(null);
    const cursorTimeRef = useRef(null);
    const cursorValueRef = useRef(null);
    const nowLabelRef = useRef(null);

    const graphStart = useMemo(() => {
        const d = new Date(now);
        d.setHours(4, 0, 0, 0);
        return d.getTime();
    }, [now]);

    const totalDuration = 24 * 60 * 60 * 1000;

    const sleepTimestamp = useMemo(() => {
        const [bH, bM] = bedtimeStr.split(':').map(Number);
        let d = new Date(now);
        d.setHours(bH, bM, 0, 0);
        if (d.getTime() < graphStart) d.setDate(d.getDate() + 1);
        return d.getTime();
    }, [bedtimeStr, now, graphStart]);

    const { points, maxY, sleepX } = useMemo(() => {
        const data = [];
        let maxMg = 200;

        for (let i = 0; i <= GRAPH_STEPS; i++) {
            const time = graphStart + (i / GRAPH_STEPS) * totalDuration;
            const totalMg = logs.reduce((acc, log) => acc + getRemainingMg(log, time), 0);
            if (totalMg > maxMg) maxMg = totalMg;
            data.push({ time, mg: totalMg });
        }

        const sX = ((sleepTimestamp - graphStart) / totalDuration) * 100;
        return { points: data, maxY: Math.ceil(maxMg * 1.2), sleepX: sX };
    }, [logs, graphStart, totalDuration, getRemainingMg, sleepTimestamp]);

    const getX = (time) => ((time - graphStart) / totalDuration) * 100;
    const getY = (mg) => 100 - (mg / maxY) * 100;
    const nowX = getX(now);

    // Handlers
    const handleMouseMove = (e) => {
        if (!containerRef.current || !cursorLineRef.current || !cursorLabelRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const xPercent = Math.max(0, Math.min(100, (x / rect.width) * 100));

        cursorLineRef.current.style.left = `${xPercent}%`;
        cursorLineRef.current.style.opacity = 1;
        cursorLabelRef.current.style.opacity = 1;

        const cursorTime = graphStart + (xPercent / 100) * totalDuration;
        const cursorMg = logs.reduce((acc, log) => acc + getRemainingMg(log, cursorTime), 0);

        if (cursorTimeRef.current) cursorTimeRef.current.innerText = new Date(cursorTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (cursorValueRef.current) cursorValueRef.current.innerText = Math.round(cursorMg) + 'mg';

        if (nowLabelRef.current) {
            const dist = Math.abs(xPercent - nowX);
            nowLabelRef.current.style.opacity = dist < 10 ? 0 : 1;
        }
    };

    const handleMouseLeave = () => {
        if (cursorLineRef.current) cursorLineRef.current.style.opacity = 0;
        if (cursorLabelRef.current) cursorLabelRef.current.style.opacity = 0;
        if (nowLabelRef.current) nowLabelRef.current.style.opacity = 1;
    };

    const mgAtSleep = points.find(p => p.time >= sleepTimestamp)?.mg || 0;
    const isDisrupted = mgAtSleep > sleepThreshold;

    // UNIFIED DOTTED LINE STYLE
    const lineStyle = isDisrupted ? 'border-red-500/50' : 'border-indigo-400/40';
    const labelColor = isDisrupted ? 'text-red-400' : 'text-indigo-300';

    const pathD = useMemo(() => {
        if (points.length === 0) return "";
        let d = `M 0,100 `;
        points.forEach(p => { d += `L ${getX(p.time).toFixed(2)},${getY(p.mg).toFixed(2)} `; });
        d += `L 100,100 Z`;
        return d;
    }, [points, maxY]);

    const lineD = useMemo(() => {
        if (points.length === 0) return "";
        return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.time).toFixed(2)},${getY(p.mg).toFixed(2)}`).join(" ");
    }, [points, maxY]);

    const xLabels = [4, 8, 12, 16, 20, 24, 28].map(h => ({
        label: (h % 24).toString().padStart(2, '0'),
        x: getX(graphStart + (h - 4) * 3600000)
    }));

    return (
        <div
            ref={containerRef}
            className="w-full h-full relative font-mono text-[9px] text-white/30 select-none cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* GRID */}
            <div className="absolute inset-0 pointer-events-none">
                {xLabels.map((l, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-l border-white/5" style={{ left: `${l.x}%` }}>
                        <span className="absolute bottom-2 -translate-x-1/2 ml-[1px]">{l.label}</span>
                    </div>
                ))}
            </div>

            {/* --- SLEEP THRESHOLD LINE (Horizontal Dotted) --- */}
            <div
                className={`absolute left-0 right-0 border-t-2 border-dotted z-0 pointer-events-none transition-colors duration-500 ${lineStyle}`}
                style={{ top: `${getY(sleepThreshold)}%` }}
            >
                <span className={`absolute right-1 -top-4 text-[8px] font-bold uppercase tracking-wider ${labelColor}`}>Max Limit</span>
            </div>

            {/* --- SLEEP TIME LINE (Vertical Dotted) --- */}
            <div
                className={`absolute top-0 bottom-0 border-l-2 border-dotted z-0 pointer-events-none transition-colors duration-500 ${lineStyle}`}
                style={{ left: `${sleepX}%` }}
            >
                <div className={`absolute top-2 -translate-x-1/2 bg-[#0a0a0a] px-2 py-1 rounded border border-white/10 whitespace-nowrap z-0 ${labelColor}`}>
                    <Moon size={10} className="inline mr-1" />
                    {isDisrupted ? 'Sleep Disrupted' : 'Sleep Safe'}
                </div>
            </div>

            {/* --- NOW LINE (Amber Dotted) --- */}
            <div className="absolute top-0 bottom-0 border-l-2 border-dotted border-amber-500/50 z-10 pointer-events-none" style={{ left: `${nowX}%` }}>
                <div ref={nowLabelRef} className="absolute bottom-0 -translate-x-1/2 translate-y-full pt-1 text-amber-500 font-bold transition-opacity duration-300">NOW</div>
            </div>

            {/* --- INTERACTIVE CURSOR LINE (White Dotted) --- */}
            <div
                ref={cursorLineRef}
                className="absolute top-0 bottom-0 border-l-2 border-white/80 border-dotted z-30 pointer-events-none opacity-0"
                style={{ left: '0%' }}
            >
                {/* White Cursor Tooltip */}
                <div
                    ref={cursorLabelRef}
                    className="absolute bottom-8 left-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-2 rounded-lg shadow-xl whitespace-nowrap z-40 flex flex-col items-start opacity-0"
                >
                    <span ref={cursorTimeRef} className="text-[10px] text-white/70 font-bold uppercase">--:--</span>
                    <span ref={cursorValueRef} className="text-sm text-white font-bold font-clock">--mg</span>
                </div>
            </div>

            {/* GRAPH SVG */}
            <svg className="w-full h-full overflow-visible relative z-0 pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
                <defs>
                    <linearGradient id="dynamicFill" x1="0" y1="0" x2="1" y2="0">
                        <stop offset={`${sleepX}%`} stopColor="#f59e0b" stopOpacity="0.5" />
                        <stop offset={`${sleepX}%`} stopColor={isDisrupted ? "#ef4444" : "#f59e0b"} stopOpacity={isDisrupted ? "0.4" : "0.5"} />
                        <stop offset="100%" stopColor={isDisrupted ? "#ef4444" : "#f59e0b"} stopOpacity="0.05" />
                    </linearGradient>

                    <linearGradient id="dynamicLine" x1="0" y1="0" x2="1" y2="0">
                        <stop offset={`${sleepX}%`} stopColor="#fbbf24" />
                        <stop offset={`${sleepX}%`} stopColor={isDisrupted ? "#f87171" : "#fbbf24"} />
                        <stop offset="100%" stopColor={isDisrupted ? "#f87171" : "#fbbf24"} />
                    </linearGradient>
                </defs>
                <path d={pathD} fill="url(#dynamicFill)" />
                <path d={lineD} fill="none" stroke="url(#dynamicLine)" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </svg>

            {/* DRINK MARKERS */}
            {logs.map(log => {
                if (log.timestamp < graphStart || log.timestamp > graphStart + totalDuration) return null;
                const logX = getX(log.timestamp);
                const mgAtTime = points.find(p => p.time >= log.timestamp)?.mg || 0;
                const logY = getY(mgAtTime);

                return (
                    <div key={log.id} className="absolute z-20 group" style={{ left: `${logX}%`, top: `${logY}%` }}>
                        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#0a0a0a] border-2 border-white/50 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.3)] z-20 transition-transform group-hover:scale-150" />
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-30 pointer-events-none">
                            <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/10 rounded-full py-1.5 px-3 shadow-xl whitespace-nowrap">
                                <span className="text-base leading-none">{log.icon}</span>
                                <div className="flex flex-col leading-none">
                                    <span className="text-[10px] text-white font-bold">{log.label}</span>
                                    <span className="text-[8px] text-amber-400 font-mono">+{log.amount}mg</span>
                                </div>
                            </div>
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white/10 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// =========================================
//  CUSTOM PICKER HELPERS
// =========================================
const CustomTimeInput = ({ value, onChange, small }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-transparent font-bold text-white outline-none border-b border-transparent hover:border-white/20 transition-colors text-left flex items-center justify-between ${small ? 'text-lg' : 'text-3xl'}`}
            >
                {formatTimeDisplay(value)}
                <ChevronDown size={small ? 14 : 20} className="text-white/30" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/20 rounded-xl shadow-2xl z-50 p-4 min-w-[200px]">
                        <CustomTimePicker value={value} onChange={onChange} />
                    </div>
                </>
            )}
        </div>
    );
};

const CustomTimePicker = ({ value, onChange }) => {
    const [hStr, mStr] = value ? value.split(':') : ['23', '00'];
    const hour = parseInt(hStr, 10);
    const minute = parseInt(mStr, 10);

    const update = (newH, newM) => {
        onChange(`${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`);
    };

    return (
        <div className="flex items-center justify-center gap-4">
            <div className="flex flex-col items-center">
                <button onClick={() => update((hour + 1) % 24, minute)} className="p-1 hover:text-amber-500 text-white/50 transition-colors"><ChevronUp size={24} /></button>
                <div className="text-4xl font-clock font-bold text-white w-16 text-center tabular-nums my-2 bg-black/40 rounded-lg py-1 border border-white/5">
                    {hour.toString().padStart(2, '0')}
                </div>
                <button onClick={() => update((hour - 1 + 24) % 24, minute)} className="p-1 hover:text-amber-500 text-white/50 transition-colors"><ChevronDown size={24} /></button>
            </div>
            <div className="text-2xl font-bold text-white/30 pb-2">:</div>
            <div className="flex flex-col items-center">
                <button onClick={() => update(hour, (minute + 5) % 60)} className="p-1 hover:text-amber-500 text-white/50 transition-colors"><ChevronUp size={24} /></button>
                <div className="text-4xl font-clock font-bold text-white w-16 text-center tabular-nums my-2 bg-black/40 rounded-lg py-1 border border-white/5">
                    {minute.toString().padStart(2, '0')}
                </div>
                <button onClick={() => update(hour, (minute - 5 + 60) % 60)} className="p-1 hover:text-amber-500 text-white/50 transition-colors"><ChevronDown size={24} /></button>
            </div>
        </div>
    );
};

// ... (DrinkSelector and DrinkConfigurator are reused from previous logic) ...
// (Omitting for space as they are unchanged)
const DrinkSelector = ({ onBack, onSelect }) => {
    const [search, setSearch] = useState("");
    const filteredDrinks = DRINK_TYPES.filter(d =>
        d.label.toLowerCase().includes(search.toLowerCase()) ||
        d.tags.some(t => t.includes(search.toLowerCase()))
    );
    return (
        <motion.div
            key="selector"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="flex flex-col h-full bg-[#0a0a0a]"
        >
            <div className="p-6 border-b border-white/10 flex items-center gap-4 shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 bg-white/5 rounded-xl flex items-center px-4 h-12 border border-transparent focus-within:border-white/20 transition-colors">
                    <Search size={18} className="text-white/40 mr-3" />
                    <input autoFocus type="text" placeholder="Search drinks..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent w-full h-full outline-none text-white placeholder-white/30" />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
                {filteredDrinks.map(drink => (
                    <button key={drink.id} onClick={() => onSelect(drink)} className="w-full flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all group text-left">
                        <div className="flex items-center gap-4">
                            <span className="text-3xl group-hover:scale-110 transition-transform">{drink.icon}</span>
                            <div>
                                <span className="block text-base font-bold text-white">{drink.label}</span>
                                <div className="flex gap-2 mt-1">
                                    {drink.tags.slice(0, 2).map(t => (
                                        <span key={t} className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-white/40 uppercase font-bold">{t}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <span className="text-lg font-bold text-amber-500">{drink.mg}<span className="text-xs text-amber-500/50 ml-0.5">mg</span></span>
                    </button>
                ))}
            </div>
        </motion.div>
    );
};

const DrinkConfigurator = ({ drink, onBack, onConfirm }) => {
    const [sippingDuration, setSippingDuration] = useState(0);
    const [timeMode, setTimeMode] = useState('now');
    const [presetOffset, setPresetOffset] = useState(15);
    const now = new Date();
    const [customTime, setCustomTime] = useState(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    const handleConfirm = () => {
        let offset = 0;
        let timeStr = null;
        if (timeMode === 'preset') offset = presetOffset;
        if (timeMode === 'custom') timeStr = customTime;
        onConfirm(drink, offset, sippingDuration, timeStr);
    };
    return (
        <motion.div
            key="config"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="flex flex-col h-full bg-[#0a0a0a]"
        >
            <div className="p-6 flex items-center gap-4 shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-bold text-white">Log Intake</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-0 space-y-8">
                <div className="flex items-center gap-5 p-6 bg-white/5 border border-white/10 rounded-3xl">
                    <span className="text-5xl drop-shadow-lg">{drink.icon}</span>
                    <div>
                        <h3 className="text-2xl font-bold text-white">{drink.label}</h3>
                        <p className="text-amber-500 font-bold text-lg">{drink.mg}mg Caffeine</p>
                    </div>
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-white/40 mb-3 block">When did you drink this?</label>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <button onClick={() => setTimeMode('now')} className={`py-3 rounded-xl border font-bold text-sm transition-all ${timeMode === 'now' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/50'}`}>Just Now</button>
                        <button onClick={() => setTimeMode('preset')} className={`py-3 rounded-xl border font-bold text-sm transition-all ${timeMode === 'preset' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/50'}`}>Ago...</button>
                        <button onClick={() => setTimeMode('custom')} className={`py-3 rounded-xl border font-bold text-sm transition-all ${timeMode === 'custom' ? 'bg-white text-black border-white' : 'bg-white/5 border-white/5 text-white/50'}`}>Custom</button>
                    </div>
                    {timeMode === 'preset' && (
                        <div className="grid grid-cols-4 gap-2 animate-fade-in-up">
                            {[15, 30, 45, 60].map(m => (
                                <button key={m} onClick={() => setPresetOffset(m)} className={`py-2 rounded-lg text-xs font-mono border transition-all ${presetOffset === m ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-white/5 border-white/5 text-white/60'}`}>-{m}m</button>
                            ))}
                        </div>
                    )}
                    {timeMode === 'custom' && (
                        <div className="animate-fade-in-up bg-white/5 border border-white/10 rounded-2xl p-4 flex justify-center">
                            <input type="time" value={customTime} onChange={e => setCustomTime(e.target.value)} className="bg-transparent text-3xl font-bold text-white outline-none" />
                        </div>
                    )}
                </div>
                <div>
                    <label className="text-[10px] uppercase font-bold text-white/40 mb-3 flex items-center justify-between">
                        <span>Sipping Duration</span>
                        <span className="text-white">{sippingDuration === 0 ? 'Instant' : `${sippingDuration} mins`}</span>
                    </label>
                    <Slider
                        value={sippingDuration}
                        max={120}
                        onChange={(e) => setSippingDuration(Number(e.target.value))}
                        color="#f59e0b" // Amber-500
                    />
                </div>
            </div>
            <div className="p-6 pt-2 shrink-0">
                <button onClick={handleConfirm} className="w-full py-4 rounded-2xl bg-amber-500 text-black font-bold text-lg hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20">Confirm Log</button>
            </div>
        </motion.div>
    );
};