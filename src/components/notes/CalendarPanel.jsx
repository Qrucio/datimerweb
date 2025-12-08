import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Bell, Trash2, GripHorizontal } from 'lucide-react';
import SmartNoteEditor from './SmartNoteEditor';
import CloseButton from '../ui/CloseButton';
import ExpandableCalendar from '../ui/ExpandableCalendar';

// --- DATE LOGIC FIX ---
const toDateKey = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GRID_HEIGHT_PER_HOUR = 60; // 1px = 1min

const CalendarPanel = ({ tasks, notes, allTags, onAddTask, onUpdateTask, onDeleteTask, onClose }) => {
    // --- STATE ---
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);

    // Animation Direction
    const [direction, setDirection] = useState(0);
    const previousDate = useRef(toDateKey(new Date()));

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [dragPreview, setDragPreview] = useState(null);

    const containerRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const isDragging = useRef(false);

    // --- DATE LOGIC ---
    const dateKey = useMemo(() => toDateKey(selectedDate), [selectedDate]);
    const todayKey = useMemo(() => toDateKey(new Date()), []);
    const isToday = dateKey === todayKey;

    // Handle Direction Change
    useEffect(() => {
        const prev = previousDate.current;
        const curr = dateKey;
        if (curr > prev) setDirection(1);
        else if (curr < prev) setDirection(-1);
        else setDirection(0);
        previousDate.current = curr;
    }, [dateKey]);

    const todaysTasks = useMemo(() => {
        return tasks.filter(t => {
            if (t.date === dateKey) return true;
            if (!t.date && isToday) return true;
            if (t.repeatDays && t.repeatDays.length > 0) {
                const taskStart = toDateKey(new Date(t.date));
                if (dateKey < taskStart) return false;
                const currentDayIndex = new Date(selectedDate).getDay();
                if (t.repeatDays.includes(currentDayIndex)) return true;
            }
            return false;
        });
    }, [tasks, dateKey, isToday, selectedDate]);

    const { timedTasks } = useMemo(() => {
        const timed = [];
        const allDay = [];
        todaysTasks.forEach(t => {
            if (t.startTime) timed.push(t);
            else allDay.push(t);
        });
        return { timedTasks: timed, allDayTasks: allDay };
    }, [todaysTasks]);

    // --- HELPERS ---
    const getTopOffset = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h * GRID_HEIGHT_PER_HOUR) + ((m / 60) * GRID_HEIGHT_PER_HOUR);
    };

    const getHeight = (durationMin) => {
        return (durationMin / 60) * GRID_HEIGHT_PER_HOUR;
    };

    // --- ORIGINAL DRAG LOGIC (Restored Exactly) ---
    const calculateSnap = (task, offsetY) => {
        const [h, m] = task.startTime.split(':').map(Number);
        const currentMinutes = h * 60 + m;
        const minutesMoved = offsetY; // 1px = 1min logic
        let newTotalMinutes = currentMinutes + minutesMoved;

        // Snap to nearest 15
        const remainder = newTotalMinutes % 15;
        if (remainder < 7.5) newTotalMinutes -= remainder;
        else newTotalMinutes += (15 - remainder);

        // Clamp
        newTotalMinutes = Math.max(0, Math.min(newTotalMinutes, 23 * 60 + 45));

        const newH = Math.floor(newTotalMinutes / 60);
        const newM = Math.floor(newTotalMinutes % 60);
        const timeStr = `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;

        return {
            minutes: newTotalMinutes,
            timeStr,
            top: (newTotalMinutes / 60) * GRID_HEIGHT_PER_HOUR
        };
    };

    const handleDragStart = () => {
        isDragging.current = true;
    };

    const handleDrag = (task, info) => {
        const snap = calculateSnap(task, info.offset.y);
        setDragPreview({
            top: snap.top,
            timeStr: snap.timeStr
        });
    };

    const handleDragEnd = (task, info) => {
        const snap = calculateSnap(task, info.offset.y);
        setDragPreview(null);

        // Small delay to prevent click from firing immediately after drag
        setTimeout(() => { isDragging.current = false; }, 100);

        if (snap.timeStr !== task.startTime) {
            onUpdateTask(task.id, { startTime: snap.timeStr });
        }
    };

    const openNew = (time) => {
        setEditingItem({ date: dateKey, startTime: time || '' });
        setIsEditorOpen(true);
    };

    const openEdit = (item) => {
        if (isDragging.current) return;
        setEditingItem(item);
        setIsEditorOpen(true);
    };

    // --- AUTO SCROLL ---
    useEffect(() => {
        if (isToday && scrollContainerRef.current) {
            const now = new Date();
            const minutes = now.getHours() * 60 + now.getMinutes();
            const timeTop = (minutes / 60) * GRID_HEIGHT_PER_HOUR;
            const containerHeight = scrollContainerRef.current.clientHeight;
            if (containerHeight > 0) {
                scrollContainerRef.current.scrollTo({
                    top: Math.max(0, timeTop - (containerHeight / 2)),
                    behavior: 'smooth'
                });
            }
        }
    }, [isToday, dateKey]);

    // --- ANIMATION VARIANTS (Improved) ---
    const slideVariants = {
        enter: (dir) => ({ x: dir * 50, opacity: 0 }),
        center: { x: 0, opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
        exit: (dir) => ({ x: dir * -50, opacity: 0, transition: { duration: 0.15, ease: "easeIn" } })
    };

    return (
        <div className="h-full flex flex-col bg-transparent relative overflow-hidden select-none" onClick={(e) => e.stopPropagation()}>

            {/* HEADER (Enhanced Calendar) */}
            <div className="flex flex-col border-b border-white/5 bg-transparent flex-shrink-0 z-30">
                <div className="p-4 pb-0 flex justify-end">
                    <CloseButton onClick={onClose} />
                </div>
                <div className="px-4 pb-4">
                    <ExpandableCalendar
                        selectedDate={selectedDate}
                        onSelectDate={(d) => {
                            const clean = new Date(d);
                            clean.setHours(0, 0, 0, 0);
                            setSelectedDate(clean);
                        }}
                        currentMonth={currentMonth}
                        setCurrentMonth={setCurrentMonth}
                        isExpanded={isCalendarExpanded}
                        setIsExpanded={setIsCalendarExpanded}
                        data={tasks.reduce((acc, t) => { if (t.date) acc[t.date] = true; return acc; }, {})}
                    />
                </div>
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                <div ref={containerRef} className="relative mt-2" style={{ height: HOURS.length * GRID_HEIGHT_PER_HOUR }}>

                    {/* 1. BACKGROUND GRID */}
                    {HOURS.map(hour => (
                        <div key={hour} className="absolute left-0 right-0 border-t border-white/5 flex group pointer-events-none" style={{ top: hour * GRID_HEIGHT_PER_HOUR, height: GRID_HEIGHT_PER_HOUR }}>
                            <div className="w-12 text-[10px] text-white/30 text-right pr-2 -mt-1.5 group-hover:text-white/50 font-mono">{hour}:00</div>
                        </div>
                    ))}

                    {/* 2. CLICK ZONES */}
                    {HOURS.map(hour => (
                        <div
                            key={`click-${hour}`}
                            className="absolute left-12 right-0 pointer-events-auto hover:bg-white/[0.02] cursor-pointer border-l border-white/5"
                            style={{ top: hour * GRID_HEIGHT_PER_HOUR, height: GRID_HEIGHT_PER_HOUR }}
                            onClick={() => openNew(`${hour.toString().padStart(2, '0')}:00`)}
                        />
                    ))}

                    {/* 3. NOW INDICATOR */}
                    {isToday && (
                        <div className="absolute left-12 right-0 border-t border-red-500 z-10 pointer-events-none" style={{ top: getTopOffset(`${new Date().getHours()}:${new Date().getMinutes()}`) }}>
                            <div className="absolute -left-1.5 -top-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                        </div>
                    )}

                    {/* 4. TASKS */}
                    <AnimatePresence mode="popLayout" custom={direction} initial={false}>
                        <motion.div
                            key={dateKey}
                            custom={direction}
                            variants={slideVariants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            className="absolute inset-0 pointer-events-none"
                        >
                            {timedTasks.map((task) => (
                                <motion.div
                                    key={task.id}
                                    // Added layout to smooth out the snap upon release
                                    layout
                                    layoutId={task.id}

                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}

                                    onClick={(e) => { e.stopPropagation(); openEdit(task); }}

                                    // RESTORED ORIGINAL DRAG PROPS
                                    drag="y"
                                    dragConstraints={containerRef}
                                    dragElastic={0}
                                    dragMomentum={false}

                                    onDragStart={handleDragStart}
                                    onDrag={(e, info) => handleDrag(task, info)}
                                    onDragEnd={(e, info) => handleDragEnd(task, info)}

                                    whileDrag={{ zIndex: 50, scale: 1.02, cursor: 'grabbing', boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}

                                    className="absolute left-14 right-4 rounded-lg border border-black/10 p-2 cursor-grab active:cursor-grabbing overflow-hidden hover:brightness-110 hover:z-20 transition-all shadow-lg group pointer-events-auto"
                                    style={{
                                        top: getTopOffset(task.startTime),
                                        height: Math.max(getHeight(task.duration || 60), 32),
                                        backgroundColor: task.color || '#ffeb3b',
                                        zIndex: 1
                                    }}
                                >
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                        className="absolute top-1 right-1 p-1 text-black/40 hover:text-red-600 hover:bg-white/50 rounded-md opacity-0 group-hover:opacity-100 transition-all z-20"
                                    >
                                        <Trash2 size={12} />
                                    </button>

                                    <div className="flex items-center justify-between pr-4">
                                        <div className="text-xs font-bold text-black/90 truncate">{task.title}</div>
                                        {task.reminder && task.reminder !== 'none' && (
                                            <Bell size={10} className="text-black/50 ml-1 shrink-0" fill="currentColor" />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-black/70 flex items-center gap-1 font-medium mt-0.5">
                                        <Clock size={10} />
                                        {task.startTime} - {new Date(new Date(`2000-01-01T${task.startTime}`).getTime() + (task.duration || 60) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </div>

                                    {/* Bottom Handle Visual (Optional, helps indicate drag) */}
                                    <div className="absolute bottom-0 left-0 right-0 h-2 flex justify-center opacity-0 group-hover:opacity-50">
                                        <GripHorizontal size={10} className="text-black/30" />
                                    </div>
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>

                    {/* SNAP GUIDE LINE */}
                    {dragPreview && (
                        <div className="absolute left-0 right-0 border-t-2 border-white z-50 pointer-events-none flex items-center" style={{ top: dragPreview.top }}>
                            <div className="absolute left-0 bg-white text-black text-[10px] font-bold px-1 rounded-r shadow-lg -mt-3">
                                {dragPreview.timeStr}
                            </div>
                            <div className="w-full h-[1px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                    )}

                </div>
            </div>

            <div className="absolute bottom-6 right-6 z-30">
                <button onClick={() => openNew()} className="w-12 h-12 bg-white text-black rounded-full shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center hover:scale-110 transition-transform active:scale-90">
                    <Plus size={24} strokeWidth={3} />
                </button>
            </div>

            <SmartNoteEditor
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                initialDate={dateKey}
                initialData={editingItem}
                notes={notes}
                allTags={allTags}
                onSave={(data) => {
                    if (editingItem?.id) onUpdateTask(data.id, data);
                    else onAddTask(data);
                    setIsEditorOpen(false);
                }}
                onDelete={onDeleteTask}
            />
        </div>
    );
};

export default CalendarPanel;