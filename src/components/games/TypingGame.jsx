import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { TYPING_WORDS } from '../../utils/words'; // Adjust path if needed

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

    // TIME MODE STATE
    const [gameTimeLeft, setGameTimeLeft] = useState(targetTime);

    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const activeWordRef = useRef(null);
    const latestInputRef = useRef(input);

    useEffect(() => { const focusInput = () => { if (gameState !== 'finished') inputRef.current?.focus(); }; window.addEventListener('click', focusInput); focusInput(); return () => window.removeEventListener('click', focusInput); }, [gameState]);
    useEffect(() => { latestInputRef.current = input; }, [input]);

    // Game Timer (Time Mode Only)
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
    }, [gameState, mode]);

    useEffect(() => { resetGame(); }, [mode, targetCount, targetTime]);

    const generateWords = (count) => Array.from({ length: count }, () => TYPING_WORDS[Math.floor(Math.random() * TYPING_WORDS.length)]).join(" ");

    const resetGame = () => {
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
        if (containerRef.current) containerRef.current.scrollTop = 0;
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); if (gameState === 'playing' || gameState === 'finished') { resetGame(); } else { onExit(); } }
        if (gameState === 'playing' && e.ctrlKey && e.key === 'Backspace') {
            e.preventDefault();
            setInput(prev => {
                if (prev.length === 0) return prev;
                if (prev.endsWith(' ')) return prev.slice(0, -1);
                const lastSpaceIndex = prev.lastIndexOf(' ');
                if (lastSpaceIndex === -1) return "";
                return prev.substring(0, lastSpaceIndex + 1);
            });
        }
    };

    const handleInputChange = (e) => {
        if (gameState === "finished") return;
        const val = e.target.value;
        const oldLength = input.length;
        const newLength = val.length;

        if (gameState === "waiting") { setGameState("playing"); setStartTime(Date.now()); }
        if (newLength > oldLength) { const charTyped = val.slice(-1); const charExpected = text[newLength - 1]; if (charTyped !== charExpected) { setMistakes(prev => prev + 1); } }
        setInput(val);

        if (mode === 'words' && val.length === text.length) finishGame(val);
        if (mode === 'time') { if (text.length - val.length < 30) { setText(prev => prev + " " + generateWords(25)); } }

        requestAnimationFrame(() => {
            if (activeWordRef.current && containerRef.current) {
                const container = containerRef.current;
                const activeEl = activeWordRef.current;
                const activeTop = activeEl.offsetTop;
                const containerHeight = container.clientHeight;
                const scrollTarget = activeTop - (containerHeight / 2) + (activeEl.clientHeight / 2);
                container.scrollTo({ top: scrollTarget, behavior: 'smooth' });
            }
        });
    };

    const finishGame = (finalInputOverride) => {
        const finalInput = typeof finalInputOverride === 'string' ? finalInputOverride : input;
        const endTime = Date.now();
        setGameState("finished");
        const durationMs = mode === 'time' ? targetTime * 1000 : (endTime - startTime);
        const timeInMinutes = Math.max(durationMs / 60000, 0.001);
        const grossWpm = (finalInput.length / 5) / timeInMinutes;
        const calculatedAcc = finalInput.length > 0 ? Math.max(0, ((finalInput.length - mistakes) / finalInput.length) * 100) : 100;
        setWpm(Math.round(grossWpm));
        setAccuracy(Math.round(calculatedAcc));
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
            const refProp = isCurrentWord ? { ref: activeWordRef } : {};
            const block = (
                <div key={wordIdx} className="inline-block whitespace-nowrap mr-3 mb-2" {...refProp}>
                    {charsInWord.map((char, localIdx) => {
                        const globalIndex = wordStartIndex + localIdx;
                        const inputChar = input[globalIndex];
                        const hasBeenTyped = globalIndex < inputLen;
                        const isCurrent = globalIndex === inputLen;
                        const isWrong = hasBeenTyped && inputChar !== char;
                        const isCorrect = hasBeenTyped && inputChar === char;
                        let styleClass = "relative inline-block whitespace-pre font-mono text-3xl md:text-4xl transition-colors duration-100 leading-relaxed ";
                        if (isWrong) { styleClass += "text-red-500 opacity-100"; } else if (isCorrect) { styleClass += "text-white opacity-100"; } else { styleClass += "text-white/20"; }
                        return (
                            <span key={globalIndex} className={styleClass}>
                                {isCurrent && (<motion.span layoutId="typing-cursor" className="absolute inset-y-0 left-0 w-[2px] bg-cyan-400 cursor-blink shadow-[0_0_10px_rgba(34,211,238,0.8)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.1 }} />)}
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
                <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"> <div className={`text-4xl md:text-5xl font-clock font-bold ${sessionTimeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white'}`}> {formatTime(sessionTimeLeft)} </div> </div>
                <button onClick={(e) => { e.stopPropagation(); onExit(); }} className="absolute top-0 right-0 pointer-events-auto p-3 rounded-full text-white/30 hover:text-white hover:bg-white/10 transition-colors"> <X size={32} /> </button>
            </div>

            {gameState !== "finished" ? (
                <div className="flex-1 flex flex-col items-center justify-center w-full max-w-7xl mx-auto relative z-10 min-h-0">
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
                    <div className="mb-4 text-center h-8"> {mode === 'time' ? (<span className={`text-2xl md:text-3xl font-mono font-bold text-cyan-400 transition-opacity ${gameState === 'playing' ? 'opacity-100' : 'opacity-50'}`}> {formatTime(gameTimeLeft)} </span>) : (<span className="invisible text-2xl md:text-3xl font-mono font-bold">00:00</span>)} </div>
                    <div ref={containerRef} className="w-full h-40 overflow-hidden relative text-left" style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 20%, black 80%, transparent 100%)' }}> <div className="px-4 md:px-12 pt-[60px] pb-[60px] text-left"> {renderWordBlocks()} </div> </div>
                    <div className="mt-8 text-center flex flex-col gap-2"> <span className={`text-white/30 text-xs font-bold uppercase tracking-widest transition-opacity duration-500 ${gameState === 'waiting' ? 'opacity-100' : 'opacity-0'}`}> Start typing to begin </span> <div className="flex items-center justify-center gap-2 text-white/20 text-[10px] font-mono uppercase tracking-widest"> <span>Press <span className="border border-white/20 px-1 rounded mx-0.5">Esc</span> to restart</span> </div> </div>
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center z-50 relative">
                    <h2 className="text-white font-serif-display text-4xl mb-12">Session Complete</h2>
                    <div className="flex gap-16 mb-16">
                        <div className="flex flex-col items-center group"> <span className="text-8xl md:text-9xl font-clock font-bold text-white transition-all cursor-default">{wpm}</span> <span className="text-white/40 text-sm uppercase tracking-[0.3em] font-bold mt-4">WPM</span> </div>
                        <div className="w-px bg-white/10"></div>
                        <div className="flex flex-col items-center group"> <span className="text-8xl md:text-9xl font-clock font-bold text-white transition-all cursor-default">{accuracy}%</span> <span className="text-white/40 text-sm uppercase tracking-[0.3em] font-bold mt-4">Accuracy</span> </div>
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