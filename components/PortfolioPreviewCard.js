import React from 'react';
import { motion } from 'framer-motion';

// Mood-based gradient mappings
const moodGradients = {
    '#차분한': 'from-blue-500/20 via-indigo-500/20 to-purple-500/20',
    '#열정적인': 'from-red-500/20 via-orange-500/20 to-yellow-500/20',
    '#창의적인': 'from-purple-500/20 via-pink-500/20 to-rose-500/20',
    '#전문적인': 'from-gray-600/20 via-slate-600/20 to-zinc-600/20',
    '#미니멀한': 'from-gray-400/20 via-gray-500/20 to-gray-600/20',
    '#따뜻한': 'from-amber-500/20 via-orange-400/20 to-red-400/20',
    '#시원한': 'from-cyan-500/20 via-blue-500/20 to-indigo-500/20',
    '#활기찬': 'from-lime-500/20 via-green-500/20 to-emerald-500/20',
};

// Mood-based accent colors
const moodAccents = {
    '#차분한': 'from-blue-500 to-indigo-500',
    '#열정적인': 'from-red-500 to-orange-500',
    '#창의적인': 'from-purple-500 to-pink-500',
    '#전문적인': 'from-gray-600 to-slate-600',
    '#미니멀한': 'from-gray-400 to-gray-600',
    '#따뜻한': 'from-amber-500 to-orange-500',
    '#시원한': 'from-cyan-500 to-blue-500',
    '#활기찬': 'from-lime-500 to-emerald-500',
};

// Job type icons
const jobIcons = {
    developer: '',
    designer: '',
    marketer: '',
    service: '',
};

// Strength labels
const strengthLabels = {
    problem: '문제 해결',
    tech: '기술 전문성',
    impl: '구현 능력',
    ux: 'UX 디자인',
    visual: '비주얼 디자인',
    brand: '브랜드 디자인',
    data: '데이터 분석',
    strategy: '전략 기획',
    creative: '크리에이티브',
    revenue: '수익 창출',
    ops: '운영 효율화',
    comm: '커뮤니케이션',
};

export default function PortfolioPreviewCard({ portfolio, userProfile, onView, onRename, onDelete, onShare }) {
    const [isLoading, setIsLoading] = React.useState(true);
    const [hasError, setHasError] = React.useState(false);
    const [showCopyToast, setShowCopyToast] = React.useState(false);

    const mood = portfolio.moods?.[0] || '#차분한';
    const gradient = moodGradients[mood] || moodGradients['#차분한'];
    const accent = moodAccents[mood] || moodAccents['#차분한'];
    const jobKey = portfolio.job?.toLowerCase() || 'developer';
    const jobIcon = jobIcons[jobKey] || jobIcons.developer;

    const handleIframeLoad = () => {
        setIsLoading(false);
        setHasError(false);
    };

    const handleIframeError = () => {
        setIsLoading(false);
        setHasError(true);
    };

    const handleShareClick = () => {
        if (onShare) {
            onShare(portfolio.id);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02, y: -4 }}
            transition={{ duration: 0.2 }}
            className="relative group"
        >
            {/* Card Container */}
            <div className="relative bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all">
                {/* Preview Area - iframe or Fallback */}
                <div className="relative h-48 bg-stone-100 overflow-hidden z-0">
                    {/* Loading State */}
                    {isLoading && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <p className="text-white/70 text-xs">Loading preview...</p>
                            </div>
                        </div>
                    )}

                    {/* Error Fallback - Show mood gradient */}
                    {hasError && (
                        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} p-6 flex flex-col justify-between`}>
                            {/* Decorative Elements */}
                            <div className="absolute inset-0 opacity-30">
                                <div className={`absolute top-4 right-4 w-32 h-32 bg-gradient-to-br ${accent} rounded-full blur-3xl`}></div>
                                <div className={`absolute bottom-4 left-4 w-24 h-24 bg-gradient-to-br ${accent} rounded-full blur-2xl`}></div>
                            </div>

                            {/* User Info Preview */}
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center text-white text-xl font-bold shadow-lg`}>
                                        {userProfile?.name?.[0] || '?'}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{userProfile?.name || 'User'}</h4>
                                        <p className="text-white/70 text-xs">{portfolio.job}</p>
                                    </div>
                                </div>
                                {userProfile?.intro && (
                                    <p className="text-white/80 text-sm line-clamp-2 mt-2">
                                        {userProfile.intro}
                                    </p>
                                )}
                            </div>

                            {/* Mood Badge */}
                            <div className="relative z-10 flex justify-end">
                                <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-white text-xs font-bold border border-white/30">
                                    {mood}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* iframe Preview */}
                    {!hasError && (
                        <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '400%', height: '400%' }}>
                            <iframe
                                src={`/result?preview=true&portfolio=${portfolio.id}`}
                                className="w-full h-full border-0 pointer-events-none"
                                onLoad={handleIframeLoad}
                                onError={handleIframeError}
                                title={`Preview of ${portfolio.name}`}
                            />
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="p-5 space-y-4 relative z-10">
                    {/* Portfolio Name */}
                    <div>
                        <h3 className="text-xl font-bold text-stone-800 mb-2 truncate flex items-center gap-2">
                            <span>{jobIcon}</span>
                            <span>{portfolio.name}</span>
                        </h3>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-stone-100 border border-stone-200 rounded text-xs text-stone-500">
                                {strengthLabels[portfolio.strength] || portfolio.strength}
                            </span>
                            {portfolio.moods?.slice(0, 2).map((m, i) => (
                                <span key={i} className="px-2 py-1 bg-stone-100 border border-stone-200 rounded text-xs text-stone-500">
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => onView(portfolio.id)}
                            className={`flex-1 py-2.5 bg-gradient-to-r ${accent} text-white font-bold rounded-lg hover:shadow-lg transition-all text-sm`}
                        >
                            보기
                        </button>
                        <button
                            onClick={handleShareClick}
                            className="px-4 py-2.5 bg-white border border-cyan-200 text-cyan-600 rounded-lg hover:bg-cyan-50 transition-all font-bold"
                            title="공유하기"
                        >
                            🔗
                        </button>
                        <button
                            onClick={() => onRename(portfolio.id)}
                            className="px-4 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 transition-all font-bold"
                            title="이름 변경"
                        >
                            ✎
                        </button>
                        <button
                            onClick={() => onDelete(portfolio.id)}
                            className="px-4 py-2.5 bg-white border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-all font-bold"
                            title="삭제"
                        >
                            🗑
                        </button>
                    </div>
                </div>

                {/* Copy Success Toast */}
                {showCopyToast && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-bold z-20 animate-bounce">
                        링크 복사됨!
                    </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-stone-900/0 opacity-0 group-hover:bg-stone-900/0 transition-opacity pointer-events-none"></div>
            </div>
        </motion.div>
    );
}
