import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

export default function Modal({ isOpen, onClose, children, hideCloseButton = false, footerContent = null }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 w-full max-w-2xl max-h-[80vh] bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col"
          >
            <div className="flex-1 overflow-y-auto p-8 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {children}
            </div>

            {/* Footer - either custom content or default close button */}
            {footerContent ? (
              <div className="p-4 border-t border-stone-200 bg-stone-50 rounded-b-2xl">
                {footerContent}
              </div>
            ) : !hideCloseButton ? (
              <div className="p-4 border-t border-stone-200 text-right bg-stone-50 rounded-b-2xl">
                <button
                  onClick={onClose}
                  className="px-6 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors"
                >
                  닫기
                </button>
              </div>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
