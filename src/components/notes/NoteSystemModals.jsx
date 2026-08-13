import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Image as ImageIcon, Pencil, CheckSquare, List, Bold, Italic } from 'lucide-react';
import { FlowTag } from '../ui/FlowTag';
import { TagPill, RichTextRenderer, NOTE_COLORS } from './StickyNoteWidget';

const NoteSystemModals = ({
  notes,
  tasks,
  habits,
  onUpdateTasks,
  onUpdateHabits,
  isLibraryOpen,
  closeLibrary,
  editingNote,
  setEditingNote,
  onSave,
  onDelete,
  onReorder,
  onSaveOrder,
  isPro,
  onOpenPro
}) => {
  // --- STATE ---
  const [editorTitle, setEditorTitle] = useState("");
  const [editorText, setEditorText] = useState("");
  const [editorColor, setEditorColor] = useState(NOTE_COLORS[0]);
  const [editorTags, setEditorTags] = useState([]);
  const [tagInput, setTagInput] = useState("");


  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashQuery, setSlashQuery] = useState("");
  const [slashIndex, setSlashIndex] = useState(-1);

  const [selectedTag, setSelectedTag] = useState("All");
  const [draggingId, setDraggingId] = useState(null);


  // --- REFS ---
  const draggingIdRef = useRef(null);
  const containerRef = useRef(null);
  const lastSwapTime = useRef(0);
  const bodyInputRef = useRef(null);
  const tagInputRef = useRef(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

  // Limit Check Logic
  const isLimitReached = !isPro && notes.length >= 3;

  // --- HANDLERS ---
  const handleSave = () => {
    if (!editorText.trim() && !editorTitle.trim()) {
      if (editingNote && editingNote.id) onDelete(editingNote.id);
    } else {
      onSave({
        id: editingNote?.id || Date.now().toString(),
        title: editorTitle,
        text: editorText,
        color: editorColor,
        tags: editorTags,
        updatedAt: Date.now()
      });
    }
    setEditingNote(null);
    setShowSlashMenu(false);
  };

  const handleToggleLine = (note, index, newStatus) => {
    let lines = note.text.split('\n');
    if (lines[index]) {
      const line = lines[index];
      const newLine = newStatus
        ? line.replace(/^(\s*)\[ \]/, '$1[x]')
        : line.replace(/^(\s*)\[x\]/i, '$1[ ]');

      lines[index] = newLine;

      // Auto-sort logic
      if (/^(\s*)\[([ x])\]/i.test(newLine)) {
        let start = index;
        while (start > 0 && /^(\s*)\[([ x])\]/i.test(lines[start - 1])) start--;

        let end = index;
        while (end < lines.length - 1 && /^(\s*)\[([ x])\]/i.test(lines[end + 1])) end++;

        const group = lines.slice(start, end + 1);
        const isChecked = (l) => /^(\s*)\[x\]/i.test(l);

        group.sort((a, b) => {
          const aChecked = isChecked(a);
          const bChecked = isChecked(b);
          if (aChecked === bChecked) return 0;
          return aChecked ? 1 : -1;
        });

        lines.splice(start, group.length, ...group);
      }

      onSave({ ...note, text: lines.join('\n'), updatedAt: Date.now() });
    }
  };



  // --- SHORTCUTS ---
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        if (showSlashMenu) { e.preventDefault(); e.stopImmediatePropagation(); setShowSlashMenu(false); return; }
        if (editingNote) {
          e.preventDefault(); e.stopImmediatePropagation();
          if (editorTitle.trim() || editorText.trim()) handleSave();
          else setEditingNote(null);
          return;
        }
        if (isLibraryOpen) { e.preventDefault(); e.stopImmediatePropagation(); closeLibrary(); }
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [editingNote, isLibraryOpen, editorTitle, editorText, editorColor, editorTags, showSlashMenu]);

  // --- SYNC EDITOR STATE ---
  useEffect(() => {
    if (editingNote) {
      setEditorTitle(editingNote.title || "");
      setEditorText(editingNote.text || "");
      setEditorColor(editingNote.color || NOTE_COLORS[0]);
      setEditorTags(editingNote.tags || []);
    } else {
      setEditorTitle("");
      setEditorText("");
      setEditorColor(NOTE_COLORS[0]);
      setEditorTags([]);
    }
  }, [editingNote]);

  const handleGlowMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  const allExistingTags = [...new Set(notes.flatMap(n => n.tags || []))];
  const allTags = ["All", ...allExistingTags];
  const tagSuggestions = tagInput.trim()
    ? allExistingTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !editorTags.includes(t))
    : [];

  useEffect(() => { setActiveSuggestionIndex(0); }, [tagInput]);

  const handleAddTag = (tag) => {
    const cleanTag = tag.trim();
    if (cleanTag && !editorTags.includes(cleanTag)) { setEditorTags([...editorTags, cleanTag]); }
    setTagInput("");
  };

  const removeTag = (tagToRemove) => { setEditorTags(editorTags.filter(t => t !== tagToRemove)); };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) { if (tagInput.trim()) handleAddTag(tagInput.trim()); return; }
      if (tagSuggestions.length > 0 && activeSuggestionIndex >= 0) { handleAddTag(tagSuggestions[activeSuggestionIndex]); return; }
      if (tagInput.trim()) { handleAddTag(tagInput.trim()); } else { bodyInputRef.current?.focus(); }
    }
    if (e.key === 'Backspace' && tagInput === '') {
      if (editorTags.length > 0) { e.preventDefault(); const newTags = [...editorTags]; newTags.pop(); setEditorTags(newTags); }
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestionIndex(prev => Math.min(prev + 1, tagSuggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestionIndex(prev => Math.max(prev - 1, 0)); }
  };

  const handleTitleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); tagInputRef.current?.focus(); } };

  const insertMarkdown = (syntax) => {
    const textarea = bodyInputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const value = textarea.value;
    const previousLineBreak = value.lastIndexOf('\n', start - 1);
    const lineStart = previousLineBreak + 1;
    let insertion = "";
    if (syntax === 'list') insertion = "- ";
    if (syntax === 'task') insertion = "[ ] ";
    if (syntax === 'bold' || syntax === 'italic') {
      const marker = syntax === 'bold' ? '**' : '*';
      const end = textarea.selectionEnd;
      const selection = value.substring(start, end);
      const newText = value.substring(0, start) + marker + selection + marker + value.substring(end);
      setEditorText(newText);
      setTimeout(() => {
        textarea.focus();
        const offset = selection ? start + marker.length + selection.length + marker.length : start + marker.length;
        textarea.setSelectionRange(offset, offset);
      }, 0);
      return;
    }
    const newText = value.substring(0, lineStart) + insertion + value.substring(lineStart);
    setEditorText(newText);
    setTimeout(() => { textarea.focus(); const newPos = (start < lineStart) ? start : start + insertion.length; textarea.setSelectionRange(newPos, newPos); }, 0);
  };

  const SLASH_COMMANDS = [
    { id: 'task', label: 'Task List', icon: CheckSquare, action: 'task' },
    { id: 'list', label: 'Bullet List', icon: List, action: 'list' },
    { id: 'bold', label: 'Bold', icon: Bold, action: 'bold' },
    { id: 'italic', label: 'Italic', icon: Italic, action: 'italic' },
  ];
  const filteredCommands = SLASH_COMMANDS.filter(c => c.id.includes(slashQuery.toLowerCase()) || c.label.toLowerCase().includes(slashQuery.toLowerCase()));

  const executeSlashCommand = (command) => {
    const textarea = bodyInputRef.current;
    if (!textarea) return;
    const value = textarea.value;
    const beforeSlash = value.substring(0, slashIndex);
    const afterCursor = value.substring(textarea.selectionStart);
    setEditorText(beforeSlash + afterCursor);
    setShowSlashMenu(false);
    setSlashQuery("");
    setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = slashIndex; insertMarkdown(command.action); }, 0);
  };

  const handleBodyChange = (e) => {
    const newValue = e.target.value;
    setEditorText(newValue);
    const textarea = e.target;
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastSlash = textBeforeCursor.lastIndexOf('/');
    if (lastSlash !== -1) {
      const charBeforeSlash = lastSlash > 0 ? textBeforeCursor[lastSlash - 1] : '\n';
      if (charBeforeSlash === ' ' || charBeforeSlash === '\n' || lastSlash === 0) {
        const query = textBeforeCursor.substring(lastSlash + 1);
        if (!query.includes(' ') && !query.includes('\n')) {
          setShowSlashMenu(true);
          setSlashIndex(lastSlash);
          setSlashQuery(query);
          return;
        }
      }
    }
    setShowSlashMenu(false);
  };

  const handleBodyKeyDown = (e) => {
    if (showSlashMenu) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands.length > 0) executeSlashCommand(filteredCommands[0]);
        return;
      }
      if (e.key === 'Escape') { e.preventDefault(); setShowSlashMenu(false); return; }
    }
    if (e.key === 'Enter') {
      const textarea = bodyInputRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const value = textarea.value;
      const previousLineBreak = value.lastIndexOf('\n', start - 1);
      const currentLineStart = previousLineBreak + 1;
      const currentLine = value.substring(currentLineStart, start);
      const listMatch = currentLine.match(/^(\s*)(-|\[([ x])\])\s/);
      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1];
        const marker = listMatch[2];
        if (currentLine.trim() === marker || currentLine.trim() === marker + ']') {
          const newValue = value.substring(0, currentLineStart) + value.substring(start);
          setEditorText(newValue);
          setTimeout(() => { textarea.selectionStart = textarea.selectionEnd = currentLineStart; }, 0);
          return;
        }
        const nextMarker = marker.startsWith('[') ? '[ ]' : '-';
        const insertion = `\n${indent}${nextMarker} `;
        const newValue = value.substring(0, start) + insertion + value.substring(start);
        setEditorText(newValue);
        setTimeout(() => {
          const newCursorPos = start + insertion.length;
          textarea.selectionStart = textarea.selectionEnd = newCursorPos;
        }, 0);
      }
    }
  };

  // --- DRAG & LOGIC ---
  const handleDragStart = (id, e) => {
    isDraggingRef.current = true;
    setDraggingId(id);
    draggingIdRef.current = id;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!draggingIdRef.current || !containerRef.current) return;
    if (Date.now() - lastSwapTime.current < 250) return;
    const noteElements = Array.from(containerRef.current.querySelectorAll('[data-note-id]'));
    let targetId = null;
    for (let el of noteElements) {
      const id = el.getAttribute('data-note-id');
      if (id === draggingIdRef.current) continue;
      const rect = el.getBoundingClientRect();
      if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        targetId = id; break;
      }
    }
    if (targetId) {
      const fromIndex = notes.findIndex(n => n.id === draggingIdRef.current);
      const toIndex = notes.findIndex(n => n.id === targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const newOrder = [...notes];
        const temp = newOrder[fromIndex];
        newOrder[fromIndex] = newOrder[toIndex];
        newOrder[toIndex] = temp;
        onReorder(newOrder);
        lastSwapTime.current = Date.now();
      }
    }
  };

  const handleDragEnd = () => {
    setTimeout(() => { isDraggingRef.current = false; }, 50);
    setDraggingId(null);
    draggingIdRef.current = null;
    if (onSaveOrder) onSaveOrder();
  };

  useEffect(() => {
    const handleGlobalUp = () => { if (draggingIdRef.current) handleDragEnd(); };
    window.addEventListener('pointerup', handleGlobalUp);
    if (draggingId) window.addEventListener('pointermove', handlePointerMove);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointermove', handlePointerMove);
    };
  }, [draggingId, notes]);

  const handleNoteTap = (e, note) => {
    setEditingNote(note);
  };

  const filteredNotes = selectedTag === "All" ? notes : notes.filter(n => n.tags && n.tags.includes(selectedTag));

  return (
    <AnimatePresence>
      {/* LIBRARY MODAL */}
      {isLibraryOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(40px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black/70 backdrop-blur-md md:backdrop-blur-2xl transform-gpu will-change-transform"
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeLibrary() }}
        >
          <div 
            className="flex flex-col lg:flex-row w-full h-full overflow-hidden relative"
            onMouseDown={(e) => { if (e.target === e.currentTarget) closeLibrary() }}
          >
            {/* LEFT: STANDARD NOTES */}
            <div 
              className="w-full flex flex-col h-full relative"
              onMouseDown={(e) => { if (e.target === e.currentTarget) closeLibrary() }}
            >
              <div className="w-full flex flex-col items-center shrink-0">
                {/* Header Bar */}
                <div 
                  className="w-full flex items-center justify-center pt-10 md:pt-12 pb-8 relative"
                  onMouseDown={(e) => { if (e.target === e.currentTarget) closeLibrary() }}
                >
                  <h2 className="text-3xl md:text-4xl text-white font-serif tracking-wide pointer-events-none mt-1">Notes</h2>
                  <div className="absolute right-6 md:right-10 flex items-center h-full pt-10 md:pt-12 pb-8 top-0">
                    <CloseButton onClick={closeLibrary} />
                  </div>
                </div>
                {/* Tags */}
                <div 
                  className="flex gap-3 overflow-x-auto max-w-full px-8 mt-2 mb-12 pb-2 no-scrollbar"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                >
                  {allTags.map(tag => (
                    <TagPill key={tag} label={tag} active={selectedTag === tag} onClick={() => setSelectedTag(tag)} />
                  ))}
                </div>
              </div>

              <div 
                className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-10 pb-24"
                onMouseDown={(e) => { if (e.target === e.currentTarget) closeLibrary() }}
              >
                <div 
                  className="max-w-7xl mx-auto pt-2" 
                  ref={containerRef}
                  onMouseDown={(e) => { if (e.target === e.currentTarget) closeLibrary() }}
                >
                  <div 
                    className="flex flex-wrap gap-6 md:gap-8"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) closeLibrary() }}
                  >

                    {/* ADD BUTTON or LOCKED BUTTON */}
                    {isLimitReached ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square bg-white/5 border-2 border-dashed border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors rounded-sm flex items-center justify-center group cursor-default w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)] overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPro();
                        }}
                      >
                        <div className="relative z-10 flex flex-col items-center gap-2">
                          <Lock size={32} className="text-white/30 group-hover:text-cyan-400 transition-colors" />
                          <span className="text-xs uppercase tracking-widest text-white/30 group-hover:text-cyan-400 transition-colors font-medium">Unlock</span>
                          {/* COUNT FOR LOCKED STATE */}
                          <span className="text-[10px] font-mono text-white/30 font-medium">3 / 3</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onMouseMove={handleGlowMove}
                        className="relative aspect-square bg-white/5 border-2 border-dashed border-white/20 hover:border-white/50 transition-colors rounded-sm flex items-center justify-center group !cursor-default w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)] overflow-hidden"
                        onClick={(e) => {
                          e.stopPropagation();
                          const initialTags = selectedTag !== "All" ? [selectedTag] : [];
                          setEditingNote({ tags: initialTags });
                        }}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.1), transparent 40%)' }} />
                        <div className="relative z-10 flex flex-col items-center gap-2">
                          <Plus size={32} className="text-white/30 group-hover:text-white transition-colors" />
                          <span className="text-xs uppercase tracking-widest text-white/30 group-hover:text-white transition-colors font-medium">New Note</span>
                          {/* COUNT FOR ACTIVE STATE (FREE USERS) */}
                          {!isPro && (
                            <span className="text-[10px] font-mono text-white/30 font-medium mt-1">
                              {notes.length} / 3
                            </span>
                          )}
                        </div>
                      </motion.div>
                    )}

                    {/* NOTES GRID */}
                    <AnimatePresence>
                      {filteredNotes.map((note) => (
                        <motion.div
                          key={note.id}
                          layoutId={note.id}
                          layout="position"
                          data-note-id={note.id}

                          // --- DRAG PROPS ---
                          drag={selectedTag === "All"}
                          dragSnapToOrigin={true}
                          dragElastic={0.1}
                          dragMomentum={false}
                          onDragStart={(e) => handleDragStart(note.id, e)}

                          // --- EVENT HANDLERS ---
                          onMouseMove={handleGlowMove}

                          onTap={(e) => {
                            if (isDraggingRef.current) return;
                            if (e.target.closest('button') || e.target.closest('[data-layout-id]')) return;
                            handleNoteTap(e, note);
                          }}

                          onClick={(e) => e.stopPropagation()}

                          // --- STYLING ---
                          style={{ backgroundColor: note.color || '#ffeb3b', touchAction: 'none', cursor: 'default' }}
                          className={`aspect-square shadow-xl p-4 md:p-6 text-black relative group !cursor-default active:cursor-grabbing flex flex-col overflow-hidden w-[calc(50%-12px)] md:w-[calc(33.33%-16px)] lg:w-[calc(25%-18px)] xl:w-[calc(20%-19.2px)]`}

                          // --- ANIMATIONS ---
                          initial={{ opacity: 0, scale: 0.8 }}

                          animate={draggingId === note.id
                            ? { scale: 1.1, zIndex: 50, boxShadow: "0px 20px 40px rgba(0,0,0,0.6)", opacity: 1 }
                            : { scale: 1, zIndex: 0, boxShadow: "0px 10px 15px rgba(0,0,0,0.2)", opacity: 1 }
                          }

                          transition={{ type: "spring", stiffness: 400, damping: 30 }}

                          // --- EXIT ANIMATION ---
                          exit={{
                            scale: 0.95,
                            opacity: 0,
                            transition: {
                              duration: 0.35,
                              ease: "backIn"
                            }
                          }}
                        >
                          {/* Mouse Glow Effect */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none mix-blend-overlay" style={{ background: 'radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255, 255, 255, 0.4), transparent 40%)' }} />

                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />

                          {/* Note Content */}
                          <div className="relative z-10 flex flex-col h-full pointer-events-none">
                            {note.title && <h4 className="font-bold text-sm md:text-base mb-2 line-clamp-1 select-none">{note.title}</h4>}
                            <div className="flex-1 overflow-y-auto no-scrollbar pointer-events-auto">

                              <RichTextRenderer
                                text={note.text}
                                className="text-xs md:text-sm"
                                onToggle={(index, status) => handleToggleLine(note, index, status)}
                              />
                            </div>
                            {note.tags && note.tags.length > 0 && (
                              <div className="mt-2 flex gap-1 flex-wrap">
                                {note.tags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[10px] bg-black/10 px-1.5 py-0.5 rounded-md font-medium text-black/60">#{tag}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* LIQUID DELETE BUTTON */}
                          <LiquidDeleteBtn onDelete={() => onDelete(note.id)} />

                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </motion.div>
      )}

      {/* EDITOR MODAL */}
      {editingNote && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(20px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30"
          onMouseDown={(e) => { if (e.target === e.currentTarget) handleSave() }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-[85vw] md:w-[550px] aspect-square shadow-2xl relative flex flex-col p-6 md:p-8 overflow-hidden transition-colors duration-500 rounded-sm max-h-[85vh]"
            style={{ backgroundColor: editorColor }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-black/5 pointer-events-none" />

            <input autoFocus type="text" value={editorTitle} onChange={(e) => setEditorTitle(e.target.value)} onKeyDown={handleTitleKeyDown} placeholder="Title..." className="relative z-10 w-full bg-transparent border-none outline-none focus:outline-none focus:ring-0 text-black/80 placeholder-black/30 text-2xl md:text-3xl font-bold mb-1 px-0 pt-0 pb-2 leading-normal overflow-visible" style={{ lineHeight: 1.4 }} />

            <div className="relative z-10 flex flex-wrap gap-2 mb-4 items-center min-h-[32px]">
              {editorTags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-black/10 px-2 py-1 rounded-md text-xs font-bold text-black/70">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-black"><X size={10} /></button>
                </span>
              ))}
              <div className="relative">
                <input ref={tagInputRef} type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown} placeholder={editorTags.length === 0 ? "Add tags..." : "+ tag"} className="bg-transparent border-none outline-none text-xs text-black/60 placeholder-black/30 w-32 focus:w-48 transition-all" />
                <AnimatePresence>
                  {tagSuggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute top-full left-0 mt-2 bg-[#111]/90 backdrop-blur-md shadow-2xl rounded-xl overflow-hidden border border-white/10 z-[100] min-w-[180px]">
                      <div className="px-3 py-2 text-[10px] uppercase font-bold text-white/30 border-b border-white/5">Suggested</div>
                      {tagSuggestions.map((tag, i) => (
                        <div key={tag} onClick={() => handleAddTag(tag)} className={`px-4 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${i === activeSuggestionIndex ? 'bg-white/20 text-white font-bold' : 'text-white/70 hover:bg-white/10'}`}><span>#{tag}</span>{i === activeSuggestionIndex && <span className="text-[10px] opacity-50">Enter</span>}</div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence>
              {showSlashMenu && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute z-50 bottom-24 left-8 right-8 bg-[#111]/90 backdrop-blur-md shadow-2xl rounded-xl border border-white/10 overflow-hidden">
                  <div className="bg-white/5 px-4 py-2 text-[10px] uppercase font-bold text-white/40 border-b border-white/5">Basic Blocks</div>
                  {filteredCommands.length > 0 ? filteredCommands.map((cmd, i) => (
                    <button key={cmd.id} onClick={() => executeSlashCommand(cmd)} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors ${i === 0 ? 'bg-white/5' : ''}`}>
                      <div className="w-8 h-8 rounded border border-white/10 flex items-center justify-center bg-white/10 text-white"><cmd.icon size={14} /></div>
                      <div className="flex flex-col"><span className="text-sm font-bold text-white/90">{cmd.label}</span><span className="text-[10px] text-white/40">Type /{cmd.id}</span></div>
                    </button>
                  )) : (<div className="px-4 py-3 text-xs text-white/40 italic">No matching commands</div>)}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative z-10 flex gap-1 mb-2 border-b border-black/10 pb-2">
              <button onClick={() => insertMarkdown('bold')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Bold"><Bold size={14} /></button>
              <button onClick={() => insertMarkdown('italic')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Italic"><Italic size={14} /></button>
              <div className="w-px bg-black/10 mx-1"></div>
              <button onClick={() => insertMarkdown('list')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Bullet List"><List size={14} /></button>
              <button onClick={() => insertMarkdown('task')} className="p-1.5 hover:bg-black/10 rounded text-black/70" title="Task List"><CheckSquare size={14} /></button>
            </div>

            <textarea
              ref={bodyInputRef}
              value={editorText}
              onChange={handleBodyChange}
              onKeyDown={handleBodyKeyDown}
              placeholder="Write / for commands..."
              className="relative z-10 w-full flex-1 bg-transparent resize-none border-none outline-none focus:outline-none focus:ring-0 text-black/80 placeholder-black/30 text-base md:text-lg font-normal leading-relaxed font-sans custom-scrollbar p-0 font-mono"
            />

            <div className="relative z-20 flex justify-between items-center pt-4 mt-2 border-t border-black/10">
              <div className="flex gap-2">{NOTE_COLORS.map(color => (<button key={color} onClick={() => setEditorColor(color)} className={`w-6 h-6 rounded-full border border-black/10 transition-transform hover:scale-110 ${editorColor === color ? 'ring-2 ring-black/50 scale-110' : ''}`} style={{ backgroundColor: color }} />))}</div>
              <button onClick={handleSave} className="px-6 py-2 bg-black text-white font-semibold uppercase tracking-wider text-xs rounded-xl hover:scale-105 transition-transform shadow-lg">Done</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};


export default NoteSystemModals;

