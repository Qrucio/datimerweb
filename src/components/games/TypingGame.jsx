import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { RotateCcw, Trophy } from 'lucide-react';
import CloseButton from '../ui/CloseButton';
import confetti from 'canvas-confetti';
import { TYPING_WORDS } from '../../utils/words'; // Adjust path if needed

const SKIP_CHAR = '§';

const TypingGame = ({ onExit, timeLeft: sessionTimeLeft }) => {
    // CONFIG STATE
    const [mode, setMode] = useState('words'); // 'words' | 'time'
    const [targetCount, setTargetCount] = useState(25); // 25, 50, 75, 100
    const [targetTime, setTargetTime] = useState(30); // 15, 25, 60

    // GAME STATE
    const [text, setText] = useState("");
    const [input, setInput] = useState("");
    const [startTime, setStartTime] = useState(null);
    const [wpm, setWpm] = useState(0);
    const [accuracy, setAccuracy] = useState(100);
    const [mistakes, setMistakes] = useState(0);
    const [gameState, setGameState] = useState("waiting"); // 'waiting' | 'playing' | 'finished'

    // PERSONAL BEST STATE
    const [personalBest, setPersonalBest] = useState(0);
    const [isNewPB, setIsNewPB] = useState(false);

    // TIME MODE STATE
    const [gameTimeLeft, setGameTimeLeft] = useState(targetTime);

    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const activeWordRef = useRef(null);
    const activeCharRef = useRef(null);
    const latestInputRef = useRef(input);

    // High-performance cursor state (bypasses React render cycle)
    const cursorTop = useMotionValue(0);
    const cursorLeft = useMotionValue(0);

    // "Buttery smooth" spring physics
    // Increased stiffness significantly to reduce lag on line jumps and fast typing
    const springConfig = { stiffness: 1000, damping: 40, mass: 1 };

    const smoothTop = useSpring(cursorTop, springConfig);
    const smoothLeft = useSpring(cursorLeft, springConfig);

    // Ref to hold latest state for callbacks
    const stateRef = useRef({ mistakes, startTime, personalBest, mode, targetTime });
    useEffect(() => {
        stateRef.current = { mistakes, startTime, personalBest, mode, targetTime };
    }, [mistakes, startTime, personalBest, mode, targetTime]);

    useEffect(() => {
        // Load Personal Best on mount
        const storedPB = localStorage.getItem('zenTimer_typing_pb');
        if (storedPB) {
            setPersonalBest(parseInt(storedPB, 10));
        }
    }, []);

    useEffect(() => {
        const focusInput = () => {
            if (gameState !== 'finished') inputRef.current?.focus();
        };
        window.addEventListener('click', focusInput);
        focusInput();
        return () => window.removeEventListener('click', focusInput);
    }, [gameState]);

    useEffect(() => { latestInputRef.current = input; }, [input]);

    // CSR Update Logic (Imperative Cursor Update)
    useLayoutEffect(() => {
        const updateCursorPosition = () => {
            if (activeCharRef.current && containerRef.current) {
                const charEl = activeCharRef.current;
                const containerEl = containerRef.current;

                // Get relative position within the scrolling container
                const charRect = charEl.getBoundingClientRect();
                const containerRect = containerEl.getBoundingClientRect();

                const relativeTop = charRect.top - containerRect.top + containerEl.scrollTop;
                const relativeLeft = charRect.left - containerRect.left + containerEl.scrollLeft;

                // Imperatively update motion values
                cursorTop.set(relativeTop);
                cursorLeft.set(relativeLeft);

                // Scroll logic
                const scrollTarget = relativeTop - (containerEl.clientHeight / 2) + (charEl.clientHeight / 2);
                // INSTANT scroll to prevent fighting with spring animation (Fixes jitter)
                containerEl.scrollTo({ top: scrollTarget });
            } else if (text.length > 0 && input.length === 0 && containerRef.current) {
                // Handle initial position if needed, though usually renderWordBlocks sets activeCharRef
            }
        };

        updateCursorPosition();

        window.addEventListener('resize', updateCursorPosition);
        return () => window.removeEventListener('resize', updateCursorPosition);

    }, [input, text, gameState, mode, cursorTop, cursorLeft]);

    const generateWords = useCallback((count) => Array.from({ length: count }, () => TYPING_WORDS[Math.floor(Math.random() * TYPING_WORDS.length)]).join(" "), []);

    const finishGame = useCallback((finalInputOverride) => {
        const { mistakes: currentMistakes, startTime: currentStartTime, personalBest: currentPB, mode: currentMode, targetTime: currentTargetTime } = stateRef.current;
        const finalInput = typeof finalInputOverride === 'string' ? finalInputOverride : latestInputRef.current;
        const endTime = Date.now();
        setGameState("finished");

        const durationMs = currentMode === 'time' ? currentTargetTime * 1000 : (endTime - currentStartTime);
        const timeInMinutes = Math.max(durationMs / 60000, 0.001);
        const grossWpm = (finalInput.length / 5) / timeInMinutes;
        const calculatedAcc = finalInput.length > 0 ? Math.max(0, ((finalInput.length - currentMistakes) / finalInput.length) * 100) : 100;

        const finalWpm = Math.round(grossWpm);
        const finalAcc = Math.round(calculatedAcc);

        setWpm(finalWpm);
        setAccuracy(finalAcc);

        if (finalWpm > currentPB) {
            setPersonalBest(finalWpm);
            setIsNewPB(true);
            localStorage.setItem('zenTimer_typing_pb', finalWpm.toString());

            const count = 200;
            const defaults = { origin: { y: 0.7 }, zIndex: 9999 };

            function fire(particleRatio, opts) {
                confetti({ ...defaults, ...opts, particleCount: Math.floor(count * particleRatio) });
            }

            fire(0.25, { spread: 26, startVelocity: 55 });
            fire(0.2, { spread: 60 });
            fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
            fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
            fire(0.1, { spread: 120, startVelocity: 45 });
        }
    }, []);

    const resetGame = useCallback(() => {
        const initialWords = generateWords(mode === 'words' ? targetCount : 50);
        setText(initialWords);
        setInput("");
        latestInputRef.current = "";
        setStartTime(null);
        setMistakes(0);
        setGameState("waiting");
        setGameTimeLeft(targetTime);
        setWpm(0);
        setAccuracy(100);
        setIsNewPB(false);
        if (containerRef.current) containerRef.current.scrollTop = 0;

        // Reset cursor to 0,0 implicitly via lack of activeChar, or force update after render
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [mode, targetCount, targetTime, generateWords]);

    useEffect(() => { resetGame(); }, [resetGame]);

    useEffect(() => {
        let interval;
        if (gameState === 'playing' && mode === 'time') {
            interval = setInterval(() => {
                setGameTimeLeft(prev => {
                    if (prev <= 1) { finishGame(latestInputRef.current); return 0; }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [gameState, mode, finishGame]);

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            e.stopPropagation();
            if (gameState === 'playing' || gameState === 'finished') {
                resetGame();
            } else {
                onExit();
            }
        }

        if (gameState === 'finished') return;

        // Spacebar Jump Logic
        if (e.key === ' ' && gameState === 'playing') {
            const currentLen = input.length;
            const expectedChar = text[currentLen];

            if (expectedChar !== ' ') {
                e.preventDefault();

                const nextSpaceIndex = text.indexOf(' ', currentLen);
                const endOfWordIndex = nextSpaceIndex === -1 ? text.length : nextSpaceIndex;

                const charsToSkip = endOfWordIndex - currentLen;
                if (charsToSkip > 0) {
                    const filler = SKIP_CHAR.repeat(charsToSkip) + " ";
                    const newInput = input + filler;

                    setInput(newInput);
                    setMistakes(prev => prev + charsToSkip);
                    return;
                }
            }
        }


        // Refined Ctrl + Backspace Logic
        if (gameState === 'playing' && e.key === 'Backspace') {
            if (e.ctrlKey) {
                e.preventDefault();
                setInput(prev => {
                    if (prev.length === 0) return prev;
                    const endsWithSpace = prev.endsWith(' ');
                    if (endsWithSpace) {
                        const trimmed = prev.slice(0, -1);
                        const lastSpace = trimmed.lastIndexOf(' ');
                        if (lastSpace === -1) return "";
                        return trimmed.substring(0, lastSpace + 1);
                    } else {
                        const lastSpaceIndex = prev.lastIndexOf(' ');
                        if (lastSpaceIndex === -1) return "";
                        return prev.substring(0, lastSpaceIndex + 1);
                    }
                });
            } else {
                // Standard Backspace with Skip Logic
                // If backspacing a space that follows a skipped word, delete the whole skip block ("Jump Back")
                if (input.endsWith(' ')) {
                    const trimmed = input.slice(0, -1);
                    const lastSpaceIndex = trimmed.lastIndexOf(' ');
                    const lastWord = trimmed.slice(lastSpaceIndex + 1);

                    if (lastWord.includes(SKIP_CHAR)) {
                        e.preventDefault();
                        const skipStartLocal = lastWord.indexOf(SKIP_CHAR);
                        const charsToDelete = lastWord.length - skipStartLocal;

                        const prefix = trimmed.slice(0, lastSpaceIndex + 1);
                        const validPart = lastWord.slice(0, skipStartLocal);

                        setInput(prefix + validPart);
                        // Correct mistakes count
                        setMistakes(prev => Math.max(0, prev - charsToDelete));
                    }
                }
            }
        }
    };

    const handleInputChange = (e) => {
        if (gameState === "finished") return;
        const val = e.target.value;
        const oldLength = input.length;
        const newLength = val.length;

        if (gameState === "waiting") { setGameState("playing"); setStartTime(Date.now()); }

        // Mistake tracking
        if (newLength > oldLength) {
            const addedSlice = val.slice(oldLength);
            for (let i = 0; i < addedSlice.length; i++) {
                const char = addedSlice[i];
                if (char === SKIP_CHAR) continue;

                const targetIndex = oldLength + i;
                const expected = text[targetIndex];
                if (char !== expected) {
                    setMistakes(prev => prev + 1);
                }
            }
        }

        setInput(val);

        if (mode === 'words' && val.length >= text.length) finishGame(val);
        if (mode === 'time') {
            if (text.length - val.length < 30) {
                setText(prev => prev + " " + generateWords(25));
            }
        }
    };

    const formatTime = (seconds) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m}:${s.toString().padStart(2, '0')}`; };

    const renderWordBlocks = () => {
        const words = text.split(" ");
        let charIndexCounter = 0;
        const inputLen = input.length;

        return words.map((word, wordIdx) => {
            const isLastWord = wordIdx === words.length - 1;
            const charsInWord = isLastWord ? word.split('') : [...word.split(''), ' '];
            const wordStartIndex = charIndexCounter;
            const wordEndIndex = wordStartIndex + charsInWord.length;
            const isCurrentWord = inputLen >= wordStartIndex && inputLen < wordEndIndex;

            const block = (
                <div key={wordIdx} className="inline-block whitespace-nowrap mr-3 mb-2">
                    {charsInWord.map((char, localIdx) => {
                        const globalIndex = wordStartIndex + localIdx;
                        const inputChar = input[globalIndex];
                        const hasBeenTyped = globalIndex < inputLen;
                        const isCurrent = globalIndex === inputLen;
                        const isSkipped = inputChar === SKIP_CHAR;
                        const isWrong = hasBeenTyped && !isSkipped && inputChar !== char;
                        const isCorrect = hasBeenTyped && !isSkipped && inputChar === char;

                        let styleClass = "relative inline-block whitespace-pre font-mono text-3xl md:text-4xl transition-colors duration-100 leading-relaxed ";
                        if (isWrong) { styleClass += "text-red-500 opacity-100"; }
                        else if (isCorrect) { styleClass += "text-white opacity-100"; }
                        else if (isSkipped) { styleClass += "text-white/20"; }
                        else { styleClass += "text-white/20"; }

                        return (
                            <span key={globalIndex} className={styleClass} ref={isCurrent ? activeCharRef : null}>
                                {char}
                            </span>
                        );
                    })}
                </div>
            );
            charIndexCounter += charsInWord.length;
            return block;
        });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex flex-col p-6 md:p-12 cursor-text overflow-hidden bg-[#111]" onClick={() => inputRef.current?.focus()}>
            <input ref={inputRef} type="text" value={input} onChange={handleInputChange} onKeyDown={handleKeyDown} className="absolute opacity-0 top-0 left-0 w-0 h-0" autoComplete="off" spellCheck="false" />

            <div className="relative z-50 w-full flex justify-center items-start shrink-0 h-20">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none">
                    <div className={`text-4xl md:text-5xl font-clock font-bold ${sessionTimeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                        {formatTime(sessionTimeLeft)}
                    </div>
                </div>
                <CloseButton onClick={(e) => { e.stopPropagation(); onExit(); }} className="absolute top-5 right-5 pointer-events-auto" />
            </div>

            {gameState !== "finished" ? (
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-screen-2xl mx-auto relative z-10 min-h-0">
                    <div className={`absolute top-0 left-1/2 -translate-x-1/2 mt-8 flex items-center gap-6 transition-all duration-500 z-[60] ${gameState === 'waiting' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
                        <div className="flex p-1 bg-white/5 rounded-full border border-white/10 relative">
                            {['words', 'time'].map(m => {
                                const isActive = mode === m;
                                return (
                                    <button key={m} onClick={(e) => { e.stopPropagation(); setMode(m); }} className={`relative px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors z-10 ${isActive ? 'text-black' : 'text-white/40 hover:text-white'}`}>
                                        {isActive && <motion.div layoutId="config-pill-bg" className="absolute inset-0 bg-white rounded-full shadow-lg z-[-1]" transition={{ type: "spring", stiffness: 500, damping: 30 }} />} {m}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="w-px h-6 bg-white/10"></div>
                        <div className="flex gap-1">
                            {mode === 'words' ? ([25, 50, 75, 100].map(count => (<button key={count} onClick={(e) => { e.stopPropagation(); setTargetCount(count); }} className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${targetCount === count ? 'text-cyan-400 bg-cyan-900/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}> {count} </button>))) : ([15, 25, 60].map(time => (<button key={time} onClick={(e) => { e.stopPropagation(); setTargetTime(time); }} className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all ${targetTime === time ? 'text-cyan-400 bg-cyan-900/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}> {time === 60 ? '1m' : `${time}s`} </button>)))}
                        </div>
                    </div>

                    <div className="mb-4 text-center h-8">
                        {mode === 'time' ? (<span className={`text-2xl md:text-3xl font-mono font-bold text-cyan-400 transition-opacity ${gameState === 'playing' ? 'opacity-100' : 'opacity-50'}`}> {formatTime(gameTimeLeft)} </span>) : (<span className="invisible text-2xl md:text-3xl font-mono font-bold">00:00</span>)}
                    </div>

                    <div ref={containerRef} className="w-full h-80 overflow-hidden relative text-left outline-none" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}>
                        {(gameState === 'waiting' || gameState === 'playing') && (
                            <motion.div
                                className="absolute bg-cyan-400 w-[2px] h-[36px] md:h-[44px] shadow-[0_0_15px_rgba(34,211,238,0.8)] z-20 pointer-events-none rounded-full"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{ top: smoothTop, left: smoothLeft }}
                            />
                        )}
                        <div className="px-4 md:px-12 pt-[100px] pb-[100px] text-left w-full"> {renderWordBlocks()} </div>
                    </div>

                    <div className="mt-8 text-center flex flex-col gap-2">
                        <span className={`text-white/30 text-xs font-bold uppercase tracking-widest transition-opacity duration-500 ${gameState === 'waiting' ? 'opacity-100' : 'opacity-0'}`}> Start typing to begin </span>
                        <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-mono uppercase tracking-widest"> <span>Press <span className="border border-white/20 px-1 rounded mx-0.5">Esc</span> to restart</span> </div>
                    </div>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center z-50 relative">
                    <h2 className="text-white font-serif-display text-4xl mb-12">Session Complete</h2>
                    <div className="flex gap-16 mb-12">
                        <div className="flex flex-col items-center group relative">
                            <span className={`text-8xl md:text-9xl font-clock font-bold transition-all cursor-default ${isNewPB ? 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]' : 'text-white'}`}>{wpm}</span>
                            <span className="text-white/40 text-sm uppercase tracking-[0.3em] font-bold mt-4">WPM</span>
                        </div>
                        <div className="w-px bg-white/10"></div>
                        <div className="flex flex-col items-center group">
                            <span className="text-8xl md:text-9xl font-clock font-bold text-white transition-all cursor-default">{accuracy}%</span>
                            <span className="text-white/40 text-sm uppercase tracking-[0.3em] font-bold mt-4">Accuracy</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-white/40 mb-12 bg-white/5 px-6 py-3 rounded-full border border-white/5">
                        <Trophy size={16} />
                        <span className="text-xs uppercase tracking-widest font-bold">Personal Best: <span className="text-white ml-2 text-base">{Math.max(personalBest, wpm)} WPM</span></span>
                    </div>

                    <div className="flex flex-col items-center gap-6">
                        <div className="flex gap-6">
                            <button onClick={(e) => { e.stopPropagation(); resetGame(); }} className="px-10 py-4 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-all flex items-center gap-3"> <RotateCcw size={18} strokeWidth={2.5} /> Restart </button>
                            <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="px-10 py-4 bg-transparent border border-white/20 text-white hover:bg-white hover:text-black font-bold uppercase tracking-widest rounded-full transition-all"> Close </button>
                        </div>
                        <div className="text-white/20 text-[10px] font-mono uppercase tracking-widest mt-2"> <span>Press <span className="border border-white/20 px-1 rounded mx-0.5">Esc</span> to restart</span> </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};
export default TypingGame;