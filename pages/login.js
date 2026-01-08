import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useGoogleLogin } from '@react-oauth/google';
import { signIn, getCurrentUser } from '../lib/auth'; // Supabase Auth
import { getUserProfile, updateUserProfile, createPortfolio } from '../lib/db';
import { loadGuestPortfolio, removeGuestPortfolio } from '../lib/guestStore';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState({ type: '', message: '' });
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const passwordRef = useRef(null);

  // 👇 [필수] 여기에 네이버 Client ID를 넣으세요!
  const NAVER_CLIENT_ID = "swARffOTqIry7j2VG7GK";
  const NAVER_CALLBACK_URL = "http://localhost:3000/login"; // 네이버 콘솔과 똑같아야 함

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { user } = await getCurrentUser();
      if (user) {
        // Check if user has profile
        const profile = await getUserProfile(user.id);
        if (profile && profile.name) {
          // Existing user with profile -> Home (Dashboard)
          router.push('/home');
        } else {
          // New user without profile -> Onboarding
          router.push('/onboarding');
        }
      }
    };
    checkAuth();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetStatus({ type: '', message: '' });

    if (!resetEmail || !resetEmail.includes('@')) {
      setResetStatus({ type: 'error', message: '올바른 이메일 주소를 입력해주세요.' });
      return;
    }

    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      setResetStatus({
        type: 'success',
        message: '비밀번호 재설정 이메일을 발송했습니다. 이메일을 확인해주세요.'
      });
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetStatus({ type: '', message: '' });
      }, 3000);
    } catch (error) {
      console.error('Password reset error:', error);
      setResetStatus({
        type: 'error',
        message: '이메일 발송에 실패했습니다. 다시 시도해주세요.'
      });
    }
  };

  const handleSuccess = (data, type) => {
    alert(`환영합니다, ${data.user_name}님! (${type})`);
    localStorage.setItem('user_name', data.user_name);
    localStorage.setItem('user_email', data.email);

    // Save portfolio data from backend to local storage, or clear it if null
    if (data.portfolio_data) {
      localStorage.setItem('portfolio_data', JSON.stringify(data.portfolio_data));
    } else {
      localStorage.removeItem('portfolio_data');
    }

    router.push('/home');
  };

  // --- 네이버 로그인 로직 (팝업) ---
  const loginWithNaver = () => {
    const state = Math.random().toString(36).substring(7);
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(NAVER_CALLBACK_URL)}&state=${state}`;

    // 팝업 열기 (가운데 정렬 계산)
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(naverAuthUrl, 'naverloginpop', `width=${width},height=${height},top=${top},left=${left}`);
  };

  // ✨ [핵심] 네이버 팝업에서 돌아왔을 때 토큰 감지
  useEffect(() => {
    // URL에 #access_token이 있으면 (네이버 로그인 성공 후 돌아온 것)
    if (window.location.hash && window.location.hash.includes('access_token')) {
      const token = window.location.hash.split('=')[1].split('&')[0];

      // 백엔드로 전송
      fetch(`${apiUrl}/naver-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token })
      })
        .then(res => res.json())
        .then(data => {
          if (data.user_name) {
            // 팝업이라면 창을 닫고 부모창을 이동시켜야 하지만, 
            // 같은 창(Redirect)이라면 바로 이동
            if (window.opener) {
              // 팝업인 경우: 부모창에게 알림 (여기선 간단히 alert 후 닫기)
              alert(`네이버 로그인 성공! ${data.user_name}님 환영합니다.`);
              window.opener.location.href = "/result";
              window.opener.localStorage.setItem('user_name', data.user_name);
              window.opener.localStorage.setItem('user_email', data.email);
              window.close();
            } else {
              handleSuccess(data, "Naver");
            }
          } else {
            alert("네이버 로그인 실패: " + data.detail);
          }
        })
        .catch(err => console.error("네이버 연동 에러", err));
    }
  }, []);


  // Email/Password Login with Supabase Auth
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      alert("이메일과 비밀번호를 입력해주세요.");
      return;
    }

    setIsLoading(true);
    try {
      const { user, session, error } = await signIn(formData.email, formData.password);

      if (error) {
        // Handle specific error cases
        const errorMsg = (error.message || '').toLowerCase();
        if (errorMsg.includes('invalid') || errorMsg.includes('credentials')) {
          alert("이메일 또는 비밀번호가 올바르지 않습니다.");
          setIsLoading(false);
          return;
        }
        if (errorMsg.includes('email not confirmed') || errorMsg.includes('confirmation')) {
          alert("이메일 인증이 필요합니다.\n이메일을 확인해주세요.");
          setIsLoading(false);
          return;
        }

        // Generic error
        alert("로그인에 실패했습니다.\n" + error.message);
        setIsLoading(false);
        return;
      }

      if (user && session) {
        // Store user ID for later use
        localStorage.setItem('user_id', user.id);

        // Check for guest portfolio data
        const guestData = sessionStorage.getItem('guest_portfolio');
        const currentPortfolioId = localStorage.getItem('current_portfolio_id') || sessionStorage.getItem('current_portfolio_id');

        // Migrate if we have an ID (check IndexedDB)
        if (currentPortfolioId) {
          // Migrate guest portfolio to DB
          try {
            const guestPortfolio = await loadGuestPortfolio(currentPortfolioId);

            if (guestPortfolio) {
              const profile = guestPortfolio.profile || {};

              // 1. Save profile - only include valid fields for user_profiles table
              const validProfileData = {
                name: profile.name || '',
                intro: profile.intro || '',
                career_summary: profile.career_summary || '',
                phone: profile.phone || '',
                link: profile.link || '',
                skills: Array.isArray(profile.skills) ? profile.skills : [],
                projects: Array.isArray(profile.projects) ? profile.projects : []
              };

              await updateUserProfile(user.id, validProfileData);

              // 2. Create portfolio
              const savedPortfolio = await createPortfolio(user.id, {
                title: guestPortfolio.title || `${profile.name || '나'}의 포트폴리오`,
                job: guestPortfolio.job || 'developer',
                strength: guestPortfolio.strength || 'problem',
                moods: Array.isArray(guestPortfolio.moods) ? guestPortfolio.moods : [],
                template: guestPortfolio.template || guestPortfolio.strength || 'problem'
              });

              // 3. Clear guest data
              await removeGuestPortfolio(currentPortfolioId);
              sessionStorage.removeItem('guest_portfolio');
              sessionStorage.removeItem('current_portfolio_id');
              localStorage.removeItem('guest_portfolio');
              localStorage.removeItem('current_portfolio_id');

              console.log('Guest data migrated successfully:', savedPortfolio);
              alert(`환영합니다!\n\n포트폴리오가 성공적으로 저장되었습니다.`);
              router.push(`/result?portfolio=${savedPortfolio.id}`);
              return;
            }
          } catch (error) {
            console.error('Migration error:', error);
            alert(`포트폴리오 저장 중 오류가 발생했습니다.\n\n${error.message || '다시 시도해주세요.'}`);
            // Continue with normal flow if migration fails
          }
        }

        // Normal flow: Check if user has profile
        const profile = await getUserProfile(user.id);

        if (profile && profile.name) {
          // Existing user with profile
          alert(`환영합니다, ${profile.name}님!`);
          router.push('/home'); // Redirect to Dashboard
        } else {
          // New user without profile
          alert(`환영합니다!\n\n포트폴리오를 만들어보세요.`);
          router.push('/onboarding');
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("로그인 중 문제가 발생했습니다.\n" + (error.message || '다시 시도해주세요.'));
    } finally {
      setIsLoading(false);
    }
  };

  // --- Google Login (Hook) ---
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const backendRes = await fetch(`${apiUrl}/google-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: tokenResponse.access_token })
        });
        const data = await backendRes.json();
        if (backendRes.ok) {
          handleSuccess(data, "Google");
        } else {
          alert("구글 로그인 실패: " + data.detail);
        }
      } catch (error) {
        console.error("구글 연동 에러", error);
        alert("구글 로그인 중 문제가 발생했습니다.");
      }
    },
    onError: () => {
      console.log('Google Login Failed');
      alert("구글 로그인에 실패했습니다.");
    }
  });

  const loginWithKakao = () => {
    if (window.Kakao && window.Kakao.isInitialized()) {
      window.Kakao.Auth.login({
        success: async (authObj) => {
          try {
            const res = await fetch(`${apiUrl}/kakao-login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token: authObj.access_token })
            });
            const data = await res.json();
            if (res.ok) {
              handleSuccess(data, "Kakao");
            } else {
              alert("카카오 로그인 실패: " + data.detail);
            }
          } catch (error) {
            console.error("카카오 연동 에러", error);
            alert("카카오 로그인 중 문제가 발생했습니다.");
          }
        },
        fail: (err) => {
          console.error(err);
          alert("카카오 로그인에 실패했습니다.");
        },
      });
    } else {
      alert("카카오 SDK가 로드되지 않았습니다.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900 text-white">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
        <h2 className="text-3xl font-bold mb-8 text-center text-transparent bg-clip-text bg-linear-to-r from-green-400 to-blue-500">로그인</h2>

        {/* SNS 버튼 영역 */}
        <div className="flex justify-center gap-4 mb-6">
          {/* 구글 */}
          {/* 구글 */}
          <button onClick={() => googleLogin()} className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:opacity-90">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
          </button>
          {/* 카카오 */}
          <button onClick={loginWithKakao} className="w-12 h-12 bg-[#FEE500] rounded-full flex items-center justify-center hover:opacity-90">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#3c1e1e"><path d="M12 3c-5.52 0-10 3.68-10 8.21 0 2.91 1.87 5.48 4.75 6.95-.21.78-.76 2.76-.87 3.16-.14.51.19.51.39.37.16-.11 2.56-1.74 3.57-2.42.69.1 1.41.15 2.16.15 5.52 0 10-3.68 10-8.21C22 6.68 17.52 3 12 3z" /></svg>
          </button>

          {/* 👇 [추가] 네이버 버튼 (초록색 N) */}
          <button onClick={loginWithNaver} className="w-12 h-12 bg-[#03C75A] rounded-full flex items-center justify-center hover:opacity-90 text-white font-black text-xl">
            N
          </button>
        </div>

        <div className="relative mb-6"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-700"></span></div><div className="relative flex justify-center text-xs uppercase"><span className="px-2 bg-gray-900 text-gray-500">Or Email</span></div></div>

        {/* ... (이메일 입력창 등 기존 코드 유지) ... */}
        <div className="space-y-5">
          <input
            name="email"
            type="email"
            placeholder="example@email.com"
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                passwordRef.current?.focus();
              }
            }}
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 text-white"
          />
          <input
            ref={passwordRef}
            name="password"
            type="password"
            placeholder="********"
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
              }
            }}
            className="w-full p-3 bg-gray-800 rounded border border-gray-700 text-white"
          />
        </div>

        {/* 비밀번호 찾기 링크 */}
        <div className="text-right mt-2">
          <button
            onClick={() => setShowResetModal(true)}
            className="text-sm text-gray-400 hover:text-emerald-400 transition"
          >
            비밀번호를 잊으셨나요?
          </button>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className={`w-full mt-6 py-4 rounded-xl font-bold transition-all ${isLoading
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-linear-to-r from-green-500 to-blue-500 text-black hover:shadow-lg'
            }`}
        >
          {isLoading ? '로그인 중...' : '로그인 하기'}
        </button>
        <div className="text-center mt-6 flex justify-center gap-4 text-sm"><Link href="/signup" className="text-gray-500 hover:text-white underline">회원가입</Link><span className="text-gray-700">|</span><Link href="/" className="text-gray-500 hover:text-white underline">메인으로</Link></div>
      </div>

      {/* 비밀번호 재설정 모달 */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2">비밀번호 재설정</h3>
            <p className="text-gray-400 text-sm mb-6">
              가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
            </p>

            <form onSubmit={handlePasswordReset}>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="example@email.com"
                className="w-full p-3 bg-gray-800 rounded border border-gray-700 text-white mb-4"
                required
              />

              {resetStatus.message && (
                <div className={`p-3 rounded-lg mb-4 ${resetStatus.type === 'success'
                  ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                  : 'bg-red-500/20 border border-red-500/30 text-red-300'
                  }`}>
                  {resetStatus.message}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail('');
                    setResetStatus({ type: '', message: '' });
                  }}
                  className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-lg hover:shadow-lg transition"
                >
                  이메일 발송
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Loading Spinner */}
      <LoadingSpinner isLoading={isLoading} message="로그인 중..." />
    </div>
  );
}