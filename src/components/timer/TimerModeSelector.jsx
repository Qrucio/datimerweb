import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Brain, Clock, Lock } from 'lucide-react';
import { FlowTag } from '../ui/FlowTag';

const TimerModeSelector = ({ mode, opacityClass, isIntentionMode, onToggleMode, onOpenPro }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Logic: Show this ONLY in Focus mode
  if (mode !== 'focus') return null;

  const modes = [
    {
      id: 'default',
      title: 'Default',
      description: 'Classic Focus. You control the flow. Pause freely.',
      icon: Zap,
      tags: [{ label: 'Flexible', warn: false }],
      isLocked: false,
      isDisabled: false
    },
    {
      id: 'intention',
      title: 'Intentional',
      description: 'Goal-oriented. Smart interventions if you distract.',
      icon: Brain,
      tags: [{ label: 'Smart AI', warn: false }],
      isLocked: false,
      isDisabled: false
    },
    {
      id: 'stopwatch',
      title: 'Stopwatch',
      description: 'Count-up timer mode. Coming Soon.',
      icon: Clock,
      tags: [],
      isLocked: true,
      isDisabled: true
    }
  ];

  const handleSelect = (m) => {
    if (m.isDisabled) return;

    if (m.id === 'default') {
      if (isIntentionMode) onToggleMode();
      setIsOpen(false);
    } else if (m.id === 'intention') {
      if (!isIntentionMode) onToggleMode();
      setIsOpen(false);
    }
  };

  const activeMode = isIntentionMode ? modes[1] : modes[0];

  return (
    <div className={`relative flex justify-center z-[60] ${opacityClass} mb-4 transition-opacity duration-700`}>
      {/* 1. Trigger Button */}
      <motion.button
        layoutId="timer-mode-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
      >
        <activeMode.icon size={14} className="text-white/50 group-hover:text-white transition-colors" />
        <span className="text-xs font-medium text-white/70 group-hover:text-white transition-colors uppercase tracking-wider">{activeMode.title}</span>
      </motion.button>

      {/* 2. Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="absolute top-full mt-3 w-72 bg-[#111] border border-white/10 p-2 rounded-2xl shadow-2xl z-50 flex flex-col gap-1 overflow-hidden"
            >
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  className={`
                    relative w-full p-3 rounded-xl flex items-start gap-3 transition-colors text-left
                    ${m.isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5 cursor-pointer'}
                    ${(isIntentionMode && m.id === 'intention') || (!isIntentionMode && m.id === 'default') ? 'bg-white/10' : ''}
                  `}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg border ${m.id === 'intention' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-white/5 border-white/10 text-white/60'}`}>
                    <m.icon size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-white">{m.title}</span>
                      {m.isLocked && <Lock size={12} className="text-white/40" />}
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed mb-2">{m.description}</p>
                    {m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {m.tags.map(t => (
                          <span key={t.label} className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-white/5 rounded border border-white/10 text-white/40">
                            {t.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TimerModeSelector;
