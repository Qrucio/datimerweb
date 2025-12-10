import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Box, Check, X, Terminal, Plus } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import { Storage } from '../../utils/storage';

// --- CONFIG ---
const STORE_ITEMS = [
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

const LiquidUseBtn = ({ onConfirm, label = "Use" }) => {
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        let t;
        if (status === 'confirming') t = setTimeout(() => setStatus('idle'), 3000);
        return () => clearTimeout(t);
    }, [status]);

    return (
        <div className="relative h-8 w-20 z-10">
            <motion.div
                layout
                initial={false}
                animate={status === 'confirming'
                    ? { width: 90, borderRadius: 20, backgroundColor: "rgba(34, 197, 94, 0.2)", borderColor: "rgba(34, 197, 94, 0.5)" }
                    : { width: 80, borderRadius: 10, backgroundColor: "rgba(255, 255, 255, 0.05)", borderColor: "rgba(255, 255, 255, 0.1)" }
                }
                className="absolute right-0 top-0 bottom-0 border flex items-center justify-center overflow-hidden cursor-pointer backdrop-blur-sm transition-colors"
                onClick={(e) => { e.stopPropagation(); if (status === 'idle') setStatus('confirming'); }}
            >
                <AnimatePresence mode="popLayout">
                    {status === 'idle' ? (
                        <motion.span
                            key="label"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="text-[10px] font-bold text-white/70 hover:text-white uppercase tracking-wider"
                        >
                            {label}
                        </motion.span>
                    ) : (
                        <motion.div
                            key="actions"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-3"
                        >
                            <button onClick={(e) => { e.stopPropagation(); onConfirm(); }} className="p-1 bg-green-500 rounded-full text-black hover:scale-110 transition-transform shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                                <Check size={12} strokeWidth={3} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setStatus('idle'); }} className="p-1 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
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
    const [devInput, setDevInput] = useState('');

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
                Storage.activateProTime(24); // Fallback
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
                        // FIXED HEIGHT
                        className="w-full max-w-md h-[600px] bg-[#080808] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl flex flex-col relative"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* --- AMBIENT GOLD GLOW --- */}
                        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-yellow-600/10 rounded-full blur-[100px] pointer-events-none" />

                        {/* --- HEADER --- */}
                        <div className="flex flex-col items-center pt-8 pb-4 shrink-0 z-20 relative px-6">
                            <div className="absolute top-6 right-6">
                                <CloseButton onClick={onClose} />
                            </div>

                            {/* UPDATED TITLE: Simple White "Bank" */}
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

                            {/* CENTERED TABS - Fixed Width 'w-full' to prevent resize jump */}
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
                            <AnimatePresence mode="wait">
                                {view === 'store' ? (
                                    <motion.div
                                        key="store"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="grid gap-3"
                                    >
                                        {STORE_ITEMS.map(item => {
                                            const canAfford = balance >= item.price;
                                            return (
                                                // MATCHING INVENTORY SIZE (p-3 pl-4)
                                                <div key={item.id} className="group relative bg-[#111] border border-white/5 hover:border-white/20 rounded-2xl p-3 pl-4 flex items-center gap-4 transition-all hover:bg-white/5 hover:shadow-lg">
                                                    {/* SMALLER ICON CONTAINER (w-10 h-10) */}
                                                    <div className="w-10 h-10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                                        <img src={item.icon} alt={item.name} className="w-full h-full object-contain opacity-90 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
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
                                                <div key={item.instanceId} className="relative bg-[#111] border border-white/5 rounded-2xl p-3 pl-4 flex items-center justify-between group hover:border-white/20 transition-colors">
                                                    <div className="flex items-center gap-4">
                                                        {/* FRAMELESS ICON */}
                                                        <div className="w-10 h-10 flex items-center justify-center">
                                                            <img src={item.icon} alt={item.name} className="w-full h-full object-contain opacity-80" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-white font-bold text-sm">{item.name}</h4>
                                                            <span className="text-[10px] text-green-400 uppercase tracking-wider font-bold">Ready</span>
                                                        </div>
                                                    </div>
                                                    <LiquidUseBtn onConfirm={() => handleUseItem(item)} />
                                                </div>
                                            ))
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* --- DEV TOOLS (Discreet) --- */}
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