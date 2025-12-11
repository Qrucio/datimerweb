import React from 'react';
import { motion } from 'framer-motion';

const ForestVisual = ({ progress }) => {
    // progress: 0 to 1 (0 = start, 1 = end)
    // We want the tree to grow as progress increases.
    // Actually, usually progress goes from 0 (start) to 100% (end) or timeLeft goes down.
    // We'll assume progress is 0 (just started) -> 1 (finished).

    // Simple stick figure tree for MVP, or a Bezier curve branch.
    // Let's do a growing vine/branch style.

    return (
        <div className="absolute inset-0 z-0 flex items-end justify-center pointer-events-none overflow-hidden">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f1c15] via-[#1a2e22] to-[#000000] opacity-80" />

            {/* Growing Branch */}
            <svg width="400" height="600" viewBox="0 0 400 600" className="opacity-80 mix-blend-screen">
                <motion.path
                    // A winding path representing a branch
                    d="M 200 600 Q 200 400 200 300 C 200 200 250 150 280 100"
                    fill="none"
                    stroke="#4ade80" // Green-400
                    strokeWidth="4"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: progress }}
                    transition={{ duration: 1, ease: "linear" }}
                />

                {/* Branch 2 (Left) - starts appearing at 30% progress */}
                <motion.path
                    d="M 200 300 Q 150 250 120 200"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: Math.max(0, (progress - 0.3) * 1.43) }} // 0 to 1 from 0.3 to 1.0
                    transition={{ duration: 1, ease: "linear" }}
                />

                {/* Branch 3 (Right Small) - starts appearing at 60% progress */}
                <motion.path
                    d="M 220 220 Q 250 200 260 180"
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth="2"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: Math.max(0, (progress - 0.6) * 2.5) }}
                    transition={{ duration: 1, ease: "linear" }}
                />
            </svg>

            {/* Leaves (Simple circles for now, appearing at end) */}
            {/* We can use motion.circle for leaves scaling up */}
        </div>
    );
};

export default ForestVisual;
