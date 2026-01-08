"""
관리자 API 엔드포인트 (Supabase 기반)
"""
from fastapi import Depends, HTTPException
from pydantic import BaseModel
from admin_auth import verify_admin
import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

# Supabase 클라이언트 초기화
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Supabase credentials not found in environment variables")

# 기본 클라이언트 (읽기 전용 등)
supabase: Client = create_client(supabase_url, supabase_key)

# 관리자 클라이언트 (삭제 등 권한 필요 작업용)
# service_role_key가 있으면 그것을 사용, 없으면 anon_key 사용 (권한 부족할 수 있음)
admin_client: Client = create_client(supabase_url, service_role_key) if service_role_key else supabase


def get_admin_stats(admin_email: str = Depends(verify_admin)):
    """관리자 대시보드 통계 데이터"""
    try:
        # 전체 사용자 수
        user_response = admin_client.table('user_profiles').select('id', count='exact').execute()
        total_users = user_response.count or 0
        
        # 전체 포트폴리오 수
        pf_response = admin_client.table('portfolios').select('id', count='exact').execute()
        total_portfolios = pf_response.count or 0
        
        # 오늘 생성된 포트폴리오
        # (실제 구현 시 시간대 고려 필요)
        
        return {
            "total_users": total_users,
            "total_portfolios": total_portfolios,
            "today_portfolios": 0,  # 임시
            "active_users": int(total_users * 0.1)  # 임시 (10%)
        }
    except Exception as e:
        print(f"❌ Stats error: {e}")
        raise HTTPException(status_code=500, detail=f"통계 조회 실패: {str(e)}")


def get_all_users(skip: int = 0, limit: int = 50, search: str = None, admin_email: str = Depends(verify_admin)):
    """사용자 목록 조회"""
    try:
        query = admin_client.table('user_profiles').select('*')
        
        if search:
            query = query.or_(f"email.ilike.%{search}%,name.ilike.%{search}%")
        
        # 페이지네이션
        response = query.range(skip, skip + limit - 1).execute()
        users = response.data
        
        # 각 사용자의 포트폴리오 수 조회
        users_with_count = []
        for user in users:
            pf_count = admin_client.table('portfolios').select('id', count='exact').eq('user_id', user['id']).execute()
            users_with_count.append({
                **user,
                "portfolio_count": pf_count.count or 0
            })
            
        return {"users": users_with_count, "skip": skip, "limit": limit}
    except Exception as e:
        print(f"❌ Users list error: {e}")
        raise HTTPException(status_code=500, detail=f"사용자 목록 조회 실패: {str(e)}")


def delete_user(user_id: str, admin_email: str = Depends(verify_admin)):
    """사용자 삭제"""
    try:
        print(f"🗑️ Deleting user {user_id} using {'Service Role' if service_role_key else 'Anon Key'}")
        
        # 사용자의 포트폴리오 먼저 삭제 (Admin Client 사용)
        admin_client.table('portfolios').delete().eq('user_id', user_id).execute()
        
        # 사용자 프로필 삭제 (Admin Client 사용)
        response = admin_client.table('user_profiles').delete().eq('id', user_id).execute()
        
        if not response.data:
            # 데이터가 없어도 에러는 아닐 수 있음 (이미 삭제되었거나 등)
            pass
            
        return {"message": "사용자가 삭제되었습니다", "user_id": user_id}
    except Exception as e:
        print(f"❌ Delete user error: {e}")
        raise HTTPException(status_code=500, detail=f"사용자 삭제 실패: {str(e)}")


def batch_delete_users(user_ids: list[str], admin_email: str = Depends(verify_admin)):
    """사용자 일괄 삭제"""
    print(f"🗑️ REQUEST: Batch delete users: {user_ids}")
    try:
        if not user_ids:
            return {"message": "삭제할 사용자가 없습니다", "deleted_count": 0}

        print(f"🔑 Using {'Service Role Key' if service_role_key else 'Anon Key'} for deletion")

        # 사용자의 포트폴리오 일괄 삭제 (Admin Client 사용)
        pf_response = admin_client.table('portfolios').delete().in_('user_id', user_ids).execute()
        print(f"🗑️ Portfolios deleted: {len(pf_response.data) if pf_response.data else 0}")
        
        # 사용자 프로필 일괄 삭제 (Admin Client 사용)
        response = admin_client.table('user_profiles').delete().in_('id', user_ids).execute()
        return {"message": "일괄 삭제 성공", "deleted_portfolios": len(pf_response.data) if pf_response.data else 0, "deleted_users": len(user_ids)}
    except Exception as e:
        print(f"❌ Batch delete failed: {e}")
        raise HTTPException(status_code=500, detail=f"일괄 삭제 실패: {str(e)}")

# --- 공지사항 관리 (Notices) ---

class NoticeCreate(BaseModel):
    title: str
    content: str
    is_active: bool = True

class NoticeUpdate(BaseModel):
    title: str = None
    content: str = None
    is_active: bool = None

def get_notices(skip: int = 0, limit: int = 20, admin_email: str = Depends(verify_admin)):
    """공지사항 목록 조회 (관리자용)"""
    try:
        response = admin_client.table('notices').select('*').order('created_at', desc=True).range(skip, skip + limit - 1).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공지사항 조회 실패: {str(e)}")

def get_active_notices():
    """활성 공지사항 조회 (공개)"""
    try:
        response = supabase.table('notices').select('*').eq('is_active', True).order('created_at', desc=True).execute()
        return response.data
    except Exception as e:
        print(f"❌ Active notices error: {e}")
        return []

def create_notice(notice: NoticeCreate, admin_email: str = Depends(verify_admin)):
    """공지사항 생성"""
    try:
        response = admin_client.table('notices').insert({
            "title": notice.title,
            "content": notice.content,
            "is_active": notice.is_active
        }).execute()
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공지사항 생성 실패: {str(e)}")

def update_notice(notice_id: str, notice: NoticeUpdate, admin_email: str = Depends(verify_admin)):
    """공지사항 수정"""
    try:
        update_data = {k: v for k, v in notice.dict().items() if v is not None}
        if not update_data:
            return {"message": "변경할 내용이 없습니다"}
            
        update_data['updated_at'] = 'now()'
        
        response = admin_client.table('notices').update(update_data).eq('id', notice_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공지사항 수정 실패: {str(e)}")

def delete_notice(notice_id: str, admin_email: str = Depends(verify_admin)):
    """공지사항 삭제"""
    try:
        admin_client.table('notices').delete().eq('id', notice_id).execute()
        return {"message": "공지사항이 삭제되었습니다"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"공지사항 삭제 실패: {str(e)}")


# --- AI 사용량 통계 (AI Stats) ---

def get_ai_stats(period: str = 'daily', admin_email: str = Depends(verify_admin)):
    """AI 사용량 통계 조회"""
    try:
        # Note: Supabase-py client doesn't support complex aggregations effectively without RPC.
        # For MVP, we will fetch raw logs and aggregate in Python (not efficient for large scale, but fine for now).
        # Or we can just count total rows for today.
        
        # 최근 30일 로그 조회
        response = admin_client.table('ai_logs').select('*').order('created_at', desc=True).limit(1000).execute()
        logs = response.data
        
        stats = {
            "total_requests": len(logs),
            "by_type": {},
            "by_model": {}
        }
        
        for log in logs:
            p_type = log.get('prompt_type', 'unknown')
            model = log.get('model_name', 'unknown')
            
            stats['by_type'][p_type] = stats['by_type'].get(p_type, 0) + 1
            stats['by_model'][model] = stats['by_model'].get(model, 0) + 1
            
        return stats
    except Exception as e:
        print(f"❌ AI Stats error: {e}")
        return {"total_requests": 0, "by_type": {}, "by_model": {}, "error": str(e)}


# --- 템플릿 관리 (Template Config) ---

class TemplateConfigUpdate(BaseModel):
    is_active: bool

def get_template_configs(admin_email: str = Depends(verify_admin)):
    """템플릿 설정 조회"""
    try:
        response = admin_client.table('template_config').select('*').execute()
        # 딕셔너리 형태로 변환하여 반환 { 'key': boolean }
        config_map = {item['key']: item['is_active'] for item in response.data}
        return config_map
    except Exception as e:
        print(f"❌ Template config error: {e}")
        return {} # 실패 시 빈 설정 반환 (모두 활성 간주)

def update_template_config(key: str, config: TemplateConfigUpdate, admin_email: str = Depends(verify_admin)):
    """템플릿 설정 업데이트 (Upsert)"""
    try:
        # upsert: 있으면 업데이트, 없으면 생성
        response = admin_client.table('template_config').upsert({
            "key": key,
            "is_active": config.is_active,
            "updated_at": 'now()'
        }).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"템플릿 설정 저장 실패: {str(e)}")


def log_ai_usage(prompt_type: str, model_name: str = "gemini-flash", status: str = "success", user_id: str = None):
    """AI 사용 로그 기록 (비동기 처리 권장되나 MVP는 동기 실행)"""
    try:
        data = {
            "prompt_type": prompt_type,
            "model_name": model_name,
            "status": status
        }
        if user_id:
            data['user_id'] = user_id
            
        supabase.table('ai_logs').insert(data).execute()
    except Exception as e:
        print(f"⚠️ AI Logging failed: {e}")

def get_all_portfolios(skip: int = 0, limit: int = 50, search: str = None, admin_email: str = Depends(verify_admin)):
    """포트폴리오 목록 조회"""
    try:
        query = admin_client.table('portfolios').select('*, user_profiles(email, name)')
        
        if search:
            query = query.ilike('title', f'%{search}%')
        
        # 페이지네이션
        response = query.range(skip, skip + limit - 1).execute()
        portfolios = response.data
        
        portfolios_data = []
        for portfolio in portfolios:
            user_profile = portfolio.get('user_profiles', {})
            portfolios_data.append({
                "id": portfolio['id'],
                "title": portfolio.get('title', '이름 없음'),
                "user_email": user_profile.get('email', ''),
                "user_name": user_profile.get('name', ''),
                "job": portfolio.get('job', ''),
                "template": portfolio.get('template', ''),
                "created_at": portfolio.get('created_at')
            })
        
        # 전체 개수
        total_response = admin_client.table('portfolios').select('id', count='exact').execute()
        total = total_response.count or 0
        
        return {"portfolios": portfolios_data, "total": total, "skip": skip, "limit": limit}
    except Exception as e:
        print(f"❌ Portfolios list error: {e}")
        raise HTTPException(status_code=500, detail=f"포트폴리오 목록 조회 실패: {str(e)}")
