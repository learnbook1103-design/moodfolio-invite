# 📅 업무 분업 구조 (WBS - Work Breakdown Structure)

MoodFolio 프로젝트의 최근 개발 단계인 "관리자 기능 고도화" 및 "시스템 안정화" 페이즈의 업무 분장 내역입니다.

## Phase 1: 관리자 대시보드 고도화 (Admin Dashboard Enhancement)
관리자가 개발자의 개입 없이 템플릿 서비스 상태를 직접 제어할 수 있는 환경 구축.

- **1.1 UI/UX 구현**
    - 1.1.1 템플릿 카드 컴포넌트 디자인 (Thumbnail, Title, Description)
    - 1.1.2 상태 표시 토글 스위치 및 시각적 인디케이터(Green/Gray) 구현
    - 1.1.3 12종 템플릿 그리드 레이아웃 구성
- **1.2 프론트엔드 로직 개발**
    - 1.2.1 템플릿 설정 조회(`loadTemplateConfig`) 함수 구현
    - 1.2.2 템플릿 상태 변경(`toggleTemplate`) 함수 및 에러 핸들링 구현
    - 1.2.3 사용자 페이지의 템플릿 선택 모달(`TemplateSelectionModal`) 필터링 로직 연동

## Phase 2: 백엔드 API 및 시스템 개발 (Backend Development)
프론트엔드 기능을 뒷받침하고 시스템의 안정성을 보장하기 위한 서버 사이드 개발.

- **2.1 API 엔드포인트 개발**
    - 2.1.1 공개용 설정 조회 API (`GET /api/templates/config`) 개발: 인증 없이 접근 가능
    - 2.1.2 관리자용 설정 변경 API (`PUT /admin/templates/config/{key}`) 개발: JWT 인증 필수
    - 2.1.3 DB 쿼리 최적화 및 에러 반환 처리
- **2.2 시스템 안정성 확보 (Troubleshooting)**
    - 2.2.1 서버 기동 실패 이슈 분석 (환경 변수 인코딩 문제)
    - 2.2.2 `.env` 파일 파싱 로직 재설계 (BOM 문자 처리, `utf-8-sig` 적용)
    - 2.2.3 시작 시 설정 검증(Validation) 및 상세 로깅 추가

## Phase 3: 인프라 및 협업 환경 (Infrastructure & Collaboration)
지속 가능한 개발과 협업을 위한 기반 환경 재정비.

- **3.1 형상 관리 (Git Configuration)**
    - 3.1.1 개인 개발용 리모트(`main-repo`)와 협업용 리모트(`invite-repo`) 분리
    - 3.1.2 민감 정보 보호를 위한 `.gitignore` 및 `.env` 관리 정책 수립
- **3.2 배포 및 테스트**
    - 3.2.1 로컬 환경(Windows)에서의 통합 테스트 수행
    - 3.2.2 포트폴리오 작성을 위한 기술 문서 및 트러블슈팅 로그 작성
