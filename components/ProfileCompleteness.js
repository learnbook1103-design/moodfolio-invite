import { useState, useEffect } from 'react';
import { calculateProfileCompleteness, getNextSteps, getCompletionLevel } from '../lib/profileCompleteness';

export default function ProfileCompleteness({ userData, onFieldClick }) {
    const [completeness, setCompleteness] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);

    useEffect(() => {
        if (userData) {
            const result = calculateProfileCompleteness(userData);
            setCompleteness(result);
        }
    }, [userData]);

    if (!completeness) return null;

    const { percentage } = completeness;
    const level = getCompletionLevel(percentage);
    const nextSteps = getNextSteps(userData, 3);

    // Circular progress bar calculation
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    return (
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-stone-800">프로필 완성도</h3>
                {percentage >= 90 && (
                    <span className="text-2xl animate-bounce">{level.icon}</span>
                )}
            </div>

            {/* Progress Circle and Level */}
            <div className="flex items-center gap-6 mb-6">
                {/* Circular Progress */}
                <div className="relative w-28 h-28 flex-shrink-0">
                    <svg className="transform -rotate-90 w-28 h-28">
                        {/* Background circle */}
                        <circle
                            cx="56"
                            cy="56"
                            r="45"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-stone-200"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="56"
                            cy="56"
                            r="45"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                        />
                        {/* Gradient definition */}
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" className={level.color} stopOpacity="1" />
                                <stop offset="100%" className={level.color} stopOpacity="0.6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    {/* Percentage text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold text-stone-800">{percentage}%</span>
                    </div>
                </div>

                {/* Level Badge and Message */}
                <div className="flex-1">
                    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${level.bg} ${level.border} border mb-2`}>
                        <span className="text-lg">{level.icon}</span>
                        <span className={`text-sm font-bold ${level.color}`}>{level.label}</span>
                    </div>
                    <p className="text-sm text-stone-500 leading-relaxed">{level.message}</p>
                </div>
            </div>

            {/* Next Steps */}
            {nextSteps.length > 0 && (
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-stone-500 uppercase tracking-wide">다음 단계</h4>
                    <div className="space-y-2">
                        {nextSteps.map((step, index) => (
                            <div
                                key={step.field}
                                onClick={() => onFieldClick && onFieldClick(step.field)}
                                className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer group"
                            >
                                <div className={`w-6 h-6 rounded-full ${level.bg} ${level.border} border flex items-center justify-center flex-shrink-0`}>
                                    <span className={`text-xs font-bold ${level.color}`}>{index + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-stone-700 truncate">{step.label}</p>
                                </div>
                                <div className={`text-xs font-bold ${level.color} flex-shrink-0`}>
                                    +{step.weight}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Expand/Collapse Button */}
            {completeness.missing.length > 3 && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-4 w-full text-center text-sm text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-2"
                >
                    <span>{isExpanded ? '간단히 보기' : `${completeness.missing.length - 3}개 더 보기`}</span>
                    <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                </button>
            )}

            {/* Expanded View */}
            {isExpanded && (
                <div className="mt-4 space-y-2 border-t border-stone-200 pt-4">
                    {completeness.missing.slice(3).map((step, index) => (
                        <div
                            key={step.field}
                            onClick={() => onFieldClick && onFieldClick(step.field)}
                            className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
                        >
                            <div className={`w-6 h-6 rounded-full ${level.bg} ${level.border} border flex items-center justify-center flex-shrink-0`}>
                                <span className={`text-xs font-bold ${level.color}`}>{index + 4}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-stone-700 truncate">{step.label}</p>
                            </div>
                            <div className={`text-xs font-bold ${level.color} flex-shrink-0`}>
                                +{step.weight}%
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Celebration Animation */}
            {showCelebration && (
                <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
                    <div className="text-6xl animate-ping">🎉</div>
                </div>
            )}
        </div>
    );
}
