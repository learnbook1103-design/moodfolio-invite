import '@/styles/globals.css';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import ChatWidget from '../components/ChatWidget';
import ErrorBoundary from '../components/ErrorBoundary';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Script from 'next/script';
import Head from 'next/head';
import { preparePortfolioRAG, hasValidPortfolioData } from '../lib/portfolioRAG';
import { loadGuestPortfolio } from '../lib/guestStore';

// [추가 1] 폰트 설정을 위해 import
import { Gowun_Batang } from 'next/font/google';

// [추가 2] Bento 템플릿의 드래그&리사이즈 기능을 위한 필수 CSS
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const gowunBatang = Gowun_Batang({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-gowun', // Tailwind에서 font-serif로 연결됨
});

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [answers, setAnswers] = useState({});
  const [chatbotMsg, setChatbotMsg] = useState("");
  const [showChatWidget, setShowChatWidget] = useState(true);
  const [currentUserData, setCurrentUserData] = useState(null);

  // 공유 링크 감지: share=true 쿼리 파라미터만 체크
  const isSharedView = router.query.share === 'true';

  // 현재 사용자의 포트폴리오 데이터 로드 (챗봇에 전달하기 위해)
  useEffect(() => {
    const loadUserPortfolio = async () => {
      try {
        // Import supabase and db functions dynamically to avoid circular dependencies
        const { supabase } = await import('../lib/supabase');
        const { getUserProfile, getPortfolios, getPublicPortfolio } = await import('../lib/db');

        // Get current portfolio ID first
        const currentPortfolioId = router.query.portfolio ||
          (typeof window !== 'undefined' ? localStorage.getItem('current_portfolio_id') : null);

        const { data: { user } } = await supabase.auth.getUser();

        // 공유 링크이고 포트폴리오 ID가 있으면 공개 포트폴리오 로드
        if (isSharedView && currentPortfolioId) {
          try {
            const publicPortfolio = await getPublicPortfolio(currentPortfolioId);
            if (publicPortfolio) {
              const ownerProfile = await getUserProfile(publicPortfolio.user_id);
              if (ownerProfile) {
                const mergedData = {
                  ...ownerProfile,
                  job: publicPortfolio.job,
                  strength: publicPortfolio.strength,
                  moods: publicPortfolio.moods
                };

                // Featured projects 로드
                const featuredIds = publicPortfolio.featured_project_ids || [];
                if (featuredIds.length > 0 && ownerProfile.projects && Array.isArray(ownerProfile.projects)) {
                  mergedData.projects = featuredIds.map(id => ownerProfile.projects[id]).filter(p => p);
                } else if (ownerProfile.projects && Array.isArray(ownerProfile.projects)) {
                  mergedData.projects = ownerProfile.projects.slice(0, 6);
                } else {
                  mergedData.projects = [];
                }

                setCurrentUserData(mergedData);
                return; // 성공 시 종료
              }
            }
          } catch (error) {
            console.error('Failed to load public portfolio for chatbot:', error);
            // 실패해도 계속 진행 (로그인한 사용자일 수 있음)
          }
        }

        if (!user) {
          // [GUEST LOGIC] Load from SessionStorage or IndexedDB
          let guestPortfolio = null;
          const guestData = typeof window !== 'undefined' ? sessionStorage.getItem('guest_portfolio') : null;

          if (guestData) {
            try {
              guestPortfolio = JSON.parse(guestData);
            } catch (e) {
              console.warn('Failed to parse guestData', e);
            }
          }

          if (!guestPortfolio && currentPortfolioId && currentPortfolioId.startsWith('guest_')) {
            try {
              guestPortfolio = await loadGuestPortfolio(currentPortfolioId);
            } catch (e) {
              console.error('Failed to load from guestStore', e);
            }
          }

          if (guestPortfolio) {
            const profile = guestPortfolio.profile || {};
            const mergedData = {
              ...profile,
              job: guestPortfolio.job,
              strength: guestPortfolio.strength,
              moods: guestPortfolio.moods,
              bgm: guestPortfolio.bgm
            };

            // Projects
            const featuredIds = guestPortfolio.featured_project_ids || [];
            if (featuredIds.length > 0 && profile.projects && Array.isArray(profile.projects)) {
              mergedData.projects = featuredIds.map(id => profile.projects[id]).filter(p => p);
            } else if (profile.projects && Array.isArray(profile.projects)) {
              mergedData.projects = profile.projects.slice(0, 6);
            } else {
              mergedData.projects = [];
            }

            setCurrentUserData(mergedData);
            return;
          }

          setCurrentUserData(null);
          return;
        }

        // Get user profile
        const profile = await getUserProfile(user.id);

        if (!profile) {
          // Even if no profile, we can use answers in onboarding
          if (router.pathname === '/onboarding' && Object.keys(answers).length > 0) {
            setCurrentUserData({ ...answers, isDraft: true });
          } else {
            setCurrentUserData(null);
          }
          return;
        }

        // If we have a profile but no portfolio ID, or we are on MyPage, 
        // use the profile for context
        if (!currentPortfolioId || router.pathname === '/mypage') {
          setCurrentUserData(profile);
          return;
        }

        // Get portfolios
        const portfolios = await getPortfolios(user.id);
        const currentPortfolio = portfolios?.find(p => p.id === currentPortfolioId);

        if (currentPortfolio) {
          // Merge profile with portfolio data (same logic as result.js)
          const mergedData = {
            ...profile,
            job: currentPortfolio.job,
            strength: currentPortfolio.strength,
            moods: currentPortfolio.moods
          };

          // Load featured projects
          const featuredIds = currentPortfolio.featured_project_ids || [];
          if (featuredIds.length > 0 && profile.projects && Array.isArray(profile.projects)) {
            mergedData.projects = featuredIds
              .map(id => profile.projects[id])
              .filter(p => (p !== undefined && p !== null));
          } else if (profile.projects && Array.isArray(profile.projects)) {
            mergedData.projects = profile.projects.slice(0, 6);
          } else {
            mergedData.projects = [];
          }

          setCurrentUserData(mergedData);
        } else {
          // Default to profile if portfolio not found
          setCurrentUserData(profile);
        }
      } catch (error) {
        console.error('Failed to load user portfolio for chatbot:', error);
        setCurrentUserData(null);
      }
    };

    loadUserPortfolio();
  }, [router.query.portfolio, router.pathname, isSharedView, answers]);

  // 포트폴리오 RAG 컨텍스트 준비 (currentUserData 사용)
  const portfolioContext = useMemo(() => {
    if (currentUserData && hasValidPortfolioData(currentUserData)) {
      return preparePortfolioRAG(currentUserData);
    }
    return null;
  }, [currentUserData]);

  // Hide ChatWidget initially on signup/onboarding page, show after GIF animation
  useEffect(() => {
    if (router.pathname === '/signup' || router.pathname === '/onboarding') {
      setShowChatWidget(false);
      const timer = setTimeout(() => {
        setShowChatWidget(true);
      }, 5000); // Match GIF removal timing (5 seconds)
      return () => clearTimeout(timer);
    } else {
      setShowChatWidget(true);
    }
  }, [router.pathname]);

  const handleChange = (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };
  const resetAnswers = () => setAnswers({});
  const triggerChatbot = (msg) => {
    setChatbotMsg(msg);
    setTimeout(() => setChatbotMsg(""), 5000);
  };

  // 🔑 키 설정
  const GOOGLE_CLIENT_ID = "53061006744-9mlb2lh79kurhcs635c5io0972ag430t.apps.googleusercontent.com";
  const KAKAO_JS_KEY = "3aa4f7b9b1ad2576fc71d8b5ef610825";

  const kakaoInit = () => {
    if (window.Kakao && !window.Kakao.isInitialized()) {
      window.Kakao.init(KAKAO_JS_KEY);
      console.log("🟡 카카오 SDK 초기화 완료");
    }
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* [추가] 폰트 변수를 최상위 div에 적용하여 전역에서 사용 가능하게 함 */}
      <div className={`${gowunBatang.variable} antialiased`} style={{ fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        <Head>
          <title>MoodFolio</title>
          {/* Pretendard 폰트 CDN */}
          <link rel="stylesheet" as="style" crossOrigin="anonymous" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
        </Head>

        {/* 카카오 SDK 로드 */}
        <Script
          src="https://developers.kakao.com/sdk/js/kakao.js"
          strategy="lazyOnload"
          onLoad={kakaoInit}
        />

        <ErrorBoundary>
          <Component
            {...pageProps}
            answers={answers}
            handleChange={handleChange}
            resetAnswers={resetAnswers}
            triggerChatbot={triggerChatbot}
            setGlobalUserData={setCurrentUserData}
          />
        </ErrorBoundary>

        {/* ChatWidget: Landing Page('/'), Preview Mode(iframe)에서는 숨김, 공유 링크(share=true)에서는 표시 */}
        {router.pathname !== '/' && (!router.asPath.includes('preview=true') || isSharedView) && showChatWidget && (
          <ChatWidget
            customMessage={chatbotMsg}
            isSharedView={isSharedView}
            portfolioContext={portfolioContext}
            userData={currentUserData}
          />
        )}
      </div>
    </GoogleOAuthProvider>
  );
}