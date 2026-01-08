import { useState } from 'react';
import Modal from './Modal';
import ImageProjectMatcher from './ImageProjectMatcher';

// 이력서 가져오기 버튼 컴포넌트 (파일 업로드 + URL + 텍스트 입력)
export default function ImportResumeButton({ onImport }) {
    const [showModal, setShowModal] = useState(false);
    const [resumeText, setResumeText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [urlInput, setUrlInput] = useState('');
    const [extractedImages, setExtractedImages] = useState([]);
    const [extractedProjects, setExtractedProjects] = useState([]);
    const [showMatcher, setShowMatcher] = useState(false);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/parse-resume', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('Server error:', data);
                const errorMsg = data.error || '파일 파싱 실패';
                const details = data.details ? `\n상세: ${data.details}` : '';
                throw new Error(errorMsg + details);
            }

            if (data.text) {
                setResumeText(data.text);

                // Handle extracted images and projects
                if (data.images && data.images.length > 0) {
                    setExtractedImages(data.images);
                    setExtractedProjects(data.projects || []);
                    alert(`✅ 파일에서 텍스트와 이미지를 추출했습니다!\n\n파일명: ${file.name}\n텍스트: ${data.text.length}자\n이미지: ${data.images.length}개\n프로젝트: ${data.projects?.length || 0}개`);
                } else {
                    setExtractedImages([]);
                    setExtractedProjects([]);
                    alert(`✅ 파일에서 텍스트를 추출했습니다!\n\n파일명: ${file.name}\n추출된 텍스트 길이: ${data.text.length}자`);
                }
            } else {
                throw new Error('텍스트 추출 실패');
            }
        } catch (error) {
            console.error('파일 파싱 오류:', error);
            alert(`❌ 파일을 읽는 중 오류가 발생했습니다.\n\n오류: ${error.message}\n\n텍스트를 직접 붙여넣어주세요.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUrlFetch = async () => {
        if (!urlInput || !urlInput.trim()) {
            alert('⚠️ URL을 입력해주세요.');
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch('/api/fetch-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: urlInput })
            });

            const data = await response.json();

            if (!response.ok) {
                const errorMsg = data.error || 'URL 가져오기 실패';
                const hint = data.hint ? `\n\n💡 ${data.hint}` : '';
                throw new Error(errorMsg + hint);
            }

            if (data.text) {
                setResumeText(data.text);
                setUrlInput('');
                alert(`✅ URL에서 텍스트를 추출했습니다!\n\n추출된 텍스트 길이: ${data.text.length}자`);
            } else {
                throw new Error('텍스트 추출 실패');
            }
        } catch (error) {
            console.error('URL fetch error:', error);
            alert(`❌ URL에서 내용을 가져오는 중 오류가 발생했습니다.\n\n${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleApply = async () => {
        if (!resumeText || resumeText.trim().length === 0) {
            alert('⚠️ 이력서 내용을 입력하거나 파일을 업로드해주세요.');
            return;
        }

        // If images and projects detected, show matcher
        if (extractedImages.length > 0 && extractedProjects.length > 0) {
            setShowModal(false);
            setShowMatcher(true);
            return;
        }

        // Otherwise apply directly
        await applyImport(extractedProjects);
    };

    const applyImport = async (projects) => {
        setIsProcessing(true);

        try {
            // Simulate processing time for better UX
            await new Promise(resolve => setTimeout(resolve, 500));

            if (onImport) await onImport(resumeText, extractedImages, projects);

            setShowModal(false);
            setShowMatcher(false);
            setResumeText('');
            setUrlInput('');
            setExtractedImages([]);
            setExtractedProjects([]);
        } catch (error) {
            console.error('Apply error:', error);
            alert('❌ 내용을 적용하는 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleMatcherConfirm = (updatedProjects) => {
        applyImport(updatedProjects);
    };

    const handleMatcherCancel = () => {
        setShowMatcher(false);
        setShowModal(true);
    };

    return (
        <>
            {/* Image-Project Matcher Modal */}
            {showMatcher && (
                <ImageProjectMatcher
                    projects={extractedProjects}
                    allImages={extractedImages}
                    onConfirm={handleMatcherConfirm}
                    onCancel={handleMatcherCancel}
                />
            )}

            {/* Main Import Modal */}
            <>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold hover:bg-emerald-100 hover:text-emerald-700 transition-all shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                    이력서 가져오기
                </button>

                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    footerContent={
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowModal(false); setResumeText(''); setUrlInput(''); setExtractedImages([]); }}
                                className="px-4 py-2 text-stone-500 hover:text-stone-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleApply}
                                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                disabled={isProcessing}
                            >
                                {isProcessing && (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                )}
                                {isProcessing ? '적용 중...' : '내용 적용하기'}
                            </button>
                        </div>
                    }
                >
                    <div className="p-1">
                        <h2 className="text-2xl font-bold text-emerald-600 mb-6 text-center">이력서 가져오기</h2>

                        {/* 노션 안내 */}
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <h3 className="text-sm font-bold text-emerald-700 mb-2">💡 노션 페이지에서 가져오기</h3>
                            <ol className="text-xs text-stone-600 space-y-1 list-decimal list-inside">
                                <li>노션 페이지를 엽니다</li>
                                <li><code className="px-1 py-0.5 bg-stone-200 text-stone-700 rounded">Ctrl + A</code> (전체 선택)</li>
                                <li><code className="px-1 py-0.5 bg-stone-200 text-stone-700 rounded">Ctrl + C</code> (복사)</li>
                                <li>아래 텍스트 영역에 붙여넣기</li>
                            </ol>
                            <p className="text-xs text-stone-500 mt-2">
                                ⚡ 이 방법이 가장 빠르고 정확합니다!
                            </p>
                        </div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-px bg-stone-200 flex-1"></div>
                            <span className="text-stone-500 text-xs">또는</span>
                            <div className="h-px bg-stone-200 flex-1"></div>
                        </div>

                        {/* 파일 업로드 */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-stone-600 mb-2">파일 업로드 (DOCX, PDF 지원)</label>
                            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-stone-50 transition-all">
                                <div className="flex flex-col items-center justify-center">
                                    {isProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mb-2"></div>
                                            <p className="text-xs text-emerald-500">파일 처리 중...</p>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6 mb-2 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                            <p className="text-xs text-stone-500">클릭하여 업로드</p>
                                            <p className="text-xs text-stone-400 mt-1">💡 PDF는 텍스트만 추출됩니다 (이미지 제외)</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
                                    disabled={isProcessing}
                                />
                            </label>
                        </div>

                        {/* Image Preview Section */}
                        {extractedImages.length > 0 && (
                            <div className="mb-6">
                                <label className="block text-sm font-bold text-emerald-600 mb-3">
                                    📷 추출된 이미지 ({extractedImages.length}개)
                                </label>
                                <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto p-3 bg-stone-50 border border-stone-200 rounded-xl">
                                    {extractedImages.map((img, idx) => (
                                        <div key={idx} className="relative group">
                                            <img
                                                src={img}
                                                alt={`Extracted ${idx + 1}`}
                                                className="w-full h-24 object-cover rounded-lg border border-stone-200 hover:border-emerald-500/50 transition-all"
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                <span className="text-white text-xs font-bold">이미지 {idx + 1}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-xs text-stone-500 mt-2">
                                    💡 이미지는 포트폴리오와 함께 저장됩니다
                                </p>
                            </div>
                        )}

                        <div className="flex items-center gap-4 mb-6">
                            <div className="h-px bg-stone-200 flex-1"></div>
                            <span className="text-stone-500 text-xs">또는 텍스트 직접 입력</span>
                            <div className="h-px bg-stone-200 flex-1"></div>
                        </div>

                        {/* 텍스트 입력 */}
                        <div className="mb-4">
                            <label className="block text-sm font-bold text-stone-600 mb-2">이력서 내용 붙여넣기</label>
                            <textarea
                                className="w-full h-48 p-4 bg-white border border-stone-200 rounded-xl text-stone-800 focus:border-emerald-500 focus:outline-none resize-none placeholder-stone-400 leading-relaxed"
                                placeholder="이력서 내용을 여기에 붙여넣으세요..."
                                value={resumeText}
                                onChange={(e) => setResumeText(e.target.value)}
                            />
                            {resumeText && (
                                <p className="text-xs text-emerald-600 mt-2">
                                    ✓ {resumeText.length}자 입력됨
                                </p>
                            )}
                        </div>
                    </div>
                </Modal>
            </>
        </>
    );
}
