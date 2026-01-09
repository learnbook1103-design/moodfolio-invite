# 🛠️ 기술 트러블슈팅 리포트
## 환경 변수 인코딩 문제로 인한 치명적 백엔드 실행 오류 해결

### 1. Situation (상황)
- **프로젝트**: MoodFolio (AI 기반 포트폴리오 생성 서비스)
- **컨텍스트**: Python FastAPI와 LangChain을 활용한 백엔드 서버 개발 중
- **문제 발생**: 백엔드 서버가 시작되지 않아 관리자 대시보드가 무한 로딩되는 현상 발생. `.env` 파일에 `GOOGLE_API_KEY`가 정확히 존재함에도 불구하고 "API Key not found" 에러가 지속됨.

### 2. Task (과제)
- 설정 파일에 키가 존재함에도 인식되지 않는 원인을 규명.
- Windows 등 다양한 환경에서도 안정적으로 환경 변수를 로드할 수 있도록 서버 안정성 확보.

### 3. Action (해결 과정)

#### 1단계: 가설 수립 및 검증
- **가설 A**: 파일 경로 오류?
    - *검증*: `os.getcwd()` 출력 및 파일 존재 여부 확인 -> **False** (파일은 정확한 위치에 존재).
- **가설 B**: 변수명 오타?
    - *검증*: `.env` 파일과 `main.py`의 `GOOGLE_API_KEY` 스펠링 대조 -> **False** (일치함).
- **가설 C**: 라이브러리(`python-dotenv`) 인식 문제?
    - *행동*: 파일의 내용을 직접 출력하여 확인 시도.
    - *발견*: 파일 내용은 읽히지만 `os.getenv`로 값을 가져오지 못함 확인.

#### 2단계: 근본 원인 분석 (Root Cause Analysis)
- **범인**: **파일 인코딩 문제 (BOM - Byte Order Mark)**
- `.env` 파일이 일부 윈도우 에디터에서 저장될 때 **UTF-8 with BOM** 형식으로 저장됨.
- 표준 `load_dotenv()` 함수나 일반적인 파일 읽기로는 파일 시작 부분의 보이지 않는 문자 BOM(`\ufeff`)을 제대로 제거하지 못함.
- 결과적으로 `GOOGLE_API_KEY`가 `\ufeffGOOGLE_API_KEY`로 인식되어, 키를 찾지 못하는 현상 발생.

#### 3단계: 해결책 구현
- 라이브러리에 의존하던 방식을 **직접 파일 파싱 로직**으로 교체.
- Python의 **`encoding='utf-8-sig'`** 옵션을 사용하여 BOM 문자를 자동으로 처리하도록 수정.
- 공백 제거 및 주석 무시 등 파싱 로직을 견고하게 작성.

```python
# 개선된 환경 변수 로딩 코드
if env_path.exists():
    try:
        # utf-8-sig: BOM 문자를 자동으로 처리하는 인코딩
        with open(env_path, 'r', encoding='utf-8-sig') as f:
            for line in f:
                if line.strip().startswith('GOOGLE_API_KEY='):
                    GOOGLE_API_KEY = line.split('=', 1)[1].strip()
                    break
    except Exception as e:
        print(f"⚠️ .env 파일 읽기 실패: {e}")
```

### 4. Result (결과)
- **성과**: 백엔드 서버가 환경에 구애받지 않고 100% 안정적으로 실행됨.
- **성능**: 프론트엔드 관리자 페이지의 무한 로딩 이슈 완전 해결.
- **배운 점**: OS별(Windows vs Linux) 파일 인코딩 차이에 대한 이해도 향상 및 프로덕션 환경에서의 견고한 설정 관리 중요성 체득.
