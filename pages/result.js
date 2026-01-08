import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { loadGuestPortfolio } from '../lib/guestStore';
import { signOut } from '../lib/auth'; // Supabase Auth

import MoodEffectLayer from '../components/MoodEffectLayer';
import PortfolioEditor from '../components/PortfolioEditor';
import ShareModal from '../components/ShareModal';
import { analyzeProjectContent } from '../lib/analyzeContent';
import dynamic from 'next/dynamic';
import { LoadingSpinner } from '../components/LoadingComponents';


// --- 템플릿 컴포넌트 동적 임포트 (코드 스플리팅) ---
const LoadingComponent = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <LoadingSpinner size="lg" color="emerald" />
  </div>
);

// 개발자
const DeveloperTimelineTemplate = dynamic(() => import('../components/templates/DeveloperTimelineTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const DeveloperBentoTemplate = dynamic(() => import('../components/templates/DeveloperBentoTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const DeveloperDocsTemplate = dynamic(() => import('../components/templates/DeveloperDocsTemplate'), {
  loading: LoadingComponent,
  ssr: false
});

// 디자이너
const DesignerGalleryTemplate = dynamic(() => import('../components/templates/DesignerGalleryTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const DesignerMagazineTemplate = dynamic(() => import('../components/templates/DesignerMagazineTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const DesignerCaseStudyTemplate = dynamic(() => import('../components/templates/DesignerCaseStudyTemplate'), {
  loading: LoadingComponent,
  ssr: false
});

// 마케터
const MarketerDashboardTemplate = dynamic(() => import('../components/templates/MarketerDashboardTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const MarketerDeckTemplate = dynamic(() => import('../components/templates/MarketerDeckTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const MarketerFeedTemplate = dynamic(() => import('../components/templates/MarketerFeedTemplate'), {
  loading: LoadingComponent,
  ssr: false
});

// 서비스기획
const ServiceJourneyTemplate = dynamic(() => import('../components/templates/ServiceJourneyTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const ServiceRoadmapTemplate = dynamic(() => import('../components/templates/ServiceRoadmapTemplate'), {
  loading: LoadingComponent,
  ssr: false
});
const ServiceWikiTemplate = dynamic(() => import('../components/templates/ServiceWikiTemplate'), {
  loading: LoadingComponent,
  ssr: false
});

// BGM 파일 목록
const bgmFiles = {
  "Smart & Professional": [
    "/music/Midnight Logic.mp3",
    "/music/Deep Dive.mp3",
    "/music/Urban Step.mp3",
    "/music/Gray Jazz.mp3",
    "/music/Afternoon Tea.mp3"
  ],
  "Emotion & Storytelling": [
    "/music/Modern Art.mp3",
    "/music/Silent Space.mp3",
    "/music/White Page.mp3",
    "/music/Wooden Memory.mp3",
    "/music/Silk Wave.mp3",
    "/music/Fresh Awake.mp3"
  ],
  "Impact & Creative": [
    "/music/The Voyage.mp3",
    "/music/Mystic East.mp3",
    "/music/The Legend.mp3",
    "/music/Glorious Moment.mp3"
  ],
  "Mute": null
};

import { supabase } from '../lib/supabase';
import { getUserProfile, updateUserProfile, getPortfolios, updatePortfolioFeaturedProjects, getPublicPortfolio, updatePortfolio } from '../lib/db';
import { JOB_SPECS } from '../lib/jobData';

// Force Rebuild Identifier: 2025-12-19-16-16
export default function ResultPage({ setGlobalUserData }) {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  const [currentPortfolioName, setCurrentPortfolioName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false); // [NEW] Menu state

  const [aiRecommendation, setAiRecommendation] = useState(null);

  // Check if we're in preview mode (for iframe embedding or public link)
  const isPreviewMode = router.query.preview === 'true';
  const isSharedView = router.query.share === 'true';

  // Guest mode state
  const [isGuest, setIsGuest] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // AI Insights Preview Modal (for guests)
  const [showInsightsPreview, setShowInsightsPreview] = useState(false);
  const [insightsData, setInsightsData] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [learningTimeline, setLearningTimeline] = useState(3); // Default: 3 months
  const [selectedKeyword, setSelectedKeyword] = useState(null); // For keyword suggestions
  const [showKeywordSuggestions, setShowKeywordSuggestions] = useState(false);

  // 추천 뱃지용 초기 직무 저장
  const [initialJob, setInitialJob] = useState(null);
  const [isTemplateWidgetOpen, setIsTemplateWidgetOpen] = useState(false);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState(null);

  // Share link state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);

  // Theme state
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const [isDark, setIsDark] = useState(false);

  // Print support
  useEffect(() => {
    if (router.query.print === 'true' && userData) {
      // Small delay to ensure everything is rendered
      const timer = setTimeout(() => {
        window.print();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [router.query.print, userData]);


  // --- BGM 로직 ---
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [currentSongTitle, setCurrentSongTitle] = useState('');
  const [isMuted, setIsMuted] = useState(false);

  // --- BGM History Logic ---
  const [songHistory, setSongHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Dark mode management
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  useEffect(() => {
    // Load global user_profile and merge with current portfolio template settings
    // In preview mode, use the portfolio ID from query params
    const loadData = async () => {
      // Early return if router is not ready
      if (!router.isReady) return;

      setIsLoading(true);
      try {

        const portfolioIdFromQuery = router.query.portfolio;

        // Check user authentication status FIRST
        const { data: { user } } = await supabase.auth.getUser();

        // Check SessionStorage for guest portfolio
        const guestData = sessionStorage.getItem('guest_portfolio');
        const currentPortfolioId = sessionStorage.getItem('current_portfolio_id') || localStorage.getItem('current_portfolio_id');

        // Determine if this is a guest session
        // Guest = no authenticated user AND (guest_ ID OR guest data exists)
        const isGuestSession = !user && (
          portfolioIdFromQuery?.startsWith('guest_') ||
          currentPortfolioId?.startsWith('guest_') ||
          guestData
        );

        if (isGuestSession) {
          // Load from IndexedDB (or fallback to LocalStorage for backward compatibility if needed)
          let guestPortfolio = null;

          if (guestData) {
            // Backward compatibility: If data is in sessionStorage (small data)
            try {
              guestPortfolio = JSON.parse(guestData);
            } catch (e) {
              console.warn('Failed to parse guestData from sessionStorage', e);
            }
          }

          if (!guestPortfolio && currentPortfolioId) {
            // Load from IndexedDB using ID
            try {
              guestPortfolio = await loadGuestPortfolio(currentPortfolioId);
            } catch (e) {
              console.error('Failed to load from guestStore', e);
            }
          }

          if (guestPortfolio) {
            // Convert guest portfolio to userData format
            const profile = guestPortfolio.profile;
            const mergedData = {
              ...profile,
              job: guestPortfolio.job,
              strength: guestPortfolio.strength,
              moods: guestPortfolio.moods,
              bgm: guestPortfolio.bgm || 'Mute'
            };

            // Use featured projects (max 6) or all projects if featured_project_ids not set
            const featuredIds = guestPortfolio.featured_project_ids || [];
            if (featuredIds.length > 0 && profile.projects && Array.isArray(profile.projects)) {
              // Load only featured projects
              mergedData.projects = featuredIds
                .map(id => profile.projects[id])
                .filter(p => p); // Remove undefined entries
            } else if (profile.projects && Array.isArray(profile.projects)) {
              // Fallback: use first 6 projects
              mergedData.projects = profile.projects.slice(0, 6);
            } else {
              // No projects
              mergedData.projects = [];
            }

            setUserData(mergedData);
            setCurrentPortfolioName(profile.name || '게스트');
            setInitialJob(guestPortfolio.job);
            setTheme(guestPortfolio.theme || 'light');
            setIsDark(guestPortfolio.theme === 'dark');
            setIsGuest(true);
            return;
          } else {
            // Guest portfolio not found
            alert('포트폴리오를 찾을 수 없습니다 (세션 만료).\n다시 생성해주세요.');
            router.push('/onboarding');
            return;
          }
        }

        const currentId = portfolioIdFromQuery || localStorage.getItem('current_portfolio_id');

        // [PUBLIC PREVIEW SUPPORT] - Load as public if preview=true OR not logged in
        if (currentId && (isPreviewMode || !user)) {
          let shouldLoadAsPublic = true;



          if (shouldLoadAsPublic) {
            console.log('Attempting to fetch public portfolio:', currentId);
            try {
              const publicPortfolio = await getPublicPortfolio(currentId);
              console.log('Public portfolio fetch result:', publicPortfolio);

              if (publicPortfolio) {
                const ownerProfile = await getUserProfile(publicPortfolio.user_id);
                if (ownerProfile) {
                  const mergedData = {
                    ...ownerProfile,
                    job: publicPortfolio.job,
                    strength: publicPortfolio.strength,
                    moods: publicPortfolio.moods
                  };

                  // Load featured projects
                  const featuredIds = publicPortfolio.featured_project_ids || [];
                  if (featuredIds.length > 0 && ownerProfile.projects && Array.isArray(ownerProfile.projects)) {
                    mergedData.projects = featuredIds.map(id => ownerProfile.projects[id]).filter(p => p);
                  } else if (ownerProfile.projects && Array.isArray(ownerProfile.projects)) {
                    mergedData.projects = ownerProfile.projects.slice(0, 6);
                  } else {
                    mergedData.projects = [];
                  }

                  setUserData(mergedData);
                  setCurrentPortfolioName(ownerProfile.name);
                  setInitialJob(publicPortfolio.job);
                  setTheme(publicPortfolio.theme || 'light'); // Load theme from DB
                  setIsDark(publicPortfolio.theme === 'dark');
                  setIsGuest(false);
                  return;
                }
              }
            } catch (error) {
              console.error('Public portfolio fetch error:', error);
            }
            // If public fetch fails and user is not logged in, redirect to login
            if (!user) {
              console.log('Public portfolio fetch failed or not found');
              router.push('/login');
              return;
            }
            // If user is logged in but portfolio not found, continue to show error below
          }
        }
        if (!user && !isPreviewMode) {
          router.push('/login');
          return;
        }

        const userId = user ? user.id : null;
        if (!userId) return;

        // Load profile and portfolios from DB
        const profile = await getUserProfile(userId);
        let portfolios = await getPortfolios(userId);

        // [FIXED] If portfolio ID is in query params but not found in DB, wait and retry
        // This handles the case where user just completed survey and DB save is still in progress
        if (portfolioIdFromQuery && (!portfolios || portfolios.length === 0 || !portfolios.find(p => p.id === portfolioIdFromQuery))) {
          console.log('Portfolio not found in DB, waiting for save to complete...');
          await new Promise(resolve => setTimeout(resolve, 1500)); // Wait 1.5 seconds
          portfolios = await getPortfolios(userId); // Retry
          console.log('Retried portfolio fetch:', portfolios);
        }

        // [NEW] Redirect if no portfolios exist AND no portfolio ID in query
        if ((!portfolios || portfolios.length === 0) && !portfolioIdFromQuery) {
          alert('생성된 포트폴리오가 없습니다. 먼저 포트폴리오를 생성해주세요!');
          router.push('/mypage');
          return;
        }

        const currentPortfolio = portfolios?.find(p => p.id === currentId);

        if (profile && currentPortfolio) {
          // Merge global profile with portfolio template settings
          const mergedData = {
            ...profile,
            job: currentPortfolio.job,
            strength: currentPortfolio.strength,
            moods: currentPortfolio.moods
          };

          // Load featured projects based on featured_project_ids
          const featuredIds = currentPortfolio.featured_project_ids || [];
          if (featuredIds.length > 0 && profile.projects && Array.isArray(profile.projects)) {
            // Load only featured projects
            mergedData.projects = featuredIds
              .map(id => profile.projects[id])
              .filter(p => p); // Remove undefined entries
          } else if (profile.projects && Array.isArray(profile.projects)) {
            // Fallback: use first 6 projects
            mergedData.projects = profile.projects.slice(0, 6);
          } else {
            // No projects
            mergedData.projects = [];
          }

          setUserData(mergedData);
          setCurrentPortfolioName(profile.name); // Use profile name, not portfolio name
          setInitialJob(currentPortfolio.job);
          setTheme(currentPortfolio.theme || 'light'); // Load theme from DB
          setIsDark((currentPortfolio.theme || 'light') === 'dark'); // Set isDark based on theme

          setIsGuest(false);
        } else if (portfolios.length > 0) {
          // Fallback to first portfolio
          const firstPortfolio = portfolios[0];
          const mergedData = {
            ...profile,
            job: firstPortfolio.job,
            strength: firstPortfolio.strength,
            moods: firstPortfolio.moods
          };

          // Load featured projects
          const featuredIds = firstPortfolio.featured_project_ids || [];
          if (featuredIds.length > 0 && profile.projects && Array.isArray(profile.projects)) {
            mergedData.projects = featuredIds
              .map(id => profile.projects[id])
              .filter(p => p);
          } else if (profile.projects && Array.isArray(profile.projects)) {
            mergedData.projects = profile.projects.slice(0, 6);
          } else {
            mergedData.projects = [];
          }

          setUserData(mergedData);
          setCurrentPortfolioName(profile.name); // Use profile name, not portfolio name
          setInitialJob(firstPortfolio.job);
          setIsGuest(false);
          // Only update localStorage if not in preview mode
          if (!portfolioIdFromQuery) {
            localStorage.setItem('current_portfolio_id', firstPortfolio.id);
          }
        }
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router.isReady, router.query.portfolio]); // Add router.isReady and router.query.portfolio as dependencies

  // 데이터 변경 시 global profile에 저장 (Legacy LocalStorage Logic - REMOVED)
  // This effect was calculating data but not saving it anywhere.
  // Saving is now handled explicitly by handleSaveEdit.

  // Listen for user_profile updates from My Page
  useEffect(() => {
    const reloadUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const currentId = router.query.portfolio || localStorage.getItem('current_portfolio_id');
        if (!currentId) return;

        const profile = await getUserProfile(user.id);
        const portfolios = await getPortfolios(user.id);
        const currentPortfolio = portfolios.find(p => p.id === currentId);

        if (profile && currentPortfolio) {
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
              .filter(p => p);
          } else if (profile.projects && Array.isArray(profile.projects)) {
            mergedData.projects = profile.projects.slice(0, 6);
          } else {
            mergedData.projects = [];
          }

          setUserData(mergedData);
          setCurrentPortfolioName(profile.name);
          console.log('User profile reloaded from My Page update');
        }
      } catch (e) {
        console.error('Reload error:', e);
      }
    };

    // Listen for custom event (same-tab updates)
    const handleProfileUpdate = (e) => {
      console.log('Received userProfileUpdated event');
      reloadUserProfile();
    };

    // Listen for storage event (cross-tab updates)
    const handleStorageChange = (e) => {
      if (e.key === 'user_profile' && e.newValue) { // Still listen for this for potential legacy or other parts
        console.log('Received storage event for user_profile');
        reloadUserProfile();
      }
    };

    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router.query.portfolio]);

  // AI 추천 템플릿 계산 (간단 키워드 기반)
  useEffect(() => {
    if (!userData) return setAiRecommendation(null);
    try {
      const rec = analyzeProjectContent(userData);
      setAiRecommendation(rec);
    } catch (e) {
      console.error('analyzeProjectContent 실패', e);
      setAiRecommendation(null);
    }
  }, [userData]);

  // BGM Mute Effect
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // [SYNC FIX] Sync local userData with global state for Chatbot
  useEffect(() => {
    if (userData && setGlobalUserData) {
      console.log('Syncing userData to global state (ChatWidget)');
      setGlobalUserData(userData);
    }
  }, [userData, setGlobalUserData]);


  // 🎵 Function to play a specific song URL
  const playSong = (bgmUrl) => {
    if (bgmUrl) {
      const title = bgmUrl.split('/').pop().replace('.mp3', '');
      setCurrentSongTitle(decodeURIComponent(title));
      if (!audioRef.current) audioRef.current = new Audio(bgmUrl);
      else audioRef.current.src = bgmUrl;

      audioRef.current.loop = true;
      audioRef.current.volume = volume;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      if (audioRef.current) audioRef.current.pause();
      setIsPlaying(false);
      setCurrentSongTitle('');
    }
  };

  // 🎵 Function to play the next song (random or from history)
  const playNextSong = () => {
    if (!userData) return;

    // If we are in the middle of history, play the next song from history
    if (historyIndex < songHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      playSong(songHistory[nextIndex]);
      return;
    }

    // Otherwise, play a new random song
    const selectedBgmCategory = userData.bgm || "음악 없음 (Mute)";
    const musicList = bgmFiles[selectedBgmCategory];
    if (Array.isArray(musicList) && musicList.length > 0) {
      let randomIndex;
      let nextSongUrl;
      // Avoid playing the same song twice in a row if possible
      do {
        randomIndex = Math.floor(Math.random() * musicList.length);
        nextSongUrl = musicList[randomIndex];
      } while (musicList.length > 1 && nextSongUrl === songHistory[historyIndex]);

      const newHistory = [...songHistory, nextSongUrl];
      setSongHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      playSong(nextSongUrl);
    }
  };

  // 🎵 Function to play the previous song from history
  const playPreviousSong = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      playSong(songHistory[prevIndex]);
    }
  };

  // Main BGM useEffect: Triggers when the BGM *category* changes
  useEffect(() => {
    if (userData?.bgm) {
      setSongHistory([]);
      setHistoryIndex(-1);
      playNextSong();
    }
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, [userData?.bgm]);

  // Removed duplicate data loading/saving logic (now handled above)

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol;
  };

  // Logout handler
  const handleLogout = async () => {
    console.log('Logout button clicked!');

    const { error } = await signOut();
    if (error) {
      alert('로그아웃 중 오류가 발생했습니다.');
      console.error('Logout error:', error);
    } else {
      console.log('Logout successful');
      router.push('/login');
    }
  };

  // Handle edit changes
  const handleEditChange = (updates) => {
    setEditedData(prev => {
      const base = prev || userData || {};
      const newValues = typeof updates === 'function' ? updates(base) : updates;
      return { ...base, ...newValues };
    });
  };

  // Save edited data
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveEdit = async () => {
    // [Fix] If no changes were made (editedData is null), just exit edit mode
    if (!editedData) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
        setIsSaving(false);
        return;
      }

      const currentPortfolioId = router.query.portfolio || localStorage.getItem('current_portfolio_id');

      // Load current profile
      const profile = await getUserProfile(user.id);
      if (profile) {
        const updatedProfile = {
          ...profile,
          name: editedData.name || profile.name,
          intro: editedData.intro || profile.intro,
          career_summary: editedData.career_summary || profile.career_summary,
          projects: editedData.projects || profile.projects
        };
        await updateUserProfile(user.id, updatedProfile);
      }

      // Update current portfolio
      if (currentPortfolioId) {
        // We need to fetch current portfolio first to get existing values? 
        // Or just update the fields we know. 
        // For simplicity, we just update the fields that can be edited here.
        await updatePortfolio(currentPortfolioId, {
          job: editedData.job,
          strength: editedData.strength,
          moods: editedData.moods,
          template: editedData.template
        });
      }

      setUserData(editedData);
      setEditedData(null);
      setIsEditing(false);
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedData(null);
    setIsEditing(false);
  };

  // Open share modal
  const handleOpenShareModal = () => {
    setIsShareModalOpen(true);
  };

  // Copy share link to clipboard (legacy or for simple copy)
  const handleCopyShareLink = async () => {
    const currentPortfolioId = router.query.portfolio || localStorage.getItem('current_portfolio_id');
    if (!currentPortfolioId) {
      alert('포트폴리오 ID를 찾을 수 없습니다.');
      return;
    }

    const shareUrl = `${window.location.origin}/result?portfolio=${currentPortfolioId}&preview=true&share=true`;

    // Try Clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 3000);
        return; // Success!
      } catch (err) {
        console.warn('Clipboard API failed, trying fallback:', err);
        // Continue to fallback
      }
    }

    // Fallback for older browsers or non-secure contexts
    try {
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      textArea.style.position = 'fixed'; // Avoid scrolling to bottom
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setShowCopyToast(true);
        setTimeout(() => setShowCopyToast(false), 3000);
      } else {
        throw new Error('execCommand copy failed');
      }
    } catch (err2) {
      console.error('Fallback copy failed:', err2);
      alert('링크 복사에 실패했습니다. 수동으로 복사해주세요:\n' + shareUrl);
    }
  };

  // Toggle theme and save to DB
  const handleToggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    setIsDark(newTheme === 'dark');

    // Save to DB if not guest
    if (!isGuest) {
      try {
        const currentPortfolioId = router.query.portfolio || localStorage.getItem('current_portfolio_id');
        if (currentPortfolioId) {
          await updatePortfolio(currentPortfolioId, { theme: newTheme });
          console.log('Theme updated to:', newTheme);
        }
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    } else {
      // Save to sessionStorage for guest
      try {
        const guestData = sessionStorage.getItem('guest_portfolio');
        if (guestData) {
          const guestPortfolio = JSON.parse(guestData);
          guestPortfolio.theme = newTheme;
          sessionStorage.setItem('guest_portfolio', JSON.stringify(guestPortfolio));
          console.log('Guest theme updated to:', newTheme);
        }
      } catch (error) {
        console.error('Failed to save guest theme:', error);
      }
    }

  };


  // Show AI Insights Preview (for both guests and logged-in users)
  const handleShowInsightsPreview = async () => {
    if (!userData) return;

    setLoadingInsights(true);
    setShowInsightsPreview(true);

    try {
      let jobType, yearsExp, userSkills, strength;

      // 1. 현재 활성화된 데이터(userData)를 우선 사용 (게스트/로그인 모두)
      // 화면에서 템플릿을 변경했을 때, userData는 업데이트되지만 localStorage는 즉시 업데이트되지 않을 수 있음
      if (userData) {
        jobType = userData.job || 'developer';
        yearsExp = userData.career_summary?.match(/(\d+)\s*년/)?.[1] || 3;
        userSkills = userData.skills || [];
        strength = userData.strength;
      }
      // 2. userData가 없을 경우에만 localStorage (게스트 백업) 사용
      else if (isGuest) {
        const guestData = sessionStorage.getItem('guest_portfolio');
        if (!guestData) {
          console.error('Guest portfolio not found');
          setInsightsData(null);
          setLoadingInsights(false);
          return;
        }
        const guestPortfolio = JSON.parse(guestData);
        jobType = guestPortfolio.job || 'developer';
        yearsExp = guestPortfolio.profile?.career_summary?.match(/(\d+)\s*년/)?.[1] || 3;
        userSkills = guestPortfolio.profile?.skills || [];
        strength = guestPortfolio.strength;
      }

      // 🔄 직군과 템플릿 분리: 템플릿에 따른 직군 강제 변경 로직 제거
      // 이제 PortfolioEditor에서 직군을 명시적으로 선택하므로, userData.job을 그대로 사용합니다.
      // const strengthToJobMap = { ... }; // Removed

      console.log('Fetching insights for:', { jobType, yearsExp, userSkills, isGuest, strength });

      console.log('Fetching insights for:', { jobType, yearsExp, userSkills, isGuest, strength });

      const response = await fetch('/api/get-market-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType,
          yearsExperience: parseInt(yearsExp),
          userSkills,
          targetMonths: learningTimeline
        })
      });

      const insights = await response.json();
      console.log('Insights loaded:', insights);
      console.log('Must have skills:', insights.mustHaveSkills);
      console.log('Effective keywords:', insights.effectiveKeywords);
      console.log('Learning path:', insights.learningPath);
      setInsightsData(insights);
    } catch (error) {
      console.error('Failed to fetch insights:', error);
      setInsightsData(null);
    } finally {
      setLoadingInsights(false);
    }
  };

  // Auto-refetch insights when timeline changes
  useEffect(() => {
    if (showInsightsPreview && userData) {
      handleShowInsightsPreview();
    }
  }, [learningTimeline]);

  // Handle keyword click to show suggestions
  const handleKeywordClick = (keyword) => {
    setSelectedKeyword(keyword);
    setShowKeywordSuggestions(true);
  };

  // Apply keyword suggestion to portfolio
  const handleApplySuggestion = async (suggestion) => {
    if (!userData) return;

    try {
      console.log('Applying suggestion:', suggestion);
      const updatedData = { ...userData };
      let changesMade = false;

      // Apply suggestion based on location
      const skillLabels = ["기술 스택", "핵심 역량", "디자인 툴", "전문 분야"];
      if (skillLabels.includes(suggestion.location) && suggestion.type === "add") {
        // Add to skills
        const newSkills = [...(updatedData.skills || []), selectedKeyword.keyword];
        updatedData.skills = newSkills;
        changesMade = true;
        console.log('Added to skills:', newSkills);
      } else if (suggestion.location === "자기소개") {
        // Enhance intro
        const currentIntro = updatedData.intro || "";
        updatedData.intro = currentIntro
          ? `${currentIntro} ${suggestion.suggested}`
          : suggestion.suggested;
        changesMade = true;
        console.log('Updated intro:', updatedData.intro);
      } else if (suggestion.location === "경력 요약") {
        // Enhance career summary
        const currentSummary = updatedData.career_summary || "";
        updatedData.career_summary = currentSummary
          ? `${currentSummary}. ${suggestion.suggested}`
          : suggestion.suggested;
        changesMade = true;
        console.log('Updated career_summary:', updatedData.career_summary);
      } else if (suggestion.location === "프로젝트 설명" && updatedData.projects && updatedData.projects.length > 0) {
        // Enhance first project description
        const firstProject = { ...updatedData.projects[0] };
        firstProject.description = firstProject.description
          ? `${firstProject.description}. ${suggestion.suggested}`
          : suggestion.suggested;
        updatedData.projects = [firstProject, ...updatedData.projects.slice(1)];
        changesMade = true;
        console.log('Updated project description:', firstProject.description);
      }

      if (!changesMade) {
        alert('적용할 수 있는 변경사항이 없습니다.');
        return;
      }

      // Update userData state immediately
      setUserData(updatedData);
      console.log('Updated userData state');

      // Save to database if logged in
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('Saving to database for user:', user.id);
        const profile = await getUserProfile(user.id);
        if (profile) {
          // Update profile fields
          const profileUpdate = {
            intro: updatedData.intro,
            career_summary: updatedData.career_summary,
            skills: updatedData.skills,
            projects: updatedData.projects
          };

          console.log('Profile update:', profileUpdate);

          await updateUserProfile(user.id, {
            ...profile,
            ...profileUpdate
          });

          console.log('Database updated successfully');
        }
      } else if (isGuest) {
        console.log('Saving to localStorage for guest');
        // Save to localStorage for guest
        const guestData = JSON.parse(sessionStorage.getItem('guest_portfolio') || '{}');
        guestData.profile = {
          ...guestData.profile,
          intro: updatedData.intro,
          career_summary: updatedData.career_summary,
          skills: updatedData.skills,
          projects: updatedData.projects
        };
        sessionStorage.setItem('guest_portfolio', JSON.stringify(guestData));
        console.log('LocalStorage updated');
      }

      // Show detailed success message
      const locationText = suggestion.location;
      const changeType = suggestion.type === 'add' ? '추가' : '수정';

      alert(`적용 완료!\n\n위치: ${locationText}\n변경: ${changeType}\n"${selectedKeyword.keyword}" 키워드가 포트폴리오에 반영되었습니다.\n\n페이지를 새로고침하면 변경사항을 확인할 수 있습니다.`);

      setShowKeywordSuggestions(false);

      // Optionally reload to show changes
      setTimeout(() => {
        if (confirm('변경사항을 바로 확인하시겠습니까? (페이지가 새로고침됩니다)')) {
          window.location.reload();
        }
      }, 500);

    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      alert(`적용 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n다시 시도해주세요.`);
    }
  };

  // allow PortfolioList to render even when there's no selected portfolio
  const currentData = isEditing && editedData ? editedData : userData;
  const job = currentData?.job;
  const strength = currentData?.strength;
  const moods = currentData?.moods || [];
  const jobKey = job?.toLowerCase() || 'developer';

  // --- [핵심] 템플릿 렌더링 로직 (직군과 템플릿 완전 분리) ---
  const renderTemplate = () => {
    // 템플릿에 전달할 공통 props
    const props = {
      answers: isEditing && editedData ? editedData : userData,
      moods,
      isEditing,
      onUpdate: handleEditChange,
      theme // Pass theme to all templates
    };

    // 🎨 템플릿은 오직 strength 값으로만 결정 (job과 무관)
    // 이제 사용자는 어떤 직군이든 원하는 템플릿을 자유롭게 선택 가능

    // Developer Templates
    if (strength === 'problem') return <DeveloperTimelineTemplate {...props} />;
    if (strength === 'impl') return <DeveloperBentoTemplate {...props} />;
    if (strength === 'tech') return <DeveloperDocsTemplate {...props} />;

    // Designer Templates
    if (strength === 'visual') return <DesignerGalleryTemplate {...props} />;
    if (strength === 'brand') return <DesignerMagazineTemplate {...props} />;
    if (strength === 'ux') return <DesignerCaseStudyTemplate {...props} />;

    // Marketer Templates
    if (strength === 'data') return <MarketerDashboardTemplate {...props} />;
    if (strength === 'strategy') return <MarketerDeckTemplate {...props} />;
    if (strength === 'creative') return <MarketerFeedTemplate {...props} />;

    // Service Planner Templates
    if (strength === 'revenue') return <ServiceJourneyTemplate {...props} />;
    if (strength === 'ops') return <ServiceRoadmapTemplate {...props} />;
    if (strength === 'comm') return <ServiceWikiTemplate {...props} />;

    // 최종 기본값 (strength가 정의되지 않은 경우)
    return <DeveloperTimelineTemplate {...props} />;
  };

  return (
    <>


      {/* Guest Mode Banner */}
      {isGuest && !isPreviewMode && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white p-4 text-center z-[60] shadow-lg">
          <p className="font-bold text-lg">
            미리보기 모드 | 임시 저장 중입니다
          </p>
          <div className="flex gap-3 justify-center mt-2">
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-6 py-2 bg-white text-orange-600 rounded-lg font-bold hover:bg-gray-100 transition shadow-md"
            >
              지금 영구 저장하기 →
            </button>
            <button
              onClick={handleShowInsightsPreview}
              className="px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold hover:scale-105 transition shadow-md flex items-center gap-2"
            >
              <span>  </span>
              <span>AI로 다듬기 (무료 체험)</span>
            </button>
          </div>
        </div>
      )}

      {/* My Portfolios & Logout Buttons - Top Right (Hidden for guests, preview, and shared links) */}
      {!isPreviewMode && !isSharedView && !isGuest && (
        <div className="fixed top-6 right-6 z-50 flex gap-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsTemplateWidgetOpen(true)}
                className={`px-4 py-2 ${theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'} border font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg`}
              >
                <span>템플릿</span>
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-4 py-2 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 shadow-lg disabled:opacity-70 disabled:cursor-wait"
              >
                <span>{isSaving ? '저장 중...' : '저장'}</span>
              </button>
              <button
                onClick={handleCancelEdit}
                className={`px-4 py-2 ${theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'} border font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg`}
              >
                <span>취소</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className={`px-4 py-2 ${theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'} border font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg`}
              >
                <span>편집</span>
              </button>
              {/* AI로 다듬기 버튼 - 편집 옆으로 이동 */}
              <button
                onClick={handleShowInsightsPreview}
                className={`px-4 py-2 ${theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'} border font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg`}
              >
                <span>AI로 다듬기</span>
              </button>
              {/* 공유 버튼 */}
              <button
                onClick={handleOpenShareModal}
                className={`px-4 py-2 ${theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'} border font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg`}
                title="공유 및 PDF 저장"
              >
                <span>공유</span>
              </button>
              {/* Theme Toggle Button */}
              <button
                onClick={handleToggleTheme}
                className={`px-4 py-2 ${theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'} border font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg`}
                title={theme === 'light' ? '다크 모드로 전환' : '라이트 모드로 전환'}
              >
                <span>{theme === 'light' ? '🌙' : '☀️'}</span>
              </button>
            </>

          )}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`px-3 py-2 ${theme === 'light' ? 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200' : 'bg-white/5 border-white/20 text-white hover:bg-white/10'} border rounded-xl transition-all shadow-lg`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className={`absolute right-0 top-full mt-2 w-48 ${theme === 'light' ? 'bg-white border-gray-300' : 'bg-gray-900 border-white/10'} border rounded-xl shadow-2xl overflow-hidden z-[60] backdrop-blur-xl`}
                >
                  <button
                    onClick={() => router.push('/home')}
                    className={`w-full px-4 py-3 text-left ${theme === 'light' ? 'text-gray-900 hover:bg-gray-100 border-gray-200' : 'text-gray-200 hover:bg-white/10 border-white/5'} flex items-center gap-3 transition-colors border-b`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span>홈</span>
                  </button>
                  <button
                    onClick={() => router.push('/mypage')}
                    className={`w-full px-4 py-3 text-left ${theme === 'light' ? 'text-gray-900 hover:bg-gray-100 border-gray-200' : 'text-gray-200 hover:bg-white/10 border-white/5'} flex items-center gap-3 transition-colors border-b`}
                  >
                    <span>내 포트폴리오</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className={`w-full px-4 py-3 text-left text-red-400 ${theme === 'light' ? 'hover:bg-red-50' : 'hover:bg-red-500/10'} flex items-center gap-3 transition-colors`}
                  >
                    <span>로그아웃</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      <MoodEffectLayer mood={moods} />

      {/* 템플릿 렌더링 */}
      {userData ? renderTemplate() : (
        isLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <LoadingSpinner size="lg" color="emerald" />
            <p className="text-gray-400 mt-4 ml-3">포트폴리오 불러오는 중...</p>
          </div>
        ) : (
          <div className="min-h-screen flex flex-col items-center justify-center text-white bg-gray-900">
            <div className="text-6xl mb-6"></div>
            <h2 className="text-2xl font-bold mb-4">포트폴리오가 선택되지 않았습니다</h2>
            <p className="text-gray-400 mb-8">My Page에서 포트폴리오를 선택하거나 생성하세요</p>
            <button
              onClick={() => router.push('/mypage')}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/50 hover:scale-105 transition-all"
            >
              My Page로 이동
            </button>
          </div>
        )
      )}

      {/* Portfolio Editor (템플릿 선택 및 추천 표시) - 위젯 모드로 분리 */}
      {!isPreviewMode && !isSharedView && (
        <PortfolioEditor
          isOpen={isTemplateWidgetOpen}
          onClose={() => setIsTemplateWidgetOpen(false)}
          answers={isEditing && editedData ? editedData : userData}
          setAnswers={isEditing ? handleEditChange : setUserData}
          aiRecommendation={aiRecommendation}
          widget={true}
        />
      )}

      {/* --- [좌측 하단] BGM 플레이어만 남김 (템플릿 버튼 제거) --- */}
      {!isPreviewMode && !isSharedView && (
        <div className="fixed bottom-8 left-8 z-40 flex flex-col gap-4 items-start">
          {/* BGM 플레이어 - 심플 버전 */}
          <AnimatePresence>
            {userData && userData.bgm !== "Mute" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-1.5 p-2 rounded-full bg-black/30 backdrop-blur-md border border-white/10 shadow-lg text-white"
              >
                <button
                  onClick={playPreviousSong}
                  disabled={historyIndex <= 0}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 17 6 12 11 7 11 17"></polygon><polygon points="18 17 13 12 18 7 18 17"></polygon></svg>
                </button>
                <button
                  onClick={togglePlay}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 transition-all"
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h4v16H6zM14 4h4v16h-4z"></path></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  )}
                </button>
                <button
                  onClick={playNextSong}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 17 18 12 13 7 13 17"></polygon><polygon points="6 17 11 12 6 7 6 17"></polygon></svg>
                </button>
                <div className="relative group">
                  <button
                    onClick={toggleMute}
                    className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-white/70 hover:text-white hover:bg-white/20 transition-all"
                    title={isMuted ? "음소거 해제" : "음소거"}
                  >
                    {isMuted ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"></path></svg>
                    )}
                  </button>
                  {/* 호버 시 볼륨 슬라이더 - 보이지 않는 연결 영역으로 호버 끊김 방지 */}
                  <div className="absolute left-full top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
                    {/* 보이지 않는 연결 영역 */}
                    <div className="absolute right-full w-2 h-full"></div>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg whitespace-nowrap ml-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                      <span className="text-xs text-white/70 font-mono w-8 text-right">{Math.round(volume * 100)}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* AI Insights Preview Modal (for guests) */}
      <AnimatePresence>
        {showInsightsPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
            onClick={() => setShowInsightsPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-900 to-black border border-emerald-500/30 rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <span>AI 시장 인사이트</span>
                  </h2>
                  <p className="text-gray-400">
                    {insightsData?.metadata?.sampleSize || 0}개의 실제 채용공고 분석 결과
                  </p>
                </div>
                <button
                  onClick={() => setShowInsightsPreview(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              {/* Loading State */}
              {loadingInsights && (
                <div className="text-center py-12">
                  <div className="animate-spin text-6xl mb-4"></div>
                  <p className="text-gray-400">AI가 시장 데이터를 분석하고 있습니다...</p>
                </div>
              )}

              {/* Insights Content */}
              {!loadingInsights && insightsData && (
                <div className="space-y-6">
                  {/* Must Have Skills */}
                  <div className="bg-white/5 rounded-2xl p-6 border border-emerald-500/20">
                    <h3 className="text-xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
                      <span>필수 기술 스택</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {insightsData.mustHaveSkills?.slice(0, 6).map((skill, idx) => (
                        <div key={idx} className="bg-black/30 rounded-xl p-4 border border-white/10">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-bold">{skill.name}</span>
                            <span className="text-emerald-400 font-bold">{skill.adoption}%</span>
                          </div>
                          <p className="text-gray-400 text-sm">{skill.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Learning Path */}
                  {insightsData.learningPath && (
                    <div className="bg-white/5 rounded-2xl p-6 border border-blue-500/20">
                      <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                        <span>추천 학습 경로</span>
                        {isGuest && (
                          <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30">
                            미리보기 (1단계만)
                          </span>
                        )}
                      </h3>

                      {/* Timeline Selector - Inline */}
                      {!isGuest && (
                        <div className="mb-4 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                          <label className="block text-xs font-medium text-blue-300 mb-2">
                            학습 목표 기간
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { months: 1, label: '1개월', desc: '집중' },
                              { months: 3, label: '3개월', desc: '균형' },
                              { months: 6, label: '6개월', desc: '종합' },
                              { months: 12, label: '1년', desc: '심화' }
                            ].map(option => (
                              <button
                                key={option.months}
                                onClick={() => setLearningTimeline(option.months)}
                                className={`p-2 rounded-lg transition-all text-sm ${learningTimeline === option.months
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg font-bold'
                                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                  }`}
                              >
                                <div className="font-semibold">{option.label}</div>
                                <div className="text-xs opacity-75">{option.desc}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        {/* 1단계는 항상 표시 */}
                        {insightsData.learningPath?.map((path, idx) => {
                          const isStepTitle = path.includes('단계');
                          const isSubItem = path.trim().startsWith('→');

                          // 현재 단계 번호 추출
                          const stepNumber = path.match(/(\d+)단계/)?.[1];
                          const isFirstStep = stepNumber === '1';

                          // 게스트이고 1단계가 아니면 건너뛰기 (블러 섹션에서 처리)
                          if (isGuest && !isFirstStep && isStepTitle) {
                            return null;
                          }

                          // 게스트이고 1단계의 서브 아이템이 아니면 건너뛰기
                          if (isGuest && isSubItem) {
                            // 이전 단계 제목 찾기
                            const prevStepIdx = insightsData.learningPath
                              .slice(0, idx)
                              .reverse()
                              .findIndex(p => p.includes('단계'));
                            if (prevStepIdx !== -1) {
                              const prevStepPath = insightsData.learningPath[idx - prevStepIdx - 1];
                              const prevStepNum = prevStepPath.match(/(\d+)단계/)?.[1];
                              if (prevStepNum !== '1') {
                                return null;
                              }
                            }
                          }

                          if (isStepTitle) {
                            const stepBadge = path.match(/\d+단계/)?.[0] || '📍';
                            const stepContent = path.replace(/^\d+단계[^:]*:\s*/, '');

                            return (
                              <div key={idx} className="mt-4 first:mt-0">
                                <div className="flex items-start gap-3 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
                                  <div className="text-blue-400 font-bold text-lg">
                                    {stepBadge}
                                  </div>
                                  <p className="text-white font-bold pt-0.5">{stepContent}</p>
                                </div>
                              </div>
                            );
                          } else if (isSubItem) {
                            return (
                              <div key={idx} className="flex items-start gap-2 ml-6 text-sm">
                                <span className="text-blue-400 mt-1">→</span>
                                <p className="text-gray-300">{path.replace(/^\s*→\s*/, '')}</p>
                              </div>
                            );
                          } else {
                            return (
                              <div key={idx} className="flex items-start gap-3">
                                <p className="text-gray-300">{path}</p>
                              </div>
                            );
                          }
                        })}

                        {/* 게스트용 블러 처리된 나머지 단계 */}
                        {isGuest && (
                          <div className="space-y-2 mt-4">
                            {insightsData.learningPath
                              .filter((path, idx) => {
                                const isStepTitle = path.includes('단계');
                                if (!isStepTitle) return false;
                                const stepNum = path.match(/(\d+)단계/)?.[1];
                                return stepNum !== '1';
                              })
                              .slice(0, 2)
                              .map((path, idx) => {
                                const stepBadge = path.match(/\d+단계/)?.[0];
                                const stepContent = path.replace(/^\d+단계[^:]*:\s*/, '');

                                return (
                                  <div key={`blur-${idx}`} className="mt-4 relative group cursor-pointer" onClick={() => router.push('/signup')}>
                                    <div className="flex items-start gap-3 bg-blue-500/10 rounded-lg p-3 border border-blue-500/20 hover:border-blue-500/40 transition">
                                      <div className="text-blue-400 font-bold text-lg blur-sm select-none">
                                        {stepBadge}
                                      </div>
                                      <p className="text-white font-bold pt-0.5 blur-sm select-none">{stepContent}</p>
                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                        <span className="text-blue-300 text-sm font-bold">클릭하여 잠금 해제</span>
                                      </div>
                                    </div>
                                    <div className="ml-6 mt-2 space-y-1">
                                      <div className="flex gap-2 text-sm">
                                        <span className="text-blue-400 blur-sm">→</span>
                                        <p className="text-gray-300 blur-sm select-none">상세 학습 자료 및 실습 가이드</p>
                                      </div>
                                      <div className="flex gap-2 text-sm">
                                        <span className="text-blue-400 blur-sm">→</span>
                                        <p className="text-gray-300 blur-sm select-none">추천 프로젝트 및 실전 팁</p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Effective Keywords */}
                  {insightsData.effectiveKeywords && (
                    <div className="bg-white/5 rounded-2xl p-6 border border-purple-500/20">
                      <h3 className="text-xl font-bold text-purple-400 mb-4 flex items-center gap-2">
                        <span>효과적인 키워드</span>
                        {isGuest && (
                          <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-500/30">
                            핵심 키워드 2개 잠김
                          </span>
                        )}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {insightsData.effectiveKeywords.map((kw, idx) => {
                          // 게스트인 경우, 사용자 포트폴리오 분석하여 가장 관련성 높은 키워드 2개 찾기
                          let shouldBlur = false;

                          if (isGuest && userData) {
                            // 사용자의 프로젝트 설명, 자기소개, 경력 요약에서 키워드 출현 빈도 계산
                            const userText = [
                              userData.intro || '',
                              userData.career_summary || '',
                              ...(userData.projects || []).map(p => `${p.title} ${p.description}`),
                            ].join(' ').toLowerCase();

                            // 키워드 관련성 점수 계산
                            const keywordScores = insightsData.effectiveKeywords.map((keyword, i) => {
                              const kwLower = keyword.keyword.toLowerCase();
                              const occurrences = (userText.match(new RegExp(kwLower, 'g')) || []).length;

                              // 키워드가 사용자 텍스트에 많이 나올수록 높은 점수
                              // 또한 채용 공고에서의 빈도도 고려 (context에서 추출)
                              const frequencyMatch = keyword.context.match(/(\d+)개/);
                              const marketFrequency = frequencyMatch ? parseInt(frequencyMatch[1]) : 0;

                              return {
                                index: i,
                                keyword: keyword.keyword,
                                score: occurrences * 10 + marketFrequency,
                                occurrences
                              };
                            });

                            // 점수 기준으로 정렬하여 상위 2개 선택
                            const topKeywords = keywordScores
                              .sort((a, b) => b.score - a.score)
                              .slice(0, 2)
                              .map(k => k.index);

                            shouldBlur = topKeywords.includes(idx);
                          }

                          if (shouldBlur) {
                            return (
                              <div
                                key={idx}
                                className="bg-gradient-to-r from-purple-500/30 to-pink-500/30 px-4 py-2 rounded-lg border-2 border-purple-400/50 cursor-pointer hover:border-purple-400/80 transition relative group"
                                onClick={() => router.push('/signup')}
                              >
                                <span className="font-bold text-purple-200 blur-sm select-none">{kw.keyword}</span>
                                <span className="text-xs ml-2 text-purple-300 blur-sm select-none">({kw.context})</span>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/60 rounded-lg">
                                  <div className="text-center">
                                    <span className="text-purple-200 text-xs font-bold">당신에게 핵심 키워드</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }


                          return (
                            <div
                              key={idx}
                              onClick={() => !isGuest && handleKeywordClick(kw)}
                              className={`bg-purple-500/20 text-purple-300 px-4 py-2 rounded-lg border border-purple-500/30 ${!isGuest ? 'cursor-pointer hover:bg-purple-500/30 hover:scale-105 transition-all' : ''
                                }`}
                              title={!isGuest ? "클릭하여 포트폴리오 적용 제안 보기" : kw.context}
                            >
                              <span className="font-bold">{kw.keyword}</span>
                              <span className="text-xs ml-2 text-purple-400">({kw.context})</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* CTA - Different for guests vs logged-in users */}
                  <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-6 border border-emerald-500/30 text-center">
                    {isGuest ? (
                      <>
                        <p className="text-white font-bold text-lg mb-2">
                          이 인사이트를 포트폴리오에 적용하고 싶으신가요?
                        </p>
                        <p className="text-gray-400 mb-4">
                          회원가입하면 AI가 자동으로 포트폴리오를 최적화해드립니다
                        </p>
                        <div className="flex gap-4 justify-center">
                          <button
                            onClick={() => router.push('/home')}
                            className="px-6 py-3 bg-white/10 text-white rounded-xl hover:bg-white/20 transition"
                          >
                            홈으로 가기
                          </button>
                          <button
                            onClick={() => {
                              setShowInsightsPreview(false);
                              setTimeout(() => router.push('/signup'), 100);
                            }}
                            className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg"
                          >
                            회원가입하고 적용하기 →
                          </button>
                          <button
                            onClick={() => {
                              const confirmed = window.confirm(
                                '⚠️ 주의: 로그인 후 이 임시 포트폴리오 데이터가 기존 계정의 포트폴리오에 덮어씌워집니다.\n\n계속하시겠습니까?'
                              );
                              if (confirmed) {
                                setShowInsightsPreview(false);
                                setTimeout(() => router.push('/login'), 100);
                              }
                            }}
                            className="px-6 py-3 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition"
                          >
                            기존 회원 로그인
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-white font-bold text-lg mb-2">
                          이 인사이트를 참고하여 포트폴리오를 개선해보세요
                        </p>
                        <p className="text-gray-400 mb-4">
                          시장 트렌드에 맞춰 프로젝트 설명과 기술 스택을 업데이트하면 더 좋은 결과를 얻을 수 있습니다
                        </p>
                        <button
                          onClick={() => setShowInsightsPreview(false)}
                          className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg"
                        >
                          확인했습니다
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Error State */}
              {!loadingInsights && !insightsData && (
                <div className="text-center py-12">
                  <p className="text-gray-400">인사이트를 불러올 수 없습니다.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Login Modal for Guest Mode */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/10"
          >
            <h2 className="text-3xl font-bold text-white mb-6">멋진 포트폴리오네요!</h2>
            <p className="text-gray-300 mb-6">
              이 포트폴리오를 영구 저장하고 언제든 수정하려면 로그인이 필요합니다.
            </p>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => router.push('/signup')}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl hover:brightness-110 transition shadow-lg"
              >
                회원가입하고 저장하기
              </button>
              <button
                onClick={() => {
                  const confirmed = window.confirm(
                    '⚠️ 주의: 로그인 후 이 임시 포트폴리오 데이터가 기존 계정의 포트폴리오에 덮어씌워집니다.\n\n계속하시겠습니까?'
                  );
                  if (confirmed) {
                    router.push('/login');
                  }
                }}
                className="w-full py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition"
              >
                이미 계정이 있어요
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowLoginModal(false)}
                className="flex-1 py-3 text-gray-400 hover:text-white transition"
              >
                나중에 하기
              </button>
              <button
                onClick={() => router.push('/home')}
                className="flex-1 py-3 bg-blue-500/20 border border-blue-500/30 text-blue-300 font-bold rounded-xl hover:bg-blue-500/30 transition flex items-center justify-center gap-2"
              >
                홈으로 가기
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <style jsx global>{`
        .marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 10s linear infinite;
        }
        @keyframes marquee {
          0%   { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>

      {/* Keyword Suggestion Modal */}
      <AnimatePresence>
        {showKeywordSuggestions && selectedKeyword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4"
            onClick={() => setShowKeywordSuggestions(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/30 rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">
                    "{selectedKeyword.keyword}" 활용 제안
                  </h2>
                  <p className="text-gray-400">
                    포트폴리오에 이 키워드를 효과적으로 추가하는 방법
                  </p>
                </div>
                <button
                  onClick={() => setShowKeywordSuggestions(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {selectedKeyword.suggestions?.map((suggestion, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl p-5 border border-purple-500/20">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-purple-400 font-bold">{suggestion.location}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${suggestion.impact === 'high'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                            {suggestion.impact === 'high' ? '높은 효과' : '중간 효과'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">{suggestion.reason}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">현재</div>
                        <div className="bg-gray-800/50 rounded p-2 text-sm text-gray-300">
                          {suggestion.current}
                        </div>
                      </div>
                      <div className="flex items-center justify-center text-purple-400">
                        ↓
                      </div>
                      <div>
                        <div className="text-xs text-emerald-500 mb-1">제안</div>
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded p-2 text-sm text-emerald-300">
                          {suggestion.suggested}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApplySuggestion(suggestion)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-2 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      적용하기
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-center text-sm text-gray-400">
                제안을 적용하면 포트폴리오가 자동으로 업데이트됩니다
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Toast */}
      <AnimatePresence>
        {showCopyToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-gray-900 border border-emerald-500/30 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-3 backdrop-blur-md"
          >
            <div className="bg-emerald-500/20 p-2 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">링크가 복사되었습니다!</p>
              <p className="text-xs text-gray-400">친구들에게 공유해보세요</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Share Modal */}
      {userData && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          portfolioId={router.query.portfolio || localStorage.getItem('current_portfolio_id')}
          ownerName={userData.name}
        />
      )}

      <style jsx global>{`
        @media print {
          .fixed, .no-print, button, .ChatWidget, #mumu-chatbot {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .min-h-screen {
            min-h-auto !important;
          }
        }
      `}</style>
    </>
  );
}

export async function getServerSideProps() {
  return {
    props: {}, // Will be passed to the page component as props
  };
}