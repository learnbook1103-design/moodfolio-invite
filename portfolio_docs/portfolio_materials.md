# MoodFolio Portfolio Materials Checklist

## 1. Project Overview
- [ ] **One-Liner**: 한 문장으로 서비스를 정의 (예: "취업 준비생을 위한 AI 기반 맞춤형 포트폴리오 생성 솔루션")
- [ ] **Problem & Solution**: 어떤 문제를 해결하려고 했는지, 그리고 어떻게 해결했는지
- [ ] **Target Audience**: 주 사용층 (취준생, 이직자 등)

## 2. Technical Stacks (기술 스택)
- [ ] **Frontend**: Next.js 14 (App Router), TailwindCSS, Mermaid.js
- [ ] **Backend**: Python FastAPI, Uvicorn
- [ ] **AI/LLM**: Google Gemini Pro, LangChain (RAG Implementation)
- [ ] **Database**: Supabase (PostgreSQL)
- [ ] **Deployment**: (Vercel/Railway/AWS 등 사용한 것이 있다면 기재)

## 3. Key Features (핵심 기능)
- [ ] **AI Resume Parsing**: 이력서를 분석하여 포트폴리오 데이터 추출
- [ ] **Template System**: 12가지 직무별/스타일별 맞춤 템플릿
- [ ] **RAG Chatbot**: 사용자의 이력 데이터를 기반으로 한 AI 상담
- [ ] **Admin Dashboard**: 템플릿 관리, AI 사용량 통계, 사용자 관리

## 4. System Architecture (시스템 아키텍처)
- [ ] **Architecture Diagram**: Frontend ↔ Backend ↔ AI/DB 데이터 흐름도
- [ ] **ERD (Entity Relationship Diagram)**: User, Portfolio, AI_Log 등 테이블 관계도
- [ ] **API Documentation**: 주요 API 명세 (Swagger/Redoc 캡처)

## 5. Technical Challenges & Solutions (트러블슈팅 로그) ★ 중요!
개발 과정에서 겪은 기술적 어려움과 해결 과정을 **STAR 기법** (Situation, Task, Action, Result)으로 정리
- [ ] **Case 1: 백엔드 환경 변수 인코딩 문제** (방금 해결한 이슈!)
    - *문제*: UTF-8 BOM으로 인한 .env 파일 파싱 실패
    - *해결*: 파이썬 `utf-8-sig` 인코딩을 사용하여 BOM 처리 로직 구현
- [ ] **Case 2: Next.js와 FastAPI 간의 CORS 및 통신 문제**
- [ ] **Case 3: RAG(검색 증강 생성) 정확도 개선 경험**

## 6. Visual Assets (시각 자료)
- [ ] **Demo UI**: 주요 기능 GIF 또는 짧은 영상
- [ ] **Before & After**: (있다면) 개선 전후 비교

## 7. Metrics & Performance (성과)
- [ ] **AI Response Time**: 응답 속도 최적화 노력 (예: 스트리밍 적용 등)
- [ ] **Code Quality**: 컴포넌트 재사용성, 모듈화 구조 등
