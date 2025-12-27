import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Digit Component: Handles the animation of a single character
const Digit = ({ value, animated = true, clockType }) => {
    if (!animated) {
        return <span className="inline-block">{value}</span>;
    }

    return (
        <div className="relative inline-block">
            {/* 
        Phantom Element: 
        Maintains the width/height of the container based on the current character.
        "tabular-nums" ensures monospaced numbers if the font supports it, reducing width jumping.
        opacity-0 makes it invisible but it still takes up space.
      */}
            {/* 
        Phantom Element: 
        Maintains the width/height of the container based on the widest character ('0').
        This enforces a fixed width (like tabular-nums) even for variable width fonts,
        preventing separate digits from shifting the layout.
      */}
            <span className="opacity-0">0</span>

            {/* 
        Animation Container:
        Positioned absolute to overlay the phantom element.
        overflow-hidden ensures digits slide in/out within the bounds.
      */}
            <div className={`absolute inset-0 overflow-hidden flex items-center justify-center ${clockType === 'serif' ? 'pb-[0.15em]' : ''}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                        key={value}
                        initial={{ y: '-100%', filter: 'blur(5px)', opacity: 0 }}
                        animate={{ y: '0%', filter: 'blur(0px)', opacity: 1 }}
                        exit={{ y: '100%', filter: 'blur(5px)', opacity: 0 }}
                        transition={{
                            duration: 0.5,
                            ease: [0.34, 1.56, 0.64, 1] // Spring-ish bezier
                        }}
                        className="block"
                    >
                        {value}
                    </motion.span>
                </AnimatePresence>
            </div>
        </div>
    );
};

const Separator = ({ value }) => {
    return (
        <span className="inline-block">{value}</span>
    )
}

const CountdownTimer = ({ timeLeft, disableAnimation = false, clockType }) => {
    // Format MM:SS
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    const minStr = minutes.toString().padStart(2, '0');
    const secStr = seconds.toString().padStart(2, '0');

    const timeString = `${minStr}:${secStr}`;
    const chars = timeString.split('');

    return (
        <div className="flex items-center justify-center tabular-nums">
            {chars.map((char, index) => {
                if (char === ':') {
                    return <Separator key={`sep-${index}`} value=":" />;
                }
                // KEY FIX: Use 'index' as key so the component doesn't unmount, allowing AnimatePresence to work
                return (
                    <Digit key={index} value={char} animated={!disableAnimation} clockType={clockType} />
                );
            })}
        </div>
    );
};

export default CountdownTimer;
