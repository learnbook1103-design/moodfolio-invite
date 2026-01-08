import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { updateUserProfile, createPortfolio } from '../lib/db';

export default function Complete({ answers, resetAnswers }) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  };

  // 1. 저장 후 나가기
  const handleSaveAndExit = () => { resetAnswers(); router.push('/home'); };
  // 2. 저장 안 하고 나가기
  const handleDiscardAndExit = () => { resetAnswers(); router.push('/home'); };

  // 3. 프로필 생성 및 첫 포트폴리오 자동 생성
  const handleSubmitToAI = async () => {
    if (isSubmitting || !user) return;
    setIsSubmitting(true);

    try {
      // Step 1: 프로젝트 데이터 추출
      const projects = [];
      const isDesigner = answers.job === 'designer';

      for (let i = 1; i <= 6; i++) {
        const titleKey = isDesigner ? `design_project${i}_title` : `project${i}_title`;
        const descKey = isDesigner ? `design_project${i}_desc` : `project${i}_desc`;
        const linkKey = isDesigner ? `design_project${i}_link` : `project${i}_link`;
        const fileKey = isDesigner ? `design_project${i}_file` : `project${i}_file`;
        const imageKey = isDesigner ? `design_project${i}_image` : `project${i}_image`;

        if (answers[titleKey] || answers[descKey]) {
          projects.push({
            id: i,
            title: answers[titleKey] || '',
            desc: answers[descKey] || '',
            link: answers[linkKey] || '',
            file: answers[fileKey] || '',
            image: answers[imageKey] || ''
          });
        }
      }

      // Step 2: User Profile 생성
      const profileData = {
        name: answers.name || '',
        intro: answers.intro || '',
        career_summary: answers.career_summary || '',
        email: answers.email || '',
        phone: answers.phone || '',
        link: answers.link || '',
        skills: answers.skills || [],
        projects: projects,
        // Survey 응답 저장 (포트폴리오 생성 시 사용)
        default_job: answers.job || 'developer',
        default_strength: answers.strength || 'problem',
        default_moods: answers.moods || ['#차분한']
      };

      console.log('Creating user profile:', profileData);
      await updateUserProfile(user.id, profileData);

      // Step 3: 첫 포트폴리오 자동 생성
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

      const firstPortfolio = await createPortfolio(user.id, {
        title: `${answers.name || '나'}의 포트폴리오`,
        job: answers.job || 'developer',
        strength: answers.strength || 'problem',
        moods: answers.moods || ['#차분한'],
        template: getTemplateFromStrength(answers.strength)
      });

      console.log('First portfolio created:', firstPortfolio);

      // Step 4: Result 페이지로 리다이렉트
      resetAnswers(); // Survey 데이터 초기화
      router.push(`/result?portfolio=${firstPortfolio.id}`);

    } catch (error) {
      console.error('Profile creation error:', error);
      alert(`포트폴리오 생성 중 오류가 발생했습니다.\n\n${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-900 text-white py-20">
      <div className="w-full max-w-3xl">

        {/* 상단 메시지 */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 text-transparent bg-clip-text bg-linear-to-r from-pink-500 to-purple-500">
            All Set!
          </h1>
          <p className="text-gray-400 text-lg">
            작성하신 내용을 확인해주세요.<br />이대로 AI 분석을 시작하시겠습니까?
          </p>
        </div>

        {/* 📝 [복구됨] 사용자 입력 정보 요약 카드 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl mb-10">

          {/* 기본 정보 */}
          <div className="border-b border-gray-800 pb-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="inline-block px-3 py-1 text-xs font-bold text-green-400 bg-green-900/30 rounded-full mb-2">
                  {answers.job || '직무 미선택'}
                </span>
                <h2 className="text-3xl font-bold text-white">{answers.name || '이름 없음'}</h2>
                <p className="text-gray-400 mt-1">{answers.intro || '한 줄 소개 없음'}</p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>{answers.email}</p>
                <p>{answers.phone}</p>
              </div>
            </div>
          </div>

          {/* 무드 & 강점 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Mood & Vibe</h3>
              <div className="flex flex-wrap gap-2">
                {(answers.moods || []).map((mood, i) => (
                  <span key={i} className="px-3 py-1 bg-purple-900/40 text-purple-300 rounded-lg text-sm border border-purple-500/30">
                    {mood}
                  </span>
                ))}
                {(!answers.moods || answers.moods.length === 0) && <span className="text-gray-600">-</span>}
              </div>
              <p className="text-xs text-gray-500 mt-2">🎵 BGM: {answers.bgm || '-'}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wider">Main Strength</h3>
              <p className="text-blue-300 font-medium">
                {answers.strength ? `${answers.strength}` : '-'}
              </p>
            </div>
          </div>

          {/* 경력 요약 */}
          <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase">Career & Projects</h3>
            <div className="mb-6">
              <h4 className="text-white font-bold mb-2 text-sm">경력 요약</h4>
              <p className="text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                {answers.career_summary || '입력된 경력이 없습니다.'}
              </p>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(num => (
                answers[`project${num}_title`] && (
                  <div key={num} className="border-l-2 border-green-500 pl-4">
                    <h5 className="text-white font-bold text-sm">{answers[`project${num}_title`]}</h5>
                    <p className="text-gray-400 text-xs mt-1">{answers[`project${num}_desc`]}</p>
                  </div>
                )
              ))}
            </div>
          </div>

          {/* AI 요청 */}
          <div className="bg-linear-to-r from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 font-bold block mb-1">AI Request</span>
              <span className="text-lg font-bold text-transparent bg-clip-text bg-linear-to-r from-pink-400 to-purple-400">
                {answers.ai_request || '선택 안 함'}
              </span>
            </div>
            <span className="text-2xl"></span>
          </div>
        </div>

        {/* 👇 버튼 영역 (디자인 수정 완료) */}
        <div className="flex gap-4 justify-center items-center mt-10">

          <div className="relative group">
            <div className={`absolute -inset-1 rounded-lg bg-linear-to-r from-green-400 via-blue-500 to-purple-600 opacity-70 blur transition duration-200 
              ${isSubmitting ? 'animate-spin-slow' : 'group-hover:opacity-100'}`}>
            </div>

            <button
              onClick={handleSubmitToAI}
              disabled={isSubmitting}
              className={`relative px-10 py-4 rounded-lg bg-black font-bold text-lg flex items-center justify-center gap-3 transition-all whitespace-nowrap w-auto min-w-[220px]
                ${isSubmitting ? 'text-transparent' : 'text-white'}`}
            >
              {isSubmitting && (
                <div className="absolute inset-0 flex items-center justify-center text-white gap-2">
                  <svg className="animate-spin h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>AI 디자인 중...</span>
                </div>
              )}

              {!isSubmitting && (
                <>
                  <span className="bg-clip-text text-transparent bg-linear-to-r from-green-400 to-blue-500">
                    AI 분석 시작하기
                  </span>
                  <span></span>
                </>
              )}
            </button>
          </div>

          <button
            onClick={() => router.back()}
            className="px-6 py-4 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-all font-bold whitespace-nowrap"
          >
            수정하기
          </button>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => setShowModal(true)} className="text-gray-600 hover:text-white underline text-sm">
            처음으로 돌아가기
          </button>
        </div>
      </div>

      {/* 팝업 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2">처음으로 돌아가시겠어요?</h3>
            <p className="text-gray-400 mb-8">작성한 내용은 사라질 수 있습니다.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleSaveAndExit} className="w-full py-3 rounded-lg bg-linear-to-r from-green-500 to-blue-500 text-black font-bold">저장 후 처음으로</button>
              <button onClick={handleDiscardAndExit} className="w-full py-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10">저장 안 함 (초기화)</button>
              <button onClick={() => setShowModal(false)} className="w-full py-3 rounded-lg text-gray-500 hover:text-white mt-2">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}