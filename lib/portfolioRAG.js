/**
 * Portfolio RAG (Retrieval-Augmented Generation) Utility
 * Converts portfolio data into structured context for AI chatbot
 */

/**
 * Prepare portfolio data as RAG context for AI chatbot
 * @param {Object} userData - User's portfolio data
 * @returns {string} Formatted context string for AI
 */
export function preparePortfolioRAG(userData) {
    if (!userData) return '';

    const sections = [];

    // Basic Information
    sections.push(`=== 포트폴리오 소유자 정보 ===`);
    sections.push(`이름: ${userData.name || '정보 없음'}`);
    sections.push(`직무: ${userData.job || '정보 없음'}`);
    sections.push(`강점/전문분야: ${userData.strength || '정보 없음'}`);

    if (userData.intro) {
        sections.push(`\n자기소개:\n${userData.intro}`);
    }

    // Career Summary
    if (userData.career_summary) {
        sections.push(`\n=== 경력 요약 ===`);
        sections.push(userData.career_summary);
    }

    // Skills (보유 기술)
    if (userData.skills && (Array.isArray(userData.skills) ? userData.skills.length > 0 : userData.skills)) {
        sections.push(`\n=== 보유 기술 ===`);
        const skillsList = Array.isArray(userData.skills) ? userData.skills.join(', ') : userData.skills;
        sections.push(skillsList);
    }

    // Projects (Enhanced with new fields)
    if (userData.projects && userData.projects.length > 0) {
        sections.push(`\n=== 프로젝트 목록 (총 ${userData.projects.length}개) ===`);
        userData.projects.forEach((project, index) => {
            sections.push(`\n[프로젝트 ${index + 1}] ${project.title || '제목 없음'}`);

            if (project.desc) {
                sections.push(`설명: ${project.desc}`);
            }

            // NEW: Project Period (작업 기간)
            if (project.period) {
                sections.push(`작업 기간: ${project.period}`);
            }

            // NEW: Role
            if (project.role) {
                sections.push(`역할: ${project.role}`);
            }

            // NEW: Tech Stack (우선순위 높음)
            if (project.tech_stack) {
                sections.push(`사용 기술: ${project.tech_stack}`);
            } else if (project.tags && project.tags.length > 0) {
                // Fallback to old tags field
                sections.push(`사용 기술: ${project.tags.join(', ')}`);
            }

            // NEW: Team Size
            if (project.team_size) {
                sections.push(`팀 규모: ${project.team_size}`);
            }

            // NEW: Achievements
            if (project.achievements) {
                sections.push(`주요 성과: ${project.achievements}`);
            }

            // Links (GitHub, Live URL, or generic link)
            if (project.github_url) {
                sections.push(`GitHub: ${project.github_url}`);
            }
            if (project.live_url) {
                sections.push(`라이브 URL: ${project.live_url}`);
            } else if (project.link) {
                sections.push(`링크: ${project.link}`);
            }

            if (project.detail) {
                sections.push(`상세: ${project.detail}`);
            }
        });
    }

    // Skills/Moods
    if (userData.moods && userData.moods.length > 0) {
        sections.push(`\n=== 관심 분야/키워드 ===`);
        sections.push(userData.moods.join(', '));
    }

    // Contact Information
    if (userData.email || userData.github || userData.linkedin) {
        sections.push(`\n=== 연락처 정보 ===`);
        if (userData.email) sections.push(`이메일: ${userData.email}`);
        if (userData.github) sections.push(`GitHub: ${userData.github}`);
        if (userData.linkedin) sections.push(`LinkedIn: ${userData.linkedin}`);
    }

    // NEW: Verified Chat Answers (High Priority)
    if (userData.chat_answers) {
        sections.push(`\n=== 지원자가 직접 검수하고 승인한 핵심 질문 답변 (최우선 활용) ===`);

        const answerMappings = [
            { key: 'core_skills', label: '지원자의 핵심 역량 3가지를 요약한다면?' },
            { key: 'main_stack', label: "이 포트폴리오에서 가장 주력으로 사용한 '기술 스택(Main Skill)'은 무엇인가요?" },
            { key: 'tech_depth', label: '기술적으로 가장 깊이 있게 파고들거나 연구해 본 분야는 어디인가요?' },
            { key: 'documentation', label: '코드 작성 외에 설계 문서(API 명세, 기획서 등)도 작성할 줄 아나요?' },
            { key: 'role_contribution', label: '각 프로젝트에서의 지원자의 구체적인 역할과 기여도는 어땠나요?' },
            { key: 'collaboration', label: '팀 프로젝트에서 동료들과의 협업(코드 리뷰, 일정 관리)은 어떻게 진행했나요?' },
            { key: 'cycle', label: "기획부터 배포/운영까지 '전체 사이클'을 경험해 본 프로젝트가 있나요?" },
            { key: 'artifacts', label: '실제 작성한 소스 코드나 디자인 원본 파일(Figma 등)을 볼 수 있나요?' },
            { key: 'best_project', label: '포트폴리오 중 가장 자신 있는 프로젝트 하나를 소개한다면?' },
            { key: 'troubleshooting', label: '개발(또는 진행) 중 발생한 가장 치명적인 문제와 해결 과정은 무엇인가요?' },
            { key: 'decision_making', label: '해당 기술(또는 디자인 컨셉)을 선정하게 된 특별한 이유나 논리가 있나요?' },
            { key: 'quantitative_performance', label: '프로젝트를 통해 얻은 구체적인 수치 성과(사용자 수, 성능 개선율 등)가 있나요?' }
        ];

        answerMappings.forEach(mapping => {
            if (userData.chat_answers[mapping.key]) {
                sections.push(`[질문: ${mapping.label}] 답변: ${userData.chat_answers[mapping.key]}`);
            }
        });

        sections.push(`\n※ 위 답변들은 지원자가 직접 확인한 내용입니다. 관련 질문 시 이 내용을 최우선으로 인용하고, "지원자가 검증한 정보"임을 명시하세요.`);
        sections.push(`※ 만약 위 목록에 없는 질문에 답해야 한다면, 반드시 '포트폴리오 데이터'에 기반한 객관적인 사실만 요약하세요. 절대 '추측'하거나 지어내지 마세요.`);
    }

    return sections.join('\n');
}

/**
 * Generate system prompt for professional portfolio assistant
 * @param {string} portfolioContext - RAG context from preparePortfolioRAG
 * @returns {string} System prompt for AI
 */
export function generatePortfolioAssistantPrompt(portfolioContext) {
    return `당신은 지원자의 포트폴리오를 전문적으로 설명하는 '도슨트 무무'입니다.
채용 담당자나 방문자가 지원자에 대해 질문하면, 다음 포트폴리오 정보를 바탕으로 정확하게 답변하세요.

${portfolioContext}

답변 규칙:
1. 존댓말을 사용하고 전문적인 톤을 유지하세요.
2. 답변 시 '포트폴리오 내용에 따르면~', '[프로젝트명]을 확인해보니~'와 같이 구체적인 근거를 언급하여 신뢰도를 높이세요.
3. 데이터에 없는 정보를 질문받으면 "해당 내용은 현재 포트폴리오에 구체적으로 기재되어 있지 않습니다. 더 자세한 정보가 궁금하시다면 지원자에게 직접 연락하여 문의해 보시는 것을 추천드립니다!"라고 답변하며 자연스럽게 연락을 유도하세요.
4. 프로젝트나 경력에 대한 질문은 구체적으로 답변하세요.
5. 기술 스택이나 경험에 대한 질문은 관련 프로젝트를 함께 언급하세요.`;
}

/**
 * Validate if portfolio has enough data for chatbot
 * @param {Object} userData - User's portfolio data
 * @returns {boolean} True if portfolio has sufficient data
 */
export function hasValidPortfolioData(userData) {
    if (!userData) return false;

    // Must have at least name and one of: projects, career_summary, or intro
    // Relaxed validation: If chat_answers exist, it's enough context
    if (userData.chat_answers && Object.keys(userData.chat_answers).length > 0) {
        return true;
    }

    // Must have at least name (or default) and content
    const hasBasicInfo = userData.name || true; // Always allow if other content exists
    const hasContent =
        (userData.projects && userData.projects.length > 0) ||
        userData.career_summary ||
        userData.intro;

    return hasContent;
}
