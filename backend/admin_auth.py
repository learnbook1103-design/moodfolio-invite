"""
관리자 API 엔드포인트
관리자 권한이 필요한 API들을 모아놓은 파일
"""

from fastapi import HTTPException, Header
from typing import Optional
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# 관리자 이메일 목록 (환경 변수에서 로드)
ADMIN_EMAILS = [email.strip() for email in os.getenv("ADMIN_EMAILS", "").split(",")]

def verify_admin(authorization: Optional[str] = Header(None)):
    """
    관리자 권한 확인 미들웨어
    Authorization 헤더에서 이메일을 추출하여 관리자 목록과 비교
    """
    print(f"🔍 Authorization header: {authorization}")
    print(f"🔍 ADMIN_EMAILS list: {ADMIN_EMAILS}")
    if not authorization:
        raise HTTPException(status_code=401, detail="인증이 필요합니다")
    
    # Bearer 토큰에서 이메일 추출 (간단한 구현)
    email = authorization.replace("Bearer ", "")
    print(f"🔍 Extracted email: '{email}'")
    print(f"🔍 Email in list? {email in ADMIN_EMAILS}")
    
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="관리자 권한이 필요합니다")
    
    return email
