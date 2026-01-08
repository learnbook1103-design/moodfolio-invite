import { useState, useRef, useEffect } from "react";

// 간단한 마크다운 렌더러 컴포넌트
const MarkdownText = ({ text }) => {
  if (!text) return null;

  const lines = text.split('\n');

  const renderInline = (content) => {
    // 볼드 (**텍스트**) 및 이탤릭 (*텍스트*) 처리
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-gray-300">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        // 제목 (#, ##, ###, ####) - 긴 접두사부터 확인
        if (line.startsWith('#### ')) return <h4 key={i} className="font-bold text-xs text-cyan-300 mt-1 mb-1">{line.slice(5)}</h4>;
        if (line.startsWith('### ')) return <h3 key={i} className="font-bold text-sm text-cyan-300 mt-2 mb-1">{line.slice(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="font-bold text-base text-cyan-300 mt-2 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="font-bold text-lg text-cyan-300 mt-2 mb-1">{line.slice(2)}</h1>;

        // 리스트 (- 또는 *)
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
          const content = line.trim().slice(2);
          return (
            <div key={i} className="flex gap-2 ml-1">
              <span className="text-cyan-500">•</span>
              <div className="flex-1">{renderInline(content)}</div>
            </div>
          );
        }

        // 일반 텍스트 (줄바꿈 포함)
        if (line.trim() === "") return <div key={i} className="h-2"></div>;

        return <div key={i} className="min-h-[1.2rem]">{renderInline(line)}</div>;
      })}
    </div>
  );
};

export default function ChatWidget({ customMessage, isSharedView = false, portfolioContext = null, userData = null }) {
  // 기본 cyan 색상으로 고정 (무드와 상관없이 항상 동일한 색상 유지)
  const colorClasses = {
    border: 'border-cyan-500',
    headerBg: 'bg-cyan-950/80',
    headerBorder: 'border-cyan-500/50',
    text: 'text-cyan-400',
    userBg: 'bg-cyan-700',
    focusRing: 'focus:ring-cyan-500',
    scrollbar: 'scrollbar-thumb-cyan-900',
    buttonGradient: 'bg-linear-to-r from-cyan-600 to-blue-600'
  };

  const [isOpen, setIsOpen] = useState(false);
  const [isGif, setIsGif] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const QUESTION_CATEGORIES = [
    {
      id: "skills",
      title: "1. 핵심 역량 및 기술 요약",
      questions: [
        { key: "core_skills", keyword: "핵심 요약", text: "지원자의 핵심 역량 3가지를 요약한다면?" },
        { key: "main_stack", keyword: "메인 스택", text: "이 포트폴리오에서 가장 주력으로 사용한 '기술 스택(Main Skill)'은 무엇인가요?" },
        { key: "tech_depth", keyword: "기술 깊이", text: "기술적으로 가장 깊이 있게 파고들거나 연구해 본 분야는 어디인가요?" },
        { key: "documentation", keyword: "문서화", text: "코드 작성 외에 설계 문서(API 명세, 기획서 등)도 작성할 줄 아나요?" }
      ]
    },
    {
      id: "contribution",
      title: "2. 역할 및 기여도 검증",
      questions: [
        { key: "role_contribution", keyword: "기여도", text: "각 프로젝트에서의 지원자의 구체적인 역할과 기여도는 어땠나요?" },
        { key: "collaboration", keyword: "협업 방식", text: "팀 프로젝트에서 동료들과의 협업(코드 리뷰, 일정 관리)은 어떻게 진행했나요?" },
        { key: "cycle", keyword: "범위 확인", text: "기획부터 배포/운영까지 '전체 사이클'을 경험해 본 프로젝트가 있나요?" },
        { key: "artifacts", keyword: "산출물", text: "실제 작성한 소스 코드나 디자인 원본 파일(Figma 등)을 볼 수 있나요?" }
      ]
    },
    {
      id: "achievements",
      title: "3. 문제 해결 및 성과",
      questions: [
        { key: "best_project", keyword: "대표작", text: "포트폴리오 중 가장 자신 있는 프로젝트 하나를 소개한다면?" },
        { key: "troubleshooting", keyword: "트러블슈팅", text: "개발(또는 진행) 중 발생한 가장 치명적인 문제와 해결 과정은 무엇인가요?" },
        { key: "decision_making", keyword: "의사결정", text: "해당 기술(또는 디자인 컨셉)을 선정하게 된 특별한 이유나 논리가 있나요?" },
        { key: "quantitative_performance", keyword: "정량 성과", text: "프로젝트를 통해 얻은 구체적인 수치 성과(사용자 수, 성능 개선율 등)가 있나요?" }
      ]
    }
  ];

  useEffect(() => {
    if (isSharedView) {
      const userName = portfolioContext?.name || '지원자';
      setMessages([
        {
          role: "ai",
          text: `안녕하세요! ${userName}님의 포트폴리오 도슨트 **무무(Mumu)**입니다.\n지원자의 역량과 프로젝트에 대해 궁금한 점을 카테고리별로 안내해 드릴게요.`
        },
        {
          role: "ai",
          text: "원하시는 질문 카테고리를 선택해주세요.",
          isCategorySelection: true
        }
      ]);
    } else {
      setMessages([
        {
          role: "ai",
          text: "안녕하세요! 포트폴리오 코치 **포포(Popo)**입니다.\n혼자 쓰기 막막한 포트폴리오,\n저랑 같이 쉽고 빠르게 완성해볼까요?"
        }
      ]);
    }
  }, [isSharedView, portfolioContext?.name]);

  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  // Drag functionality
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const lastMessageRef = useRef(null);

  // 자동 스크롤 로직 개선
  useEffect(() => {
    if (isOpen && lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [messages, isOpen]);

  const handleMouseDown = (e) => {
    if (!isOpen) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
        startX: e.clientX,
        startY: e.clientY
      });
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      const distance = Math.sqrt(
        Math.pow(e.clientX - dragStart.startX, 2) +
        Math.pow(e.clientY - dragStart.startY, 2)
      );

      if (distance < 5) {
        setIsOpen(!isOpen);
      }
    }
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  const sendMessage = async (textOverride = null) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // 안전하게 문자열로 변환
    let msgText = textOverride !== null ? textOverride : input;

    // 디버깅: 타입 확인
    console.log('sendMessage called with:', { textOverride, input, msgText, type: typeof msgText });

    // msgText가 객체인 경우 처리
    if (msgText && typeof msgText === 'object') {
      console.warn('msgText is an object, attempting to extract text:', msgText);
      // 객체에서 text 속성 추출 시도
      if (msgText.text) {
        msgText = msgText.text;
      } else if (msgText.target && msgText.target.value) {
        // 이벤트 객체인 경우
        msgText = msgText.target.value;
      } else {
        // 안전하게 문자열로 변환 (순환 참조 방지)
        msgText = String(msgText);
      }
    }

    // msgText가 문자열이 아니면 문자열로 변환
    if (msgText && typeof msgText !== 'string') {
      msgText = String(msgText);
    }

    // 빈 문자열 체크
    if (!msgText || !msgText.trim()) {
      console.log('Message is empty, returning');
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: msgText }]);
    // textOverride가 명시적으로 null일 때만 입력창 비우기 (사용자가 직접 입력한 경우)
    if (textOverride === null) setInput("");
    setIsLoading(true);

    try {
      const contextStr = portfolioContext && typeof portfolioContext === 'object'
        ? JSON.stringify(portfolioContext, null, 2)
        : portfolioContext;

      const res = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          portfolio_context: contextStr,
          is_shared: isSharedView
        }),
      });

      if (!res.ok) throw new Error(`Server Error: ${res.status}`);
      const data = await res.json();
      setMessages((prev) => {
        const updated = [...prev, { role: "ai", text: data.reply }];
        if (isSharedView) {
          updated.push({
            role: "ai",
            text: "다른 궁금한 점이 있으신가요? 아래 카테고리에서 선택해주시면 더 안내해 드릴게요!",
            isCategorySelection: true
          });
        }
        return updated;
      });
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "ai", text: "죄송합니다. 서버가 꺼져있는 것 같아요!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  // [NEW] Direct Retrieval Logic
  const handleSelection = async (question) => {
    // 1. Show user message
    setMessages(prev => [...prev, { role: "user", text: question.text }]);

    // 2. Check for Verified Answer
    const verifiedAnswer = userData?.chat_answers?.[question.key];

    if (verifiedAnswer && verifiedAnswer.trim().length > 0) {
      setIsLoading(true);
      setTimeout(() => {
        setMessages(prev => {
          const updated = [...prev, { role: "ai", text: `지원자가 직접 작성한 답변입니다:\n\n${verifiedAnswer}` }];
          if (isSharedView) {
            updated.push({
              role: "ai",
              text: "다른 궁금한 점이 있으신가요? 아래 카테고리에서 선택해주시면 더 안내해 드릴게요!",
              isCategorySelection: true
            });
          }
          return updated;
        });
        setIsLoading(false);
      }, 600);
      return;
    }

    // 3. Fallback to AI
    await sendMessage(question.text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const [showBubble, setShowBubble] = useState(false);

  useEffect(() => {
    const toggleBubble = () => {
      setShowBubble(true);
      const hideTimer = setTimeout(() => {
        setShowBubble(false);
      }, 5000);
      return () => clearTimeout(hideTimer);
    };

    const cleanupInitial = toggleBubble();
    const interval = setInterval(() => {
      toggleBubble();
    }, 15000);

    return () => {
      clearInterval(interval);
      if (cleanupInitial) cleanupInitial();
    };
  }, []);

  const displayMessage = customMessage || (isSharedView ? "궁금한 카테고리를 선택해보세요!" : "무엇이든 물어보세요!");

  return (
    <div className="chat-widget-container fixed bottom-6 right-6 z-[100000] flex flex-col items-end font-sans" style={{ isolation: 'isolate' }}>

      {/* 말풍선 */}
      {!isOpen && showBubble && (
        <div
          className="mb-[170px] mr-[70px] z-50"
          style={{
            transform: `translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : undefined,
            pointerEvents: 'none'
          }}
        >
          <div className="bg-white text-black px-4 py-3 rounded-2xl rounded-br-none shadow-xl border border-gray-200 animate-bounce transition-all max-w-[200px] text-sm font-bold relative">
            {displayMessage}
            <div className="absolute -bottom-3 right-1 w-5 h-5 bg-white border-b border-r border-gray-200 transform rotate-45"></div>
          </div>
        </div>
      )}

      {/* 채팅창 본체 */}
      {isOpen && (
        <div
          className="chat-widget-backdrop mb-4 w-[360px] h-[550px] border border-cyan-500 rounded-2xl flex flex-col overflow-hidden animate-fade-in-up transition-all duration-300"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            boxShadow: '0 0 25px rgba(6,182,212,0.6)',
            position: 'fixed',
            bottom: (() => {
              const baseBottom = 24;
              const adjustedBottom = baseBottom + position.y;
              const chatHeight = 550 + 16;
              const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
              const minBottom = 10;
              const maxBottom = viewportHeight - chatHeight - 10;
              return Math.max(minBottom, Math.min(adjustedBottom, maxBottom)) + 'px';
            })(),
            right: (() => {
              const baseRight = 24;
              const adjustedRight = baseRight - position.x;
              const chatWidth = 360;
              const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
              const minRight = 10;
              const maxRight = viewportWidth - chatWidth - 10;
              return Math.max(minRight, Math.min(adjustedRight, maxRight)) + 'px';
            })()
          }}
        >
          <div className="chat-widget-header-bg p-4 border-b border-cyan-500/50 flex justify-between items-center" style={{ cursor: 'grab' }}>
            <div className="flex items-center gap-2">
              <img src="/chat-icon.png" alt="Logo" className="w-6 h-6 object-contain" />
              <span className="chat-widget-text font-bold tracking-wider drop-shadow-md">
                {isSharedView ? "포트폴리오 도슨트(Docent) 무무" : "Popo"}
              </span>
            </div>
            <div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white hover:rotate-90 transition-transform duration-200">✕</button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-cyan-900 scrollbar-track-transparent">
            {messages.map((msg, idx) => {
              let isScrollTarget = false;
              if (isSharedView) {
                if (idx === messages.length - 2 && messages[messages.length - 1].isCategorySelection) {
                  isScrollTarget = true;
                } else if (idx === messages.length - 1 && !msg.isCategorySelection) {
                  isScrollTarget = true;
                }
              } else {
                isScrollTarget = idx === messages.length - 1;
              }

              return (
                <div
                  key={idx}
                  ref={isScrollTarget ? lastMessageRef : null}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] p-3 text-sm leading-relaxed rounded-2xl shadow-sm ${msg.role === "user" ? "chat-widget-user-bg text-white rounded-tr-none" : "chat-widget-ai-bg text-gray-200 border border-gray-700 rounded-tl-none"
                    }`}>
                    <div className="markdown-content">
                      {msg.role === 'ai' && msg.text.includes('지원자가 직접 검수한') && (
                        <div className="mb-2 flex items-center gap-1 text-[10px] bg-emerald-400/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-400/30 w-fit">
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          지원자 인증 답변
                        </div>
                      )}
                      <MarkdownText text={msg.text} />
                    </div>

                    {msg.isCategorySelection && (
                      <div className="mt-3 flex flex-col gap-2">
                        {QUESTION_CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setMessages(prev => [...prev,
                              { role: "user", text: cat.title },
                              { role: "ai", text: "상세 질문을 선택해주세요:", isLevel2Selection: true, categoryId: cat.id }
                              ]);
                            }}
                            className="text-left p-3 bg-cyan-900/30 hover:bg-cyan-800/50 border border-cyan-500/30 rounded-xl text-xs text-cyan-100 transition-all active:scale-95 flex justify-between items-center group"
                          >
                            <span>{cat.title}</span>
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            const email = userData?.email || "정보 없음";
                            const phone = userData?.phone || null;

                            let contactText = `지원자님께 직접 궁금한 점을 문의해보세요!\n\n**이메일**: ${email}`;
                            if (phone) {
                              contactText += `\n**전화번호**: ${phone}`;
                            }
                            contactText += `\n\n다른 궁금한 점이 있으시면 언제든 물어보세요!`;

                            setMessages(prev => [...prev,
                            { role: "user", text: "지원자 연락처 확인하기" },
                            { role: "ai", text: contactText }
                            ]);
                          }}
                          className="text-left p-3 bg-emerald-900/30 hover:bg-emerald-800/50 border border-emerald-500/30 rounded-xl text-xs text-emerald-100 transition-all active:scale-95 flex justify-between items-center group mt-2"
                        >
                          <span className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                            지원자에게 직접 연락하기
                          </span>
                          <span>→</span>
                        </button>
                      </div>
                    )}

                    {msg.isLevel2Selection && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {QUESTION_CATEGORIES.find(c => c.id === msg.categoryId)?.questions.map((q, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelection(q)}
                            className="text-center p-2 bg-white/5 hover:bg-cyan-900/30 border border-white/10 rounded-lg text-xs text-gray-300 transition-all active:scale-95 hover:border-cyan-500/50"
                          >
                            {q.keyword}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setMessages(prev => [...prev, { role: "ai", text: "다른 카테고리를 선택하시겠어요?", isCategorySelection: true }]);
                          }}
                          className="text-center p-1 text-[10px] text-gray-500 hover:text-cyan-400 mt-1 transition-colors"
                        >
                          ← 이전으로 돌아가기
                        </button>
                      </div>
                    )}

                    {msg.isSuggestion && msg.suggestions && (
                      <div className="mt-3 flex flex-col gap-2">
                        {msg.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => sendMessage(s)}
                            className="text-left p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-xs text-white transition-all active:scale-95"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div className="flex justify-start">
                <div className="chat-widget-ai-bg border border-gray-700 p-3 rounded-2xl rounded-tl-none chat-widget-text text-xs flex items-center gap-2 animate-pulse">
                  <span>AI가 생각 중입니다...</span>
                  <div className="animate-spin w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                </div>
              </div>
            )}
          </div>
          {/* 하단 입력창 - 공유 페이지(무무)에서는 숨김 */}
          {!isSharedView && (
            <div className="chat-widget-footer-bg p-3 border-t border-gray-700 flex gap-2">
              <input className="chat-widget-input-bg flex-1 text-white text-sm rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-gray-500 transition-all" placeholder="궁금한 점을 입력하세요..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} />
              <button onClick={sendMessage} disabled={isLoading} className="chat-widget-button disabled:opacity-50 text-white rounded-full w-12 h-12 flex items-center justify-center transition-all shadow-lg hover:opacity-90" style={{
                boxShadow: isLoading ? 'none' : '0 0 20px rgba(6,182,212,0.5)'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🟢 GIF/Image 토글 코드 */}
      <button
        onMouseDown={handleMouseDown}
        className={`z-50 ${isOpen && 'hidden'}`}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'grab',
          willChange: isDragging ? 'transform' : 'auto',
          transition: isDragging ? 'none' : undefined,
          padding: 0,
          border: 'none',
          background: 'transparent'
        }}
      >
        <div
          className={`w-40 h-40 relative flex items-center justify-center ${!isDragging && 'transition-transform duration-300 hover:scale-105 active:scale-95'}`}
          style={{ transformOrigin: 'center center' }}
        >
          <img
            src={isSharedView ? "/shared-character.gif" : (isGif ? "/character.gif" : "/file.svg")}
            alt="AI Coach"
            className="w-full h-full object-contain"
            style={{ pointerEvents: 'none' }}
          />
        </div>
      </button>
    </div>
  );
}

