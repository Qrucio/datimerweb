import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// --- HELPER HOOK (Moved here) ---
function useInterval(callback, delay) {
    const savedCallback = useRef();
    useEffect(() => { savedCallback.current = callback; }, [callback]);
    useEffect(() => {
        if (delay !== null) {
            const id = setInterval(() => savedCallback.current(), delay);
            return () => clearInterval(id);
        }
    }, [delay]);
}

// --- SHARED ICON (Exported so App.jsx can use it in the menu) ---
export const SnakeIcon = ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M21 7H17V11H13V15H9V19H3V15H7V11H11V7H15V3H21V7Z" fill="currentColor" />
        <circle cx="18.5" cy="5.5" r="1.5" fill="black" fillOpacity="0.5" />
    </svg>
);

const SnakeGame = ({ onExit, timeLeft }) => {
    const GRID_SIZE = 20;
    const [snake, setSnake] = useState([{ x: 10, y: 10 }]);
    const [food, setFood] = useState({ x: 15, y: 5 });
    const [direction, setDirection] = useState({ x: 0, y: -1 });
    const [gameOver, setGameOver] = useState(false);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(() => parseInt(localStorage.getItem('zen_snake_highscore') || '0'));
    const [isPaused, setIsPaused] = useState(false);
    const gameBoardRef = useRef(null);

    // Controls (WASD + Arrow Keys)
    const handleInput = useCallback((e) => {
        e.stopPropagation(); // Stop global shortcuts
        if (gameOver) return;

        const key = e.key.toLowerCase();
        setDirection(prev => {
            // Prevent 180 degree turns
            if ((key === 'arrowup' || key === 'w') && prev.y === 1) return prev;
            if ((key === 'arrowdown' || key === 's') && prev.y === -1) return prev;
            if ((key === 'arrowleft' || key === 'a') && prev.x === 1) return prev;
            if ((key === 'arrowright' || key === 'd') && prev.x === -1) return prev;

            if (key === 'arrowup' || key === 'w') return { x: 0, y: -1 };
            if (key === 'arrowdown' || key === 's') return { x: 0, y: 1 };
            if (key === 'arrowleft' || key === 'a') return { x: -1, y: 0 };
            if (key === 'arrowright' || key === 'd') return { x: 1, y: 0 };
            return prev;
        });
    }, [gameOver]);

    useEffect(() => {
        const handleKeyDown = (e) => handleInput(e);
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleInput]);

    useInterval(() => {
        if (gameOver || isPaused) return;

        setSnake(prevSnake => {
            const newHead = { x: prevSnake[0].x + direction.x, y: prevSnake[0].y + direction.y };

            // Wall Wrap
            if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
                setGameOver(true);
                return prevSnake;
            }
            // Self Collision
            if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
                setGameOver(true);
                return prevSnake;
            }

            const newSnake = [newHead, ...prevSnake];

            if (newHead.x === food.x && newHead.y === food.y) {
                setScore(s => {
                    const newScore = s + 10;
                    if (newScore > highScore) {
                        setHighScore(newScore);
                        localStorage.setItem('zen_snake_highscore', newScore);
                    }
                    return newScore;
                });
                let newFood;
                do {
                    newFood = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
                } while (newSnake.some(s => s.x === newFood.x && s.y === newFood.y));
                setFood(newFood);
            } else {
                newSnake.pop();
            }
            return newSnake;
        });
    }, 120);

    const resetGame = () => {
        setSnake([{ x: 10, y: 10 }]);
        setFood({ x: 15, y: 5 });
        setDirection({ x: 0, y: -1 });
        setGameOver(false);
        setScore(0);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div id="snake-game-container" className="flex flex-col items-center justify-center w-full h-full relative bg-[#111] overflow-hidden p-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-20 pointer-events-none">
                <div className="flex flex-col items-start gap-1">
                    <div className="flex items-baseline gap-2"> <span className="text-xs font-bold text-white/40 tracking-widest uppercase">Score</span> <span className="text-2xl font-mono text-white font-bold">{score}</span> </div>
                    <div className="flex items-baseline gap-2"> <span className="text-[10px] font-bold text-white/30 tracking-widest uppercase">Best</span> <span className="text-sm font-mono text-yellow-500">{highScore}</span> </div>
                </div>
                <button onClick={onExit} className="pointer-events-auto p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-all group"> <X size={24} className="group-hover:rotate-90 transition-transform duration-300" /> </button>
            </div>

            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center pointer-events-none">
                <div className={`text-6xl md:text-7xl font-clock font-bold tracking-tight drop-shadow-2xl transition-colors ${timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-white/90'}`}> {formatTime(timeLeft)} </div>
                <span className="text-xs font-bold text-white/30 uppercase tracking-[0.2em] mt-2">Break Time</span>
            </div>

            <div className="relative z-10 mt-24 flex-shrink-0 w-full max-w-[500px] aspect-square max-h-[55vh] flex items-center justify-center">
                <div ref={gameBoardRef} className="w-full h-full bg-[#0a0a0a] border border-white/10 rounded-xl shadow-2xl overflow-hidden relative grid" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}>
                    {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                        const x = i % GRID_SIZE;
                        const y = Math.floor(i / GRID_SIZE);
                        const isSnake = snake.some(s => s.x === x && s.y === y);
                        const isHead = snake[0].x === x && snake[0].y === y;
                        const isFood = food.x === x && food.y === y;
                        return (
                            <div key={i} className="w-full h-full relative border-[0.5px] border-white/[0.02]">
                                {isSnake && <div className={`absolute inset-[1px] rounded-sm ${isHead ? 'bg-white z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.3)]'}`} />}
                                {isFood && <motion.div layoutId="food" className="absolute inset-[2px] rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />}
                            </div>
                        )
                    })}
                    <AnimatePresence>
                        {gameOver && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-6 text-center">
                                <h3 className="text-3xl md:text-4xl font-serif-display text-white mb-2">Game Over</h3>
                                <div className="text-white/50 mb-8 font-mono">Final Score: <span className="text-white font-bold">{score}</span></div>
                                <div className="flex flex-col gap-3 w-full max-w-[200px]">
                                    <button onClick={resetGame} className="w-full py-3 bg-white text-black font-bold text-sm uppercase tracking-widest rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"> Play Again </button>
                                    <button onClick={onExit} className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-bold text-xs uppercase tracking-widest rounded-full transition-colors"> Exit Arcade </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            <div className="mt-6 flex items-center gap-6 text-white/20 text-[10px] font-mono uppercase tracking-widest flex-shrink-0">
                <span className="flex items-center gap-1"><span className="border border-white/20 px-1 rounded">WASD</span> to Move</span>
                <span className="flex items-center gap-1"><span className="border border-white/20 px-1 rounded">Arrows</span> to Move</span>
            </div>
        </div>
    );
};
export default SnakeGame;