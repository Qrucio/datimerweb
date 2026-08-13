import React from 'react';
import { motion } from 'framer-motion';

const RevealLogo = ({ src, className, disableReveal = false }) => {
  return (
    <motion.div
      className={`group relative flex items-center justify-center ${disableReveal ? '' : 'cursor-default'}`}
      initial="rest"
      whileHover={disableReveal ? "rest" : "hover"}
      animate="rest"
    >
      {/* The Logo Image (The "A") */}
      <motion.img
        src={src}
        alt="DaTimer Logo"
        className={`${className} relative z-10 object-contain`}
        variants={{
          rest: { x: 0 },
          // Shift left slightly to make space for the text
          hover: { x: -8 }
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />

      {/* The Reveal Text ("ltimer") */}
      {!disableReveal && (
        <div className="overflow-hidden flex items-center absolute left-[85%] top-0 bottom-0 pl-1">
          <motion.span
            className="font-logo text-white leading-none tracking-wide whitespace-nowrap"
            style={{
              fontSize: '150%', // Matches logo scale
              lineHeight: '1',
              marginTop: '0.1em'
            }}
            variants={{
              // Start hidden behind the logo, shifted left, transparent
              rest: { x: -20, opacity: 0, width: 0 },
              // Slide out to natural position
              hover: { x: 0, opacity: 1, width: "auto" }
            }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            timer
          </motion.span>
        </div>
      )}
    </motion.div>
  );
};

export default RevealLogo;
