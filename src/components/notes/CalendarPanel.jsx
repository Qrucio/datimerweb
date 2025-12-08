import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ChevronLeft, ChevronRight, Clock, Bell, Trash2 } from 'lucide-react'; // Added Trash2
import SmartNoteEditor from './SmartNoteEditor';
import CloseButton from '../ui/CloseButton';


const HOURS = Array.from({ length: 24 }, (_, i) => i);
const GRID_HEIGHT_PER_HOUR = 60;

const CalendarPanel = ({ tasks, notes, allTags, onAddTask, onUpdateTask, onDeleteTask, onClose }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    const [editingItem, setEditingItem] = useState(null);
    const [dragPreview, setDragPreview] = useState(null); // { top: number, timeStr: string }
    const containerRef = React.useRef(null);
    const scrollContainerRef = React.useRef(null);
    const isDragging = React.useRef(false);

    const dateKey = selectedDate.toISOString().split('T')[0];
    const todayKey = new Date().toISOString().split('T')[0];
    const isToday = dateKey === todayKey;

    const todaysTasks = useMemo(() => {
        return tasks.filter(t => t.date === dateKey || (!t.date && isToday));
    }, [tasks, dateKey, isToday]);

    const { timedTasks } = useMemo(() => {
        const timed = [];
        const allDay = [];
        todaysTasks.forEach(t => {
            if (t.startTime) timed.push(t);
            else allDay.push(t);
        });
        return { timedTasks: timed, allDayTasks: allDay };
    }, [todaysTasks]);

    const getTopOffset = (timeStr) => {
        if (!timeStr) return 0;
        const [h, m] = timeStr.split(':').map(Number);
        return (h * GRID_HEIGHT_PER_HOUR) + ((m / 60) * GRID_HEIGHT_PER_HOUR);
    };

    const getHeight = (durationMin) => {
        return (durationMin / 60) * GRID_HEIGHT_PER_HOUR;
    };

    const handleSave = (data) => {
        if (editingItem && editingItem.id) {
            onUpdateTask(data.id, data);
        } else {
            onAddTask(data);
        }
    };

    const handleDelete = (id) => {
        onDeleteTask(id);
        setIsEditorOpen(false); // Close editor after delete
    };

    const calculateSnap = (task, offsetY) => {
        const [h, m] = task.startTime.split(':').map(Number);
        const currentMinutes = h * 60 + m;
        const minutesMoved = offsetY; // 1px = 1min
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

    const handleDrag = (task, info) => {
        const snap = calculateSnap(task, info.offset.y);
        setDragPreview({
            top: snap.top,
            timeStr: snap.timeStr
        });
    };

    const handleDragStart = () => {
        isDragging.current = true;
    };

    const handleDragEnd = (task, info) => {
        const snap = calculateSnap(task, info.offset.y);
        setDragPreview(null);

        // Small delay to prevent click from firing immediately after drag
        setTimeout(() => {
            isDragging.current = false;
        }, 100);

        if (snap.timeStr !== task.startTime) {
            onUpdateTask(task.id, { startTime: snap.timeStr });
        }
    };

    const openNew = (time) => {
        setEditingItem({
            date: dateKey,
            startTime: time || '',
        });
        setIsEditorOpen(true);
    };

    const openEdit = (item) => {
        if (isDragging.current) return;
        setEditingItem(item);
        setIsEditorOpen(true);
    };

    const handlePrevDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() - 1);
        setSelectedDate(d);
    };

    const handleNextDay = () => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + 1);
        setSelectedDate(d);
    };

    // Scroll to current time on initial load if today
    React.useEffect(() => {
        if (isToday && scrollContainerRef.current) {
            // Short delay to ensure layout is ready
            const timer = setTimeout(() => {
                if (!scrollContainerRef.current) return;

                const now = new Date();
                const minutes = now.getHours() * 60 + now.getMinutes();
                const timeTop = (minutes / 60) * GRID_HEIGHT_PER_HOUR;
                const containerHeight = scrollContainerRef.current.clientHeight;

                // Center the time
                const scrollTarget = Math.max(0, timeTop - (containerHeight / 2));

                scrollContainerRef.current.scrollTo({
                    top: scrollTarget,
                    behavior: 'smooth'
                });
            }, 300);

            return () => clearTimeout(timer);
        }
    }, [isToday, dateKey]); // Added dateKey dependency to re-trigger on date change

    return (
        <div className="h-full flex flex-col bg-transparent relative overflow-hidden select-none" onClick={(e) => e.stopPropagation()}>



            <div className="flex items-center justify-between px-6 py-6 border-b border-white/5 bg-white/5 flex-shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-black/20 rounded-lg p-1 border border-white/5">
                        <button onClick={handlePrevDay} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"><ChevronLeft size={16} /></button>
                        <button onClick={() => setSelectedDate(new Date())} className={`px-3 py-0.5 text-xs font-bold uppercase tracking-wide rounded transition-colors ${isToday ? 'bg-white text-black' : 'text-white/50 hover:bg-white/10 hover:text-white'}`}>Today</button>
                        <button onClick={handleNextDay} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white transition-colors"><ChevronRight size={16} /></button>
                    </div>
                    <h2 className="text-lg font-bold text-white tracking-wide min-w-[140px]">
                        {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                    </h2>
                </div>
                <CloseButton onClick={onClose} />
            </div>

            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={dateKey}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="relative"
                    >
                        <div ref={containerRef} className="relative mt-2" style={{ height: HOURS.length * GRID_HEIGHT_PER_HOUR }}>
                            {HOURS.map(hour => (
                                <div key={hour} className="absolute left-0 right-0 border-t border-white/5 flex group pointer-events-none" style={{ top: hour * GRID_HEIGHT_PER_HOUR, height: GRID_HEIGHT_PER_HOUR }}>
                                    <div className="w-12 text-[10px] text-white/30 text-right pr-2 -mt-1.5 group-hover:text-white/50 font-mono">{hour}:00</div>
                                    <div className="flex-1 pointer-events-auto hover:bg-white/[0.02] cursor-pointer border-l border-white/5" onClick={() => openNew(`${hour.toString().padStart(2, '0')}:00`)} />
                                </div>
                            ))}

                            {isToday && (
                                <div className="absolute left-12 right-0 border-t border-red-500 z-10 pointer-events-none" style={{ top: getTopOffset(`${new Date().getHours()}:${new Date().getMinutes()}`) }}>
                                    <div className="absolute -left-1.5 -top-1 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                                </div>
                            )}

                            {/* SNAP GUIDE LINE */}
                            {dragPreview && (
                                <div className="absolute left-0 right-0 border-t-2 border-white z-50 pointer-events-none flex items-center" style={{ top: dragPreview.top }}>
                                    <div className="absolute left-0 bg-white text-black text-[10px] font-bold px-1 rounded-r shadow-lg -mt-3">
                                        {dragPreview.timeStr}
                                    </div>
                                    <div className="w-full h-[1px] bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                                </div>
                            )}

                            {timedTasks.map(task => (
                                <motion.div
                                    key={task.id}
                                    layoutId={task.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={(e) => { e.stopPropagation(); openEdit(task); }}
                                    drag="y"
                                    dragConstraints={containerRef}
                                    dragElastic={0}
                                    dragMomentum={false}
                                    onDragStart={handleDragStart}
                                    onDrag={(e, info) => handleDrag(task, info)}
                                    onDragEnd={(e, info) => handleDragEnd(task, info)}
                                    whileDrag={{ zIndex: 50, scale: 1.02, cursor: 'grabbing', boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}
                                    className="absolute left-14 right-4 rounded-lg border border-black/10 p-2 cursor-grab active:cursor-grabbing overflow-hidden hover:brightness-110 hover:z-20 transition-all shadow-lg group"
                                    style={{
                                        top: getTopOffset(task.startTime),
                                        height: Math.max(getHeight(task.duration || 60), 32),
                                        backgroundColor: task.color || '#ffeb3b',
                                        zIndex: 1
                                    }}
                                >
                                    {/* DELETE BUTTON (VISIBLE ON HOVER) */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteTask(task.id);
                                        }}
                                        className="absolute top-1 right-1 p-1 text-black/40 hover:text-red-600 hover:bg-white/50 rounded-md opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="Delete"
                                    >
                                        <Trash2 size={12} />
                                    </button>

                                    <div className="flex items-center justify-between pr-4"> {/* Added padding for delete button space */}
                                        <div className="text-xs font-bold text-black/90 truncate">{task.title}</div>
                                        {task.reminder && task.reminder !== 'none' && (
                                            <Bell size={10} className="text-black/50 ml-1 shrink-0" fill="currentColor" />
                                        )}
                                    </div>
                                    <div className="text-[10px] text-black/70 flex items-center gap-1 font-medium mt-0.5">
                                        <Clock size={10} />
                                        {task.startTime} - {new Date(new Date(`2000-01-01T${task.startTime}`).getTime() + (task.duration || 60) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </div>
                                    {task.linkedNoteId && (
                                        <div className="absolute bottom-1.5 right-1.5 opacity-60 group-hover:opacity-100 bg-black/20 p-0.5 rounded-full"><div className="w-1.5 h-1.5 bg-black rounded-full" /></div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
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
                onSave={handleSave}
                onDelete={handleDelete} // Passes the logic down
            />
        </div>
    );
};

export default CalendarPanel;