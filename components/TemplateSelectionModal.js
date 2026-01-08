import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JOB_SPECS } from '../lib/jobData';

const TemplateSelectionModal = ({ isOpen, onClose, onSelectTemplate, userJob }) => {
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [isCreating, setIsCreating] = useState(false);

    // Get all templates from all job categories
    const allTemplates = Object.values(JOB_SPECS).flatMap(jobSpec => jobSpec.strengths);

    const handleSelect = async (template) => {
        setSelectedTemplate(template.id);
        setIsCreating(true);

        try {
            await onSelectTemplate(template.id);
        } catch (error) {
            console.error('Template selection error:', error);
            setIsCreating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                {/* Modal */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-stone-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-stone-800 mb-1">템플릿 선택</h2>
                                <p className="text-sm text-stone-600">원하는 스타일의 포트폴리오를 선택하세요</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Template Grid */}
                    <div className="p-6 overflow-y-auto max-h-[calc(80vh-140px)]">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {allTemplates.map((template) => (
                                <motion.button
                                    key={template.id}
                                    whileHover={{ scale: 1.02, y: -4 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleSelect(template)}
                                    disabled={isCreating}
                                    className={`relative p-5 rounded-2xl border-2 transition-all text-left ${selectedTemplate === template.id
                                        ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                                        : 'border-stone-200 bg-white hover:border-emerald-300 hover:shadow-md'
                                        } ${isCreating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    {/* Layout Preview */}
                                    <div className="h-32 w-full bg-stone-50 relative overflow-hidden mb-3 rounded-lg border border-stone-100">
                                        {/* Type A: Minimal / List */}
                                        {(template.id === 'tech' || template.id === 'problem' || template.id === 'impl') && (
                                            <div className="flex flex-col gap-1.5 p-2 h-full opacity-80">
                                                <div className="h-2 w-1/3 rounded-sm bg-emerald-200"></div>
                                                <div className="h-1 w-3/4 bg-stone-100 rounded-sm"></div>
                                                <div className="h-px w-full bg-stone-100 my-1"></div>
                                                <div className="flex gap-1.5 flex-1">
                                                    <div className="w-1/3 flex flex-col gap-0.5">
                                                        <div className="h-1 w-full bg-stone-100 rounded-sm"></div>
                                                        <div className="h-1 w-2/3 bg-stone-100 rounded-sm"></div>
                                                    </div>
                                                    <div className="w-2/3 flex flex-col gap-0.5">
                                                        <div className="h-4 w-full bg-stone-50 rounded border border-stone-100"></div>
                                                        <div className="h-4 w-full bg-stone-50 rounded border border-stone-100"></div>
                                                        <div className="h-4 w-full bg-stone-50 rounded border border-stone-100"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Type B: Visual / Grid */}
                                        {(template.id === 'visual' || template.id === 'brand' || template.id === 'creative') && (
                                            <div className="flex flex-col gap-1 p-1.5 h-full opacity-80">
                                                <div className="h-12 w-full rounded-sm mb-1 bg-gradient-to-r from-pink-100 to-rose-100 flex items-center justify-center">
                                                    <div className="h-1.5 w-1/2 bg-white/50 rounded"></div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 flex-1">
                                                    <div className="bg-stone-50 rounded-sm h-full border border-stone-100"></div>
                                                    <div className="bg-stone-50 rounded-sm h-full border border-stone-100"></div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Type C: Story / Text */}
                                        {(template.id === 'ux' || template.id === 'data' || template.id === 'strategy' || template.id === 'revenue' || template.id === 'ops' || template.id === 'comm') && (
                                            <div className="flex flex-col gap-1 items-center text-center p-2 h-full opacity-80">
                                                <div className="h-2 w-1/2 rounded-sm mb-1 bg-purple-200"></div>
                                                <div className="h-0.5 w-5/6 bg-stone-100 rounded-sm"></div>
                                                <div className="h-0.5 w-4/5 bg-stone-100 rounded-sm"></div>
                                                <div className="h-0.5 w-full bg-stone-100 rounded-sm mb-1"></div>
                                                <div className="mt-auto w-full p-1.5 bg-stone-50 rounded border border-stone-100 flex gap-1.5 text-left">
                                                    <div className="w-4 h-4 rounded bg-stone-200 flex-shrink-0"></div>
                                                    <div className="flex-1 flex flex-col gap-0.5">
                                                        <div className="h-0.5 w-full bg-stone-100 rounded-sm"></div>
                                                        <div className="h-0.5 w-3/4 bg-stone-100 rounded-sm"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Template Icon/Badge */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={`p-2 rounded-lg ${selectedTemplate === template.id
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-stone-100 text-stone-600'
                                            }`}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                            </svg>
                                        </div>
                                        {selectedTemplate === template.id && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="p-1 bg-emerald-500 text-white rounded-full"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Template Info */}
                                    <h3 className="text-lg font-bold text-stone-800 mb-1">{template.label}</h3>
                                    <p className="text-xs text-stone-500">{template.desc}</p>

                                    {/* Loading Indicator */}
                                    {isCreating && selectedTemplate === template.id && (
                                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                                                <p className="text-sm font-bold text-emerald-600">생성 중...</p>
                                            </div>
                                        </div>
                                    )}
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default TemplateSelectionModal;
