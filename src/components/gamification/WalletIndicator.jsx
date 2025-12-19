import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const WalletIndicator = ({ balance, onClick }) => {
    return (
        <motion.button
            layout
            onClick={onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="group relative h-9 flex items-center gap-2.5 px-4 bg-black/40 hover:bg-black/60 backdrop-blur-xl border border-white/10 hover:border-yellow-500/50 rounded-full transition-all duration-500 cursor-default overflow-hidden shadow-lg"
        >
            {/* Liquid Gold Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.25)_0%,transparent_70%)]" />

            {/* Coin Emoji - Floating Free */}
            <span className="relative z-10 text-lg filter drop-shadow-md group-hover:rotate-12 transition-transform duration-300">
                🪙
            </span>

            {/* Balance */}
            <div className="relative z-10 flex flex-col items-start leading-none">
                <AnimatePresence mode='popLayout'>
                    <motion.span
                        key={balance}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        className="text-sm font-clock font-bold text-white/90 tracking-wide group-hover:text-yellow-100 transition-colors"
                    >
                        {(balance || 0).toLocaleString()}
                    </motion.span>
                </AnimatePresence>
            </div>
        </motion.button>
    );
};

export default WalletIndicator;