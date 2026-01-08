import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ShareModal({ isOpen, onClose, portfolioId, ownerName }) {
    const [includeMumu, setIncludeMumu] = useState(true);
    const [showCopyToast, setShowCopyToast] = useState(false);

    if (!isOpen) return null;

    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/result?portfolio=${portfolioId}&preview=true${includeMumu ? '&share=true' : ''}`
        : '';

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowCopyToast(true);
            setTimeout(() => setShowCopyToast(false), 2000);
        } catch (err) {
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                setShowCopyToast(true);
                setTimeout(() => setShowCopyToast(false), 2000);
            } catch (err2) {
                alert('링크 복사 실패: ' + shareUrl);
            }
            document.body.removeChild(textArea);
        }
    };

    const handleDownloadPDF = () => {
        const printUrl = `${window.location.origin}/result?portfolio=${portfolioId}&print=true`;
        window.open(printUrl, '_blank');
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[200000] flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-stone-900/40 backdrop-blur-md"
                />

                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    className="relative bg-white border border-stone-200 rounded-[2rem] w-full max-w-[28rem] shadow-xl overflow-hidden px-1"
                >
                    {/* Header: More Minimal */}
                    <div className="pt-8 pb-4 px-7 flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="text-2xl font-bold text-stone-800 tracking-tight">공유 설정</h3>
                            <p className="text-stone-500 text-xs font-medium">포트폴리오를 가장 가치 있게 공유하는 방법을 선택하세요.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-stone-100 text-stone-400 hover:text-stone-800 hover:bg-stone-200 transition-all active:scale-90"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Option Group */}
                        <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-5">
                            {/* Toggle Row */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h4 className="text-stone-800 text-[0.95rem] font-semibold">무무(AI 도슨트)와 함께 공유</h4>
                                    <p className="text-stone-500 text-[0.8rem] leading-relaxed"> recruiters를 위한 챗봇 가이드를 활성화합니다.</p>
                                </div>
                                <button
                                    onClick={() => setIncludeMumu(!includeMumu)}
                                    className={`w-14 h-7 rounded-full transition-all relative ${includeMumu ? 'bg-emerald-500' : 'bg-stone-300'}`}
                                >
                                    <motion.div
                                        animate={{ x: includeMumu ? 30 : 4 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                        className="absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-sm"
                                    />
                                </button>
                            </div>

                            {/* Divider with active indicator */}
                            <div className="relative pt-1">
                                <div className="h-px bg-stone-200 w-full"></div>
                                <motion.div
                                    className={`absolute top-1 left-0 h-[2px] bg-emerald-500 rounded-full transition-all duration-500`}
                                    animate={{ width: includeMumu ? '100%' : '0%', opacity: includeMumu ? 1 : 0 }}
                                />
                            </div>

                            {/* Link Container */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-1.5 px-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    <span className="text-[0.65rem] font-bold text-stone-500 uppercase tracking-[0.1em]">Shareable Link Produced</span>
                                </div>

                                <div className="relative group">
                                    <div className={`p-4 bg-white border-2 rounded-2xl text-stone-600 text-[0.85rem] transition-all duration-300 font-mono break-all pr-12 ${includeMumu ? 'border-emerald-500/30 ring-1 ring-emerald-500/10' : 'border-stone-200'}`}>
                                        <span className="opacity-40">.../result?portfolio=</span>
                                        <span className="opacity-70">{portfolioId.slice(0, 8)}...</span>
                                        <AnimatePresence>
                                            {includeMumu && (
                                                <motion.span
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    className="text-emerald-600 font-semibold"
                                                >
                                                    &share=true
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <button
                                        onClick={handleCopyLink}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-90 transition-all"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Secondary Export Option: Card Style */}
                        <div className="px-1">
                            <button
                                onClick={handleDownloadPDF}
                                className="w-full group relative p-4 bg-white hover:bg-stone-50 border border-stone-200 rounded-2xl transition-all duration-300 flex items-center gap-4 text-left overflow-hidden shadow-sm hover:shadow-md"
                            >
                                <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform duration-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="m9 15 3 3 3-3"></path></svg>
                                </div>
                                <div className="flex-1">
                                    <h5 className="text-stone-800 text-sm font-bold">PDF 파일로 내보내기</h5>
                                    <p className="text-stone-500 text-[0.7rem]">인쇄 및 문서 제출용 파일이 필요할 때</p>
                                </div>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-stone-300 group-hover:text-stone-500 group-hover:translate-x-1 transition-all"><polyline points="9 18 15 12 9 6"></polyline></svg>

                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-stone-100/[0.5] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                            </button>
                            <p className="text-center text-[0.65rem] text-stone-400 mt-4 leading-relaxed font-medium">인쇄 창이 뜨면 설정에서 'PDF로 저장'을 선택해 주세요.</p>
                        </div>
                    </div>

                    <div className="h-4 w-full"></div>

                    {/* Minimal Toast Overlay */}
                    <AnimatePresence>
                        {showCopyToast && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: -20, scale: 1 }}
                                exit={{ opacity: 0, y: 0, scale: 0.95 }}
                                className="absolute bottom-8 left-1/2 -translate-x-1/2 px-5 py-2.5 bg-stone-800 text-white rounded-full shadow-2xl font-bold text-xs tracking-tight z-50 flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                링크가 복사되었습니다!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
