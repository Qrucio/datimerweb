import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Calendar,
    Repeat,
    Clock,
    Link as LinkIcon,
    ChevronDown,
    Hash,
    Check,
    Bell
} from 'lucide-react';
import { TimeInput } from '../ui/TimePicker';
import CloseButton from '../ui/CloseButton';
import LiquidDeleteBtn from '../ui/LiquidDeleteBtn';

// COLORS UPDATED to match your Notes theme
const COLORS = [
    '#ffeb3b', // Classic Yellow
    '#ffcc80', // Orange
    '#ccff90', // Green
    '#a7ffeb', // Teal
    '#f8bbd0', // Pink
    '#d1c4e9', // Purple
];

const RECURRENCE_OPTIONS = [
    { id: 'none', label: 'Does not repeat' },
    { id: 'daily', label: 'Daily' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'monthly', label: 'Monthly' },
    { id: 'weekdays', label: 'Weekdays (Mon-Fri)' },
];

const REMINDER_OPTIONS = [
    { value: 0, label: 'At start' },
    { value: 5, label: '-5 min' },
    { value: 10, label: '-10 min' },
    { value: 15, label: '-15 min' },
    { value: 30, label: '-30 min' },
    { value: 60, label: '-1 hour' },
];

const SmartNoteEditor = ({ isOpen, onClose, initialDate, initialData, notes = [], allTags = [], onSave, onDelete }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState('task');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [linkedNoteId, setLinkedNoteId] = useState('');
    const [tags, setTags] = useState([]);
    const [color, setColor] = useState(COLORS[0]);
    const [recurrence, setRecurrence] = useState('none');
    const [reminders, setReminders] = useState([]);

    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [showNotePicker, setShowNotePicker] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setTitle(initialData.title || '');
                setType('task');
                setDate(initialData.date || new Date().toISOString().split('T')[0]);
                setStartTime(initialData.startTime || '');

                // Calculate End Time from Duration
                // Calculate End Time from Duration OR Default to +30m
                if (initialData.startTime) {
                    const [h, m] = initialData.startTime.split(':').map(Number);
                    // Use provided duration or DEFAULT 30 mins
                    const duration = initialData.duration || 30;
                    const totalMin = h * 60 + m + duration;
                    const endH = Math.floor(totalMin / 60) % 24;
                    const endM = totalMin % 60;
                    setEndTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
                } else {
                    setEndTime('');
                }

                setLinkedNoteId(initialData.linkedNoteId || '');
                setTags(initialData.tags || []);
                setColor(initialData.color || COLORS[0]);
                // Handle repeatDays if present, otherwise fallback to recurrence string or 'none'
                setRecurrence(initialData.repeatDays || initialData.recurrence || 'none');
                setReminders(initialData.reminders || (initialData.reminder && initialData.reminder !== 'none' ? [initialData.reminder] : []));
            } else {
                setTitle('');
                setType('task');
                setDate(initialDate || new Date().toISOString().split('T')[0]);
                setStartTime('');
                setEndTime('');
                setLinkedNoteId('');
                setTags([]);
                setColor(COLORS[0]);
                setRecurrence('none');
                setReminders([]);
            }
            setTagInput('');
            setShowTagSuggestions(false);
            setShowNotePicker(false);
        }
    }, [isOpen, initialData, initialDate]);

    const handleLinkNote = (noteId) => {
        setLinkedNoteId(noteId);
        setShowNotePicker(false);
        if (!noteId) return;

        const note = notes.find(n => n.id === noteId);
        if (note) {
            if (note.color) setColor(note.color);
            if (note.tags && note.tags.length > 0) {
                setTags(prev => [...new Set([...prev, ...note.tags])]);
            }
        }
    };

    const handleSave = () => {
        if (!title.trim()) return;

        // Calculate Duration
        let calculatedDuration = 30; // Default
        if (startTime && endTime) {
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            const startTotal = sh * 60 + sm;
            let endTotal = eh * 60 + em;
            if (endTotal < startTotal) endTotal += 24 * 60; // Assume next day overlap
            calculatedDuration = endTotal - startTotal;
        }

        const data = {
            id: initialData?.id || Date.now().toString(),
            title,
            type: 'task',
            date,
            startTime,
            duration: calculatedDuration,
            linkedNoteId,
            tags,
            color,
            // Save as repeatDays if it's an array, otherwise recurrence string (legacy support)
            // Save as repeatDays if it's an array, otherwise recurrence string (legacy support)
            recurrence: Array.isArray(recurrence) ? 'custom' : recurrence,
            repeatDays: Array.isArray(recurrence) ? recurrence : [],
            reminders: reminders,
            reminder: reminders.length > 0 ? reminders[0] : 'none', // Backward compat
            createdAt: initialData?.createdAt || Date.now(),
            isDone: initialData?.isDone || false,
        };

        onSave(data);
        onClose();
    };

    const filteredTagSuggestions = tagInput.trim()
        ? allTags.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !tags.includes(t))
        : [];

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (showTagSuggestions && filteredTagSuggestions.length > 0) {
                handleAddTag(filteredTagSuggestions[activeSuggestionIndex]);
            } else if (tagInput.trim()) {
                handleAddTag(tagInput.trim());
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev + 1) % filteredTagSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev - 1 + filteredTagSuggestions.length) % filteredTagSuggestions.length);
        } else if (e.key === 'Escape') {
            setShowTagSuggestions(false);
        }
    };

    const handleAddTag = (tag) => {
        if (!tags.includes(tag)) {
            setTags([...tags, tag]);
        }
        setTagInput('');
        setShowTagSuggestions(false);
    };

    const removeTag = (tagToRemove) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const overlayVariants = {
        hidden: { opacity: 0, backdropFilter: "blur(0px)" },
        visible: { opacity: 1, backdropFilter: "blur(8px)" }
    };

    const modalVariants = {
        hidden: { opacity: 0, scale: 0.9, y: 30 },
        visible: {
            opacity: 1, scale: 1, y: 0,
            transition: { type: "spring", stiffness: 350, damping: 25 }
        },
        exit: {
            opacity: 0, scale: 0.95, y: 20,
            transition: { duration: 0.2 }
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50"
                    onClick={onClose}
                    variants={overlayVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                >
                    <motion.div
                        variants={modalVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-lg bg-[#111] border border-white/10 rounded-3xl shadow-2xl overflow-visible flex flex-col max-h-[90vh]"
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#161616] rounded-t-3xl">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">
                                {initialData ? 'Edit Task' : 'New Task'}
                            </h3>
                            <div className="flex items-center gap-4">
                                {initialData && onDelete && (
                                    <LiquidDeleteBtn
                                        size={40}
                                        className="bg-white/5 text-white"
                                        darkMode={true}
                                        onDelete={() => {
                                            if (initialData?.id) {
                                                onDelete(initialData.id);
                                                onClose();
                                            }
                                        }} />
                                )}
                                <CloseButton onClick={onClose} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                            <input
                                autoFocus
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="What needs to be done?"
                                className="w-full bg-transparent text-3xl font-bold text-white placeholder-white/20 border-none outline-none ring-0 p-0 leading-tight"
                            />

                            <div className="grid grid-cols-1 gap-6">

                                <div className="space-y-4">
                                    {/* ROW 1: TIME (Start + End) */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-1">
                                            <Clock size={12} /> Time
                                        </label>
                                        <div className="flex gap-4 items-center">
                                            <div className="flex-1">
                                                <TimeInput value={startTime} onChange={(val) => {
                                                    // Capture OLD start time to calculate duration
                                                    const oldStart = startTime;
                                                    setStartTime(val);

                                                    if (val) {
                                                        const [h, m] = val.split(':').map(Number);
                                                        const startMin = h * 60 + m;

                                                        if (!endTime) {
                                                            // Case 1: No End Time -> Default +30 min
                                                            const endMin = startMin + 30;
                                                            const eh = Math.floor(endMin / 60) % 24;
                                                            const em = endMin % 60;
                                                            setEndTime(`${eh.toString().padStart(2, '0')}:${em.toString().padStart(2, '0')}`);
                                                        } else if (oldStart) {
                                                            // Case 2: Has End Time & Old Start -> Preserve Duration
                                                            const [oh, om] = oldStart.split(':').map(Number);
                                                            const [eh, em] = endTime.split(':').map(Number);

                                                            let oldStartMin = oh * 60 + om;
                                                            let oldEndMin = eh * 60 + em;

                                                            // Handle crossing midnight for duration calc
                                                            if (oldEndMin < oldStartMin) oldEndMin += 24 * 60;

                                                            const duration = oldEndMin - oldStartMin;

                                                            let newEndMin = startMin + duration;
                                                            const newEh = Math.floor(newEndMin / 60) % 24;
                                                            const newEm = newEndMin % 60;
                                                            setEndTime(`${newEh.toString().padStart(2, '0')}:${newEm.toString().padStart(2, '0')}`);
                                                        }
                                                    }
                                                }} placeholder="Start" />
                                            </div>
                                            <span className="text-white/20 font-bold">-</span>
                                            <div className="flex-1">
                                                <TimeInput value={endTime} onChange={setEndTime} placeholder="End" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ROW 2: SCHEDULE (Date + Repeat) */}
                                    <div className="flex gap-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-white/30 uppercase tracking-widest">
                                                <Calendar size={12} /> Schedule
                                            </div>
                                            <input
                                                type="date"
                                                value={date}
                                                onChange={(e) => setDate(e.target.value)}
                                                className="w-40 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-white/20 focus:bg-white/10 transition-colors"
                                            />
                                        </div>

                                        {/* Repeat Days */}
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-bold text-white/30 uppercase tracking-widest">
                                                <Repeat size={12} /> Repeat
                                            </div>
                                            <div className="flex gap-1 justify-between bg-white/5 border border-white/10 rounded-xl p-2 items-center h-[46px]">
                                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => {
                                                    const isSelected = Array.isArray(recurrence) && recurrence.includes(i);
                                                    return (
                                                        <button
                                                            key={i}
                                                            onClick={() => {
                                                                let newRecurrence;
                                                                if (!Array.isArray(recurrence)) {
                                                                    newRecurrence = [i];
                                                                } else {
                                                                    if (recurrence.includes(i)) {
                                                                        newRecurrence = recurrence.filter(d => d !== i);
                                                                    } else {
                                                                        newRecurrence = [...recurrence, i];
                                                                    }
                                                                }
                                                                setRecurrence(newRecurrence.length > 0 ? newRecurrence : 'none');
                                                            }}
                                                            style={isSelected ? { backgroundColor: color, color: '#000', borderColor: color } : {}}
                                                            className={`w-8 h-8 rounded-full text-[10px] font-bold transition-all flex items-center justify-center ${isSelected ? 'scale-110 shadow-lg' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ROW 3: REMINDERS */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-1">
                                            <Bell size={12} /> Reminders
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {REMINDER_OPTIONS.map((opt) => {
                                                const isSelected = reminders.includes(opt.value) || reminders.includes(String(opt.value));
                                                return (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => {
                                                            const val = opt.value;
                                                            // Toggle
                                                            if (isSelected) {
                                                                setReminders(reminders.filter(r => r !== val && r !== String(val)));
                                                            } else {
                                                                setReminders([...reminders, val]);
                                                            }
                                                        }}
                                                        style={isSelected ? { backgroundColor: color, color: '#000', borderColor: color, boxShadow: `0 4px 12px ${color}40` } : {}}
                                                        className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${isSelected
                                                            ? 'shadow-lg'
                                                            : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white'
                                                            }`}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 relative z-20">
                                    <label className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-1">
                                        <LinkIcon size={12} /> Link to Note
                                    </label>

                                    <div className="relative">
                                        <div
                                            onClick={() => setShowNotePicker(!showNotePicker)}
                                            className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-colors ${showNotePicker ? 'border-white/30 bg-white/10' : 'border-white/10'}`}
                                        >
                                            {linkedNoteId ? (
                                                (() => {
                                                    const n = notes.find(n => n.id === linkedNoteId);
                                                    return n ? (
                                                        <>
                                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="font-bold truncate text-xs">{n.title || "Untitled"}</span>
                                                                <span className="text-white/30 text-[10px] truncate max-w-[200px]">{n.text?.substring(0, 40) || "No text"}</span>
                                                            </div>
                                                            <div onClick={(e) => { e.stopPropagation(); setLinkedNoteId(''); }} className="ml-auto p-1 hover:bg-white/10 rounded-full">
                                                                <X size={12} className="text-white/50" />
                                                            </div>
                                                        </>
                                                    ) : <span className="text-white/50">Note not found</span>
                                                })()
                                            ) : (
                                                <span className="text-white/50">Select a note to link...</span>
                                            )}
                                            {!linkedNoteId && <ChevronDown size={14} className={`ml-auto text-white/30 transition-transform ${showNotePicker ? 'rotate-180' : ''}`} />}
                                        </div>

                                        <AnimatePresence>
                                            {showNotePicker && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-2 z-50 max-h-[250px] overflow-y-auto custom-scrollbar"
                                                >
                                                    <div onClick={() => handleLinkNote('')} className="p-2 hover:bg-white/5 rounded-lg cursor-pointer text-xs text-white/50 mb-1">
                                                        No Link
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {notes.map(note => (
                                                            <div
                                                                key={note.id}
                                                                onClick={() => handleLinkNote(note.id)}
                                                                className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] flex flex-col gap-1 ${linkedNoteId === note.id ? 'border-white/30 bg-white/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}
                                                            >
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: note.color }} />
                                                                    <span className="text-xs font-bold text-white truncate">{note.title || "Untitled"}</span>
                                                                </div>
                                                                <p className="text-[10px] text-white/50 line-clamp-2 leading-relaxed">
                                                                    {note.text || "No content"}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="space-y-2 relative z-10">
                                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest flex items-center gap-1">
                                            <Hash size={12} /> Tags
                                        </label>
                                        <div className="flex flex-wrap gap-2 p-2 bg-white/5 border border-white/10 rounded-xl min-h-[48px] items-center">
                                            {tags.map(tag => (
                                                <span key={tag} className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg text-xs font-medium text-white/90">
                                                    #{tag}
                                                    <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors ml-1"><X size={12} /></button>
                                                </span>
                                            ))}
                                            <div className="flex-1 relative min-w-[100px]">
                                                <input
                                                    value={tagInput}
                                                    onChange={(e) => { setTagInput(e.target.value); setShowTagSuggestions(true); }}
                                                    onKeyDown={handleTagKeyDown}
                                                    onFocus={() => setShowTagSuggestions(true)}
                                                    onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                                                    placeholder={tags.length === 0 ? "Add tag..." : ""}
                                                    className="w-full bg-transparent border-none outline-none text-sm text-white placeholder-white/20 h-full py-1"
                                                />
                                                <AnimatePresence>
                                                    {showTagSuggestions && filteredTagSuggestions.length > 0 && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: 5 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0 }}
                                                            className="absolute bottom-full left-0 mb-2 w-full max-w-[200px] bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl overflow-hidden z-50"
                                                        >
                                                            {filteredTagSuggestions.map((tag, i) => (
                                                                <div
                                                                    key={tag}
                                                                    onClick={() => handleAddTag(tag)}
                                                                    className={`px-3 py-2 text-xs cursor-pointer flex justify-between ${i === activeSuggestionIndex ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'}`}
                                                                >
                                                                    <span>#{tag}</span>
                                                                    {i === activeSuggestionIndex && <span className="opacity-50 text-[10px]">Enter</span>}
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/30 uppercase tracking-widest">Color</label>
                                        <div className="flex gap-3 flex-wrap">
                                            {COLORS.map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setColor(c)}
                                                    className={`w-8 h-8 rounded-full border border-white/10 transition-transform duration-300 ${color === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-black' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                                                    style={{ backgroundColor: c }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>

                            <div className="p-6 pt-0 flex gap-4 items-center">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                                    style={{ backgroundColor: color, color: '#000' }}
                                >
                                    <Check size={18} />
                                    Save {type === 'task' ? 'Task' : 'Habit'}
                                </button>
                            </div>
                        </div>

                    </motion.div>
                </motion.div>
            )
            }
        </AnimatePresence >
    );
};

export default SmartNoteEditor;