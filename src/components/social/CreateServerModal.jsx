import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Hash, Check, ChevronDown, ChevronUp } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import { ICON_OPTIONS } from '../../utils/iconOptions';

const CreateServerModal = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState(null); // { id, Icon }
    const [showIcons, setShowIcons] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);

        // Format: "lucide:iconId"
        const iconUrl = selectedIcon ? `lucide:${selectedIcon.id}` : "";

        const success = await onCreate({ name, iconUrl });
        setLoading(false);
        if (success) {
            setName("");
            setSelectedIcon(null);
            onClose();
        } else {
            alert("Failed to create server. Please check your connection or database.");
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#111] border border-white/10 p-6 rounded-2xl w-[90%] max-w-sm shadow-2xl flex flex-col"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h3 className="text-white font-bold text-lg">Create Server</h3>
                        <CloseButton onClick={onClose} />
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">

                        {/* ICON PREVIEW & PICKER */}
                        <div className="flex flex-col gap-3">
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider block">Server Icon</label>

                            {/* PREVIEW + TOGGLE */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/20 flex items-center justify-center overflow-hidden shrink-0 transition-all">
                                    {selectedIcon ? (
                                        <selectedIcon.Icon size={32} className="text-white" />
                                    ) : (
                                        <div className="text-white/20 flex flex-col items-center">
                                            <Upload size={18} className="mb-1" />
                                        </div>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowIcons(!showIcons)}
                                    className="flex-1 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between transition-colors group"
                                >
                                    <span className="text-sm font-medium text-white/70 group-hover:text-white">
                                        {selectedIcon ? "Change Icon" : "Select Icon"}
                                    </span>
                                    {showIcons ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
                                </button>
                            </div>

                            {/* COLLAPSIBLE GRID */}
                            <AnimatePresence>
                                {showIcons && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-black/20 border border-white/10 rounded-xl p-3 grid grid-cols-6 gap-2 max-h-[160px] overflow-y-auto custom-scrollbar">
                                            {ICON_OPTIONS.map((opt) => (
                                                <button
                                                    key={opt.id}
                                                    type="button"
                                                    onClick={() => setSelectedIcon(opt)}
                                                    className={`aspect-square rounded-lg flex items-center justify-center transition-all ${selectedIcon?.id === opt.id ? 'bg-white text-black shadow-lg scale-110' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    <opt.Icon size={18} />
                                                </button>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* NAME INPUT */}
                        <div>
                            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Server Name</label>
                            <div className="relative">
                                <Hash size={16} className="absolute left-4 top-3.5 text-white/30" />
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Enter server name..."
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* SUBMIT BUTTON */}
                        <button
                            type="submit"
                            disabled={!name.trim() || loading}
                            className="mt-2 w-full bg-white hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-wide text-xs"
                        >
                            {loading ? "Creating..." : <>Create Server <Check size={14} strokeWidth={3} /></>}
                        </button>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default CreateServerModal;
