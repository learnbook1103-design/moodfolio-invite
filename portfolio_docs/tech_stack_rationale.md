# 🛠️ 기술 선정 이유 (Technology Selection Rationale)

MoodFolio 프로젝트의 핵심 목표인 "빠른 개발 속도", "AI 기능의 효율적 통합", "안정적인 확장성"을 달성하기 위해 다음과 같은 기술 스택을 선정하였습니다.

## 1. Frontend: Next.js + Tailwind CSS
### 선정 기술
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Visualization**: Mermaid.js, Recharts

### 선정 이유
1. **생산성과 성능의 균형**: Next.js는 React 기반의 강력한 컴포넌트 생태계를 가지면서도, SSR(Server Side Rendering)을 통해 초기 로딩 속도와 SEO 최적화에 유리합니다.
2. **빠른 UI 개발**: Tailwind CSS는 사전에 정의된 유틸리티 클래스를 사용하여 CSS 파일을 오가는 컨텍스트 스위칭 없이 빠르게 모던하고 반응형인 UI를 구축할 수 있습니다.
3. **직관적인 라우팅**: App Router 시스템은 파일 구조 기반의 직관적인 라우팅을 제공하여 관리자 페이지(`/admin`)와 사용자 페이지(`/home`)를 명확히 분리하는 데 적합합니다.

## 2. Backend: Python FastAPI
### 선정 기술
- **Framework**: FastAPI
- **Server Interface**: Uvicorn (ASGI)

### 선정 이유
1. **AI 라이브러리와의 호환성**: AI/LLM 생태계(LangChain 등)가 Python 중심이므로, Node.js보다 Python 기반 백엔드가 AI 기능을 통합하고 유지보수하기에 압도적으로 유리합니다.
2. **고성능 비동기 처리**: FastAPI는 Node.js와 유사한 비동기(Async) 처리를 지원하여, AI 생성과 같이 시간이 오래 걸리는 I/O 바운드 작업에서도 서버가 블로킹되지 않고 요청을 처리할 수 있습니다.
3. **자동 문서화**: Swagger UI가 기본 내장되어 있어, 프론트엔드 개발자와의 협업 시 별도의 API 문서를 작성하는 수고를 덜어줍니다.

## 3. AI Engine: Google Gemini Pro
### 선정 기술
- **Model**: Gemini Pro (via LangChain)
- **API**: Google Generative AI SDK

### 선정 이유
1. **가성비와 성능**: GPT-4 수준의 높은 추론 능력을 제공하면서도, 초기 개발 단계에서 무료 티어의 넉넉한 할당량을 제공하여 비용 효율적인 개발이 가능합니다.
2. **긴 컨텍스트 윈도우**: 사용자의 이력서나 자기소개서 등 긴 텍스트 데이터를 분석하고 포트폴리오를 생성하기 위해서는 긴 입력 토큰을 처리할 수 있는 모델이 필수적입니다.

## 4. Database: Supabase (PostgreSQL)
### 선정 기술
- **DB**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth

### 선정 이유
1. **Backend-as-a-Service (BaaS)의 이점**: 별도의 DB 서버 구축이나 유지보수 없이 즉시 관계형 데이터베이스를 사용할 수 있어 개발 리소스를 절약했습니다.
2. **강력한 데이터 무결성**: 단순 NoSQL보다 템플릿 설정, 사용자 정보, 생성 로그 등 구조화된 데이터를 관리하기에 관계형 DB인 PostgreSQL이 적합합니다.
3. **손쉬운 인증 연동**: JWT 기반의 인증 시스템이 내장되어 있어, 보안성이 높은 관리자 로그인 기능을 빠르게 구현할 수 있었습니다.
