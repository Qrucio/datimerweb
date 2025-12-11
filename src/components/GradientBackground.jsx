import React from 'react';
import { motion } from 'framer-motion';

const GradientBackground = ({ isActive }) => {
    // variants for the background animation
    // Active: Deep, slow, focus-enhancing colors (Purples, Deep Blues)
    // Paused: A bit brighter, maybe warmer or shifting to indicate "waiting" (Oranges/Purples)

    const variants = {
        active: {
            background: [
                "linear-gradient(45deg, #1a0b2e, #2d1b4e, #1a0b2e)",
                "linear-gradient(45deg, #2d1b4e, #1a0b2e, #2d1b4e)",
                "linear-gradient(45deg, #1a0b2e, #2d1b4e, #1a0b2e)"
            ],
            transition: {
                duration: 8,
                repeat: Infinity,
                ease: "linear"
            }
        },
        paused: {
            background: [
                // Shifting to a slightly alert/warm but still dark tone
                "linear-gradient(45deg, #2e1a0b, #4e2d1b, #2e1a0b)",
                "linear-gradient(45deg, #4e2d1b, #2e1a0b, #4e2d1b)"
            ],
            transition: {
                duration: 4,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
            }
        }
    };

    return (
        <motion.div
            className="fixed inset-0 z-0"
            initial="active"
            animate={isActive ? "active" : "paused"}
            variants={variants}
            style={{
                backgroundSize: "400% 400%"
            }}
        />
    );
};

export default GradientBackground;
