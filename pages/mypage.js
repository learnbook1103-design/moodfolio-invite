import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import BackgroundElements from '../components/BackgroundElements';
import MoodEffectLayer from '../components/MoodEffectLayer';
import PortfolioPreviewCard from '../components/PortfolioPreviewCard';
import ShareModal from '../components/ShareModal';
import ImportResumeButton from '../components/ImportResumeButton';
import ProfileCompleteness from '../components/ProfileCompleteness';
// NoticeBanner removed

import { supabase } from '../lib/supabase';
import { getUserProfile, updateUserProfile, getPortfolios, createPortfolio, deletePortfolio as deletePortfolioDB } from '../lib/db';
import { signOut } from '../lib/auth';
import { JOB_SPECS } from '../lib/jobData';

export default function MyPage() {
    const router = useRouter();
    const [portfolios, setPortfolios] = useState([]);
    const [userProfile, setUserProfile] = useState({
        name: '',
        intro: '',
        career_summary: '',
        email: '',
        phone: '',
        link: '',
        skills: [],
        projects: [],
        profile_image: null,
        default_job: 'developer',
        default_strength: 'problem',
        default_moods: ['#차분한'],
        chat_answers: {
            best_project: '',
            role_contribution: '',
            core_skills: ''
        }
    });
    const [user, setUser] = useState(null);
    // Simplified loading state
    const [isLoading, setIsLoading] = useState(true);

    // [NEW] Tab State
    const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'projects', 'portfolios'

    // [NEW] Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [selectedPortfolioId, setSelectedPortfolioId] = useState(null);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [statusLog, setStatusLog] = useState(''); // Debug Log State
    const [isGeneratingChat, setIsGeneratingChat] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Notices logic removed

    useEffect(() => {
        console.log('MyPage Loaded - v2.1 (Simple Loading Logic)');
        loadData();

        // [NEW] Handle tab query parameter for direct navigation
        if (router.query.tab) {
            setActiveTab(router.query.tab);
        }

        const handleRouteChange = (url) => {
            if (url.split('?')[0] === '/mypage') {
                console.log('Route changed to mypage, reloading...');
                loadData();
            }
        };

        router.events?.on('routeChangeComplete', handleRouteChange);

        // Safety timeout (3 seconds)
        const timeout = setTimeout(() => {
            console.warn('Loading timeout reached (3s), forcing disable');
            setIsLoading(false);
        }, 3000);

        return () => {
            clearTimeout(timeout);
            router.events?.off('routeChangeComplete', handleRouteChange);
        };
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        console.log('loadData started...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('User fetched:', user?.email);

            if (!user) {
                console.log('No user, redirecting to login');
                router.push('/login');
                return;
            }
            setUser(user);

            // Check if user is admin
            const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim());
            setIsAdmin(adminEmails.includes(user.email));

            // Load profile from DB
            const profile = await getUserProfile(user.id);
            console.log('Profile fetched:', profile ? 'Found' : 'New');

            if (profile) {
                // Ensure chat_answers structure exists even if DB returns null for it
                const mergedProfile = {
                    ...userProfile, // Default structure
                    ...profile,
                    chat_answers: {
                        ...userProfile.chat_answers,
                        ...(profile.chat_answers || {})
                    }
                };
                console.log('Projects in profile:', profile.projects);
                console.log('Projects count:', profile.projects?.length || 0);
                setUserProfile(mergedProfile);
            } else {
                // New user - just set default structure, don't save to DB yet
                console.log('No profile found - using default structure');
            }

            // Load portfolios from DB
            const portfoliosList = await getPortfolios(user.id);
            console.log('Portfolios fetched:', portfoliosList?.length);
            setPortfolios(portfoliosList);

        } catch (e) {
            console.error('Load error:', e);
        } finally {
            console.log('loadData finished');
            setIsLoading(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);
    const [savedSuccess, setSavedSuccess] = useState(false);

    const saveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await updateUserProfile(user.id, userProfile);

            // Dispatch custom event for same-tab sync
            window.dispatchEvent(new CustomEvent('userProfileUpdated', {
                detail: userProfile
            }));

            // Show success feedback
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 3000);

            // alert removed
        } catch (e) {
            console.error('Save error:', e);
            if (window.confirm('저장 중 오류가 발생했습니다. (이미지 용량 초과 가능성)\n\n이미지를 제외하고 글자 정보만 저장하시겠습니까?')) {
                try {
                    const safeProfile = {
                        ...userProfile,
                        profile_image: null, // Remove profile image
                        projects: userProfile.projects.map(p => ({ ...p, image: null }))
                    };
                    await updateUserProfile(user.id, safeProfile);
                    setUserProfile(safeProfile);

                    setSavedSuccess(true);
                    setTimeout(() => setSavedSuccess(false), 3000);
                    // alert('이미지를 제외하고 저장되었습니다.');
                } catch (retryError) {
                    console.error('Retry save error:', retryError);
                    alert(`저장 실패: ${retryError.message}`);
                }
            }
        } finally {
            setIsSaving(false);
        }
    };

    const updateProfileField = (field, value) => {
        console.log('Updating profile field:', field, 'Value length:', value?.length || 'N/A');
        setUserProfile(prev => ({ ...prev, [field]: value }));
    };

    const addProject = () => {
        const newProject = {
            id: Date.now(), // Use timestamp for unique ID after deletions
            title: '',
            desc: '',
            image: null,
            period: '',
            role: '',
            team_size: '',
            skills: '',
            github: '',
            live_url: '',
            achievements: ''
        };
        setUserProfile(prev => ({
            ...prev,
            projects: [newProject, ...prev.projects] // Add at beginning
        }));
    };

    const updateProject = (id, field, value) => {
        setUserProfile(prev => ({
            ...prev,
            projects: prev.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
        }));
    };

    const deleteProject = (id) => {
        if (window.confirm('이 프로젝트를 삭제하시겠습니까?')) {
            setUserProfile(prev => ({
                ...prev,
                projects: prev.projects.filter(p => !p.id || p.id !== id)
            }));
        }
    };

    const openCreateModal = () => {
        setNewPortfolioName('나의 멋진 포트폴리오');
        setStatusLog(''); // Clear log
        setIsCreateModalOpen(true);
    };

    const handleCreatePortfolio = async () => {
        const addLog = (msg) => setStatusLog(prev => prev + '\n' + msg);

        addLog('0. 시작...');
        if (!newPortfolioName.trim()) {
            addLog('! 이름이 비어있음');
            return;
        }

        // Auth Check
        addLog('1. 유저 확인 중...');
        let currentUser = user;
        if (!currentUser) {
            addLog('...서버 요청 중');
            const { data } = await supabase.auth.getUser();
            addLog(`...서버 응답: ${data.user ? '있음' : '없음'}`);
            currentUser = data.user;
        }

        if (!currentUser) {
            addLog('! 로그인 필요');
            setTimeout(() => router.push('/login'), 1000);
            return;
        }

        // Create Portfolio
        try {
            addLog('2. DB 저장 시도...');

            // Use default values from user profile (from survey or inferred from resume)
            const portfolioJob = userProfile.default_job || 'developer';
            const portfolioStrength = userProfile.default_strength || 'problem';
            const portfolioMoods = userProfile.default_moods || ['#차분한'];

            // Map strength to template
            const getTemplateFromStrength = (strength) => {
                const templateMap = {
                    'problem': 'problem',
                    'tech': 'tech',
                    'impl': 'impl',
                    'visual': 'visual',
                    'brand': 'brand',
                    'ux': 'ux',
                    'data': 'data',
                    'strategy': 'strategy',
                    'creative': 'creative',
                    'revenue': 'revenue',
                    'ops': 'ops',
                    'comm': 'comm'
                };
                return templateMap[strength] || 'problem';
            };

            const newPortfolio = await createPortfolio(currentUser.id, {
                title: newPortfolioName,
                job: portfolioJob,
                strength: portfolioStrength,
                moods: portfolioMoods,
                template: getTemplateFromStrength(portfolioStrength)
            });

            addLog(`3. 결과: ${newPortfolio ? '성공' : '실패'}`);

            if (newPortfolio) {
                setPortfolios([newPortfolio, ...portfolios]);
                addLog('4. 이동 중...');
                setTimeout(() => {
                    setIsCreateModalOpen(false);
                    router.push(`/result?portfolio=${newPortfolio.id}`);
                }, 500);
            } else {
                addLog('! DB 응답 데이터 없음');
            }
        } catch (e) {
            console.error(e);
            addLog(`! 에러: ${e.message}`);
        }
    };

    const selectPortfolio = (id) => {
        router.push(`/result?portfolio=${id}`);
    };

    const deletePortfolio = async (id) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            try {
                await deletePortfolioDB(id);
                setPortfolios(portfolios.filter(p => p.id !== id));
            } catch (e) {
                console.error(e);
                alert('삭제 중 오류가 발생했습니다.');
            }
        }
    };

    const handleShare = (portfolioId) => {
        setSelectedPortfolioId(portfolioId);
        setIsShareModalOpen(true);
    };


    const renamePortfolio = async (id) => {
        const p = portfolios.find(x => x.id === id);
        if (!p) return;

        const newName = window.prompt('포트폴리오 새 이름', p.name);
        if (!newName) return;

        try {
            await updatePortfolio(id, { name: newName });
            setPortfolios(portfolios.map(x => x.id === id ? { ...x, name: newName } : x));
        } catch (e) {
            console.error(e);
            alert('이름 변경 중 오류가 발생했습니다.');
        }
    };

    // Resume import handler
    const handleResumeImport = async (resumeText, images, projects) => {
        console.log('handleResumeImport called. Projects:', projects?.length, 'Images:', images?.length);

        try {
            // Call AI to analyze resume
            const response = await fetch('/api/analyze-resume', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText })
            });

            const data = await response.json();
            console.log('Analyze API result:', data);

            if (data.name || data.intro || data.career_summary) {
                // Determine which projects to use based on count
                let convertedProjects = [];
                const passedCount = projects ? projects.length : 0;
                const analyzedCount = data.projects ? data.projects.length : 0;

                console.log(`Project Count Comparison: Parsed(File)=${passedCount}, Analyzed(Text)=${analyzedCount}`);

                // Use the source that detected more projects, but prioritize passed projects if counts are equal (to keep image manual assignments)
                if (passedCount > 0 && passedCount >= analyzedCount) {
                    console.log('Using passed projects array (File Structure)');
                    convertedProjects = projects.map((proj, idx) => ({
                        id: idx + 1,
                        title: proj.title || '',
                        desc: proj.desc || '',
                        duration: proj.duration || null,
                        period: proj.duration || null,
                        // Check for matched images first
                        image: (proj.images && proj.images.length > 0) ? proj.images[0] : (images && images[idx] ? images[idx] : null)
                    }));
                } else {
                    console.log('Using analyzed projects array (Text Regex) - Found more items');
                    convertedProjects = (data.projects || []).map((proj, idx) => ({
                        ...proj,
                        id: idx + 1,
                        duration: proj.duration || null,
                        period: proj.duration || null,
                        // Fallback to sequential image assignment since we lost manual matching key
                        image: images && images[idx] ? images[idx] : null
                    }));
                }

                console.log('Final converted projects:', convertedProjects);

                // Check if user has existing data
                const hasExistingData = userProfile.name || userProfile.intro || userProfile.career_summary || (userProfile.projects && userProfile.projects.length > 0);

                let newProfile;

                if (hasExistingData) {
                    // Ask user if they want to overwrite existing data
                    const shouldOverwrite = window.confirm(
                        '이력서 내용으로 기존 개인정보를 덮어쓰시겠습니까?\n\n' +
                        '확인: 이력서 내용으로 전체 교체\n' +
                        '취소: 빈 항목만 채우기'
                    );

                    if (shouldOverwrite) {
                        // Overwrite with resume data (preserve email)
                        newProfile = {
                            ...userProfile,
                            name: data.name || userProfile.name,
                            intro: data.intro || userProfile.intro,
                            career_summary: data.career_summary || userProfile.career_summary,
                            phone: data.phone || userProfile.phone,
                            link: data.link || userProfile.link,
                            skills: data.skills || userProfile.skills,
                            projects: convertedProjects.length > 0 ? convertedProjects : userProfile.projects
                        };
                    } else {
                        // Only fill empty fields
                        newProfile = {
                            ...userProfile,
                            name: userProfile.name || data.name,
                            intro: userProfile.intro || data.intro,
                            career_summary: userProfile.career_summary || data.career_summary,
                            phone: userProfile.phone || data.phone,
                            link: userProfile.link || data.link,
                            skills: (userProfile.skills && userProfile.skills.length > 0) ? userProfile.skills : data.skills,
                            projects: (userProfile.projects && userProfile.projects.length > 0) ? userProfile.projects : convertedProjects
                        };
                    }
                } else {
                    // No existing data, just use resume data
                    newProfile = {
                        ...userProfile,
                        name: data.name || '',
                        intro: data.intro || '',
                        career_summary: data.career_summary || '',
                        phone: data.phone || '',
                        link: data.link || '',
                        skills: data.skills || [],
                        projects: convertedProjects
                    };
                }

                if (user) {
                    console.log('Attempting to save imported profile for user:', user.id);
                    try {
                        const result = await updateUserProfile(user.id, newProfile);
                        console.log('Save result:', result);
                        setUserProfile(newProfile);
                        alert('이력서 내용을 성공적으로 불러왔습니다!');
                    } catch (e) {
                        console.error('Import save error:', e);
                        // Retry without images if payload is likely too large
                        console.warn('Retrying without images...');
                        try {
                            const safeProfile = {
                                ...newProfile,
                                projects: newProfile.projects.map(p => ({ ...p, image: null }))
                            };
                            await updateUserProfile(user.id, safeProfile);
                            setUserProfile(safeProfile);
                            alert('이미지 용량이 너무 커서 텍스트 정보만 저장했습니다.');
                        } catch (retryError) {
                            console.error('Retry save error:', retryError);
                            alert(`저장 중 오류가 발생했습니다: ${e.message}`);
                        }
                    }
                } else {
                    console.warn('No user found, skipping DB save');
                    setUserProfile(newProfile);
                }
            } else {
                alert('이력서에서 정보를 추출하지 못했습니다. 직접 입력해주세요.');
            }
        } catch (error) {
            console.error('Resume analysis failed:', error);
            alert('이력서 분석 중 오류가 발생했습니다.');
        }
    };

    // Handle field click from ProfileCompleteness
    const handleFieldClick = (fieldName) => {
        // Map field names to input element IDs or names
        const fieldMap = {
            'name': 'input-name',
            'email': 'input-email',
            'phone': 'input-phone',
            'profile_image': 'profile-image-section',
            'intro': 'input-intro',
            'job': 'input-job',
            'strength': 'input-strength',
            'career_summary': 'input-career-summary',
            'projects': 'projects-section',
            'projects_count': 'projects-section',
            'projects_complete': 'projects-section',
            'skills': 'input-skills',
            'github': 'input-link',
            'linkedin': 'input-link'
        };

        const elementId = fieldMap[fieldName];
        if (elementId) {
            // Switch to relevant tab
            if (['projects', 'projects_count', 'projects_complete'].includes(fieldName)) {
                setActiveTab('projects');
            } else {
                setActiveTab('profile');
            }

            // Wait for tab switch animation, then scroll
            setTimeout(() => {
                // Special handling for project-related fields
                if (['projects', 'projects_count', 'projects_complete'].includes(fieldName)) {
                    // Find the first incomplete project
                    const firstIncompleteProject = userProfile.projects.find(p =>
                        !p.title || !p.desc || !p.skills
                    );

                    if (firstIncompleteProject) {
                        // Find the DOM element for this project
                        const projectElements = document.querySelectorAll('[id^="project-"]');
                        const targetElement = Array.from(projectElements).find(el =>
                            el.id === `project-${firstIncompleteProject.id}`
                        );

                        if (targetElement) {
                            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            targetElement.classList.add('ring-4', 'ring-emerald-500/50');
                            setTimeout(() => {
                                targetElement.classList.remove('ring-4', 'ring-emerald-500/50');
                            }, 2000);
                            return;
                        }
                    }
                }

                // Default behavior for other fields
                const element = document.getElementById(elementId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Focus if it's an input
                    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                        element.focus();
                    }
                    element.classList.add('ring-4', 'ring-emerald-500/50');
                    setTimeout(() => {
                        element.classList.remove('ring-4', 'ring-emerald-500/50');
                    }, 2000);
                }
            }, 300);
        }
    };

    const handleGenerateChatAnswers = async () => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        setIsGeneratingChat(true);

        try {
            const { preparePortfolioRAG } = await import('../lib/portfolioRAG');

            // Fix: Create a clean copy of the profile without existing chat_answers 
            // to prevent the AI from referencing deleted/stale data during regeneration.
            const cleanProfile = {
                ...userProfile,
                chat_answers: null
            };

            const context = preparePortfolioRAG(cleanProfile);

            if (!context || context.length < 50) {
                alert('포트폴리오 내용이 너무 적어 답변을 생성할 수 없습니다. 내용을 조금 더 채워주세요!');
                return;
            }

            const res = await fetch(`${apiUrl}/generate-chat-answers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ portfolio_context: context })
            });

            if (!res.ok) throw new Error('서버 응답 오류 (Generation failed)');
            const data = await res.json();

            if (data.error) {
                alert(`AI 답변 생성 실패: ${data.error}`);
                console.error('API returned error:', data.error);
                return;
            }

            setUserProfile(prev => ({
                ...prev,
                chat_answers: data
            }));
            alert('AI 답변 초안이 제작되었습니다! 내용을 확인해 보세요.');
        } catch (error) {
            console.error('Error generating chat answers:', error);
            alert(`답변 생성 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsGeneratingChat(false);
        }
    };



    return (
        <div className="min-h-screen bg-[#FFFCF5] text-stone-800 relative">
            {/* NoticeBanner removed */}

            {/* <BackgroundElements mood={userProfile.default_moods} /> */}
            {/* <MoodEffectLayer mood={['#차분한']} /> */}

            {isLoading ? (
                // Loading State
                <div className="min-h-screen relative z-10 flex flex-col items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mb-4"></div>
                        <p className="text-stone-800 text-xl font-medium">데이터를 불러오는 중...</p>
                        <p className="text-stone-400 text-sm mt-2">잠시만 기다려주세요</p>

                        <button
                            onClick={() => setIsLoading(false)}
                            className="mt-8 px-4 py-2 text-sm text-stone-500 hover:text-stone-800 underline transition-colors"
                        >
                            로딩 건너뛰기
                        </button>
                    </div>
                </div>
            ) : (
                <div className="min-h-screen relative z-10 flex flex-col items-center p-8 py-16">
                    {/* Top Right Buttons */}
                    <div className="fixed top-6 right-6 z-50 flex gap-3">

                        {/* Home Button (New) */}
                        <button
                            onClick={() => router.push('/home')}
                            className="px-4 py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
                        >
                            <span>메인으로</span>
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={async () => {
                                const { error } = await signOut();
                                if (error) {
                                    alert('로그아웃 중 오류가 발생했습니다.');
                                    console.error('Logout error:', error);
                                } else {
                                    router.push('/');
                                }
                            }}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm hover:shadow-md group"
                        >
                            <span>로그아웃</span>
                        </button>
                    </div>

                    {/* Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-5xl font-bold text-stone-800 mb-4 drop-shadow-sm">My Page</h1>
                        <p className="text-stone-500 text-lg">개인 정보와 프로젝트를 관리하세요</p>
                    </motion.div>

                    {/* Tab Navigation */}
                    <div className="w-full max-w-4xl mb-8">
                        <div className="flex gap-2 bg-white border border-stone-200 rounded-xl p-2 shadow-sm backdrop-blur-md">
                            <button
                                onClick={() => setActiveTab('profile')}
                                className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'profile'
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                                    }`}
                            >
                                개인 정보
                            </button>
                            <button
                                onClick={() => setActiveTab('projects')}
                                className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'projects'
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                                    }`}
                            >
                                프로젝트
                            </button>
                            <button
                                onClick={() => setActiveTab('portfolios')}
                                className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'portfolios'
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                                    }`}
                            >
                                포트폴리오
                            </button>
                            <button
                                onClick={() => setActiveTab('ai-docent')}
                                className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'ai-docent'
                                    ? 'bg-emerald-500 text-white shadow-md'
                                    : 'text-stone-400 hover:text-stone-700 hover:bg-stone-50'
                                    }`}
                            >
                                AI 도슨트 설정
                            </button>
                        </div>
                    </div>

                    <div className="w-full max-w-4xl space-y-8">
                        {/* Profile Completeness Card */}
                        <ProfileCompleteness
                            userData={userProfile}
                            onFieldClick={handleFieldClick}
                        />

                        {/* Personal Info Section */}
                        {activeTab === 'profile' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm"
                            >
                                <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={userProfile.profile_image || '/profile.png'}
                                            alt="Profile"
                                            className="w-10 h-10 rounded-full object-cover border border-stone-200"
                                        />
                                        <span>개인 정보</span>
                                    </div>
                                    <ImportResumeButton onImport={handleResumeImport} />
                                </h2>

                                <div className="space-y-4">
                                    {/* Profile Image Upload */}
                                    <div id="profile-image-section" className="flex flex-col items-center mb-6">
                                        <label className="block text-sm font-bold text-stone-500 mb-3">프로필 사진</label>
                                        <div className="relative group">
                                            {userProfile.profile_image ? (
                                                <div className="relative">
                                                    <img
                                                        src={userProfile.profile_image}
                                                        alt="Profile"
                                                        className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                                                    />
                                                    <button
                                                        onClick={() => updateProfileField('profile_image', null)}
                                                        className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md transition"
                                                        title="사진 제거"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-32 h-32 rounded-full bg-slate-100 border-4 border-white flex items-center justify-center text-4xl shadow-inner">

                                                </div>
                                            )}
                                        </div>
                                        <label className="mt-4 px-4 py-2 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2 shadow-sm">
                                            <span></span>
                                            <span>{userProfile.profile_image ? '사진 변경' : '사진 업로드'}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        // Check file size (max 2MB)
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            alert('파일 크기는 2MB 이하여야 합니다.');
                                                            e.target.value = ''; // Reset input
                                                            return;
                                                        }

                                                        // Compress image before uploading
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => {
                                                            const img = new Image();
                                                            img.onload = () => {
                                                                try {
                                                                    // Create canvas for compression
                                                                    const canvas = document.createElement('canvas');
                                                                    const ctx = canvas.getContext('2d');

                                                                    // Calculate new dimensions (max 400x400)
                                                                    let width = img.width;
                                                                    let height = img.height;
                                                                    const maxSize = 400;

                                                                    if (width > height) {
                                                                        if (width > maxSize) {
                                                                            height = (height * maxSize) / width;
                                                                            width = maxSize;
                                                                        }
                                                                    } else {
                                                                        if (height > maxSize) {
                                                                            width = (width * maxSize) / height;
                                                                            height = maxSize;
                                                                        }
                                                                    }

                                                                    canvas.width = width;
                                                                    canvas.height = height;
                                                                    ctx.drawImage(img, 0, 0, width, height);

                                                                    // Convert to base64 with compression (0.8 quality)
                                                                    const compressedImage = canvas.toDataURL('image/jpeg', 0.8);
                                                                    updateProfileField('profile_image', compressedImage);
                                                                    console.log('Image compressed successfully:', compressedImage.length, 'bytes');
                                                                } catch (error) {
                                                                    console.error('Image compression error:', error);
                                                                    alert('이미지 처리 중 오류가 발생했습니다.');
                                                                    e.target.value = ''; // Reset input
                                                                }
                                                            };
                                                            img.onerror = () => {
                                                                console.error('Image load error');
                                                                alert('이미지를 불러올 수 없습니다. 다른 파일을 선택해주세요.');
                                                                e.target.value = ''; // Reset input
                                                            };
                                                            img.src = reader.result;
                                                        };
                                                        reader.onerror = () => {
                                                            console.error('FileReader error');
                                                            alert('파일을 읽을 수 없습니다.');
                                                            e.target.value = ''; // Reset input
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                        <p className="text-xs text-gray-500 mt-2">권장: 정사각형 이미지, 최대 2MB</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-500 mb-2">이름</label>
                                            <input
                                                type="text"
                                                value={userProfile.name}
                                                onChange={(e) => updateProfileField('name', e.target.value)}
                                                id="input-name"
                                                placeholder="홍길동"
                                                className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-stone-500 mb-2">연락처 (Phone)</label>
                                            <input
                                                type="text"
                                                value={userProfile.phone || ''}
                                                onChange={(e) => updateProfileField('phone', e.target.value)}
                                                id="input-phone"
                                                placeholder="010-1234-5678"
                                                className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                            />
                                            <p className="text-xs text-stone-400 mt-2">채용 담당자가 연락할 수 있는 번호를 입력하세요</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-500 mb-2">대표 직무 (Main Job)</label>
                                            <div className="relative">
                                                <select
                                                    value={userProfile.default_job || 'developer'}
                                                    onChange={(e) => {
                                                        const newJob = e.target.value;
                                                        updateProfileField('default_job', newJob);
                                                        // Reset strength when job changes
                                                        const defaultStrength = JOB_SPECS[newJob]?.strengths[0]?.id || '';
                                                        updateProfileField('default_strength', defaultStrength);
                                                    }}
                                                    id="input-job"
                                                    className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                                                >
                                                    {Object.entries(JOB_SPECS).map(([key, spec]) => (
                                                        <option key={key} value={key} className="bg-white text-stone-800">
                                                            {spec.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                                    ▼
                                                </div>
                                            </div>
                                            <p className="text-xs text-stone-400 mt-2">포트폴리오 생성 시 기본값으로 사용됩니다</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-stone-500 mb-2">대표 강점 (Main Strength)</label>
                                            <div className="relative">
                                                <select
                                                    value={userProfile.default_strength || ''}
                                                    onChange={(e) => updateProfileField('default_strength', e.target.value)}
                                                    id="input-strength"
                                                    className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                                                >
                                                    {JOB_SPECS[userProfile.default_job || 'developer']?.strengths.map((strength) => (
                                                        <option key={strength.id} value={strength.id} className="bg-white text-stone-800">
                                                            {strength.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                                    ▼
                                                </div>
                                            </div>
                                            <p className="text-xs text-stone-400 mt-2">자신을 가장 잘 나타내는 강점을 선택하세요</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-stone-500 mb-2">이메일</label>
                                            <input
                                                type="email"
                                                value={userProfile.email || ''}
                                                onChange={(e) => updateProfileField('email', e.target.value)}
                                                id="input-email"
                                                placeholder="example@moodfolio.com"
                                                className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-stone-500 mb-2">링크 (GitHub/Blog)</label>
                                            <input
                                                type="text"
                                                value={userProfile.link || ''}
                                                onChange={(e) => updateProfileField('link', e.target.value)}
                                                id="input-link"
                                                placeholder="포트폴리오나 깃허브 주소를 입력하세요"
                                                className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                            />
                                            <p className="text-xs text-stone-400 mt-2">자신의 포트폴리오나 블로그 주소를 입력하세요</p>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-stone-500 mb-2">보유 기술 (Skills)</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(userProfile.skills) ? userProfile.skills.join(', ') : (userProfile.skills || '')}
                                            onChange={(e) => updateProfileField('skills', e.target.value.split(',').map(s => s.trim()))}
                                            id="input-skills"
                                            placeholder="React, Java, Python, Figma (쉼표로 구분)"
                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                        />
                                        <p className="text-xs text-stone-400 mt-2">쉼표(,)로 구분하여 여러 기술을 입력할 수 있습니다</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-stone-500 mb-2">한 줄 소개</label>
                                        <textarea
                                            rows="3"
                                            value={userProfile.intro}
                                            onChange={(e) => updateProfileField('intro', e.target.value)}
                                            id="input-intro"
                                            placeholder="안녕하세요, 끊임없이 성장하는 개발자 홍길동입니다."
                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none resize-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-stone-500 mb-2">경력 요약</label>
                                        <textarea
                                            rows="4"
                                            value={userProfile.career_summary}
                                            onChange={(e) => updateProfileField('career_summary', e.target.value)}
                                            id="input-career-summary"
                                            placeholder="○○회사 프론트엔드 개발자 (2020.03 - 현재)&#13;&#10;주요 업무: 웹 서비스 유지보수 및 신규 기능 개발"
                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none resize-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={saveProfile}
                                    disabled={isSaving}
                                    className={`mt-6 w-full py-3 font-bold rounded-lg shadow-lg hover:brightness-110 transition active:scale-95 flex items-center justify-center gap-2
                                    ${savedSuccess ? 'bg-emerald-500 text-white' : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'}
                                    ${isSaving ? 'opacity-80 cursor-wait' : ''}
                                `}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>저장 중...</span>
                                        </>
                                    ) : savedSuccess ? (
                                        <>
                                            <span>✅</span>
                                            <span>저장되었습니다!</span>
                                        </>
                                    ) : (
                                        '개인 정보 저장'
                                    )}
                                </button>
                            </motion.div>
                        )}

                        {/* Projects Section */}
                        {activeTab === 'projects' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                                        <span></span>
                                        <span>프로젝트</span>
                                    </h2>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={addProject}
                                            className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold rounded-lg transition-all"
                                        >
                                            추가
                                        </button>
                                        <button
                                            onClick={saveProfile}
                                            disabled={isSaving}
                                            className={`px-4 py-2 font-bold rounded-lg transition-all flex items-center gap-2 ${savedSuccess ? 'bg-emerald-500 text-white' : 'bg-stone-800 text-white hover:bg-stone-900'
                                                } ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>저장 중...</span>
                                                </>
                                            ) : savedSuccess ? (
                                                <>
                                                    <span>✅</span>
                                                    <span>저장 완료</span>
                                                </>
                                            ) : (
                                                <span>저장</span>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div id="projects-section" className="space-y-4">
                                    {userProfile.projects.length === 0 ? (
                                        <div className="text-center py-12 text-stone-400">
                                            <div className="text-4xl mb-2"></div>
                                            <p>아직 프로젝트가 없습니다</p>
                                            <p className="text-sm mt-1">프로젝트를 추가해보세요!</p>
                                        </div>
                                    ) : (
                                        userProfile.projects.map((project) => (
                                            <div
                                                key={project.id}
                                                id={`project-${project.id}`}
                                                className="bg-stone-50 border border-stone-200 rounded-xl p-4 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-stone-500">PROJECT {project.id}</span>
                                                    <button
                                                        onClick={() => deleteProject(project.id)}
                                                        className="flex items-center gap-1 text-red-500 hover:text-red-600 transition text-xs font-bold bg-white border border-red-100 px-2 py-1 rounded-md"
                                                        title="삭제"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                        <span>삭제</span>
                                                    </button>
                                                </div>

                                                {/* Project Image */}
                                                {project.image && (
                                                    <div className="relative group">
                                                        <img
                                                            src={project.image}
                                                            alt={project.title || 'Project image'}
                                                            className="w-full h-48 object-cover rounded-lg border border-stone-200"
                                                        />
                                                        <button
                                                            onClick={() => updateProject(project.id, 'image', null)}
                                                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition"
                                                        >
                                                            이미지 제거
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Image Upload Button */}
                                                <label className="block cursor-pointer">
                                                    <div className="w-full p-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-600 font-medium rounded-lg transition-all text-center">
                                                        {project.image ? '이미지 변경' : '이미지 업로드'}
                                                    </div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                if (file.size > 2 * 1024 * 1024) {
                                                                    alert('파일 크기는 2MB 이하여야 합니다.');
                                                                    e.target.value = '';
                                                                    return;
                                                                }

                                                                const reader = new FileReader();
                                                                reader.onloadend = () => {
                                                                    const img = new Image();
                                                                    img.onload = () => {
                                                                        try {
                                                                            const canvas = document.createElement('canvas');
                                                                            const ctx = canvas.getContext('2d');

                                                                            let width = img.width;
                                                                            let height = img.height;
                                                                            const maxSize = 800;

                                                                            if (width > height) {
                                                                                if (width > maxSize) {
                                                                                    height = (height * maxSize) / width;
                                                                                    width = maxSize;
                                                                                }
                                                                            } else {
                                                                                if (height > maxSize) {
                                                                                    width = (width * maxSize) / height;
                                                                                    height = maxSize;
                                                                                }
                                                                            }

                                                                            canvas.width = width;
                                                                            canvas.height = height;
                                                                            ctx.drawImage(img, 0, 0, width, height);

                                                                            const compressedImage = canvas.toDataURL('image/jpeg', 0.8);
                                                                            updateProject(project.id, 'image', compressedImage);
                                                                            console.log('Project image compressed:', compressedImage.length, 'bytes');
                                                                        } catch (error) {
                                                                            console.error('Image compression error:', error);
                                                                            alert('이미지 처리 중 오류가 발생했습니다.');
                                                                        }
                                                                    };
                                                                    img.onerror = () => {
                                                                        alert('이미지를 불러올 수 없습니다.');
                                                                        e.target.value = '';
                                                                    };
                                                                    img.src = reader.result;
                                                                };
                                                                reader.onerror = () => {
                                                                    alert('파일을 읽을 수 없습니다.');
                                                                    e.target.value = '';
                                                                };
                                                                reader.readAsDataURL(file);
                                                            }
                                                        }}
                                                    />
                                                </label>

                                                <input
                                                    type="text"
                                                    placeholder="프로젝트 제목"
                                                    value={project.title}
                                                    onChange={(e) => updateProject(project.id, 'title', e.target.value)}
                                                    className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                                />
                                                <textarea
                                                    rows="3"
                                                    placeholder="프로젝트 설명"
                                                    value={project.desc}
                                                    onChange={(e) => updateProject(project.id, 'desc', e.target.value)}
                                                    className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none resize-none"
                                                />

                                                {/* [RESTORED] Detailed Project Fields */}
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">작업 기간 📅</label>
                                                    <input
                                                        type="text"
                                                        value={project.period || ''}
                                                        onChange={(e) => {
                                                            let value = e.target.value;
                                                            const digitsOnly = value.replace(/[^\d]/g, '');

                                                            if (digitsOnly.length > 0) {
                                                                if (digitsOnly.length <= 2) {
                                                                    value = `(${digitsOnly}개월)`;
                                                                } else if (digitsOnly.length === 6) {
                                                                    value = `${digitsOnly.slice(0, 4)}.${digitsOnly.slice(4, 6)}`;
                                                                } else if (digitsOnly.length === 8) {
                                                                    value = `${digitsOnly.slice(0, 4)}.${digitsOnly.slice(4, 6)} - ${digitsOnly.slice(0, 4)}.${digitsOnly.slice(6, 8)}`;
                                                                } else if (digitsOnly.length === 12) {
                                                                    value = `${digitsOnly.slice(0, 4)}.${digitsOnly.slice(4, 6)} - ${digitsOnly.slice(6, 10)}.${digitsOnly.slice(10, 12)}`;
                                                                }
                                                            }
                                                            updateProject(project.id, 'period', value);
                                                        }}
                                                        placeholder="예: 202401 또는 20240106 또는 6"
                                                        className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                                    />
                                                    <p className="text-xs text-stone-400 mt-1">숫자만 입력하면 자동 변환됩니다 (예: 202401 → 2024.01)</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">역할</label>
                                                        <input
                                                            type="text"
                                                            value={project.role || ''}
                                                            onChange={(e) => updateProject(project.id, 'role', e.target.value)}
                                                            placeholder="예: 프론트엔드 개발 리드"
                                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">프로젝트 유형</label>
                                                        <select
                                                            value={project.team_size?.includes('개인') ? '개인' : project.team_size?.includes('기업') ? '기업' : project.team_size?.includes('팀') ? '팀' : ''}
                                                            onChange={(e) => {
                                                                const type = e.target.value;
                                                                if (type === '개인') {
                                                                    updateProject(project.id, 'team_size', '개인 프로젝트');
                                                                } else if (type === '기업') {
                                                                    updateProject(project.id, 'team_size', '기업 프로젝트');
                                                                } else if (type === '팀') {
                                                                    updateProject(project.id, 'team_size', '팀 프로젝트');
                                                                } else {
                                                                    updateProject(project.id, 'team_size', '');
                                                                }
                                                            }}
                                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 focus:border-emerald-500 outline-none appearance-none cursor-pointer"
                                                        >
                                                            <option value="">선택하세요</option>
                                                            <option value="개인">개인 프로젝트</option>
                                                            <option value="팀">팀 프로젝트</option>
                                                            <option value="기업">기업 프로젝트</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* 팀 프로젝트인 경우에만 팀 규모 입력 필드 표시 */}
                                                {project.team_size?.includes('팀') && (
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">팀 규모 (인원)</label>
                                                        <input
                                                            type="text"
                                                            value={project.team_size === '팀 프로젝트' ? '' : project.team_size?.replace('팀 프로젝트 (', '').replace(')', '').trim() || ''}
                                                            onChange={(e) => {
                                                                const size = e.target.value.trim();
                                                                updateProject(project.id, 'team_size', size ? `팀 프로젝트 (${size})` : '팀 프로젝트');
                                                            }}
                                                            placeholder="예: 4명"
                                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                                        />
                                                        <p className="text-xs text-stone-400 mt-1">팀 인원수를 입력하세요 (선택사항)</p>
                                                    </div>
                                                )}

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">사용 기술 💡</label>
                                                    <input
                                                        type="text"
                                                        value={project.skills || ''}
                                                        onChange={(e) => updateProject(project.id, 'skills', e.target.value)}
                                                        placeholder="React, Next.js, Tailwind CSS, Supabase"
                                                        className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                                    />
                                                    <p className="text-xs text-stone-400 mt-1">채용담당자가 가장 먼저 확인하는 정보입니다</p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">GitHub 링크</label>
                                                        <input
                                                            type="text"
                                                            value={project.github || ''}
                                                            onChange={(e) => updateProject(project.id, 'github', e.target.value)}
                                                            placeholder="https://github.com/..."
                                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 mb-1">라이브 URL</label>
                                                        <input
                                                            type="text"
                                                            value={project.live_url || ''}
                                                            onChange={(e) => updateProject(project.id, 'live_url', e.target.value)}
                                                            placeholder="https://..."
                                                            className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">주요 성과 (선택사항)</label>
                                                    <textarea
                                                        rows="2"
                                                        value={project.achievements || ''}
                                                        onChange={(e) => updateProject(project.id, 'achievements', e.target.value)}
                                                        placeholder="예: 월 활성 사용자 1,000명 달성, 페이지 로딩 속도 40% 개선"
                                                        className="w-full p-3 bg-white border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:border-emerald-500 outline-none resize-none"
                                                    />
                                                    <p className="text-xs text-stone-400 mt-1">💡 숫자로 표현하면 더 임팩트 있어요!</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                            </motion.div>
                        )}

                        {/* Portfolios Section */}
                        {activeTab === 'portfolios' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm"
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
                                        <span></span>
                                        <span>포트폴리오</span>
                                    </h2>
                                    <button
                                        onClick={openCreateModal}
                                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 font-bold rounded-lg transition-all"
                                    >
                                        새 포트폴리오
                                    </button>
                                </div>

                                {portfolios.length === 0 ? (
                                    <div className="text-center py-12 text-stone-400">
                                        <div className="text-4xl mb-2"></div>
                                        <p>아직 포트폴리오가 없습니다</p>
                                        <button
                                            onClick={openCreateModal}
                                            className="mt-4 px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg transition shadow-md"
                                        >
                                            첫 포트폴리오 만들기
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {portfolios.map((p) => (
                                            <PortfolioPreviewCard
                                                key={p.id}
                                                portfolio={p}
                                                userProfile={userProfile}
                                                onView={selectPortfolio}
                                                onRename={renamePortfolio}
                                                onDelete={deletePortfolio}
                                                onShare={handleShare}
                                            />
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* AI Docent Section */}
                        {activeTab === 'ai-docent' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border border-stone-200 rounded-2xl p-8 shadow-sm"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-stone-800 mb-2 flex items-center gap-3">
                                            <span>AI 도슨트 설정 (무무 관리)</span>
                                        </h2>
                                        <p className="text-stone-500 text-sm">채용 담당자가 챗봇에게 물어볼 핵심 질문들에 대한 답변을 미리 준비하세요.</p>
                                    </div>
                                    <button
                                        onClick={handleGenerateChatAnswers}
                                        disabled={isGeneratingChat}
                                        className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 min-w-[200px] border border-cyan-500"
                                    >
                                        {isGeneratingChat ? (
                                            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div> 생성 중...</>
                                        ) : (
                                            <>AI로 답변 초안 만들기</>
                                        )}
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Category 1: 핵심 역량 및 기술 요약 */}
                                    <div className="space-y-6">
                                        <h4 className="text-lg font-bold text-stone-800 border-l-4 border-cyan-500 pl-3">1. 핵심 역량 및 기술 요약</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { key: 'core_skills', label: '핵심 요약', q: '지원자의 핵심 역량 3가지를 요약한다면?' },
                                                { key: 'main_stack', label: '메인 스택', q: "이 포트폴리오에서 가장 주력으로 사용한 '기술 스택'은?" },
                                                { key: 'tech_depth', label: '기술 깊이', q: '기술적으로 가장 깊이 있게 파고들거나 연구해 본 분야는?' },
                                                { key: 'documentation', label: '문서화', q: '코드 작성 외에 설계 문서도 작성할 줄 아나요?' }
                                            ].map((item) => (
                                                <div key={item.key} className="space-y-2 p-4 bg-stone-50 rounded-xl border border-stone-200 hover:border-cyan-500 transition-colors">
                                                    <label className="block text-cyan-600 text-xs font-bold uppercase tracking-wider">{item.label}</label>
                                                    <p className="text-stone-500 text-[11px] leading-tight mb-2">{item.q}</p>
                                                    <textarea
                                                        value={userProfile.chat_answers?.[item.key] || ''}
                                                        onChange={(e) => setUserProfile({
                                                            ...userProfile,
                                                            chat_answers: { ...(userProfile.chat_answers || {}), [item.key]: e.target.value }
                                                        })}
                                                        className="w-full h-24 bg-white border border-stone-200 rounded-lg p-3 text-stone-800 text-xs focus:ring-1 focus:ring-cyan-500 outline-none resize-none transition-all"
                                                        placeholder="답변을 입력해주세요..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Category 2: 역할 및 기여도 검증 */}
                                    <div className="space-y-6 pt-6">
                                        <h4 className="text-lg font-bold text-stone-800 border-l-4 border-emerald-500 pl-3">2. 역할 및 기여도 검증</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { key: 'role_contribution', label: '기여도', q: '각 프로젝트에서의 지원자의 구체적인 역할과 기여도는?' },
                                                { key: 'collaboration', label: '협업 방식', q: '팀 프로젝트에서 동료들과의 협업은 어떻게 진행했나요?' },
                                                { key: 'cycle', label: '범위 확인', q: "기획부터 배포/운영까지 '전체 사이클' 경험이 있나요?" },
                                                { key: 'artifacts', label: '산출물', q: '실제 작성한 소스 코드나 디자인 원본 파일을 볼 수 있나요?' }
                                            ].map((item) => (
                                                <div key={item.key} className="space-y-2 p-4 bg-stone-50 rounded-xl border border-stone-200 hover:border-emerald-500 transition-colors">
                                                    <label className="block text-emerald-600 text-xs font-bold uppercase tracking-wider">{item.label}</label>
                                                    <p className="text-stone-500 text-[11px] leading-tight mb-2">{item.q}</p>
                                                    <textarea
                                                        value={userProfile.chat_answers?.[item.key] || ''}
                                                        onChange={(e) => setUserProfile({
                                                            ...userProfile,
                                                            chat_answers: { ...(userProfile.chat_answers || {}), [item.key]: e.target.value }
                                                        })}
                                                        className="w-full h-24 bg-white border border-stone-200 rounded-lg p-3 text-stone-800 text-xs focus:ring-1 focus:ring-emerald-500 outline-none resize-none transition-all"
                                                        placeholder="답변을 입력해주세요..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Category 3: 문제 해결 및 성과 */}
                                    <div className="space-y-6 pt-6">
                                        <h4 className="text-lg font-bold text-stone-800 border-l-4 border-amber-500 pl-3">3. 문제 해결 및 성과</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                { key: 'best_project', label: '대표작', q: '포트폴리오 중 가장 자신 있는 프로젝트를 소개한다면?' },
                                                { key: 'troubleshooting', label: '트러블슈팅', q: '진행 중 발생한 가장 치명적인 문제와 해결 과정은?' },
                                                { key: 'decision_making', label: '의사결정', q: '해당 기술(컨셉)을 선정하게 된 특별한 이유가 있나요?' },
                                                { key: 'quantitative_performance', label: '정량 성과', q: '프로젝트를 통해 얻은 구체적인 수치 성과가 있나요?' }
                                            ].map((item) => (
                                                <div key={item.key} className="space-y-2 p-4 bg-stone-50 rounded-xl border border-stone-200 hover:border-amber-500 transition-colors">
                                                    <label className="block text-amber-600 text-xs font-bold uppercase tracking-wider">{item.label}</label>
                                                    <p className="text-stone-500 text-[11px] leading-tight mb-2">{item.q}</p>
                                                    <textarea
                                                        value={userProfile.chat_answers?.[item.key] || ''}
                                                        onChange={(e) => setUserProfile({
                                                            ...userProfile,
                                                            chat_answers: { ...(userProfile.chat_answers || {}), [item.key]: e.target.value }
                                                        })}
                                                        className="w-full h-24 bg-white border border-stone-200 rounded-lg p-3 text-stone-800 text-xs focus:ring-1 focus:ring-amber-500 outline-none resize-none transition-all"
                                                        placeholder="답변을 입력해주세요..."
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-8 border-t border-stone-200 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 text-stone-500 text-sm">
                                        <span className="text-xl">💡</span>
                                        <p>저장된 정보는 챗봇 답변 시 우선 활용되며, 채용 담당자에게 **"지원자 공식 답변"**으로 안내됩니다.</p>
                                    </div>
                                    <button
                                        onClick={saveProfile}
                                        disabled={isSaving}
                                        className={`w-full md:w-auto px-10 py-4 font-bold rounded-xl shadow-md hover:shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2 ${savedSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white'
                                            } ${isSaving ? 'opacity-80 cursor-wait' : ''}`}
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>저장 중...</span>
                                            </>
                                        ) : savedSuccess ? (
                                            <>
                                                <span>✅</span>
                                                <span>저장되었습니다!</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                                <span>설정 저장하기</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* [NEW] Create Portfolio Modal */}
                        {isCreateModalOpen && (
                            <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-stone-900/50 backdrop-blur-sm"
                                onClick={(e) => { if (e.target === e.currentTarget) setIsCreateModalOpen(false); }}
                            >
                                <motion.div
                                    initial={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="bg-white border border-stone-200 p-8 rounded-2xl w-full max-w-md shadow-2xl relative"
                                >
                                    <h3 className="text-2xl font-bold text-stone-800 mb-6">새로운 포트폴리오</h3>

                                    <div className="mb-6">
                                        <label className="block text-stone-500 text-sm font-bold mb-2">포트폴리오 이름</label>
                                        <input
                                            autoFocus
                                            type="text"
                                            value={newPortfolioName}
                                            onChange={(e) => setNewPortfolioName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                                            className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-lg focus:border-emerald-500 outline-none transition-colors"
                                            placeholder="예: 2024 개발자 포트폴리오"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => setIsCreateModalOpen(false)}
                                            className="px-6 py-3 text-stone-500 hover:text-stone-800 font-bold transition-colors"
                                        >
                                            취소
                                        </button>
                                        <button
                                            onClick={handleCreatePortfolio}
                                            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95"
                                        >
                                            생성하기
                                        </button>
                                    </div>

                                    {/* Debug Log Area - [NEW] */}
                                    {statusLog && (
                                        <div className="mt-4 p-3 bg-stone-800 rounded-lg text-xs text-emerald-400 font-mono whitespace-pre-wrap animate-pulse">
                                            {statusLog}
                                        </div>
                                    )}
                                </motion.div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                portfolioId={selectedPortfolioId}
                ownerName={userProfile.name}
            />
        </div>
    );
}