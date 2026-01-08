import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NoticeBanner({ notices = [] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Auto-rotate notices if more than one
    useEffect(() => {
        if (notices.length <= 1) return;

        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % notices.length);
        }, 5000); // 5 seconds per notice

        return () => clearInterval(interval);
    }, [notices.length]);

    if (!notices || notices.length === 0) return null;

    const currentNotice = notices[currentIndex];

    return (
        <div className="fixed bottom-6 left-6 z-[100]">
            <AnimatePresence mode='wait'>
                <motion.div
                    key={currentNotice.id}
                    initial={{ x: -20, opacity: 0, scale: 0.9 }}
                    animate={{ x: 0, opacity: 1, scale: 1 }}
                    exit={{ x: -20, opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="bg-white/95 backdrop-blur-xl border border-stone-200 p-4 rounded-2xl shadow-lg flex items-start gap-3 max-w-sm hover:bg-stone-50 transition-colors cursor-pointer"
                >
                    <div className="text-2xl pt-1">📢</div>
                    <div className="flex-1">
                        <h4 className="font-bold text-stone-800 text-sm mb-1">{currentNotice.title}</h4>
                        <p className="text-stone-600 text-xs leading-relaxed line-clamp-2">{currentNotice.content}</p>
                    </div>
                    {notices.length > 1 && (
                        <div className="flex flex-col items-center justify-center gap-1 pl-2 border-l border-stone-200">
                            <span className="text-[10px] text-stone-400 font-mono">
                                {currentIndex + 1}/{notices.length}
                            </span>
                            <div className="w-1 h-8 bg-stone-200 rounded-full overflow-hidden relative">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ height: "0%" }}
                                    animate={{ height: "100%" }}
                                    transition={{ duration: 5, ease: "linear" }}
                                    className="w-full bg-emerald-500 absolute bottom-0"
                                />
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
