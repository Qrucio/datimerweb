import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, BookOpen, BrainCircuit, CheckCircle2, ChevronRight, Target, Check } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import { examsData } from '../../data/syllabusData';
import { Storage } from '../../utils/storage';

// --- CONSTANTS ---
const CONFIDENCE_STATES = {
    0: { icon: Circle, color: 'text-white/30', bg: 'bg-white/5', label: 'Not Started', dot: 'bg-white/20' },
    1: { icon: BookOpen, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Learning', dot: 'bg-orange-400' },
    2: { icon: BrainCircuit, color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Practicing', dot: 'bg-yellow-400' },
    3: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10', label: 'Mastered', dot: 'bg-green-400' }
};

const LS_KEY_SELECTED_EXAMS = 'zen_syllabus_exams';

// --- EXAM SELECTION SCREEN (Onboarding) ---
const ExamSelectionScreen = ({ onConfirm }) => {
    const [selected, setSelected] = useState([]);

    const toggle = (id) => {
        setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            {/* Decorative Gradient Blobs */}
            <div className="absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-15%] left-[-10%] w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="relative z-10 max-w-lg w-full"
            >
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
                    <Target className="w-8 h-8 text-white/80" />
                </div>
                <h2 className="text-3xl font-serif-display text-white tracking-tight mb-2">What are you preparing for?</h2>
                <p className="text-white/40 text-sm mb-10">Select one or more exams. You can always change this later.</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
                    {examsData.map(exam => {
                        const isSelected = selected.includes(exam.id);
                        return (
                            <button
                                key={exam.id}
                                onClick={() => toggle(exam.id)}
                                className={`relative p-5 rounded-2xl border text-left transition-all duration-200 group ${
                                    isSelected
                                        ? 'bg-white/10 border-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]'
                                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`font-semibold text-base ${isSelected ? 'text-white' : 'text-white/70'}`}>{exam.name}</p>
                                        <p className="text-xs text-white/30 mt-1">{exam.subjects.length} subjects</p>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                        isSelected ? 'bg-white border-white' : 'border-white/20'
                                    }`}>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => { if (selected.length > 0) onConfirm(selected); }}
                    disabled={selected.length === 0}
                    className={`w-full py-3.5 rounded-full text-sm font-semibold transition-all duration-300 ${
                        selected.length > 0
                            ? 'bg-white text-black hover:bg-white/90 shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                            : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                    }`}
                >
                    {selected.length > 0 ? `Continue with ${selected.length} exam${selected.length > 1 ? 's' : ''}` : 'Select at least one exam'}
                </button>
            </motion.div>
        </div>
    );
};


// --- MAIN MODAL ---
const SyllabusTrackerModal = ({ isOpen, onClose }) => {
    const [userExams, setUserExams] = useState(() => {
        try { return JSON.parse(localStorage.getItem(LS_KEY_SELECTED_EXAMS)) || null; } catch { return null; }
    });
    const [selectedExamId, setSelectedExamId] = useState(null);
    const [selectedSubjectId, setSelectedSubjectId] = useState(null);
    const [progressData, setProgressData] = useState({});
    const [expandedChapters, setExpandedChapters] = useState({});

    // Load progress & set defaults when modal opens
    useEffect(() => {
        if (isOpen) {
            setProgressData(Storage.getSyllabusProgress());
            if (userExams && userExams.length > 0 && !selectedExamId) {
                setSelectedExamId(userExams[0]);
            }
        }
    }, [isOpen, userExams]);

    // Set default subject when exam changes
    useEffect(() => {
        if (selectedExamId) {
            const exam = examsData.find(e => e.id === selectedExamId);
            if (exam) setSelectedSubjectId(exam.subjects[0].id);
        }
    }, [selectedExamId]);

    if (!isOpen) return null;

    const handleExamSelection = (selectedIds) => {
        localStorage.setItem(LS_KEY_SELECTED_EXAMS, JSON.stringify(selectedIds));
        setUserExams(selectedIds);
        setSelectedExamId(selectedIds[0]);
    };

    const activeExams = userExams ? examsData.filter(e => userExams.includes(e.id)) : [];
    const currentExam = examsData.find(e => e.id === selectedExamId) || activeExams[0];
    const currentSubject = currentExam?.subjects.find(s => s.id === selectedSubjectId) || currentExam?.subjects[0];

    // Toggle chapter expansion
    const toggleChapter = (chapterId) => {
        setExpandedChapters(prev => ({ ...prev, [chapterId]: !prev[chapterId] }));
    };

    // Cycle topic confidence
    const handleTopicClick = (chapterId, topicIdx) => {
        const currentLevel = progressData?.[selectedExamId]?.[selectedSubjectId]?.[chapterId]?.[topicIdx] || 0;
        const nextLevel = (currentLevel + 1) % 4;
        const newData = Storage.updateSyllabusTopic(selectedExamId, selectedSubjectId, chapterId, topicIdx, nextLevel);
        setProgressData(newData);
    };

    // Progress Calculators
    const calculateSubjectProgress = (examId, subject) => {
        let totalTopics = 0;
        let totalScore = 0;
        subject.chapters.forEach(chap => {
            totalTopics += chap.topics.length;
            chap.topics.forEach((_, idx) => {
                totalScore += progressData?.[examId]?.[subject.id]?.[chap.id]?.[idx] || 0;
            });
        });
        if (totalTopics === 0) return 0;
        return Math.round((totalScore / (totalTopics * 3)) * 100);
    };

    const calculateChapterProgress = (chapter) => {
        let score = 0;
        chapter.topics.forEach((_, idx) => {
            score += progressData?.[selectedExamId]?.[currentSubject?.id]?.[chapter.id]?.[idx] || 0;
        });
        if (chapter.topics.length === 0) return 0;
        return Math.round((score / (chapter.topics.length * 3)) * 100);
    };

    const calculateOverallProgress = (examId) => {
        const exam = examsData.find(e => e.id === examId);
        if (!exam) return 0;
        let totalTopics = 0;
        let totalScore = 0;
        exam.subjects.forEach(sub => {
            sub.chapters.forEach(chap => {
                totalTopics += chap.topics.length;
                chap.topics.forEach((_, idx) => {
                    totalScore += progressData?.[examId]?.[sub.id]?.[chap.id]?.[idx] || 0;
                });
            });
        });
        if (totalTopics === 0) return 0;
        return Math.round((totalScore / (totalTopics * 3)) * 100);
    };

    const showOnboarding = !userExams || userExams.length === 0;
    const tabTransition = { enter: { duration: 0.25, ease: "easeOut" }, exit: { duration: 0.08, ease: "linear" } };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md md:p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 10 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="w-full h-full md:h-[700px] md:max-w-4xl md:max-h-[90vh] bg-[#0F0F0F] md:border border-white/10 md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden relative will-change-transform"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Decorative Ambient Glow */}
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

                    {showOnboarding ? (
                        <>
                            <div className="absolute top-6 right-6 z-20"><CloseButton onClick={onClose} /></div>
                            <ExamSelectionScreen onConfirm={handleExamSelection} />
                        </>
                    ) : (
                        <>
                            {/* --- TOP BAR: Header + Close --- */}
                            <div className="flex items-center justify-between p-6 md:p-8 pb-4 z-20 shrink-0 mt-8 md:mt-0">
                                <div>
                                    <h2 className="text-2xl md:text-3xl font-serif-display text-white tracking-tight">Syllabus Tracker</h2>
                                    <p className="text-white/40 text-xs md:text-sm mt-1 font-medium">Track your mastery, chapter by chapter.</p>
                                </div>
                                <CloseButton onClick={onClose} />
                            </div>

                            {/* --- TOP BAR: Exam Pills --- */}
                            {activeExams.length > 1 && (
                                <div className="px-6 md:px-8 mb-1 z-20 shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
                                    {activeExams.map(exam => {
                                        const isActive = selectedExamId === exam.id;
                                        const progress = calculateOverallProgress(exam.id);
                                        return (
                                            <button
                                                key={exam.id}
                                                onClick={() => setSelectedExamId(exam.id)}
                                                className={`relative px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-2 whitespace-nowrap z-0 ${
                                                    isActive ? 'text-black' : 'text-white/60 hover:text-white'
                                                }`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="examPillBg"
                                                        className="absolute inset-0 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.15)] z-[-1]"
                                                        transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                                    />
                                                )}
                                                <span>{exam.name}</span>
                                                <span className={`text-[10px] font-mono ${isActive ? 'text-black/50' : 'text-white/30'}`}>{progress}%</span>
                                            </button>
                                        );
                                    })}
                                    {/* Change Exams Button */}
                                    <button
                                        onClick={() => { setUserExams(null); localStorage.removeItem(LS_KEY_SELECTED_EXAMS); }}
                                        className="ml-auto px-3 py-1.5 rounded-full text-[10px] font-medium text-white/30 hover:text-white/60 hover:bg-white/5 border border-white/5 transition-all whitespace-nowrap"
                                    >
                                        Edit Goals
                                    </button>
                                </div>
                            )}

                            {/* --- TOP BAR: Subject Tabs --- */}
                            {currentExam && (
                                <div className="px-6 md:px-8 mb-2 z-20 shrink-0 overflow-x-auto no-scrollbar flex items-center">
                                    <div className="inline-flex p-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-xl whitespace-nowrap">
                                        {currentExam.subjects.map(subject => {
                                            const isActive = selectedSubjectId === subject.id;
                                            const progress = calculateSubjectProgress(currentExam.id, subject);
                                            return (
                                                <button
                                                    key={subject.id}
                                                    onClick={() => setSelectedSubjectId(subject.id)}
                                                    className={`relative px-3 md:px-5 py-2 rounded-full text-xs md:text-sm font-medium transition-all duration-200 flex items-center gap-2 z-0 ${
                                                        isActive ? 'text-black' : 'text-white/60 hover:text-white'
                                                    }`}
                                                >
                                                    {isActive && (
                                                        <motion.div
                                                            layoutId="subjectTabBg"
                                                            className="absolute inset-0 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.3)] z-[-1]"
                                                            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                                                        />
                                                    )}
                                                    <span>{subject.name}</span>
                                                    <span className={`text-[10px] font-mono ${isActive ? 'text-black/50' : 'text-white/30'}`}>{progress}%</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {/* Legend — now placed outside the pill strip, safe from close button */}
                                    <div className="hidden lg:flex items-center gap-3 ml-auto pl-4">
                                        {Object.values(CONFIDENCE_STATES).map((state, i) => (
                                            <div key={i} className="flex items-center gap-1.5">
                                                <div className={`w-2 h-2 rounded-full ${state.dot}`} />
                                                <span className="text-[10px] text-white/40">{state.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* --- MAIN CONTENT: Chapters & Topics --- */}
                            <div className="flex-1 overflow-hidden relative z-10">
                                <AnimatePresence mode="wait">
                                    {currentSubject && (
                                        <motion.div
                                            key={`${selectedExamId}-${selectedSubjectId}`}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0, transition: tabTransition.enter }}
                                            exit={{ opacity: 0, x: -10, transition: tabTransition.exit }}
                                            className="h-full overflow-y-auto custom-scrollbar px-6 md:px-10 pt-4 pb-32"
                                        >
                                            <div className="max-w-3xl mx-auto space-y-3">
                                                {currentSubject.chapters.map(chapter => {
                                                    const isExpanded = expandedChapters[chapter.id];
                                                    const chapterProgress = calculateChapterProgress(chapter);

                                                    return (
                                                        <div
                                                            key={chapter.id}
                                                            className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden transition-colors hover:border-white/10"
                                                        >
                                                            {/* Chapter Header */}
                                                            <button
                                                                onClick={() => toggleChapter(chapter.id)}
                                                                className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <motion.div
                                                                        animate={{ rotate: isExpanded ? 90 : 0 }}
                                                                        transition={{ duration: 0.2 }}
                                                                    >
                                                                        <ChevronRight className="w-4 h-4 text-white/30" />
                                                                    </motion.div>
                                                                    <span className="font-medium text-sm text-white/90 text-left">{chapter.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-3">
                                                                    {/* Mini progress dots */}
                                                                    <div className="hidden sm:flex items-center gap-1">
                                                                        {chapter.topics.map((_, idx) => {
                                                                            const level = progressData?.[selectedExamId]?.[currentSubject.id]?.[chapter.id]?.[idx] || 0;
                                                                            return <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-colors ${CONFIDENCE_STATES[level].dot}`} />;
                                                                        })}
                                                                    </div>
                                                                    <span className={`text-xs font-mono tabular-nums ${chapterProgress === 100 ? 'text-green-400' : 'text-white/30'}`}>
                                                                        {chapterProgress}%
                                                                    </span>
                                                                </div>
                                                            </button>

                                                            {/* Topics List */}
                                                            <AnimatePresence initial={false}>
                                                                {isExpanded && (
                                                                    <motion.div
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: 'auto', opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
                                                                        className="border-t border-white/5 overflow-hidden"
                                                                    >
                                                                        <div className="px-5 py-3 flex flex-col gap-0.5">
                                                                            {chapter.topics.map((topic, idx) => {
                                                                                const level = progressData?.[selectedExamId]?.[currentSubject.id]?.[chapter.id]?.[idx] || 0;
                                                                                const state = CONFIDENCE_STATES[level];
                                                                                const StateIcon = state.icon;

                                                                                return (
                                                                                    <button
                                                                                        key={idx}
                                                                                        onClick={() => handleTopicClick(chapter.id, idx)}
                                                                                        className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-white/[0.04] transition-colors group text-left"
                                                                                    >
                                                                                        <div className="flex items-center gap-3 min-w-0">
                                                                                            <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors ${state.bg}`}>
                                                                                                <StateIcon className={`w-3 h-3 transition-colors ${state.color}`} />
                                                                                            </div>
                                                                                            <span className={`text-sm truncate transition-colors ${level === 3 ? 'text-white/35 line-through decoration-white/20' : 'text-white/70 group-hover:text-white/90'}`}>
                                                                                                {topic}
                                                                                            </span>
                                                                                        </div>
                                                                                        <span className={`text-[10px] ml-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${state.color}`}>
                                                                                            {state.label}
                                                                                        </span>
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </motion.div>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Single-exam "Edit Goals" fallback */}
                            {activeExams.length <= 1 && (
                                <div className="absolute bottom-6 right-6 z-20">
                                    <button
                                        onClick={() => { setUserExams(null); localStorage.removeItem(LS_KEY_SELECTED_EXAMS); }}
                                        className="px-3 py-1.5 rounded-full text-[10px] font-medium text-white/30 hover:text-white/60 hover:bg-white/5 border border-white/5 transition-all"
                                    >
                                        Edit Goals
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default SyllabusTrackerModal;
