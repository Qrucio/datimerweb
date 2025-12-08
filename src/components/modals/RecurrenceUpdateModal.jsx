import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RecurrenceUpdateModal = ({ isOpen, onClose, onConfirm }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 10 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-[#111] border border-white/10 p-6 rounded-2xl w-[90vw] max-w-sm shadow-2xl"
                    >
                        <h3 className="text-lg font-bold text-white mb-2">Repeating Task</h3>
                        <p className="text-white/60 text-sm mb-6 leading-relaxed">
                            This is a repeating event. How would you like to apply your changes?
                        </p>

                        <div className="space-y-3">
                            <button
                                onClick={() => onConfirm('single')}
                                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white text-sm font-medium transition-colors text-left flex justify-between items-center group"
                            >
                                <span>This event only</span>
                                <span className="text-white/20 group-hover:text-white/50">&rarr;</span>
                            </button>

                            <button
                                onClick={() => onConfirm('all')}
                                className="w-full py-3 px-4 bg-white text-black rounded-xl text-sm font-bold transition-transform active:scale-95 text-left flex justify-between items-center"
                            >
                                <span>All upcoming events</span>
                                <span>&rarr;</span>
                            </button>
                        </div>

                        <button
                            onClick={onClose}
                            className="mt-4 w-full py-2 text-xs text-white/30 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default RecurrenceUpdateModal;
