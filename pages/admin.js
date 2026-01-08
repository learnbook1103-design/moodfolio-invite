import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import BackgroundElements from '../components/BackgroundElements';
import MoodEffectLayer from '../components/MoodEffectLayer';
import { supabase } from '../lib/supabase';

export default function AdminPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [portfolios, setPortfolios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userEmail, setUserEmail] = useState(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState(new Set());

    // 신규 기능 State
    const [notices, setNotices] = useState([]);
    const [aiStats, setAiStats] = useState(null);
    const [templateConfig, setTemplateConfig] = useState({});

    // 공지사항 입력 State
    const [newNoticeTitle, setNewNoticeTitle] = useState('');
    const [newNoticeContent, setNewNoticeContent] = useState('');

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // 관리자 권한 체크
    useEffect(() => {
        const checkAuth = async () => {
            console.log('🔐 인증 체크 시작');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.log('❌ 세션 없음, 로그인 페이지로 이동');
                router.replace('/login');
                return;
            }

            console.log('✅ 세션 확인됨:', session.user.email);
            setUserEmail(session.user.email);
            setIsAuthChecking(false);
            // 인증 완료 후 바로 대시보드 로드
            loadStatsWithEmail(session.user.email);
        };
        checkAuth();
    }, []);

    // userEmail로 통계 로드하는 헬퍼 함수
    const loadStatsWithEmail = async (email) => {
        console.log('📊 loadStats 시작, userEmail:', email);
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${email}` }
            });
            console.log('📊 응답 상태:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('❌ API 에러:', res.status, errorText);

                if (res.status === 403) {
                    alert('관리자 권한이 없습니다.');
                    router.replace('/mypage');
                } else {
                    alert(`관리자 API 에러: ${res.status} - ${errorText}`);
                }

                setLoading(false);
                return;
            }
            const data = await res.json();
            console.log('📊 응답 데이터:', data);
            setStats(data);
        } catch (error) {
            console.error('❌ 통계 로드 실패:', error);
            alert(`통계 로드 실패: ${error.message}`);
        }
        setLoading(false);
        console.log('📊 loadStats 완료');
    };

    // 통계 데이터 로드
    const loadStats = async () => {
        console.log('📊 loadStats 시작, userEmail:', userEmail);
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/stats`, {
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            console.log('📊 응답 상태:', res.status);
            const data = await res.json();
            console.log('📊 응답 데이터:', data);
            setStats(data);
        } catch (error) {
            console.error('❌ 통계 로드 실패:', error);
        }
        setLoading(false);
        console.log('📊 loadStats 완료');
    };

    // 사용자 목록 로드
    const loadUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/users?search=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            console.error('사용자 로드 실패:', error);
        }
        setLoading(false);
    };

    // 포트폴리오 목록 로드
    const loadPortfolios = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/portfolios?search=${searchQuery}`, {
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            const data = await res.json();
            setPortfolios(data.portfolios || []);
        } catch (error) {
            console.error('포트폴리오 로드 실패:', error);
        }
        setLoading(false);
    };

    // --- 신규 기능 로드 함수들 ---

    const loadNotices = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/notices`, {
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            const data = await res.json();
            setNotices(data || []);
        } catch (error) {
            console.error('공지사항 로드 실패:', error);
        }
        setLoading(false);
    };

    const createNotice = async () => {
        if (!newNoticeTitle || !newNoticeContent) return alert('제목과 내용을 입력해주세요');
        try {
            await fetch(`${apiUrl}/admin/notices`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userEmail}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title: newNoticeTitle, content: newNoticeContent, is_active: true })
            });
            alert('공지사항이 등록되었습니다');
            setNewNoticeTitle('');
            setNewNoticeContent('');
            loadNotices();
        } catch (error) {
            alert('등록 실패');
        }
    };

    const deleteNotice = async (id) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await fetch(`${apiUrl}/admin/notices/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            loadNotices();
        } catch (error) {
            alert('삭제 실패');
        }
    };

    const toggleNoticeActive = async (id, currentStatus) => {
        try {
            await fetch(`${apiUrl}/admin/notices/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${userEmail}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: !currentStatus })
            });
            loadNotices();
        } catch (error) {
            alert('수정 실패');
        }
    };

    const loadAiStats = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/stats/ai`, {
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            const data = await res.json();
            setAiStats(data);
        } catch (error) {
            console.error('AI 통계 로드 실패:', error);
        }
        setLoading(false);
    };

    const loadTemplateConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${apiUrl}/admin/templates/config`, {
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            const data = await res.json();
            setTemplateConfig(data || {});
        } catch (error) {
            console.error('템플릿 설정 로드 실패:', error);
        }
        setLoading(false);
    };

    const toggleTemplate = async (key, currentStatus) => {
        try {
            const newStatus = !currentStatus;
            await fetch(`${apiUrl}/admin/templates/config/${key}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${userEmail}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ is_active: newStatus })
            });
            loadTemplateConfig();
        } catch (error) {
            alert('설정 저장 실패');
        }
    };

    // 사용자 삭제
    const deleteUser = async (userId) => {
        if (!confirm('정말 이 사용자를 삭제하시겠습니까?')) return;

        try {
            await fetch(`${apiUrl}/admin/users/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${userEmail}` }
            });
            alert('사용자가 삭제되었습니다');
            loadUsers();
        } catch (error) {
            console.error('사용자 삭제 실패:', error);
            alert('삭제 중 오류가 발생했습니다');
        }
    };

    const toggleSelectUser = (id) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedUsers(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedUsers.size === users.length && users.length > 0) {
            setSelectedUsers(new Set());
        } else {
            setSelectedUsers(new Set(users.map(u => u.id)));
        }
    };

    const deleteSelectedUsers = async () => {
        console.log('🗑️ Attempting batch delete. Selected:', Array.from(selectedUsers));
        if (selectedUsers.size === 0) {
            console.log('❌ No users selected');
            return;
        }

        if (!confirm(`${selectedUsers.size}명의 사용자를 정말 삭제하시겠습니까?`)) {
            console.log('❌ User cancelled');
            return;
        }

        console.log('🔄 Sending delete request...');
        setLoading(true);
        try {
            const body = JSON.stringify({ user_ids: Array.from(selectedUsers) });
            console.log('📦 Request body:', body);

            const res = await fetch(`${apiUrl}/admin/users/batch-delete`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${userEmail}`,
                    'Content-Type': 'application/json'
                },
                body: body
            });

            console.log('📥 Response status:', res.status);

            if (!res.ok) {
                const errorText = await res.text();
                console.error('❌ Error text:', errorText);
                throw new Error(errorText || 'Failed to delete users');
            }

            const data = await res.json();
            console.log('✅ Success data:', data);

            alert(data.message || '선택한 사용자가 삭제되었습니다.');
            setSelectedUsers(new Set());
            loadUsers();
            loadStatsWithEmail(userEmail);
        } catch (error) {
            console.error('❌ Catch error:', error);
            alert(`사용자 삭제 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 탭 변경 시 데이터 로드
    useEffect(() => {
        if (!userEmail) return;
        if (activeTab === 'dashboard') loadStatsWithEmail(userEmail);
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'portfolios') loadPortfolios();
        if (activeTab === 'notices') loadNotices();
        if (activeTab === 'ai') loadAiStats();
        if (activeTab === 'templates') loadTemplateConfig();
    }, [activeTab, userEmail]);


    // 인증 체크 중이면 아무것도 렌더링하지 않음
    if (isAuthChecking) {
        return null;
    }

    return (
        <>
            <BackgroundElements showGround={false} />
            <MoodEffectLayer mood={['#차분한']} />

            <div className="min-h-screen relative z-10 flex">
                {/* 사이드바 */}
                <div className="w-64 bg-slate-900/90 backdrop-blur-xl border-r border-white/20 p-6">
                    <h1 className="text-2xl font-bold text-white mb-8">관리자 페이지</h1>

                    <nav className="space-y-2">
                        <SidebarItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} label="대시보드" />
                        <SidebarItem active={activeTab === 'users'} onClick={() => setActiveTab('users')} label="사용자 관리" />
                        <SidebarItem active={activeTab === 'portfolios'} onClick={() => setActiveTab('portfolios')} label="포트폴리오 관리" />
                        <div className="my-4 border-t border-white/10"></div>
                        <SidebarItem active={activeTab === 'notices'} onClick={() => setActiveTab('notices')} label="공지사항" />
                        <SidebarItem active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} label="AI 사용량" />
                        <SidebarItem active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} label="템플릿 관리" />
                    </nav>

                    <button
                        onClick={() => router.push('/mypage')}
                        className="w-full mt-8 px-4 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-lg transition-all"
                    >
                        마이페이지로
                    </button>
                </div>

                {/* 메인 콘텐츠 */}
                <div className="flex-1 p-8 overflow-y-auto">
                    {/* 대시보드 */}
                    {activeTab === 'dashboard' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 className="text-3xl font-bold text-white mb-8">대시보드</h2>

                            {loading ? (
                                <div className="text-white">로딩 중...</div>
                            ) : stats ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                                        <div className="text-gray-400 text-sm mb-2">전체 사용자</div>
                                        <div className="text-4xl font-bold text-white">{stats.total_users}</div>
                                    </div>
                                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                                        <div className="text-gray-400 text-sm mb-2">포트폴리오</div>
                                        <div className="text-4xl font-bold text-white">{stats.total_portfolios}</div>
                                    </div>
                                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                                        <div className="text-gray-400 text-sm mb-2">오늘 생성</div>
                                        <div className="text-4xl font-bold text-white">{stats.today_portfolios}</div>
                                    </div>
                                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                                        <div className="text-gray-400 text-sm mb-2">활성 사용자</div>
                                        <div className="text-4xl font-bold text-white">{stats.active_users}</div>
                                    </div>
                                </div>
                            ) : null}
                        </motion.div>
                    )}

                    {/* 사용자 관리 */}
                    {activeTab === 'users' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 className="text-3xl font-bold text-white mb-8">사용자 관리</h2>

                            <div className="mb-6 flex justify-between items-center gap-4">
                                <input
                                    type="text"
                                    placeholder="이메일 또는 이름으로 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && loadUsers()}
                                    className="w-full max-w-md px-4 py-3 bg-slate-800/90 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-emerald-500 outline-none"
                                />
                                {selectedUsers.size > 0 && (
                                    <button
                                        onClick={deleteSelectedUsers}
                                        className="px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
                                    >
                                        🗑️ 선택 삭제 ({selectedUsers.size})
                                    </button>
                                )}
                            </div>

                            {loading ? (
                                <div className="text-white">로딩 중...</div>
                            ) : (
                                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="px-6 py-4 text-left">
                                                    <input
                                                        type="checkbox"
                                                        checked={users.length > 0 && selectedUsers.size === users.length}
                                                        onChange={toggleSelectAll}
                                                        className="w-5 h-5 rounded border-gray-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                                    />
                                                </th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">ID</th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">이메일</th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">이름</th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">포트폴리오 수</th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className={`border-t border-white/10 hover:bg-white/5 ${selectedUsers.has(user.id) ? 'bg-emerald-500/10' : ''}`}>
                                                    <td className="px-6 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedUsers.has(user.id)}
                                                            onChange={() => toggleSelectUser(user.id)}
                                                            className="w-5 h-5 rounded border-gray-600 bg-slate-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-white">{user.id}</td>
                                                    <td className="px-6 py-4 text-white">{user.email}</td>
                                                    <td className="px-6 py-4 text-white">{user.name}</td>
                                                    <td className="px-6 py-4 text-white">{user.portfolio_count}</td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => deleteUser(user.id)}
                                                            className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg text-sm transition-all"
                                                        >
                                                            삭제
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* 포트폴리오 관리 */}
                    {activeTab === 'portfolios' && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <h2 className="text-3xl font-bold text-white mb-8">포트폴리오 관리</h2>

                            <div className="mb-6">
                                <input
                                    type="text"
                                    placeholder="포트폴리오 제목으로 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && loadPortfolios()}
                                    className="w-full max-w-md px-4 py-3 bg-slate-800/90 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:border-emerald-500 outline-none"
                                />
                            </div>

                            {loading ? (
                                <div className="text-white">로딩 중...</div>
                            ) : (
                                <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">제목</th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">작성자</th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">직무</th>
                                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-400">템플릿</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {portfolios.map((portfolio, idx) => (
                                                <tr key={idx} className="border-t border-white/10 hover:bg-white/5">
                                                    <td className="px-6 py-4 text-white">{portfolio.name}</td>
                                                    <td className="px-6 py-4 text-white">{portfolio.user_name} ({portfolio.user_email})</td>
                                                    <td className="px-6 py-4 text-white">{portfolio.job}</td>
                                                    <td className="px-6 py-4 text-white">{portfolio.template}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* --- 공지사항 탭 --- */}
                    {activeTab === 'notices' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white mb-6">공지사항 관리</h2>

                            {/* 공지사항 등록 폼 */}
                            <div className="bg-slate-800/50 p-6 rounded-xl border border-white/10 mb-8">
                                <h3 className="text-lg font-bold text-white mb-4">새 공지 등록</h3>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="제목"
                                        className="w-full px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white"
                                        value={newNoticeTitle}
                                        onChange={e => setNewNoticeTitle(e.target.value)}
                                    />
                                    <textarea
                                        placeholder="내용"
                                        className="w-full px-4 py-2 bg-slate-900 border border-white/20 rounded-lg text-white h-24"
                                        value={newNoticeContent}
                                        onChange={e => setNewNoticeContent(e.target.value)}
                                    />
                                    <button
                                        onClick={createNotice}
                                        className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold"
                                    >
                                        등록하기
                                    </button>
                                </div>
                            </div>

                            {/* 공지사항 목록 */}
                            <div className="bg-slate-900/90 backdrop-blur-xl border border-white/20 rounded-2xl overflow-hidden p-6">
                                <h3 className="text-lg font-bold text-white mb-4">등록된 공지사항</h3>
                                <div className="space-y-4">
                                    {notices.map(notice => (
                                        <div key={notice.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-lg">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    {notice.is_active ?
                                                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">Active</span> :
                                                        <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded-full">Inactive</span>
                                                    }
                                                    <span className="text-white font-bold">{notice.title}</span>
                                                </div>
                                                <p className="text-gray-400 text-sm">{notice.content}</p>
                                                <p className="text-gray-500 text-xs mt-2">{new Date(notice.created_at).toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleNoticeActive(notice.id, notice.is_active)}
                                                    className={`px-3 py-1 rounded text-sm ${notice.is_active ? 'bg-yellow-500/20 text-yellow-400' : 'bg-emerald-500/20 text-emerald-400'}`}
                                                >
                                                    {notice.is_active ? '숨기기' : '보이기'}
                                                </button>
                                                <button
                                                    onClick={() => deleteNotice(notice.id)}
                                                    className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-sm hover:bg-red-500/30"
                                                >
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {notices.length === 0 && <p className="text-gray-500 text-center py-4">등록된 공지사항이 없습니다.</p>}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- AI 통계 탭 --- */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white mb-6">AI 사용량 통계 (최근 1000건 기준)</h2>
                            {aiStats ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <StatsCard title="총 요청 수" value={aiStats.total_requests} icon="🤖" color="blue" />

                                    <div className="bg-slate-900/90 border border-white/20 rounded-2xl p-6 col-span-2">
                                        <h3 className="text-lg font-bold text-white mb-4">기능별 사용량</h3>
                                        <div className="space-y-2">
                                            {Object.entries(aiStats.by_type).map(([key, value]) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-gray-300">{key}</span>
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${(value / aiStats.total_requests) * 100}%` }}></div>
                                                        </div>
                                                        <span className="text-white font-mono">{value}회</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-white">로딩 중...</div>
                            )}
                        </div>
                    )}

                    {/* --- 템플릿 관리 탭 --- */}
                    {activeTab === 'templates' && (
                        <div className="space-y-6">
                            <h2 className="text-2xl font-bold text-white mb-6">템플릿 활성/비활성 관리</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {['developer', 'designer', 'marketer', 'service'].map(job => (
                                    <div key={job} className="bg-slate-900/90 border border-white/20 rounded-2xl p-6">
                                        <h3 className="text-xl font-bold text-white mb-4 capitalize flex items-center gap-2">
                                            {/* 이미지 경로는 public 폴더 기준 */}
                                            {job}
                                        </h3>
                                        <div className="space-y-4">
                                            {['typeA', 'typeB', 'typeC'].map(type => {
                                                const key = `${job}_${type}`;
                                                const isActive = templateConfig[key] !== false; // 기본값 True

                                                return (
                                                    <div key={key} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg">
                                                        <span className="text-gray-300">{type} 템플릿</span>
                                                        <button
                                                            onClick={() => toggleTemplate(key, isActive)}
                                                            className={`w-12 h-6 rounded-full relative transition-colors ${isActive ? 'bg-emerald-500' : 'bg-slate-600'}`}
                                                        >
                                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isActive ? 'left-7' : 'left-1'}`}></div>
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// Stats Card Component
const StatsCard = ({ title, value, icon, subValue, subLabel, color = "emerald" }) => (
    <motion.div
        whileHover={{ y: -5 }}
        className={`bg-slate-900/90 backdrop-blur-xl border border-white/10 p-6 rounded-2xl relative overflow-hidden group`}
    >
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-${color}-500/20`}></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 bg-${color}-500/20 rounded-xl`}>
                    <span className="text-2xl">{icon}</span>
                </div>
                {subValue && (
                    <span className={`text-sm ${subValue >= 0 ? 'text-emerald-400' : 'text-red-400'} font-medium bg-slate-800/50 px-2 py-1 rounded-lg border border-white/5`}>
                        {subValue > 0 ? '+' : ''}{subValue}% {subLabel}
                    </span>
                )}
            </div>

            <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
            <div className="text-3xl font-bold text-white tracking-tight">
                {value?.toLocaleString()}
            </div>
        </div>
    </motion.div>
);

const SidebarItem = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
    >
        <span className="text-xl">{icon}</span>
        <span className="font-medium">{label}</span>
    </button>
);
