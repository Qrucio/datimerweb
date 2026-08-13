import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, ShieldAlert, Play } from 'lucide-react';

export const StrictConfirmationModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
            <Lock size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-medium text-white text-center mb-2">Enable Strict Mode?</h3>
          <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
            This will force full-screen during Focus sessions. If you try to exit or switch tabs, the timer will pause and a warning will appear.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-3 rounded-xl transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 bg-white text-black hover:bg-gray-200 text-sm font-bold py-3 rounded-xl transition-colors">Enable</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const StrictWarningModal = ({ isOpen, onResume, onDisable }) => {
  useEffect(() => {
    if (isOpen) {
      const audio = new Audio('/sounds/strict-mode.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log("Audio play failed", e));
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black text-center p-6">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center max-w-md">
            <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6 animate-pulse">
              <ShieldAlert size={48} className="text-red-500" />
            </div>

            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-4">Strict Mode Active</h2>
            <p className="text-white/50 mb-8 leading-relaxed">
              Focus is paused. Return to your session to resume.
            </p>

            <button onClick={onResume} className="px-8 py-4 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2 mb-4">
              <Play size={18} fill="black" />
              <span>Resume Focus</span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const StrictDisableModal = ({ isOpen, onClose, onConfirm }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-[#111] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl mx-4" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-4 mx-auto">
            <Unlock size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-medium text-white text-center mb-2">Turn off Strict Mode?</h3>
          <p className="text-white/60 text-sm text-center mb-6 leading-relaxed">
            Disabling this means the app will no longer force full-screen or block distractions during this session.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-white text-sm font-bold py-3 rounded-xl transition-colors">Cancel</button>
            <button onClick={onConfirm} className="flex-1 bg-white text-black hover:bg-gray-200 text-sm font-bold py-3 rounded-xl transition-colors">Turn Off</button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);
