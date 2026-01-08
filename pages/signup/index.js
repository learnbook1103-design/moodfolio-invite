import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useGoogleLogin } from '@react-oauth/google';

// Components
import Modal from '../../components/Modal';

import BackgroundElements from '../../components/BackgroundElements';
import LoadingSpinner from '../../components/LoadingSpinner';
import { apiWrapper, apiUrl } from '../../utils/apiHelper'; // Shared helper
import { isValidEmail, checkPasswordStrength, getPasswordStrengthMessage, getPasswordStrengthColor, getPasswordStrengthTextColor, isValidName } from '../../utils/validation';
import { signUp } from '../../lib/auth'; // Supabase Auth
import { updateUserProfile, createPortfolio } from '../../lib/db';
import { loadGuestPortfolio, removeGuestPortfolio } from '../../lib/guestStore';
import { supabase } from '../../lib/supabase';

// --- 애니메이션 설정 (배경 유지) ---
const windAnimation = {
  rotate: [0, -1.5, 0, 1.5, 0],
  transition: { duration: 6, ease: "easeInOut", times: [0, 0.25, 0.5, 0.75, 1], repeat: Infinity, repeatType: "loop" }
};

// ==========================================
// [내부 컴포넌트 1] 회원가입 폼
// ==========================================
function SignupForm({ onComplete }) {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '', name: '' });
  const [agreements, setAgreements] = useState({ terms: false, privacy: false, marketing: false });
  const [modalContent, setModalContent] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const nameRef = useRef(null);

  // Validation state
  const [validation, setValidation] = useState({
    email: { isValid: null, message: '' },
    password: { strength: null, message: '' },
    confirmPassword: { isValid: null, message: '' },
    name: { isValid: null, message: '' }
  });
  const [touched, setTouched] = useState({});

  const NAVER_CLIENT_ID = "swARffOTqIry7j2VG7GK";
  const NAVER_CALLBACK_URL = typeof window !== 'undefined' ? `${window.location.origin}/signup` : '';

  // --- Modal Logic ---
  const openModal = (type) => {
    if (type === 'terms') {
      setModalContent({
        title: '서비스 이용약관',
        content: `제1조 (목적)
본 약관은 MoodFolio(이하 "회사")가 제공하는 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 감정 기록 및 포트폴리오 관리 플랫폼을 의미합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 회원 및 비회원을 말합니다.
3. "회원"이란 회사와 서비스 이용계약을 체결하고 회원 아이디를 부여받은 자를 말합니다.

제3조 (약관의 효력 및 변경)
1. 본 약관은 서비스를 이용하고자 하는 모든 이용자에게 그 효력이 발생합니다.
2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.
3. 약관이 변경되는 경우 회사는 변경사항을 시행일자 7일 전부터 공지합니다.

제4조 (서비스의 제공)
1. 회사는 다음과 같은 서비스를 제공합니다:
   - 감정 기록 및 분석 서비스
   - 개인 포트폴리오 관리 서비스
   - 데이터 시각화 및 통계 서비스
2. 서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다.
3. 회사는 시스템 점검, 보수 등의 사유로 서비스 제공을 일시적으로 중단할 수 있습니다.

제5조 (회원가입)
1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.
2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
   - 등록 내용에 허위, 기재누락, 오기가 있는 경우
   - 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우

제6조 (회원 탈퇴 및 자격 상실)
1. 회원은 언제든지 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.
2. 회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다:
   - 가입 신청 시 허위 내용을 등록한 경우
   - 다른 사람의 서비스 이용을 방해하거나 정보를 도용하는 등 전자상거래 질서를 위협하는 경우
   - 서비스를 이용하여 법령 또는 본 약관이 금지하는 행위를 하는 경우

제7조 (개인정보보호)
회사는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 이용에 대해서는 관련 법령 및 회사의 개인정보처리방침이 적용됩니다.

제8조 (회사의 의무)
1. 회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위하여 최선을 다합니다.
2. 회사는 이용자의 개인정보 보호를 위해 보안시스템을 구축하며 개인정보처리방침을 공시하고 준수합니다.

제9조 (이용자의 의무)
1. 이용자는 다음 행위를 하여서는 안 됩니다:
   - 신청 또는 변경 시 허위내용의 등록
   - 타인의 정보 도용
   - 회사가 게시한 정보의 변경
   - 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시
   - 회사 기타 제3자의 저작권 등 지적재산권에 대한 침해
   - 회사 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
   - 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위

제10조 (저작권의 귀속 및 이용제한)
1. 회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.
2. 이용자는 서비스를 이용함으로써 얻은 정보 중 회사에게 지적재산권이 귀속된 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.

제11조 (분쟁해결)
1. 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 피해보상처리기구를 설치·운영합니다.
2. 회사와 이용자 간에 발생한 전자상거래 분쟁과 관련하여 이용자의 피해구제신청이 있는 경우에는 공정거래위원회 또는 시·도지사가 의뢰하는 분쟁조정기관의 조정에 따를 수 있습니다.

제12조 (재판권 및 준거법)
1. 회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다.
2. 회사와 이용자 간에 제기된 전자상거래 소송에는 대한민국법을 적용합니다.

부칙
본 약관은 2025년 12월 15일부터 시행됩니다.`
      });
    } else if (type === 'privacy') {
      setModalContent({
        title: '개인정보 수집 및 이용 동의',
        content: `MoodFolio(이하 "회사")는 개인정보 보호법 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.

제1조 (개인정보의 처리 목적)
회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.

1. 회원 가입 및 관리
   - 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적으로 개인정보를 처리합니다.

2. 재화 또는 서비스 제공
   - 서비스 제공, 콘텐츠 제공, 맞춤 서비스 제공, 본인인증을 목적으로 개인정보를 처리합니다.

3. 마케팅 및 광고에의 활용
   - 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 인구통계학적 특성에 따른 서비스 제공 및 광고 게재, 서비스의 유효성 확인, 접속빈도 파악 또는 회원의 서비스 이용에 대한 통계 등을 목적으로 개인정보를 처리합니다.

제2조 (개인정보의 처리 및 보유 기간)
1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.
2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:
   - 회원 가입 및 관리: 회원 탈퇴 시까지
   - 재화 또는 서비스 제공: 재화·서비스 공급완료 및 요금결제·정산 완료시까지

제3조 (처리하는 개인정보의 항목)
회사는 다음의 개인정보 항목을 처리하고 있습니다:

1. 필수항목
   - 이메일 주소, 비밀번호, 이름
   - 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보

2. 선택항목
   - 프로필 사진, 생년월일, 직업, 관심사

제4조 (개인정보의 제3자 제공)
회사는 정보주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.

제5조 (개인정보처리의 위탁)
1. 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:
   - 위탁받는 자: (예시) AWS, Google Cloud Platform
   - 위탁하는 업무의 내용: 서버 호스팅, 데이터 저장 및 관리

2. 회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등 책임에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.

제6조 (정보주체의 권리·의무 및 그 행사방법)
1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:
   - 개인정보 열람요구
   - 오류 등이 있을 경우 정정 요구
   - 삭제요구
   - 처리정지 요구

2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전화, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.

제7조 (개인정보의 파기)
1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.
2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:
   - 파기절차: 불필요한 개인정보 및 개인정보파일은 개인정보책임자의 책임 하에 내부방침 절차에 따라 파기합니다.
   - 파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다. 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.

제8조 (개인정보의 안전성 확보 조치)
회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:
1. 관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육 등
2. 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 고유식별정보 등의 암호화, 보안프로그램 설치
3. 물리적 조치: 전산실, 자료보관실 등의 접근통제

제9조 (개인정보 자동 수집 장치의 설치·운영 및 거부에 관한 사항)
1. 회사는 이용자에게 개별적인 맞춤서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(cookie)'를 사용합니다.
2. 쿠키는 웹사이트를 운영하는데 이용되는 서버(http)가 이용자의 컴퓨터 브라우저에게 보내는 소량의 정보이며 이용자들의 PC 컴퓨터내의 하드디스크에 저장되기도 합니다.
3. 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서, 이용자는 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.

제10조 (개인정보 보호책임자)
회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:

- 개인정보 보호책임자
  성명: [담당자명]
  직책: [직책]
  연락처: [이메일], [전화번호]

제11조 (개인정보 처리방침 변경)
이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.

부칙
본 방침은 2025년 12월 15일부터 시행됩니다.`
      });
    }
  };
  const closeModal = () => setModalContent(null);

  // --- Social Login Success Handler ---
  const handleSocialSuccess = (data, type) => {
    alert(`${type} 계정으로 가입되었습니다. 설문을 시작합니다.`);
    onComplete({
      email: data.email,
      name: data.user_name,
      password: "social-login-password"
    });
  };

  // --- Google Login ---
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
          handleSocialSuccess(data, "Google");
        } else {
          alert("구글 연동 실패: " + data.detail);
        }
      } catch (error) {
        console.error("Google-Signup-Error:", error);
        alert("서버와 통신 중 오류가 발생했습니다.");
      }
    },
    onError: () => {
      console.log('Google Login Failed');
      alert("구글 로그인에 실패했습니다.");
    }
  });

  // --- Kakao Login ---
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
              handleSocialSuccess(data, "Kakao");
            } else {
              alert("카카오 연동 실패: " + data.detail);
            }
          } catch (error) {
            console.error("Kakao-Signup-Error:", error);
            alert("서버와 통신 중 오류가 발생했습니다.");
          }
        },
        fail: (err) => {
          console.error(err);
          alert("카카오 로그인에 실패했습니다.");
        },
      });
    }
  };

  // --- Naver Login ---
  const loginWithNaver = () => {
    const state = Math.random().toString(36).substring(7);
    const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=token&client_id=${NAVER_CLIENT_ID}&redirect_uri=${encodeURIComponent(NAVER_CALLBACK_URL)}&state=${state}`;
    window.open(naverAuthUrl, 'naverloginpop', 'width=500,height=600');
  };

  useEffect(() => {
    const handleNaverCallback = (data) => {
      handleSocialSuccess(data, "Naver");
    };
    window.handleNaverCallback = handleNaverCallback;

    if (window.location.hash && window.location.hash.includes('access_token')) {
      const token = window.location.hash.split('=')[1].split('&')[0];
      fetch(`${apiUrl}/naver-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token })
      })
        .then(res => res.json())
        .then(data => {
          if (data.user_name && window.opener && window.opener.handleNaverCallback) {
            window.opener.handleNaverCallback(data);
            window.close();
          }
        })
        .catch(err => console.error("Naver-Popup-Error:", err));
    }

    return () => { delete window.handleNaverCallback; };
  }, []);

  // --- Email Signup ---
  const handleSignup = async () => {
    // Validation checks
    if (!formData.email || !formData.password || !formData.name) {
      return alert("필수 항목을 모두 입력해주세요.");
    }

    if (!formData.email.trim()) {
      return alert("이메일을 입력해주세요.");
    }

    // Check for Korean or non-ASCII characters
    if (/[^\x00-\x7F]/.test(formData.email)) {
      return alert("이메일 주소에 한글이나 특수문자를 사용할 수 없습니다.\n\n영문과 숫자만 사용해주세요.\n예: user123@example.com");
    }

    if (!isValidEmail(formData.email)) {
      return alert("이메일 형식이 올바르지 않습니다.\n예: user@example.com");
    }

    if (!isValidName(formData.name)) {
      return alert("이름은 2자 이상 입력해주세요.");
    }

    const passwordStrength = checkPasswordStrength(formData.password);
    if (passwordStrength === 'weak') {
      return alert("비밀번호가 너무 약합니다.\n8자 이상, 영문/숫자/특수문자를 포함해주세요.");
    }

    if (formData.password !== formData.confirmPassword) {
      return alert("비밀번호가 일치하지 않습니다.\n다시 확인해주세요.");
    }

    if (!agreements.terms || !agreements.privacy) {
      return alert("필수 약관에 동의해주세요.");
    }

    try {
      console.log('Attempting signup with:', { email: formData.email, name: formData.name });

      // Use Supabase Auth for signup
      const { user, session, error } = await signUp(
        formData.email.trim(), // Trim whitespace
        formData.password,
        { name: formData.name }
      );

      if (error) {
        console.error('Signup error:', error);

        // Handle specific error cases
        if (error.message.includes('already registered')) {
          return alert("이미 가입된 이메일입니다.\n로그인 페이지로 이동하시겠어요?");
        }
        if (error.message.includes('invalid format') || error.message.includes('email')) {
          return alert("이메일 형식이 올바르지 않습니다.\n다시 확인해주세요.");
        }
        throw error;
      }

      if (user) {
        alert("회원가입에 성공했습니다!");
        // Pass user data to completion handler
        onComplete({
          ...formData,
          userId: user.id
        });
      }

    } catch (error) {
      console.error("Signup error:", error);
      alert("회원가입 처리 중 오류가 발생했습니다.\n" + (error.message || '다시 시도해주세요.'));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Real-time validation
    if (name === 'email') {
      const isValid = isValidEmail(value);
      setValidation(prev => ({
        ...prev,
        email: {
          isValid: value ? isValid : null,
          message: value && !isValid ? '올바른 이메일 형식이 아닙니다' : ''
        }
      }));
    }

    if (name === 'password') {
      const strength = checkPasswordStrength(value);
      setValidation(prev => ({
        ...prev,
        password: {
          strength: value ? strength : null,
          message: value ? getPasswordStrengthMessage(strength) : ''
        }
      }));

      // Also validate confirm password if it exists
      if (formData.confirmPassword) {
        setValidation(prev => ({
          ...prev,
          confirmPassword: {
            isValid: value === formData.confirmPassword,
            message: value !== formData.confirmPassword ? '비밀번호가 일치하지 않습니다' : ''
          }
        }));
      }
    }

    if (name === 'confirmPassword') {
      const isValid = value === formData.password;
      setValidation(prev => ({
        ...prev,
        confirmPassword: {
          isValid: value ? isValid : null,
          message: value && !isValid ? '비밀번호가 일치하지 않습니다' : ''
        }
      }));
    }

    if (name === 'name') {
      const isValid = isValidName(value);
      setValidation(prev => ({
        ...prev,
        name: {
          isValid: value ? isValid : null,
          message: value && !isValid ? '이름은 2자 이상 입력해주세요' : ''
        }
      }));
    }
  };
  const handleAgreementChange = (e) => {
    const { name, checked } = e.target;
    setAgreements(prev => ({ ...prev, [name]: checked }));
  };
  const handleAllAgreement = (e) => {
    const { checked } = e.target;
    setAgreements({ terms: checked, privacy: checked, marketing: checked });
  };
  const isAllRequiredChecked = agreements.terms && agreements.privacy;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.5 }} className="w-full max-w-md p-8 rounded-3xl bg-black/30 backdrop-blur-md border border-white/10 shadow-2xl">
      <h2 className="text-3xl font-bold mb-6 text-center text-transparent bg-clip-text bg-linear-to-r from-emerald-300 to-blue-400 font-serif">회원가입</h2>

      {/* 소셜 로그인 */}
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
        {/* 네이버 */}
        <button onClick={loginWithNaver} className="w-12 h-12 bg-[#03C75A] rounded-full flex items-center justify-center hover:opacity-90 text-white font-black text-xl">
          N
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-px bg-white/10 flex-1" />
        <span className="text-xs text-gray-400 uppercase font-medium tracking-wide">Or Email</span>
        <div className="h-px bg-white/10 flex-1" />
      </div>

      {/* 입력 폼 */}
      <div className="space-y-4">
        {/* Email */}
        <div>
          <input
            name="email"
            type="text"
            placeholder="이메일"
            value={formData.email}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                passwordRef.current?.focus();
              }
            }}
            className={`w-full p-4 bg-white/5 rounded-xl border text-white placeholder-gray-400 focus:bg-white/10 focus:outline-none transition-all ${validation.email.isValid === false ? 'border-red-500' :
              validation.email.isValid === true ? 'border-green-500' :
                'border-white/10 focus:border-emerald-500'
              }`}
          />
          {validation.email.message && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <span></span> {validation.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <input
            ref={passwordRef}
            name="password"
            type="password"
            placeholder="비밀번호"
            value={formData.password}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                confirmPasswordRef.current?.focus();
              }
            }}
            className="w-full p-4 bg-white/5 rounded-xl border border-white/10 text-white placeholder-gray-400 focus:border-emerald-500 focus:bg-white/10 focus:outline-none transition-all"
          />
          {validation.password.strength && (
            <div className="mt-2">
              <div className="flex gap-1 h-1 mb-1">
                <div className={`flex-1 rounded ${validation.password.strength === 'weak' ? 'bg-red-500' : 'bg-gray-700'}`}></div>
                <div className={`flex-1 rounded ${validation.password.strength === 'medium' || validation.password.strength === 'strong' ? 'bg-yellow-500' : 'bg-gray-700'}`}></div>
                <div className={`flex-1 rounded ${validation.password.strength === 'strong' ? 'bg-green-500' : 'bg-gray-700'}`}></div>
              </div>
              <p className={`text-xs ${getPasswordStrengthTextColor(validation.password.strength)}`}>
                {validation.password.message}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <input
            ref={confirmPasswordRef}
            name="confirmPassword"
            type="password"
            placeholder="비밀번호 확인"
            value={formData.confirmPassword}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                nameRef.current?.focus();
              }
            }}
            className={`w-full p-4 bg-white/5 rounded-xl border text-white placeholder-gray-400 focus:bg-white/10 focus:outline-none transition-all ${validation.confirmPassword.isValid === false ? 'border-red-500' :
              validation.confirmPassword.isValid === true ? 'border-green-500' :
                'border-white/10 focus:border-emerald-500'
              }`}
          />
          {validation.confirmPassword.message && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <span></span> {validation.confirmPassword.message}
            </p>
          )}
          {validation.confirmPassword.isValid === true && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <span></span> 비밀번호가 일치합니다
            </p>
          )}
        </div>

        {/* Name */}
        <div>
          <input
            ref={nameRef}
            name="name"
            type="text"
            placeholder="이름"
            value={formData.name}
            onChange={handleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isAllRequiredChecked) {
                e.preventDefault();
                handleSignup();
              }
            }}
            className={`w-full p-4 bg-white/5 rounded-xl border text-white placeholder-gray-400 focus:bg-white/10 focus:outline-none transition-all ${validation.name.isValid === false ? 'border-red-500' :
              validation.name.isValid === true ? 'border-green-500' :
                'border-white/10 focus:border-emerald-500'
              }`}
          />
          {validation.name.message && (
            <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
              <span></span> {validation.name.message}
            </p>
          )}
        </div>

        {/* Agreements */}
        <div className="space-y-3 mt-6 p-4 bg-white/5 rounded-xl border border-white/5">
          <div className="flex items-center gap-3 cursor-pointer"><input type="checkbox" id="all" checked={isAllRequiredChecked} onChange={handleAllAgreement} className="accent-emerald-500 w-5 h-5 cursor-pointer" /><label htmlFor="all" className="text-sm font-bold text-gray-200 cursor-pointer">약관 전체 동의</label></div>
          <div className="pl-2 space-y-2 text-xs text-gray-400">
            <div className="flex items-center gap-2"><input type="checkbox" name="terms" checked={agreements.terms} onChange={handleAgreementChange} className="accent-emerald-500 cursor-pointer" /> <span>[필수] 서비스 이용약관</span> <button type="button" onClick={() => openModal('terms')} className="ml-auto px-2 py-1 text-xs text-emerald-400 border border-emerald-400 rounded hover:bg-emerald-400 hover:text-white transition-colors">보기</button></div>
            <div className="flex items-center gap-2"><input type="checkbox" name="privacy" checked={agreements.privacy} onChange={handleAgreementChange} className="accent-emerald-500 cursor-pointer" /> <span>[필수] 개인정보 수집 및 이용</span> <button type="button" onClick={() => openModal('privacy')} className="ml-auto px-2 py-1 text-xs text-emerald-400 border border-emerald-400 rounded hover:bg-emerald-400 hover:text-white transition-colors">보기</button></div>
          </div>        </div>
      </div>
      <button onClick={handleSignup} disabled={!isAllRequiredChecked} className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all transform active:scale-95 ${isAllRequiredChecked ? 'bg-linear-to-r from-emerald-400 to-blue-500 text-black shadow-[0_0_20px_rgba(52,211,153,0.4)]' : 'bg-gray-700/50 text-gray-500 cursor-not-allowed border border-white/5'}`}>이메일로 회원가입</button>
      <div className="text-center mt-6"><Link href="/home" className="text-sm text-gray-400 hover:text-white underline transition-colors underline-offset-4">메인으로 돌아가기</Link></div>

      <Modal isOpen={!!modalContent} onClose={closeModal}>
        {modalContent && (
          <>
            <h2 className="text-2xl font-bold text-emerald-400 mb-6">{modalContent.title}</h2>
            <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
              {modalContent.content}
            </div>
          </>
        )}
      </Modal>
    </motion.div>
  );
}

// ==========================================
// [메인] 통합 페이지 (배경 포함)
// ==========================================
export default function SignUpPage() {
  const router = useRouter();
  const [showWidget, setShowWidget] = useState(false);
  const [hideGif, setHideGif] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Added missing state

  // Trigger widget animation on page load
  useEffect(() => {
    setShowWidget(true);
    // GIF plays while sliding (2s) + additional playback time
    // Adjust this value based on actual GIF duration
    const timer = setTimeout(() => {
      setHideGif(true);
    }, 5000); // GIF plays during entire animation + 3s extra

    return () => clearTimeout(timer);
  }, []);

  const handleSignupComplete = async (signupData) => {
    setIsLoading(true); // Start loading
    try {

      // Save user session data
      if (signupData.userId) {
        localStorage.setItem('user_id', signupData.userId);
      }
      localStorage.setItem('signup_data', JSON.stringify(signupData));

      // Wait for Supabase session to be fully established
      let sessionEstablished = false;
      let retries = 0;
      const maxRetries = 5;

      while (!sessionEstablished && retries < maxRetries) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          sessionEstablished = true;
          console.log('✅ Session established for user:', session.user.id);
        } else {
          retries++;
          console.log(`⏳ Waiting for session... (${retries}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
        }
      }

      if (!sessionEstablished) {
        console.warn('⚠️ Session not established after retries, proceeding anyway');
      }

      // Check for guest portfolio data
      const guestData = sessionStorage.getItem('guest_portfolio');
      const currentPortfolioId = localStorage.getItem('current_portfolio_id') || sessionStorage.getItem('current_portfolio_id');

      if (currentPortfolioId && signupData.userId) {
        // Migrate guest portfolio to DB
        try {
          const guestPortfolio = await loadGuestPortfolio(currentPortfolioId);
          console.log('📦 Guest portfolio data:', guestPortfolio);

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
              projects: Array.isArray(profile.projects) ? profile.projects : [],
              // Peer comparison fields
              job_type: profile.job_type || guestPortfolio.job || 'developer',
              years_experience: profile.years_experience || 0
            };

            console.log('💾 Saving profile data:', validProfileData);
            await updateUserProfile(signupData.userId, validProfileData);

            // 2. Create portfolio - ensure all required fields have defaults
            const portfolioData = {
              title: guestPortfolio.title || `${profile.name || '나'}의 포트폴리오`,
              job: guestPortfolio.job || 'developer',
              strength: guestPortfolio.strength || 'problem',
              moods: Array.isArray(guestPortfolio.moods) ? guestPortfolio.moods : [],
              template: guestPortfolio.template || guestPortfolio.strength || 'problem'
            };

            console.log('📁 Creating portfolio:', portfolioData);
            const savedPortfolio = await createPortfolio(signupData.userId, portfolioData);

            // 3. Clear guest data
            await removeGuestPortfolio(currentPortfolioId);
            sessionStorage.removeItem('guest_portfolio');
            sessionStorage.removeItem('current_portfolio_id');
            localStorage.removeItem('guest_portfolio');
            localStorage.removeItem('current_portfolio_id');

            console.log('✅ Guest data migrated after signup:', savedPortfolio);
            alert('회원가입 성공!\n\n임시 포트폴리오가 저장되었습니다.');
            router.push(`/result?portfolio=${savedPortfolio.id}`);
            return;
          }
        } catch (error) {
          console.error('❌ Migration error after signup:', error);
          console.error('Error details:', error.message, error.code);

          // Handle specific errors
          if (error.code === '23505' || error.message?.includes('duplicate key')) {
            alert('이미 사용 중인 이메일입니다.\n\n다른 이메일로 다시 시도해주세요.');
            router.push('/signup');
            return;
          }

          // For other errors, show user-friendly message and continue with normal flow
          alert(`포트폴리오 저장 중 오류가 발생했습니다.\n\n${error.message || '온보딩 페이지로 이동합니다.'}`);
        }
      }

      // Normal flow: Redirect to onboarding page
      alert('회원가입 성공!\n\n포트폴리오를 만들어보세요.');
      router.push('/onboarding');
    } catch (error) {
      console.error("Error in signup completion:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a2e35] flex flex-col items-center justify-center relative overflow-hidden">

      {/* 배경 요소 */}
      <BackgroundElements animate={true} />

      {/* 컨텐츠 영역 */}
      <div className="relative z-30 w-full h-full flex items-center justify-center px-4 overflow-y-auto py-10">
        {/* Only Signup Form is shown here now */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="w-full flex justify-center">
          <SignupForm onComplete={handleSignupComplete} />
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

      {/* Global Loading Spinner */}
      <LoadingSpinner isLoading={isLoading} message="회원가입 처리 중..." />
    </div>
  );
}
