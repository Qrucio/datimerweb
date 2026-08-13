import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { StickyNote, Gamepad2, CloudRain, Music, Crown } from 'lucide-react';
import { FlowTag } from '../ui/FlowTag';

const GetProModal = ({ isOpen, onClose, onUpgrade, source = 'notes' }) => {
  // Config for the modal content
  const content = {
    notes: {
      title: "Limit Reached",
      description: <>Free users are limited to 3 notes. Upgrade to <FlowTag className="inline-block h-3 w-auto mx-1" /> for unlimited notes, exclusive themes, and more.</>,
      icon: StickyNote
    },
    arcade: {
      title: "Unlock Arcade",
      description: <>Gain access to <FlowTag className="inline-block h-3 w-auto mx-1" /> exclusive games, multiplayer modes, and global leaderboards.</>,
      icon: Gamepad2
    },
    ambience: {
      title: "Soundscape Locked",
      description: <>You have chosen your 3 free sounds. Upgrade to <FlowTag className="inline-block h-3 w-auto mx-1" /> to unlock the full library and mix unlimited sounds.</>,
      icon: CloudRain
    },
    music: {
      title: "Unlock Focus Music",
      description: <>Curated Focus Tracks are a <FlowTag className="inline-block h-3 w-auto mx-1" /> feature. Upgrade to access high-fidelity binaural beats and lofi streams.</>,
      icon: Music
    },
    settings: {
      title: "Unlock Everything",
      description: (
        <div className="flex flex-col gap-3 mt-1">
          <p className="text-white/60 text-sm">Become a Flow member to remove all limits and access the complete experience.</p>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col gap-2 text-left">
            {[StickyNote, Gamepad2, CloudRain, Music, FlowTag].map((Icon, i) => (
              <div key={i} className="flex items-center gap-3">
                {Icon === FlowTag ? <div className="p-0"><FlowTag className="h-5 w-auto" /></div> : <div className="p-1 bg-cyan-400/10 rounded text-cyan-400"><Icon size={12} /></div>}
                <span className="text-xs text-white/80">Flow Feature Unlocked</span>
              </div>
            ))}
          </div>
        </div>
      ),
      icon: Crown
    }
  };

  const currentContent = content[source] || content.notes;
  const Icon = currentContent.icon;

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative w-full max-w-sm p-8 bg-[#111] border border-cyan-500/30 rounded-3xl text-center overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Blue Background Blur */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-cyan-500/10 blur-[50px] pointer-events-none" />

            <div className="relative z-10 w-16 h-16 mx-auto mb-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Icon size={32} />
            </div>

            <h2 className="relative z-10 text-xl font-semibold tracking-tight text-white mb-2">{currentContent.title}</h2>
            <div className="relative z-10 text-white/60 text-sm mb-8 leading-relaxed px-1">
              {currentContent.description}
            </div>

            <button onClick={() => { if (onUpgrade) onUpgrade(); }} className="relative z-10 w-full py-3.5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-bold text-sm uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-transform shadow-lg shadow-cyan-500/20">
              Upgrade to Flow
            </button>
            <button onClick={onClose} className="mt-4 text-xs text-white/30 hover:text-white uppercase tracking-widest font-bold transition-colors">Maybe Later</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default GetProModal;
