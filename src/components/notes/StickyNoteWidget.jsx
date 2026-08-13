import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Check, X } from 'lucide-react';

export const StickyNote = ({ text, onClick, className = "", style = {}, scale = 1 }) => (
  <motion.div
    layoutId={onClick ? "sticky-note-transition" : undefined}
    onClick={onClick}
    style={style}
    whileHover={onClick ? { scale: scale * 1.05, rotate: 0 } : {}}
    whileTap={onClick ? { scale: scale * 0.95 } : {}}
    className={`bg-[#ffeb3b] text-black p-4 shadow-xl cursor-default relative overflow-hidden flex flex-col ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />
    <div className="relative z-10 flex-1 overflow-hidden text-left">
      {text ? (
        <RichTextRenderer text={text} className="text-sm md:text-base opacity-90" />
      ) : (
        <div className="w-full h-full flex items-center justify-center opacity-30">
          <span className="text-4xl font-light">+</span>
        </div>
      )}
    </div>
  </motion.div>
);

const parseInlineStyles = (text) => {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    return part;
  });
};

const parseRichText = (text, onToggleLine) => {
  if (!text) return [];
  return text.split('\n').map((line, index) => {
    const checkboxMatch = line.match(/^(\s*)\[([ x])\] (.*)/);
    if (checkboxMatch) {
      const indent = checkboxMatch[1];
      const isChecked = checkboxMatch[2].toLowerCase() === 'x';
      const content = checkboxMatch[3];
      return (
        <div key={index} className="flex items-start gap-2 my-1 group">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              if (onToggleLine) {
                e.stopPropagation();
                onToggleLine(index, !isChecked);
              }
            }}
            className={`
              mt-1 w-3 h-3 border border-black/40 rounded-[3px] flex items-center justify-center transition-colors flex-shrink-0
              ${isChecked ? 'bg-black/60 border-transparent' : 'bg-transparent'}
              ${onToggleLine ? 'cursor-pointer hover:border-black' : ''}
            `}
          >
            {isChecked && <Check size={8} className="text-white" />}
          </button>
          <span className={`flex-1 leading-relaxed ${isChecked ? 'line-through opacity-50' : ''} whitespace-pre-wrap`}>
            {indent}{parseInlineStyles(content)}
          </span>
        </div>
      );
    }

    const bulletMatch = line.match(/^(\s*)-\s(.*)/);
    if (bulletMatch) {
      const indent = bulletMatch[1];
      const content = bulletMatch[2];
      return (
        <div key={index} className="flex items-start gap-2 my-1 pl-2">
          <div className="mt-2 w-1.5 h-1.5 bg-black/60 rounded-full flex-shrink-0" />
          <span className="flex-1 leading-relaxed whitespace-pre-wrap">{indent}{parseInlineStyles(content)}</span>
        </div>
      );
    }

    return (
      <div key={index} className={`min-h-[1.2em] my-0.5 ${line.trim() === '' ? 'h-2' : ''} whitespace-pre-wrap`}>
        {parseInlineStyles(line)}
      </div>
    );
  });
};

export const RichTextRenderer = ({ text, className = "", onToggle }) => (
  <div className={`font-sans font-normal text-black/90 ${className}`}>
    {parseRichText(text, onToggle)}
  </div>
);

export const StickyNoteWidget = ({ notes, onOpenLibrary, isLibraryOpen, onSave }) => {
  const hasNotes = notes.length > 0;
  const showStack = notes.length > 1;
  const topNote = notes[0];
  const secondNote = notes[1];

  const handleToggleLine = (index, newStatus) => {
    if (!onSave || !topNote) return;
    const lines = topNote.text.split('\n');
    if (lines[index]) {
      const line = lines[index];
      const newLine = newStatus
        ? line.replace(/^(\s*)\[ \]/, '$1[x]')
        : line.replace(/^(\s*)\[x\]/i, '$1[ ]');

      lines[index] = newLine;
      onSave({ ...topNote, text: lines.join('\n'), updatedAt: Date.now() });
    }
  };

  const handleGlowMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  if (isLibraryOpen) {
    return <div className="relative w-40 h-80 md:w-48 md:h-48" />;
  }

  if (!hasNotes) {
    return (
      <button
        onClick={onOpenLibrary}
        onMouseMove={handleGlowMove}
        className="w-32 h-32 md:w-48 md:h-48 border-2 border-dashed border-white/50 bg-white/5 rounded-sm cursor-default flex items-center justify-center group hover:border-white/50 transition-all duration-300 relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{ background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.1), transparent 40%)' }}
        />
        <div className="relative z-10 text-center">
          <Plus size={32} className="text-white/30 group-hover:text-white mx-auto mb-2 transition-colors" />
          <span className="text-xs uppercase tracking-widest text-white/30 group-hover:text-white transition-colors font-medium">New Note</span>
        </div>
      </button>
    );
  }

  return (
    <div className="relative w-32 h-32 md:w-48 md:h-48 cursor-pointer group" onClick={onOpenLibrary}>
      {showStack && (
        <div
          className="absolute inset-0 shadow-lg transform rotate-6 translate-x-2 translate-y-2 group-hover:rotate-12 group-hover:translate-x-4 transition-transform duration-300 origin-bottom-right"
          style={{ backgroundColor: secondNote.color || '#ffeb3b', zIndex: 0 }}
        >
          <div className="absolute inset-0 bg-black/10" />
        </div>
      )}

      <div
        className="absolute inset-0 shadow-2xl p-4 flex flex-col z-10 transition-all duration-300 group-hover:-translate-y-1 group-hover:-rotate-2"
        style={{ backgroundColor: topNote.color || '#ffeb3b' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {topNote.title && (
            <h4 className="text-black font-bold text-sm mb-1 line-clamp-1 flex-shrink-0">{topNote.title}</h4>
          )}

          <div className="flex-1 overflow-hidden relative">
            <RichTextRenderer
              text={topNote.text}
              className="text-xs md:text-sm"
              onToggle={onSave ? handleToggleLine : undefined}
            />

            <div
              className="absolute bottom-0 left-0 right-0 h-4 pointer-events-none"
              style={{ background: `linear-gradient(to top, ${topNote.color || '#ffeb3b'}, transparent)` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const NOTE_COLORS = ['#ffeb3b', '#81c784', '#64b5f6', '#ffb74d', '#f06292', '#e0e0e0'];

export const TagPill = ({ label, active, onClick, onDelete }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border ${active ? 'bg-white text-black border-white shadow-sm' : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white hover:bg-white/10'}`}
  >
    {label}
    {onDelete && (
      <div
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className={`p-0.5 rounded-full hover:bg-black/10 ${active ? 'text-black/50 hover:text-black' : 'text-white/50 hover:text-white'}`}
      >
        <X size={10} />
      </div>
    )}
  </button>
);
