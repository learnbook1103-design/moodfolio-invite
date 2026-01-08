import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase'; // Import supabase for auth check
import { getPortfolios, getUserProfile } from '../lib/db';
import BackgroundElements from '../components/BackgroundElements';
import MoodEffectLayer from '../components/MoodEffectLayer';
import TemplateSelectionModal from '../components/TemplateSelectionModal';

export default function Home() { // Renamed to Home as it is now index.js
    const router = useRouter();
    const [notices, setNotices] = useState([]);
    const [loadingNotices, setLoadingNotices] = useState(true);
    const [expandedNoticeId, setExpandedNoticeId] = useState(null); // Track expanded notice
    const [user, setUser] = useState(null); // Track user state
    const [isAdmin, setIsAdmin] = useState(false); // Admin status state
    const [portfolios, setPortfolios] = useState([]); // User's portfolios
    const [loadingPortfolios, setLoadingPortfolios] = useState(false);
    const [profile, setProfile] = useState(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);

    // Check Auth State
    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) {
                const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim());
                setIsAdmin(adminEmails.includes(user.email));

                // Fetch Portfolios & Profile
                setLoadingPortfolios(true);
                const [pfs, prof] = await Promise.all([
                    getPortfolios(user.id),
                    getUserProfile(user.id)
                ]);

                // Sort portfolios by most recently updated first
                const sortedPortfolios = (pfs || []).sort((a, b) => {
                    const dateA = new Date(a.updated_at || a.created_at);
                    const dateB = new Date(b.updated_at || b.created_at);
                    return dateB - dateA; // Descending order (newest first)
                });

                setPortfolios(sortedPortfolios);
                setProfile(prof);
                setLoadingPortfolios(false);
            }
        };
        checkUser();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Load Notices
    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                const res = await fetch(`${apiUrl}/api/notices/active`); // Using active route for public view
                if (res.ok) {
                    const data = await res.json();
                    setNotices(data || []);
                }
            } catch (e) {
                console.error('Failed to fetch notices', e);
            } finally {
                setLoadingNotices(false);
            }
        };
        fetchNotices();
    }, []);

    // 12 Hardcoded Templates Data
    const ALL_TEMPLATES = [
        // Developer
        { id: 'dev-A', job: '개발자', type: 'Type A', title: '기술 탐구 (Deep Dive)', desc: '복잡한 아키텍처와 기술적 챌린지를 깊이 있게 설명하는 구조', icon: '💻', color: 'blue' },
        { id: 'dev-B', job: '개발자', type: 'Type B', title: '서비스 구현 (Implementation)', desc: '완성된 결과물과 사용 기술 스택을 직관적으로 보여주는 비주얼 중심', icon: '💻', color: 'blue' },
        { id: 'dev-C', job: '개발자', type: 'Type C', title: '문제 해결 (Troubleshooting)', desc: '버그 발생부터 해결까지의 과정을 논리적으로 서술하는 로그 형식', icon: '💻', color: 'blue' },

        // Designer
        { id: 'des-A', job: '디자이너', type: 'Type A', title: '비주얼 임팩트 (Visual Impact)', desc: '압도적인 메인 이미지와 타이포그래피로 시선을 사로잡는 스타일', icon: '🎨', color: 'pink' },
        { id: 'des-B', job: '디자이너', type: 'Type B', title: '브랜드 스토리 (Brand Story)', desc: '디자인 컨셉 도출 과정과 철학을 에세이처럼 풀어내는 레이아웃', icon: '🎨', color: 'pink' },
        { id: 'des-C', job: '디자이너', type: 'Type C', title: 'UX 논리 (Logic & Flow)', desc: '사용자 경험 설계의 흐름과 와이어프레임을 체계적으로 정리', icon: '🎨', color: 'pink' },

        // Marketer
        { id: 'mkt-A', job: '마케터', type: 'Type A', title: '데이터 성과 (Performance)', desc: 'ROAS, 도달률 등 핵심 KPI 수치를 그래프와 함께 강조하는 스타일', icon: '📢', color: 'orange' },
        { id: 'mkt-B', job: '마케터', type: 'Type B', title: '크리에이티브 (Creative)', desc: '카드뉴스, 영상 등 콘텐츠 소재 자체를 돋보이게 하는 갤러리형', icon: '📢', color: 'orange' },
        { id: 'mkt-C', job: '마케터', type: 'Type C', title: '전략 인사이트 (Strategy)', desc: '시장 분석부터 전략 수립까지의 사고 과정을 제안서처럼 구성', icon: '📢', color: 'orange' },

        // Planner (Service)
        { id: 'pln-A', job: '기획자', type: 'Type A', title: '매출 견인 (Business Impact)', desc: '서비스 기획이 실제 비즈니스 성과로 이어진 사례 중심', icon: '📝', color: 'purple' },
        { id: 'pln-B', job: '기획자', type: 'Type B', title: '운영 효율화 (Efficiency)', desc: '운영 프로세스 개선 및 효율화 성과를 다이어그램으로 표현', icon: '📝', color: 'purple' },
        { id: 'pln-C', job: '기획자', type: 'Type C', title: '소통 협업 (Collaboration)', desc: '개발자, 디자이너와의 협업 과정과 커뮤니케이션 스킬 강조', icon: '📝', color: 'purple' },
    ];

    return (
        <div className="min-h-screen bg-[#FFFCF5] text-stone-800 relative flex flex-col items-center">
            {/* <BackgroundElements /> */}
            {/* <MoodEffectLayer mood={['#차분한']} /> */}

            {/* Admin Page Button - Only for admin users (Moved to Top Left for UI consistency) */}
            {isAdmin && (
                <div className="absolute top-6 left-6 z-50">
                    <button
                        onClick={() => router.push('/admin')}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 text-white font-bold rounded-full text-xs transition-all flex items-center gap-2 shadow-sm shadow-purple-500/20 group"
                    >
                        <span>관리자</span>
                    </button>
                </div>
            )}

            {/* Navigation Bar (Top Right) */}
            <div className="absolute top-6 right-6 z-50 flex gap-4">
                {/* Intro Link (for non-logged users) or Logout Button (for logged users) */}
                {user ? (
                    <button
                        onClick={async () => {
                            const { signOut } = await import('../lib/auth');
                            await signOut();
                            router.push('/');
                        }}
                        className="px-4 py-2 bg-white hover:bg-red-50 backdrop-blur-md rounded-full text-xs font-bold text-stone-500 hover:text-red-600 border border-stone-200 hover:border-red-200 transition-all uppercase tracking-wider flex items-center gap-2 shadow-sm"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        <span>Logout</span>
                    </button>
                ) : (
                    <Link
                        href="/"
                        className="px-4 py-2 bg-white hover:bg-stone-100 backdrop-blur-md rounded-full text-xs font-bold text-stone-500 hover:text-stone-800 border border-stone-200 transition-all uppercase tracking-wider flex items-center gap-2 shadow-sm"
                    >
                        <span>Intro</span>
                    </Link>
                )}

                {/* My Page / Login Button */}
                {user ? (
                    <Link
                        href="/mypage"
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 backdrop-blur-md rounded-full text-sm font-bold text-white border border-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2"
                    >
                        <span>My Page</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </Link>
                ) : (
                    <Link
                        href="/login"
                        className="px-6 py-2 bg-white hover:bg-stone-50 backdrop-blur-md rounded-full text-sm font-bold text-stone-700 border border-stone-200 transition-all shadow-md flex items-center gap-2"
                    >
                        <span>Log In</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                    </Link>
                )}
            </div>

            {/* Header / Intro Section */}
            <div className="relative z-10 w-full max-w-[1600px] px-12 py-12 mt-10">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <h1 className="text-5xl font-extrabold text-stone-800 tracking-tight">
                        {user ? `${profile?.name || '사용자'}님,` : '나만의 무드,'}<br />
                        <span className="text-emerald-600">포트폴리오의 시작.</span>
                    </h1>
                    <p className="text-stone-500 mt-4 text-lg font-medium max-w-2xl">
                        최신 소식부터 12가지 직무별 맞춤형 템플릿까지, 무드폴리오에서 당신의 가치를 완성해보세요.
                    </p>
                    {!user && (
                        <Link href="/login" className="inline-block mt-6 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 transition-all hover:-translate-y-1 active:translate-y-0">
                            지금 바로 시작하기 →
                        </Link>
                    )}
                </motion.div>
            </div>

            {/* --- SECTION 1: 공지사항 --- */}
            <div className="relative z-10 w-full max-w-[1600px] px-12 mb-16">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        공지사항
                    </h2>
                </div>

                {/* Notices Section Content */}
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden p-6 md:p-8 shadow-sm">
                    {loadingNotices ? (
                        <div className="text-center py-12 text-stone-400">불러오는 중...</div>
                    ) : notices.length > 0 ? (
                        <div className="space-y-3">
                            {notices.map((notice, idx) => {
                                const isExpanded = expandedNoticeId === notice.id;
                                return (
                                    <div
                                        key={notice.id}
                                        className={`bg-stone-50 border rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'border-emerald-500 shadow-md bg-white' : 'border-stone-100 hover:border-stone-200'
                                            }`}
                                    >
                                        <button
                                            onClick={() => setExpandedNoticeId(isExpanded ? null : notice.id)}
                                            className="w-full flex items-center justify-between p-5 text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <h3 className={`text-lg font-bold transition-colors ${isExpanded ? 'text-emerald-600' : 'text-stone-700'}`}>
                                                    {notice.title}
                                                </h3>
                                            </div>
                                            <span className="text-xs text-stone-400 font-mono bg-stone-100 px-2 py-1 rounded">
                                                {new Date(notice.created_at).toLocaleDateString()}
                                            </span>
                                        </button>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <div className="p-5 pt-0 border-t border-stone-100 text-stone-600 leading-relaxed whitespace-pre-wrap">
                                                        {notice.content}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-stone-400">등록된 공지사항이 없습니다.</div>
                    )}
                </div>
            </div>

            {/* --- SECTION 2: 작업 중인 포트폴리오 --- */}
            {user && (
                <div className="relative z-10 w-full max-w-[1600px] px-12 mb-16">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
                            <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                            작업 중인 포트폴리오
                        </h2>
                        <Link href="/mypage?tab=portfolios" className="text-sm font-bold text-emerald-600 hover:underline">전체보기 ({portfolios.length})</Link>
                    </div>

                    {loadingPortfolios ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-40 bg-white/50 animate-pulse rounded-2xl border border-stone-100"></div>
                            ))}
                        </div>
                    ) : portfolios.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {portfolios.slice(0, 3).map((pf) => (
                                <motion.div
                                    key={pf.id}
                                    whileHover={{ y: -5 }}
                                    className="group relative bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer"
                                    onClick={() => router.push(`/result?id=${pf.id}`)}
                                >
                                    {/* iframe Preview Section */}
                                    <div className="relative h-40 bg-stone-50 overflow-hidden">
                                        <div
                                            className="absolute inset-0 pointer-events-none"
                                            style={{
                                                transform: 'scale(0.2)',
                                                transformOrigin: 'top left',
                                                width: '500%',
                                                height: '500%'
                                            }}
                                        >
                                            <iframe
                                                src={`/result?preview=true&portfolio=${pf.id}`}
                                                className="w-full h-full border-0 pointer-events-none"
                                                title={`Preview of ${pf.title}`}
                                            />
                                        </div>
                                    </div>

                                    {/* Info Section */}
                                    <div className="p-4 bg-white">
                                        <h3 className="text-base font-bold text-stone-700 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
                                            {pf.title || '제목 없음'}
                                        </h3>
                                        <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
                                            <span>최근 수정: {new Date(pf.updated_at || pf.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    {/* Hover Arrow */}
                                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="p-1.5 bg-emerald-500 text-white rounded-lg shadow-lg">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {/* Create New Card */}
                            <motion.div
                                whileHover={{ y: -5 }}
                                className="border-2 border-dashed border-stone-200 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all cursor-pointer group"
                                onClick={() => setShowTemplateModal(true)}
                            >
                                <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </div>
                                <p className="text-sm font-bold text-stone-500 group-hover:text-emerald-600 transition-colors">새 포트폴리오 만들기</p>
                            </motion.div>
                        </div>
                    ) : (
                        <div className="bg-white border-2 border-dashed border-stone-200 rounded-3xl p-12 text-center">
                            <h3 className="text-lg font-bold text-stone-400 mb-2">아직 작업 중인 포트폴리오가 없습니다.</h3>
                            <p className="text-stone-400 text-sm mb-6">AI와 함께 5분 만에 완성도 높은 포트폴리오를 만들어보세요!</p>
                            <Link href="/onboarding" className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-600/20 transition-all hover:-translate-y-1">
                                첫 포트폴리오 생성하기
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* --- SECTION 3: 템플릿 갤러리 --- */}
            <div className="relative z-10 w-full max-w-[1600px] px-12 mb-16">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="9" y1="21" x2="9" y2="9"></line>
                        </svg>
                        템플릿 갤러리
                    </h2>
                    <p className="text-stone-500 text-sm">총 12가지의 전문 포트폴리오 템플릿</p>
                </div>


                {/* 12 Template Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {ALL_TEMPLATES.map((tpl) => (
                        <div key={tpl.id} className="group relative bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-xl">

                            {/* Virtual Portfolio Preview (CSS Wireframe) */}
                            <div className="h-48 w-full bg-stone-50 relative overflow-hidden p-3 flex flex-col gap-2 border-b border-stone-100">
                                {/* Window Controls */}
                                <div className="flex gap-1.5 mb-1 absolute top-3 left-3 opacity-50">
                                    <div className="w-2 h-2 rounded-full bg-stone-300"></div>
                                    <div className="w-2 h-2 rounded-full bg-stone-300"></div>
                                    <div className="w-2 h-2 rounded-full bg-stone-300"></div>
                                </div>

                                {/* Layouts based on Type - adjusted for small scale */}
                                <div className="mt-5 h-full w-full rounded bg-white overflow-hidden relative shadow-sm border border-stone-100">

                                    {/* Type A: Minimal / List */}
                                    {tpl.type === 'Type A' && (
                                        <div className="flex flex-col gap-2 p-2 h-full opacity-80">
                                            <div className={`h-3 w-1/3 rounded-sm ${tpl.color === 'blue' ? 'bg-blue-200' : tpl.color === 'pink' ? 'bg-pink-200' : tpl.color === 'orange' ? 'bg-orange-200' : 'bg-purple-200'}`}></div>
                                            <div className="h-1.5 w-3/4 bg-stone-100 rounded-sm"></div>
                                            <div className="h-px w-full bg-stone-100 my-1"></div>
                                            <div className="flex gap-2 flex-1">
                                                <div className="w-1/3 flex flex-col gap-1">
                                                    <div className="h-1.5 w-full bg-stone-100 rounded-sm"></div>
                                                    <div className="h-1.5 w-2/3 bg-stone-100 rounded-sm"></div>
                                                </div>
                                                <div className="w-2/3 flex flex-col gap-1">
                                                    <div className="h-6 w-full bg-stone-50 rounded border border-stone-100"></div>
                                                    <div className="h-6 w-full bg-stone-50 rounded border border-stone-100"></div>
                                                    <div className="h-6 w-full bg-stone-50 rounded border border-stone-100"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Type B: Visual / Grid */}
                                    {tpl.type === 'Type B' && (
                                        <div className="flex flex-col gap-1 p-1 h-full opacity-80">
                                            <div className={`h-16 w-full rounded-sm mb-1 ${tpl.color === 'blue' ? 'bg-blue-100' : tpl.color === 'pink' ? 'bg-pink-100' : tpl.color === 'orange' ? 'bg-orange-100' : 'bg-purple-100'} flex items-center justify-center`}>
                                            </div>
                                            <div className="grid grid-cols-2 gap-1 flex-1">
                                                <div className="bg-stone-50 rounded-sm h-full"></div>
                                                <div className="bg-stone-50 rounded-sm h-full"></div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Type C: Story / Text */}
                                    {tpl.type === 'Type C' && (
                                        <div className="flex flex-col gap-1.5 items-center text-center p-2 h-full opacity-80">
                                            <div className={`h-2.5 w-1/2 rounded-sm mb-1 ${tpl.color === 'blue' ? 'bg-blue-200' : tpl.color === 'pink' ? 'bg-pink-200' : tpl.color === 'orange' ? 'bg-orange-200' : 'bg-purple-200'}`}></div>
                                            <div className="h-1 w-5/6 bg-stone-100 rounded-sm"></div>
                                            <div className="h-1 w-4/5 bg-stone-100 rounded-sm"></div>
                                            <div className="h-1 w-full bg-stone-100 rounded-sm"></div>

                                            <div className="mt-auto w-full p-1.5 bg-stone-50 rounded border border-stone-100 flex gap-1.5 text-left">
                                                <div className="w-5 h-5 rounded bg-stone-200 flex-shrink-0"></div>
                                                <div className="flex-1 flex flex-col gap-1">
                                                    <div className="h-1 w-full bg-stone-100 rounded-sm"></div>
                                                    <div className="h-1 w-3/4 bg-stone-100 rounded-sm"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-5">
                                <h3 className="text-lg font-bold text-stone-800 mb-2 group-hover:text-emerald-600 transition-colors">
                                    {tpl.title}
                                </h3>
                                <p className="text-stone-500 text-sm leading-relaxed line-clamp-2">
                                    {tpl.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Template Selection Modal */}
            <TemplateSelectionModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                userJob={profile?.job}
                onSelectTemplate={async (templateId) => {
                    try {
                        // Import createPortfolio
                        const { createPortfolio } = await import('../lib/db');

                        // Create portfolio with existing user data
                        const newPortfolio = await createPortfolio(user.id, {
                            title: `${profile?.name || '나'}의 포트폴리오`,
                            template: templateId,
                            job: profile?.job || 'developer',
                            moods: profile?.moods || ['#전문적인'],
                            strength: templateId,
                            answers: {
                                name: profile?.name || '',
                                intro: profile?.intro || '',
                                career_summary: profile?.career_summary || '',
                                projects: profile?.projects || [],
                                skills: profile?.skills || [],
                                ...profile?.chat_answers
                            }
                        });

                        // Close modal and redirect to result page
                        setShowTemplateModal(false);
                        if (newPortfolio?.id) {
                            router.push(`/result?id=${newPortfolio.id}`);
                        }
                    } catch (error) {
                        console.error('Portfolio creation error:', error);
                        alert('포트폴리오 생성 중 오류가 발생했습니다.');
                        setShowTemplateModal(false);
                    }
                }}
            />
        </div >
    );
}
