import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingBag, Box, Check, X, Terminal, Plus, ArrowLeft,
    Zap, Coffee, Flame, Heart, Star, Crown, Skull, Trophy,
    Gem, Sword, Shield, Ghost, Anchor, Music, Gamepad2, Gift,
    // Daily Objects
    Tv, Laptop, Smartphone, Dumbbell, Headphones, Book,
    Camera, Watch, Sun, Moon, Briefcase, Umbrella,
    ChevronDown, ChevronUp, Shuffle
} from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import { Storage } from '../../utils/storage';

// --- CONFIG ---
const DEFAULT_STORE_ITEMS = [
    {
        id: 'flow_sub_24h',
        name: 'Flow State Pass',
        description: '24 hours of uninterrupted Pro features.',
        price: 1000,
        icon: '/icons/flowsub.png',
        type: 'subscription',
        duration: 24 * 60 * 60 * 1000
    }
];

// --- CUSTOMIZATION OPTIONS ---
const ICON_OPTIONS = [
    { id: 'zap', Icon: Zap }, { id: 'coffee', Icon: Coffee },
    { id: 'flame', Icon: Flame }, { id: 'heart', Icon: Heart },
    { id: 'star', Icon: Star }, { id: 'crown', Icon: Crown },
    { id: 'skull', Icon: Skull }, { id: 'trophy', Icon: Trophy },
    { id: 'gem', Icon: Gem }, { id: 'sword', Icon: Sword },
    { id: 'shield', Icon: Shield }, { id: 'ghost', Icon: Ghost },
    { id: 'music', Icon: Music }, { id: 'gamepad', Icon: Gamepad2 },
    // Daily Objects
    { id: 'tv', Icon: Tv }, { id: 'laptop', Icon: Laptop },
    { id: 'phone', Icon: Smartphone }, { id: 'gym', Icon: Dumbbell },
    { id: 'audio', Icon: Headphones }, { id: 'book', Icon: Book },
    { id: 'cam', Icon: Camera }, { id: 'watch', Icon: Watch },
    { id: 'sun', Icon: Sun }, { id: 'moon', Icon: Moon },
    { id: 'work', Icon: Briefcase }, { id: 'rain', Icon: Umbrella }
];

const BG_OPTIONS = [
    { id: 'dark', class: 'bg-[#1a1a1a]' },
    { id: 'red', class: 'bg-red-500' },
    { id: 'blue', class: 'bg-blue-500' },
    { id: 'green', class: 'bg-green-500' },
    { id: 'purple', class: 'bg-purple-500' },
    { id: 'orange', class: 'bg-orange-500' },
    { id: 'grad_sunset', class: 'bg-gradient-to-br from-orange-500 to-pink-500' },
    { id: 'grad_ocean', class: 'bg-gradient-to-br from-cyan-500 to-blue-600' },
    { id: 'grad_forest', class: 'bg-gradient-to-br from-emerald-500 to-green-700' },
    { id: 'grad_royal', class: 'bg-gradient-to-br from-purple-600 to-indigo-600' },
    { id: 'grad_fire', class: 'bg-gradient-to-br from-red-500 to-yellow-500' },
    { id: 'grad_dark', class: 'bg-gradient-to-br from-gray-800 to-black' },
    // New Options
    { id: 'grad_midnight', class: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900' },
    { id: 'grad_solar', class: 'bg-gradient-to-br from-yellow-200 via-yellow-400 to-yellow-700' },
    { id: 'grad_neon', class: 'bg-gradient-to-br from-fuchsia-500 via-red-600 to-orange-400' },
    { id: 'grad_berry', class: 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500' },
];

// --- COMPONENT: CUSTOM ITEM CREATOR ---
const CustomItemCreator = ({ onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState(100);
    const [selectedIcon, setSelectedIcon] = useState(ICON_OPTIONS[0]);
    const [selectedBg, setSelectedBg] = useState(BG_OPTIONS[0]);

    // Collapsing State
    const [showIcons, setShowIcons] = useState(false);
    const [showBgs, setShowBgs] = useState(false);

    // Randomize on Mount
    useEffect(() => {
        randomizeAll();
    }, []);

    const randomizeAll = () => {
        const randomIcon = ICON_OPTIONS[Math.floor(Math.random() * ICON_OPTIONS.length)];
        const randomBg = BG_OPTIONS[Math.floor(Math.random() * BG_OPTIONS.length)];
        setSelectedIcon(randomIcon);
        setSelectedBg(randomBg);
    };

    const handleCreate = () => {
        if (!name.trim()) return;

        const newItem = {
            id: `custom_${Date.now()}`,
            name: name,
            description: `Custom item created by you.`,
            price: parseInt(price),
            customData: {
                iconId: selectedIcon.id,
                bgClass: selectedBg.class,
            },
            type: 'custom'
        };
        onCreate(newItem);
    };

    return (
        <div className="absolute inset-0 bg-[#080808] z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center gap-4 p-6 border-b border-white/10 shrink-0">
                <button onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white">Design Item</h3>
                </div>
                <button onClick={randomizeAll} className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Randomize All">
                    <Shuffle size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

                {/* PREVIEW CARD */}
                <div className="flex justify-center py-2">
                    <div className={`relative w-40 h-40 rounded-3xl ${selectedBg.class} flex items-center justify-center shadow-2xl border border-white/20 transition-all duration-500`}>
                        <selectedIcon.Icon size={64} className="text-white drop-shadow-md" strokeWidth={1.5} />
                    </div>
                </div>

                {/* FIELDS */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">Item Name</label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: My Lucky Laptop"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors placeholder-white/20"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-white/40 uppercase tracking-wider mb-2 block">Price</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm">🪙</span>
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-white/30 transition-colors appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        </div>
                    </div>
                </div>

                {/* ICON PICKER (Collapsed) */}
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                    <button
                        onClick={() => setShowIcons(!showIcons)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Icon</span>
                            <div className="p-1 bg-white/10 rounded-md"><selectedIcon.Icon size={14} /></div>
                        </div>
                        {showIcons ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                    </button>

                    <AnimatePresence>
                        {showIcons && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 grid grid-cols-6 gap-2">
                                    {ICON_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setSelectedIcon(opt)}
                                            className={`aspect-square rounded-xl flex items-center justify-center transition-all ${selectedIcon.id === opt.id ? 'bg-white text-black scale-110 shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                                        >
                                            <opt.Icon size={20} />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* BACKGROUND PICKER (Collapsed) */}
                <div className="border border-white/10 rounded-2xl overflow-hidden bg-white/[0.02]">
                    <button
                        onClick={() => setShowBgs(!showBgs)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Background</span>
                            <div className={`w-6 h-6 rounded-md border border-white/10 ${selectedBg.class}`} />
                        </div>
                        {showBgs ? <ChevronUp size={16} className="text-white/30" /> : <ChevronDown size={16} className="text-white/30" />}
                    </button>

                    <AnimatePresence>
                        {showBgs && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 grid grid-cols-6 gap-2">
                                    {BG_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.id}
                                            onClick={() => setSelectedBg(opt)}
                                            className={`aspect-square rounded-xl transition-all border-2 overflow-hidden ${selectedBg.id === opt.id ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                                        >
                                            <div className={`w-full h-full ${opt.class}`} />
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </div>

            <div className="p-6 border-t border-white/10 bg-[#080808] shrink-0">
                <button
                    onClick={handleCreate}
                    disabled={!name.trim()}
                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all ${name.trim() ? 'bg-white text-black hover:bg-gray-200 shadow-lg' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                >
                    Add to Store
                </button>
            </div>
        </div>
    );
};

const LiquidUseBtn = ({ onConfirm, label = "Use" }) => {
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        let t;
        if (status === 'confirming') t = setTimeout(() => setStatus('idle'), 3000);
        return () => clearTimeout(t);
    }, [status]);

    return (
        <div className="relative h-9 min-w-[70px] z-10 flex justify-end">
            <motion.div
                layout
                onClick={(e) => { e.stopPropagation(); if (status === 'idle') setStatus('confirming'); }}
                initial={false}
                animate={status === 'confirming'
                    ? { width: 140, borderRadius: 24, backgroundColor: "rgba(34, 197, 94, 0.15)", borderColor: "rgba(34, 197, 94, 0.4)" }
                    : { width: 70, borderRadius: 12, backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)" }
                }
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="absolute right-0 top-0 bottom-0 border flex items-center justify-center overflow-hidden cursor-pointer backdrop-blur-md transition-colors"
            >
                <AnimatePresence mode="popLayout">
                    {status === 'idle' ? (
                        <motion.button
                            key="label"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/70 hover:text-white uppercase tracking-wider"
                        >
                            {label}
                        </motion.button>
                    ) : (
                        <motion.div
                            key="actions"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 5 }}
                            className="flex items-center gap-2 px-1 w-full justify-evenly"
                        >
                            <button onClick={(e) => { e.stopPropagation(); onConfirm(); }} className="w-6 h-6 rounded-full bg-green-500 text-black flex items-center justify-center hover:scale-110 transition-transform shadow-sm">
                                <Check size={12} strokeWidth={3} />
                            </button>
                            <span className="text-[10px] font-bold text-green-400 select-none">Confirm</span>
                            <button onClick={(e) => { e.stopPropagation(); setStatus('idle'); }} className="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                                <X size={12} strokeWidth={3} />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

const VaultModal = ({ isOpen, onClose, balance, onUpdateBalance, onSync, onActivatePro }) => {
    const [view, setView] = useState('store'); // 'store' | 'inventory'
    const [inventory, setInventory] = useState([]);

    // --- STATE CHANGE: Store items are now dynamic state (Merged with Local Custom Items) ---
    const [storeItems, setStoreItems] = useState(() => {
        const customItems = Storage.getCustomStoreItems();
        return [...DEFAULT_STORE_ITEMS, ...customItems];
    });

    const [devInput, setDevInput] = useState('');
    const [isCreatorOpen, setIsCreatorOpen] = useState(false);

    // Check Localhost
    const isDev = window.location.hostname === 'localhost';

    useEffect(() => {
        if (isOpen) {
            refreshInventory();
        }
    }, [isOpen]);

    const refreshInventory = () => {
        setInventory(Storage.getInventory() || []);
    };

    // --- UPDATED: Add to Store instead of Inventory ---
    const handleCreateItem = (newItem) => {
        // 1. Save to Storage (Persistence)
        Storage.addCustomStoreItem(newItem);

        // 2. Update React State
        setStoreItems(prev => [...prev, newItem]);
        setIsCreatorOpen(false);
        // We stay in the 'store' view so the user can buy it
        setView('store');

        // 3. Sync to Cloud
        if (onSync) onSync();
    };

    const handlePurchase = (item) => {
        if (balance >= item.price) {
            const newWallet = Storage.updateWallet(-item.price);
            onUpdateBalance(newWallet.balance);
            Storage.addToInventory(item);
            refreshInventory();
            if (onSync) onSync();
        }
    };

    const handleUseItem = (item) => {
        if (item.id === 'flow_sub_24h') {
            if (onActivatePro) {
                onActivatePro(24);
            } else {
                Storage.activateProTime(24);
            }
        }
        Storage.removeFromInventory(item.instanceId);
        refreshInventory();
        if (onSync) onSync();
    };

    const handleDevAddCoins = (e) => {
        e.preventDefault();
        const amount = parseInt(devInput);
        if (!isNaN(amount)) {
            const newWallet = Storage.updateWallet(amount);
            onUpdateBalance(newWallet.balance);
            setDevInput('');
            if (onSync) onSync();
        }
    };

    // --- HELPER TO RENDER CUSTOM OR STATIC ICON ---
    const renderItemIcon = (item) => {
        if (item.customData) {
            // It's a custom item, reconstruct the UI
            const IconComponent = ICON_OPTIONS.find(o => o.id === item.customData.iconId)?.Icon || Box;
            return (
                <div className={`w-full h-full rounded-xl flex items-center justify-center ${item.customData.bgClass}`}>
                    <IconComponent size={20} className="text-white drop-shadow-sm" />
                </div>
            );
        }
        // It's a static image item
        return <img src={item.icon} alt={item.name} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity drop-shadow-lg" />;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        // Increased Size
                        className="w-full max-w-lg h-[750px] bg-[#080808] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* --- CREATOR MODAL OVERLAY --- */}
                        <AnimatePresence>
                            {isCreatorOpen && (
                                <motion.div
                                    initial={{ x: '100%' }}
                                    animate={{ x: 0 }}
                                    exit={{ x: '100%' }}
                                    // Smooth slide instead of bouncy spring to fix vibration
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    className="absolute inset-0 z-50 bg-[#080808]"
                                >
                                    <CustomItemCreator onClose={() => setIsCreatorOpen(false)} onCreate={handleCreateItem} />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* --- AMBIENT GOLD GLOW --- */}
                        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px] pointer-events-none" />

                        {/* --- HEADER --- */}
                        <div className="flex flex-col items-center pt-8 pb-4 shrink-0 z-20 relative px-6">
                            <div className="absolute top-6 right-6">
                                <CloseButton onClick={onClose} />
                            </div>

                            <h2 className="text-3xl font-serif-display text-white tracking-tight mb-6 mt-2">
                                Bank
                            </h2>

                            {/* HUGE BALANCE DISPLAY */}
                            <div className="flex items-center gap-3 mb-8 scale-110">
                                <span className="text-4xl filter drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">🪙</span>
                                <span className="text-5xl font-clock font-bold text-white tracking-tight">
                                    {balance.toLocaleString()}
                                </span>
                            </div>

                            {/* CENTERED TABS */}
                            <div className="flex w-full p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-xl">
                                {['store', 'inventory'].map((tab) => {
                                    const isActive = view === tab;
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setView(tab)}
                                            className={`flex-1 relative py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 z-0 ${isActive ? 'text-black' : 'text-white/40 hover:text-white'}`}
                                        >
                                            {isActive && (
                                                <motion.div
                                                    layoutId="vaultTab"
                                                    className="absolute inset-0 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] z-[-1]"
                                                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                                />
                                            )}
                                            {tab === 'store' ? <ShoppingBag size={14} strokeWidth={2.5} /> : <Box size={14} strokeWidth={2.5} />}
                                            <span>{tab}</span>
                                            {tab === 'inventory' && inventory.length > 0 && <span className="opacity-60 font-mono ml-0.5">({inventory.length})</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* --- CONTENT --- */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 bg-transparent relative z-10">
                            <AnimatePresence mode="popLayout">
                                {view === 'store' ? (
                                    <motion.div
                                        key="store"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="grid gap-3"
                                    >
                                        {/* 1. Mapped Store Items (Including custom ones added) */}
                                        {storeItems.map(item => {
                                            const canAfford = balance >= item.price;
                                            return (
                                                <div key={item.id} className="group relative bg-[#111] border border-white/5 hover:border-white/20 rounded-2xl p-3 pl-4 flex items-center gap-4 transition-all hover:bg-white/5 hover:shadow-lg">
                                                    <div className="w-10 h-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        {renderItemIcon(item)}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <h3 className="text-white font-bold text-sm truncate">{item.name}</h3>
                                                        </div>
                                                        <p className="text-white/40 text-[10px] leading-relaxed line-clamp-2">{item.description}</p>
                                                    </div>

                                                    <button
                                                        disabled={!canAfford}
                                                        onClick={() => handlePurchase(item)}
                                                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${canAfford
                                                            ? 'bg-white text-black border-white hover:bg-yellow-400 hover:border-yellow-400 shadow-md active:scale-95'
                                                            : 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed grayscale'}`}
                                                    >
                                                        <span className="text-sm">🪙</span>
                                                        <span className="text-xs font-bold font-mono">{item.price}</span>
                                                    </button>
                                                </div>
                                            );
                                        })}

                                        {/* 2. Create Custom Item Card (Moved to Bottom) */}
                                        <button
                                            onClick={() => setIsCreatorOpen(true)}
                                            // Matches standard card padding (p-3 pl-4) and general layout logic
                                            className="group relative bg-transparent border-2 border-dashed border-white/10 hover:border-white/40 rounded-2xl p-3 pl-4 flex items-center gap-4 transition-all hover:bg-white/5 min-h-[72px]"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform border border-white/10">
                                                <Plus size={18} className="text-white/50 group-hover:text-white" />
                                            </div>
                                            <div className="flex-1 text-left">
                                                <span className="text-sm font-bold text-white/40 group-hover:text-white uppercase tracking-widest transition-colors">Create Custom Item</span>
                                            </div>
                                        </button>

                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="inventory"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="grid gap-3"
                                    >
                                        {(inventory || []).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 opacity-30">
                                                <Box size={40} className="mb-4 text-white" />
                                                <p className="text-xs font-bold uppercase tracking-widest text-white">Inventory Empty</p>
                                            </div>
                                        ) : (
                                            (inventory || []).map((item, i) => (
                                                <motion.div
                                                    layout
                                                    key={item.instanceId}
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                                                    className="relative bg-[#111] border border-white/5 rounded-2xl p-3 pl-4 flex items-center justify-between group hover:border-white/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            {renderItemIcon(item)}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-white font-bold text-sm">{item.name}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-green-400 uppercase tracking-wider font-bold">Ready</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* ENABLED USE BUTTON FOR ALL ITEMS */}
                                                    <LiquidUseBtn onConfirm={() => handleUseItem(item)} />
                                                </motion.div>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* --- DEV TOOLS --- */}
                        {isDev && (
                            <div className="p-3 bg-black border-t border-white/5">
                                <form onSubmit={handleDevAddCoins} className="flex items-center gap-2 opacity-30 hover:opacity-100 transition-opacity">
                                    <Terminal size={10} className="text-white" />
                                    <input
                                        type="number"
                                        value={devInput}
                                        onChange={(e) => setDevInput(e.target.value)}
                                        placeholder="DEV: Add Coins"
                                        className="flex-1 bg-transparent text-[10px] text-white focus:outline-none font-mono placeholder-white/50"
                                    />
                                </form>
                            </div>
                        )}

                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default VaultModal;