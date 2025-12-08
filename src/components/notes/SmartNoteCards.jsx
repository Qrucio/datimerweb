import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, RotateCcw, Flame, Calendar as CalendarIcon, Trash2 } from 'lucide-react';

// --- TASK CARD ---
export const TaskCard = ({ task, onToggle, onUpdate, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(task.title);

    const handleBlur = () => {
        setIsEditing(false);
        if (editTitle.trim() !== task.title) {
            onUpdate({ ...task, title: editTitle });
        }
    };

    return (
        <motion.div
            layout="position" // Changing from 'layout' to 'layout="position"' helps prevent size distortion
            initial={{ opacity: 0, scale: 0.95 }} // Add explicit entrance
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onMouseEnter={() => setIsHovered(true)}
            className={`group relative p-3 rounded-xl border transition-all duration-200 ${task.isDone
                ? 'bg-white/5 border-white/5 opacity-60'
                : 'bg-[#1a1a1a] border-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/20'
                }`}
        >
            <div className="flex items-start gap-3">
                {/* Checkbox */}
                <button
                    onClick={() => onToggle(task.id)}
                    className={`mt-1 w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${task.isDone
                        ? 'bg-green-500 border-green-500 text-black'
                        : 'border-white/30 hover:border-white/60 text-transparent'
                        }`}
                >
                    <Check size={12} strokeWidth={4} />
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            autoFocus
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                            className="w-full bg-transparent text-sm font-medium focus:outline-none text-white placeholder-white/30"
                            placeholder="Task name..."
                        />
                    ) : (
                        <div
                            onClick={() => setIsEditing(true)}
                            className={`text-sm font-medium truncate cursor-text ${task.isDone ? 'line-through text-white/40' : 'text-white/90'}`}
                        >
                            {task.title || "Untitled Task"}
                        </div>
                    )}

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/40">
                        {task.time && (
                            <div className="flex items-center gap-1">
                                <Clock size={10} />
                                <span>{task.time}</span>
                            </div>
                        )}
                        {task.repeat && (
                            <div className="flex items-center gap-1 text-cyan-400">
                                <RotateCcw size={10} />
                                <span>{task.repeat}</span>
                            </div>
                        )}
                        {task.dueDate && (
                            <div className="flex items-center gap-1">
                                <CalendarIcon size={10} />
                                <span>{new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Delete Action (Hover) */}
                <AnimatePresence>
                    {isHovered && !isEditing && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
                            className="absolute top-2 right-2 text-white/20 hover:text-red-400 transition-colors"
                        >
                            <Trash2 size={14} />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

// --- HABIT CARD ---
export const HabitCard = ({ habit, onCheck, onUpdate, onDelete }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Heatmap generation (Last 14 days)
    const renderHeatmap = () => {
        const days = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateId = d.toISOString().split('T')[0];
            const status = habit.history?.[dateId]; // 'done', 'skipped', or undefined

            let bg = 'bg-white/5';
            if (status === 'done') bg = 'bg-green-500';
            if (status === 'skipped') bg = 'bg-red-500/50';

            days.push(
                <div key={i} className={`w-1.5 h-6 rounded-full ${bg} transition-colors`} title={dateId} />
            );
        }
        return days;
    };

    const isDoneToday = (() => {
        const today = new Date().toISOString().split('T')[0];
        return habit.history?.[today] === 'done';
    })();

    return (
        <motion.div
            layout
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="group relative p-4 rounded-xl border border-white/10 bg-[#151515] overflow-hidden"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-3 relative z-10">
                <h3 className="font-semibold text-white/90">{habit.title}</h3>

                {/* Streak Counter */}
                <div className="flex items-center gap-1 text-xs font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                    <Flame size={10} className="fill-current" />
                    <span>{habit.streak || 0}</span>
                </div>
            </div>

            <div className="flex justify-between items-end relative z-10">
                {/* Heatmap */}
                <div className="flex items-center gap-0.5">
                    {renderHeatmap()}
                </div>

                {/* Big Check Button */}
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onCheck(habit.id)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all ${isDoneToday
                        ? 'bg-green-500 text-black shadow-green-500/20'
                        : 'bg-white/10 text-white/30 hover:bg-white/20 hover:text-white'
                        }`}
                >
                    <Check size={20} strokeWidth={3} />
                </motion.button>
            </div>

            {/* Delete (Hidden) */}
            <AnimatePresence>
                {isHovered && (
                    <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={(e) => { e.stopPropagation(); onDelete(habit.id); }}
                        className="absolute top-2 right-2 p-1 text-white/10 hover:text-red-400"
                    >
                        <Trash2 size={12} />
                    </motion.button>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
