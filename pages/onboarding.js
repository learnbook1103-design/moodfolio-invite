import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { updateUserProfile, createPortfolio } from '../lib/db';
import { saveGuestPortfolio } from '../lib/guestStore';
import BackgroundElements from '../components/BackgroundElements';
import MoodEffectLayer from '../components/MoodEffectLayer';
import RecommendationPanel from '../components/RecommendationPanel';

export default function Onboarding() {
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [showWidget, setShowWidget] = useState(false);
    const [hideGif, setHideGif] = useState(false);
    const [pasteMode, setPasteMode] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const [errorMessage, setErrorMessage] = useState(null);

    // Market Insights 상태
    const [showInsights, setShowInsights] = useState(false);
    const [marketInsights, setMarketInsights] = useState(null);
    const [loadingInsights, setLoadingInsights] = useState(false);
    const [analyzedData, setAnalyzedData] = useState(null);

    useEffect(() => {
        checkUser();

        // Widget animation
        setShowWidget(true);
        const timer = setTimeout(() => {
            setHideGif(true);
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user); // 있으면 설정, 없어도 OK (게스트 모드)
    };

    // 이력서 파일 업로드 처리
    const handleFileUpload = async (file) => {
        if (!file) return;

        setIsUploading(true);
        try {
            // 1. 파일 파싱
            const formData = new FormData();
            formData.append('file', file);

            const parseResponse = await fetch('/api/parse-resume', {
                method: 'POST',
                body: formData
            });

            const parseData = await parseResponse.json();
            console.log('Parse result:', parseData);

            // Check for parse errors
            if (!parseResponse.ok || parseData.error) {
                let errorMsg = parseData.error || '파일 파싱에 실패했습니다.';
                let suggestion = parseData.suggestion || '';
                setErrorMessage({ error: errorMsg, suggestion });
                setIsUploading(false);
                return;
            }

            // 2. 텍스트 분석
            const analyzeResponse = await fetch('/api/analyze-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText: parseData.text })
            });

            const analyzeData = await analyzeResponse.json();
            console.log('Analyze result:', analyzeData);

            // 3. 프로젝트 변환
            const projects = (analyzeData.projects || []).map((proj, idx) => ({
                id: idx + 1,
                title: proj.title || '',
                desc: proj.desc || '',
                image: parseData.images && parseData.images[idx] ? parseData.images[idx] : null,
                duration: proj.duration || null,
                period: proj.duration || null // Map to existing UI field
            }));

            // 4. 직군 추론 (skills 기반 + 텍스트 분석 폴백)
            const inferredJob = inferJobFromSkills(analyzeData.skills || [], analyzeData);
            console.log('Inferred Job:', inferredJob, 'from skills:', analyzeData.skills);

            // 4-1. 강점(Strength) 추론
            const inferredStrength = inferStrengthFromResume(
                analyzeData.skills || [],
                analyzeData.career_summary || '',
                analyzeData.projects || []
            );
            console.log('Inferred Strength:', inferredStrength);

            // 4-2. 무드(Moods) 추론
            const inferredMoods = inferMoodsFromResume(
                inferredJob,
                inferredStrength,
                analyzeData.intro || ''
            );
            console.log('Inferred Moods:', inferredMoods);

            // 4-3. 경력 연차 계산
            const yearsExp = calculateYearsFromCareer(analyzeData.career_summary || '');
            console.log('Years of Experience:', yearsExp);

            // 5. User Profile 생성
            const profileData = {
                name: analyzeData.name || '',
                intro: analyzeData.intro || '',
                career_summary: analyzeData.career_summary || '',
                phone: analyzeData.phone || '',
                link: analyzeData.link || '',
                skills: analyzeData.skills || [],
                projects: projects,
                default_job: inferredJob,
                default_strength: inferredStrength,
                default_moods: inferredMoods,
                // 피어 비교를 위한 필드 추가
                job_type: inferredJob,
                years_experience: yearsExp
            };

            // 6. 분석 데이터 저장
            const fullAnalyzedData = {
                ...analyzeData,
                profileData,
                inferredJob,
                inferredStrength,
                inferredMoods,
                yearsExp,
                projects
            };
            setAnalyzedData(fullAnalyzedData);

            // 7. 시장 인사이트 가져오기 (백그라운드)
            fetchMarketInsights(inferredJob, yearsExp, analyzeData.skills || []);

            // 8. 바로 포트폴리오 생성 (게스트 모드) - 데이터를 직접 전달
            await handleCreatePortfolio(fullAnalyzedData);

        } catch (error) {
            console.error('Resume upload error:', error);
            alert('이력서 분석 중 오류가 발생했습니다.\n\n' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Skills 기반 직군 추론
    const inferJobFromSkills = (skills, analyzeData = {}) => {
        const designKeywords = ['Figma', 'Photoshop', 'Illustrator', 'Sketch', 'XD', '디자인', 'UI', 'UX', '시각', '그래픽'];
        const devKeywords = ['React', 'JavaScript', 'Python', 'Java', 'Node.js', '개발', '프로그래밍', '코딩', 'Frontend', 'Backend'];
        const marketingKeywords = ['GA', 'Analytics', 'SEO', 'Marketing', '마케팅', '광고', '브랜딩', 'SNS'];

        // First, try skills array
        const hasDesign = skills.some(s => designKeywords.some(k => s.includes(k)));
        const hasDev = skills.some(s => devKeywords.some(k => s.includes(k)));
        const hasMarketing = skills.some(s => marketingKeywords.some(k => s.includes(k)));

        if (hasDesign) return 'designer';
        if (hasDev) return 'developer';
        if (hasMarketing) return 'marketer';

        // Fallback: Analyze text content if skills array is empty
        const textToAnalyze = `${analyzeData.intro || ''} ${analyzeData.career_summary || ''} ${(analyzeData.projects || []).map(p => p.title + ' ' + p.desc).join(' ')}`.toLowerCase();

        if (designKeywords.some(k => textToAnalyze.includes(k.toLowerCase()))) return 'designer';
        if (marketingKeywords.some(k => textToAnalyze.includes(k.toLowerCase()))) return 'marketer';
        if (devKeywords.some(k => textToAnalyze.includes(k.toLowerCase()))) return 'developer';

        return 'developer'; // 기본값
    };

    // 강점(Strength) 추론
    const inferStrengthFromResume = (skills, careerSummary, projects) => {
        const text = `${skills.join(' ')} ${careerSummary} ${projects.map(p => p.desc).join(' ')}`.toLowerCase();

        // Developer strengths
        if (text.includes('알고리즘') || text.includes('문제 해결') || text.includes('problem solving')) return 'problem';
        if (text.includes('기술') || text.includes('tech') || text.includes('architecture')) return 'tech';
        if (text.includes('구현') || text.includes('개발') || text.includes('implementation')) return 'impl';

        // Designer strengths
        if (text.includes('ui') || text.includes('ux') || text.includes('사용자 경험')) return 'ux';
        if (text.includes('브랜드') || text.includes('brand') || text.includes('아이덴티티')) return 'brand';
        if (text.includes('비주얼') || text.includes('visual') || text.includes('그래픽')) return 'visual';

        // Marketer/Service strengths
        if (text.includes('데이터') || text.includes('분석') || text.includes('analytics')) return 'data';
        if (text.includes('전략') || text.includes('strategy') || text.includes('기획')) return 'strategy';
        if (text.includes('성과') || text.includes('매출') || text.includes('revenue')) return 'revenue';

        return 'problem'; // 기본값
    };

    // 무드(Moods) 추론
    const inferMoodsFromResume = (job, strength, intro) => {
        const moods = [];

        // 직군 기반 기본 무드
        if (job === 'developer') {
            moods.push('#전문적인');
            if (strength === 'tech') moods.push('#혁신적인');
            else if (strength === 'problem') moods.push('#논리적인');
            else moods.push('#차분한');
        } else if (job === 'designer') {
            moods.push('#창의적인');
            if (strength === 'visual') moods.push('#감각적인');
            else if (strength === 'ux') moods.push('#사용자 중심');
            else moods.push('#세련된');
        } else if (job === 'marketer') {
            moods.push('#전략적인');
            if (strength === 'data') moods.push('#분석적인');
            else if (strength === 'creative') moods.push('#창의적인');
            else moods.push('#역동적인');
        }

        // 자기소개 기반 추가 무드
        const introLower = intro.toLowerCase();
        if (introLower.includes('열정') || introLower.includes('passion')) {
            moods.push('#열정적인');
        }
        if (introLower.includes('협업') || introLower.includes('팀') || introLower.includes('collaboration')) {
            moods.push('#협력적인');
        }

        // 최대 3개로 제한
        return moods.slice(0, 3);
    };
    // 경력 연차 계산
    const calculateYearsFromCareer = (careerText) => {
        if (!careerText) return 0;

        const yearMatch = careerText.match(/(\d+)\s*(?:년|year)/i);
        if (yearMatch) return parseInt(yearMatch[1]);

        const periodMatch = careerText.match(/(\d{4})\s*-\s*(\d{4}|현재|Present)/i);
        if (periodMatch) {
            const startYear = parseInt(periodMatch[1]);
            const endYear = periodMatch[2].match(/\d{4}/)
                ? parseInt(periodMatch[2])
                : new Date().getFullYear();
            return endYear - startYear;
        }

        return 3;
    };
    // 시장 인사이트 가져오기
    const fetchMarketInsights = async (jobType, yearsExp, skills) => {
        setLoadingInsights(true);

        try {
            const response = await fetch('/api/get-market-insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jobType,
                    yearsExperience: yearsExp,
                    userSkills: skills
                })
            });

            const insights = await response.json();
            setMarketInsights(insights);
            console.log('Market insights loaded:', insights);
        } catch (error) {
            console.error('Failed to fetch insights:', error);
        } finally {
            setLoadingInsights(false);
        }
    };
    // 포트폴리오 생성
    const handleCreatePortfolio = async (data = analyzedData) => {
        if (!data) {
            console.error('No data available for portfolio creation');
            return;
        }
        try {
            const { profileData, inferredJob, inferredStrength, inferredMoods, name } = data;
            if (user) {
                await updateUserProfile(user.id, profileData);
                const getTemplateFromStrength = (strength) => {
                    const templateMap = {
                        'problem': 'problem', 'tech': 'tech', 'impl': 'impl',
                        'visual': 'visual', 'brand': 'brand', 'ux': 'ux',
                        'data': 'data', 'strategy': 'strategy', 'creative': 'creative',
                        'revenue': 'revenue', 'ops': 'ops', 'comm': 'comm'
                    };
                    return templateMap[strength] || 'problem';
                };
                const firstPortfolio = await createPortfolio(user.id, {
                    title: `${name || '나'}의 포트폴리오`,
                    job: inferredJob,
                    strength: inferredStrength,
                    moods: inferredMoods,
                    template: getTemplateFromStrength(inferredStrength)
                });
                router.push(`/result?portfolio=${firstPortfolio.id}`);
            } else {
                const guestPortfolio = {
                    id: `guest_${Date.now()}`,
                    title: `${profileData.name || '나'}의 포트폴리오`,
                    job: inferredJob,
                    strength: inferredStrength,
                    moods: inferredMoods,
                    template: inferredStrength,
                    profile: profileData,
                    isGuest: true,
                    createdAt: new Date().toISOString()
                };

                // Use IndexedDB for data (allows large images), sessionStorage for session key
                await saveGuestPortfolio(guestPortfolio.id, guestPortfolio);
                sessionStorage.setItem('current_portfolio_id', guestPortfolio.id);

                console.log('Guest portfolio created:', guestPortfolio);
                router.push(`/result?portfolio=${guestPortfolio.id}`);
            }
        } catch (error) {
            console.error('Portfolio creation error:', error);
            alert('포트폴리오 생성 중 오류가 발생했습니다.\n\n' + error.message);
        }
    };
    // 파일 선택 핸들러
    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) handleFileUpload(file);
    };

    // 드래그 앤 드롭
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) handleFileUpload(file);
    };

    // 텍스트 붙여넣기 분석
    const handleTextAnalysis = async () => {
        if (!pastedText || pastedText.trim().length < 50) {
            alert('이력서 내용이 너무 짧습니다. 최소 50자 이상 입력해주세요.');
            return;
        }

        setIsUploading(true);
        try {
            // 텍스트 분석 (파일 파싱 단계 스킵)
            const analyzeResponse = await fetch('/api/analyze-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText: pastedText })
            });

            const analyzeData = await analyzeResponse.json();
            console.log('Analyze result:', analyzeData);

            // 프로젝트 변환
            const projects = (analyzeData.projects || []).map((proj, idx) => ({
                id: idx + 1,
                title: proj.title || '',
                desc: proj.desc || '',
                image: null
            }));

            // 직군 추론
            const inferredJob = inferJobFromSkills(analyzeData.skills || [], analyzeData);
            const inferredStrength = inferStrengthFromResume(
                analyzeData.skills || [],
                analyzeData.career_summary || '',
                analyzeData.projects || []
            );
            const inferredMoods = inferMoodsFromResume(
                inferredJob,
                inferredStrength,
                analyzeData.intro || ''
            );

            // User Profile 생성
            const yearsExp = calculateYearsFromCareer(analyzeData.career_summary || '');
            const profileData = {
                name: analyzeData.name || '',
                intro: analyzeData.intro || '',
                career_summary: analyzeData.career_summary || '',
                phone: analyzeData.phone || '',
                link: analyzeData.link || '',
                skills: analyzeData.skills || [],
                projects: projects,
                default_job: inferredJob,
                default_strength: inferredStrength,
                default_moods: inferredMoods,
                // 피어 비교를 위한 필드 추가
                job_type: inferredJob,
                years_experience: yearsExp
            };

            if (user) {
                await updateUserProfile(user.id, profileData);
                const getTemplateFromStrength = (strength) => {
                    const templateMap = {
                        'problem': 'problem', 'tech': 'tech', 'impl': 'impl',
                        'visual': 'visual', 'brand': 'brand', 'ux': 'ux',
                        'data': 'data', 'strategy': 'strategy', 'creative': 'creative',
                        'revenue': 'revenue', 'ops': 'ops', 'comm': 'comm'
                    };
                    return templateMap[strength] || 'problem';
                };

                const firstPortfolio = await createPortfolio(user.id, {
                    title: `${analyzeData.name || '나'}의 포트폴리오`,
                    job: inferredJob,
                    strength: inferredStrength,
                    moods: inferredMoods,
                    template: getTemplateFromStrength(inferredStrength)
                });

                alert(`이력서 분석 완료!\n\n분석 결과:\n직군: ${inferredJob}\n강점: ${inferredStrength}\n무드: ${inferredMoods.join(', ')}`);
                router.push(`/result?portfolio=${firstPortfolio.id}`);
            } else {
                const guestPortfolio = {
                    id: `guest_${Date.now()}`,
                    title: `${analyzeData.name || '나'}의 포트폴리오`,
                    job: inferredJob,
                    strength: inferredStrength,
                    moods: inferredMoods,
                    template: inferredStrength,
                    profile: profileData,
                    isGuest: true,
                    createdAt: new Date().toISOString()
                };

                await saveGuestPortfolio(guestPortfolio.id, guestPortfolio);
                sessionStorage.setItem('current_portfolio_id', guestPortfolio.id);

                alert(`이력서 분석 완료!\n\n분석 결과:\n직군: ${inferredJob}\n강점: ${inferredStrength}\n무드: ${inferredMoods.join(', ')}`);
                router.push(`/result?portfolio=${guestPortfolio.id}`);
            }

        } catch (error) {
            console.error('Text analysis error:', error);
            alert('텍스트 분석 중 오류가 발생했습니다.\n\n' + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    // 설문조사 시작
    const handleSurveyStart = () => {
        router.push('/survey');
    };

    return (
        <>
            <BackgroundElements showGround={false} />
            <MoodEffectLayer mood={['#차분한']} />

            <div className="min-h-screen relative z-[99999] flex flex-col items-center justify-center p-8">
                {/* 상단 네비게이션 */}
                <div className="absolute top-8 right-8 flex gap-3">
                    <button
                        onClick={() => router.push('/home')}
                        className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-gray-600 text-gray-700 rounded-lg hover:bg-white/20 transition font-medium"
                    >
                        홈으로
                    </button>
                    {!user && (
                        <button
                            onClick={() => router.push('/login')}
                            className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-gray-600 text-gray-700 rounded-lg hover:bg-white/20 transition font-medium"
                        >
                            로그인
                        </button>
                    )}
                </div>

                {/* 헤더 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl font-bold text-gray-800 mb-4">포트폴리오 만들기</h1>
                    <p className="text-gray-700 text-lg">어떤 방법으로 시작하시겠어요?</p>
                </motion.div>

                {/* 선택 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
                    {/* 이력서 업로드 카드 */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>

                        <div className="relative bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 h-full flex flex-col">
                            <div className="text-6xl mb-4"></div>
                            <h2 className="text-3xl font-bold text-white mb-2">이력서 업로드</h2>
                            <p className="text-emerald-400 font-bold mb-4">가장 빠른 방법!</p>
                            <p className="text-gray-200 mb-6 flex-grow">
                                이력서 파일을 업로드하면 AI가 자동으로 분석하여<br />
                                3분 안에 포트폴리오를 완성할 수 있습니다.
                            </p>

                            {/* Error Message Display */}
                            {errorMessage && (
                                <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="text-red-400 font-bold">{errorMessage.error}</p>
                                        <button
                                            onClick={() => setErrorMessage(null)}
                                            className="text-red-400 hover:text-red-300 text-xl leading-none"
                                        >
                                            ×
                                        </button>
                                    </div>
                                    {errorMessage.suggestion && (
                                        <p className="text-sm text-red-300 mt-2">
                                            {errorMessage.suggestion}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* 드래그 앤 드롭 영역 */}
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${dragActive
                                    ? 'border-emerald-400 bg-emerald-500/10'
                                    : 'border-white/20 hover:border-white/40'
                                    }`}
                            >
                                {isUploading ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="animate-spin h-8 w-8 border-4 border-emerald-400 border-t-transparent rounded-full"></div>
                                        <p className="text-white font-bold">분석 중...</p>
                                    </div>
                                ) : pasteMode ? (
                                    <>
                                        <p className="text-white font-bold mb-3">이력서 텍스트를 붙여넣으세요</p>
                                        <textarea
                                            value={pastedText}
                                            onChange={(e) => setPastedText(e.target.value)}
                                            placeholder="PDF에서 복사한 이력서 내용을 여기에 붙여넣으세요..."
                                            className="w-full h-48 bg-black/30 border border-white/20 rounded-lg p-4 text-white text-sm resize-none focus:outline-none focus:border-emerald-400"
                                        />
                                        <div className="flex gap-2 mt-3">
                                            <button
                                                onClick={handleTextAnalysis}
                                                disabled={!pastedText || pastedText.trim().length < 50}
                                                className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                분석 시작
                                            </button>
                                            <button
                                                onClick={() => { setPasteMode(false); setPastedText(''); }}
                                                className="px-4 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition"
                                            >
                                                취소
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white font-bold mb-2">파일을 드래그하거나</p>
                                        <label className="cursor-pointer">
                                            <span className="inline-block px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg hover:brightness-110 transition">
                                                파일 선택
                                            </span>
                                            <input
                                                type="file"
                                                accept=".docx,.pdf,.txt"
                                                onChange={handleFileSelect}
                                                className="hidden"
                                            />
                                        </label>
                                        <p className="text-gray-300 text-sm mt-3">DOCX, PDF, TXT 지원</p>
                                        <div className="mt-4 pt-4 border-t border-white/10">
                                            <button
                                                onClick={() => setPasteMode(true)}
                                                className="text-sm text-emerald-400 hover:text-emerald-300 underline"
                                            >
                                                PDF 텍스트 직접 붙여넣기
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* 설문조사 카드 */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="relative group"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur opacity-25 group-hover:opacity-75 transition duration-300"></div>

                        <div className="relative bg-black/40 backdrop-blur-md border border-white/10 rounded-3xl p-8 h-full flex flex-col">
                            <div className="text-6xl mb-4"></div>
                            <h2 className="text-3xl font-bold text-white mb-2">직접 작성</h2>
                            <p className="text-blue-400 font-bold mb-4">차근차근 입력하기</p>
                            <p className="text-gray-200 mb-6 flex-grow">
                                이력서가 없거나 직접 작성하고 싶다면<br />
                                간단한 설문을 통해 포트폴리오를 만들 수 있습니다.
                            </p>

                            <button
                                onClick={handleSurveyStart}
                                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:brightness-110 transition shadow-lg"
                            >
                                설문 시작하기 →
                            </button>

                            <div className="mt-4 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-200">
                                    <span className="text-blue-400"></span>
                                    <span>직무 및 강점 선택</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-200">
                                    <span className="text-blue-400"></span>
                                    <span>무드 및 스타일 설정</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-200">
                                    <span className="text-blue-400"></span>
                                    <span>프로젝트 상세 입력</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* 하단 안내 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-12 text-center"
                >
                    <p className="text-gray-700 text-sm">
                        이력서가 있다면 업로드를 추천드려요. 훨씬 빠릅니다!
                    </p>
                </motion.div>
            </div>

            {/* Widget Open Animation */}
            {showWidget && !hideGif && (
                <motion.div
                    initial={{ x: '100vw', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{
                        type: 'spring',
                        stiffness: 60,
                        damping: 18,
                        duration: 2.0
                    }}
                    className="fixed bottom-8 z-[100]"
                    style={{ right: '-26px' }}
                >
                    <img
                        src="/widget_open.gif"
                        alt="Widget Opening"
                        className="h-auto drop-shadow-2xl"
                        style={{ width: '265px' }}
                    />
                </motion.div>
            )}
        </>
    );
}
