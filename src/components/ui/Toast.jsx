import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Check, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { ToastContext } from '../../hooks/useToast';
import { cn } from '../../lib/utils';

const TOAST_LIMIT = 5;
const AUTO_DISMISS_TIME = 5000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((title, options = {}) => {
    const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
    const type = options.type || 'default'; // default, success, error, warning, info
    const description = options.description;
    const action = options.action;

    setToasts((prev) => {
      const newToasts = [...prev, { id, title, description, type, action, ...options }];
      if (newToasts.length > TOAST_LIMIT) {
        return newToasts.slice(newToasts.length - TOAST_LIMIT);
      }
      return newToasts;
    });

    if (type !== 'loading') {
      setTimeout(() => {
        removeToast(id);
      }, AUTO_DISMISS_TIME);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const updateToast = useCallback((id, updates) => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast, dismiss: removeToast, update: updateToast, toasts }}>
      {children}
      <ToastViewport toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastViewport = ({ toasts, removeToast }) => {
    // Portal to ensure it's always on top
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div className="fixed bottom-0 right-0 z-[9999] p-4 md:p-6 flex flex-col gap-3 w-full max-w-[420px] pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
                ))}
            </AnimatePresence>
        </div>,
        document.body
    );
};

const ToastItem = ({ toast, onDismiss }) => {
    const icons = {
        default: <Info className="w-5 h-5 text-white/70" />,
        success: <Check className="w-5 h-5 text-emerald-400" />,
        error: <AlertCircle className="w-5 h-5 text-rose-400" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        info: <Info className="w-5 h-5 text-sky-400" />,
        loading: <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className={cn(
                "pointer-events-auto relative flex w-full items-center gap-4 overflow-hidden rounded-xl",
                "bg-black/60 backdrop-blur-xl border border-white/10 p-4 shadow-2xl shadow-black/20",
                "group hover:border-white/20 transition-colors"
            )}
        >
            <div className="flex-shrink-0">
                {icons[toast.type] || icons.default}
            </div>
            
            <div className="flex-1 overflow-hidden">
                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-white leading-none tracking-wide">
                        {toast.title}
                    </p>
                    {toast.description && (
                        <p className="text-xs text-white/60 leading-relaxed break-words">
                            {toast.description}
                        </p>
                    )}
                </div>
                {toast.action && (
                    <div className="mt-3">
                        {toast.action}
                    </div>
                )}
            </div>

            <button
                onClick={onDismiss}
                className="flex-shrink-0 rounded-lg p-1 text-white/40 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-white/10 transition-all"
            >
                <X className="w-4 h-4" />
            </button>
        </motion.div>
    );
};
