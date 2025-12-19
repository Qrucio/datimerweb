import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Clock, Bell, Trash2, GripHorizontal } from 'lucide-react';
import SmartNoteEditor from './SmartNoteEditor';
import CloseButton from '../ui/CloseButton';
import ExpandableCalendar from '../ui/ExpandableCalendar';
import RecurrenceUpdateModal from '../modals/RecurrenceUpdateModal';
import LiquidDeleteBtn from '../ui/LiquidDeleteBtn';

// --- DATE LOGIC FIX ---
const toDateKey = (date) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

const formatTime12 = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GRID_HEIGHT_PER_HOUR = 60; // 1px = 1min

const CalendarPanel = ({ tasks, notes, allTags, onAddTask, onUpdateTask, onDeleteTask, onClose, onUpdateTasks }) => {
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

    // --- RESIZING STATE ---
    const [resizingTask, setResizingTask] = useState(null);

    // --- RECURRENCE LOGIC ---
    const [recurrenceModal, setRecurrenceModal] = useState({ isOpen: false, taskId: null, updates: null, originalTask: null });

    const handleRequestUpdate = (taskId, updates) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        // Check if recurring (Robust)
        const hasRepeatDays = Array.isArray(task.repeatDays) && task.repeatDays.length > 0;
        const hasRecurrenceString = typeof task.recurrence === 'string' && task.recurrence !== 'none' && task.recurrence !== '';
        const isRecurring = hasRepeatDays || hasRecurrenceString;

        if (isRecurring) {
            setRecurrenceModal({
                isOpen: true,
                taskId,
                updates,
                originalTask: task
            });
        } else {
            onUpdateTask(taskId, updates);
        }
    };

    const handleRecurrenceConfirm = (mode) => {
        const { taskId, updates, originalTask } = recurrenceModal;
        setRecurrenceModal({ isOpen: false, taskId: null, updates: null, originalTask: null });

        if (mode === 'single') {
            const exceptionDate = dateKey;
            const updatedExceptions = [...(originalTask.exceptions || []), exceptionDate];

            // Create New Task
            const newTask = {
                ...originalTask,
                ...updates,
                id: Date.now().toString(),
                date: dateKey,
                repeatDays: [],
                recurrence: 'none',
                exceptions: [],
                isFromRecurrence: true,
                originalTaskId: taskId
            };

            // ATOMIC UPDATE: Modify original task AND add new task simultaneously
            if (onUpdateTasks) {
                const newTasks = tasks.map(t =>
                    t.id === taskId ? { ...t, exceptions: updatedExceptions } : t
                );
                newTasks.push(newTask);
                onUpdateTasks(newTasks);
            } else {
                // Fallback (Risk of race condition)
                onUpdateTask(taskId, { exceptions: updatedExceptions });
                onAddTask(newTask);
            }

        } else {
            onUpdateTask(taskId, updates);
        }
    };

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
            // 1. GLOBAL EXCEPTION CHECK (Must be first)
            if (t.exceptions && t.exceptions.includes(dateKey)) return false;

            // 2. Specific Date Match
            if (t.date === dateKey) return true;
            if (!t.date && isToday) return true;

            // 3. Recurrence Logic
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
        return Math.round((h * GRID_HEIGHT_PER_HOUR) + ((m / 60) * GRID_HEIGHT_PER_HOUR));
    };

    const getHeight = (durationMin) => {
        return Math.round((durationMin / 60) * GRID_HEIGHT_PER_HOUR);
    };

    // --- RESIZING LOGIC ---
    const handleResizeStart = (e, task, type) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging.current = true; // Prevent click from firing

        const startY = e.clientY;

        // Parse start time to minutes
        const [h, m] = task.startTime.split(':').map(Number);
        const startMinutes = h * 60 + m;
        const startDuration = task.duration || 60;

        setResizingTask({
            id: task.id,
            originalStartTime: startMinutes,
            originalDuration: startDuration,
            resizeType: type, // 'top' or 'bottom'
            currentStartTimeStr: task.startTime,
            currentDuration: startDuration
        });

        // Define listeners
        const onMove = (moveEvent) => {
            const deltaY = moveEvent.clientY - startY;
            const deltaMinutes = Math.round(deltaY / (GRID_HEIGHT_PER_HOUR / 60)); // 1px = 1min

            // Snap to 15
            const snappedDeltaMinutes = Math.round(deltaMinutes / 15) * 15;

            setResizingTask(prev => {
                if (!prev) return null;

                let newMinutes = prev.originalStartTime;
                let newDuration = prev.originalDuration;

                if (type === 'top') {
                    // Changing start time means duration changes inversely
                    newMinutes = prev.originalStartTime + snappedDeltaMinutes;
                    newDuration = prev.originalDuration - snappedDeltaMinutes;
                } else {
                    // Changing end time (bottom handle) means duration changes
                    newDuration = prev.originalDuration + snappedDeltaMinutes;
                }

                // Minimum duration 15 mins
                if (newDuration < 15) {
                    newDuration = 15;
                    if (type === 'top') {
                        newMinutes = prev.originalStartTime + prev.originalDuration - 15;
                    }
                }

                // Clamp to day boundaries
                if (newMinutes < 0) newMinutes = 0;
                if (newMinutes > 24 * 60 - 15) newMinutes = 24 * 60 - 15;

                const h = Math.floor(newMinutes / 60);
                const m = Math.floor(newMinutes % 60);
                const newTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                return {
                    ...prev,
                    currentStartTimeStr: newTimeStr,
                    currentDuration: newDuration
                };
            });
        };

        const onUp = () => {
            setResizingTask(current => {
                if (current) {
                    handleRequestUpdate(current.id, {
                        startTime: current.currentStartTimeStr,
                        duration: current.currentDuration
                    });
                }
                return null;
            });

            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            document.body.style.cursor = '';

            // Small delay to ensure click doesn't fire
            setTimeout(() => { isDragging.current = false; }, 100);
        };

        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        document.body.style.cursor = 'ns-resize';
    };

    // --- ORIGINAL DRAG LOGIC (Restored Exactly) ---
    const calculateSnap = (task, offsetY) => {
        const [h, m] = task.startTime.split(':').map(Number);
        const currentMinutes = h * 60 + m;
        const minutesMoved = Math.round(offsetY); // Round pixel offset
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
            top: Math.round((newTotalMinutes / 60) * GRID_HEIGHT_PER_HOUR)
        };
    };

    const handleDragStart = () => {
        isDragging.current = true;
    };

    const handleDrag = (task, info) => {
        if (resizingTask) return;
        const snap = calculateSnap(task, info.offset.y);
        setDragPreview({
            top: snap.top,
            timeStr: snap.timeStr
        });
    };

    const handleDragEnd = (task, info) => {
        if (resizingTask) return;
        const snap = calculateSnap(task, info.offset.y);
        setDragPreview(null);

        // Small delay to prevent click from firing immediately after drag
        setTimeout(() => { isDragging.current = false; }, 100);

        if (snap.timeStr !== task.startTime) {
            handleRequestUpdate(task.id, { startTime: snap.timeStr });
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
        <div className="h-full flex flex-col relative overflow-hidden select-none" onClick={(e) => e.stopPropagation()}>
            <RecurrenceUpdateModal
                isOpen={recurrenceModal.isOpen}
                onClose={() => setRecurrenceModal({ ...recurrenceModal, isOpen: false })}
                onConfirm={handleRecurrenceConfirm}
            />

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
                        <div key={hour} className="absolute left-0 right-0 border-t border-white/20 flex group pointer-events-none" style={{ top: hour * GRID_HEIGHT_PER_HOUR, height: GRID_HEIGHT_PER_HOUR }}>
                            <div className="w-12 text-[10px] text-white text-right pr-2 -mt-1.5 group-hover:text-white/50 font-mono">
                                {((hour % 12) || 12)} {hour >= 12 ? 'PM' : 'AM'}
                            </div>
                        </div>
                    ))}

                    {/* 2. CLICK ZONES */}
                    {HOURS.map(hour => (
                        <div
                            key={`click-${hour}`}
                            className="absolute left-12 right-0 pointer-events-auto hover:bg-white/[0.02] cursor-pointer border-l border-white/20"
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
                            {timedTasks.map((task) => {
                                const isBeingResized = resizingTask && resizingTask.id === task.id;
                                const displayStartTime = isBeingResized ? resizingTask.currentStartTimeStr : task.startTime;
                                const displayDuration = isBeingResized ? resizingTask.currentDuration : (task.duration || 60);

                                return (
                                    <motion.div
                                        key={task.id}
                                        layout={!isBeingResized}


                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{
                                            opacity: 1,
                                            scale: 1,
                                            zIndex: isBeingResized ? 50 : 1
                                        }}
                                        exit={{ opacity: 0, scale: 0.95 }}

                                        onClick={(e) => { e.stopPropagation(); openEdit(task); }}

                                        drag={!isBeingResized ? "y" : false}
                                        dragConstraints={containerRef}
                                        dragElastic={0}
                                        dragMomentum={false}

                                        onDragStart={handleDragStart}
                                        onDrag={(e, info) => handleDrag(task, info)}
                                        onDragEnd={(e, info) => handleDragEnd(task, info)}

                                        whileDrag={{ zIndex: 50, scale: 1.02, cursor: 'grabbing', boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}

                                        className={`absolute left-14 right-4 rounded-lg border border-black/10 p-2 overflow-visible hover:brightness-110 hover:z-20 transition-all shadow-sm group pointer-events-auto ${!isBeingResized ? '!cursor-default active:cursor-grabbing' : ''}`}
                                        style={{
                                            top: getTopOffset(displayStartTime),
                                            height: Math.max(getHeight(displayDuration) - 2, 30),
                                            backgroundColor: task.color || '#ffeb3b',
                                            boxShadow: isBeingResized ? "0 20px 25px -5px rgba(0, 0, 0, 0.5)" : undefined,
                                            scale: isBeingResized ? 1.02 : 1
                                        }}
                                    >
                                        {/* Resize Handle - Top */}
                                        <div
                                            className="absolute top-0 left-0 right-0 h-[6px] cursor-ns-resize z-50 bg-transparent"
                                            onPointerDownCapture={(e) => handleResizeStart(e, task, 'top')}
                                        />

                                        {/* DELETE BUTTON (Liquid) */}
                                        <div className="absolute top-1 right-1 z-[60]">
                                            <LiquidDeleteBtn
                                                size={24}
                                                className="bg-black/5 text-black border-black/5"
                                                onDelete={() => onDeleteTask(task.id)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between pr-4 pointer-events-none">
                                            <div className="text-xs font-bold text-black/90 truncate">{task.title}</div>
                                            {task.reminder && task.reminder !== 'none' && (
                                                <Bell size={10} className="text-black/50 ml-1 shrink-0" fill="currentColor" />
                                            )}
                                        </div>
                                        {displayDuration >= 30 && (
                                            <div className="text-[10px] text-black/70 flex items-center gap-1 font-medium mt-0.5 pointer-events-none">
                                                <Clock size={10} />
                                                {formatTime12(displayStartTime)} - {formatTime12(new Date(new Date(`2000-01-01T${displayStartTime}`).getTime() + (displayDuration) * 60000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))}
                                            </div>
                                        )}

                                        {/* Bottom Resize Handle - 6px hit zone */}
                                        <div
                                            className="absolute bottom-0 left-0 right-0 h-[6px] cursor-ns-resize z-50 flex justify-center bg-transparent"
                                            onPointerDownCapture={(e) => handleResizeStart(e, task, 'bottom')}
                                        />
                                    </motion.div>
                                );
                            })}
                        </motion.div>
                    </AnimatePresence>

                    {/* SNAP GUIDE LINE */}
                    {dragPreview && (
                        <div className="absolute left-0 right-0 z-[60] pointer-events-none" style={{ top: dragPreview.top, transform: 'translateY(-50%)' }}>
                            {/* Text Label: Strictly confined to left, with Background Pill */}
                            <div className="absolute left-0 w-12 flex justify-end pr-2 -mt-2.5">
                                <span className="text-[10px] font-bold text-[#ffeb3b] font-mono bg-[#000000]/80 backdrop-blur-md px-1.5 py-0.5 rounded-sm shadow-sm border border-[#ffeb3b]/20">
                                    {formatTime12(dragPreview.timeStr)}
                                </span>
                            </div>
                            {/* Line: Starts at left-12 to match grid */}
                            <div className="absolute left-12 right-0 h-[1px] bg-[#ffeb3b] shadow-[0_0_6px_rgba(255,235,59,0.8)] opacity-80" />
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
                    if (editingItem?.id) handleRequestUpdate(data.id, data);
                    else onAddTask(data);
                    setIsEditorOpen(false);
                }}
                onDelete={onDeleteTask}
            />
        </div>
    );
};

export default CalendarPanel;