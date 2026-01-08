# -*- coding: utf-8 -*-
# admin API 추가 스크립트

admin_code = '''

# ==================== 관리자 API ====================

@app.get("/admin/stats")
def get_admin_stats(admin_email: str = Depends(verify_admin)):
    """관리자 대시보드 통계 데이터"""
    db = SessionLocal()
    try:
        total_users = db.query(User).count()
        total_portfolios = db.query(User).filter(User.portfolio_data.isnot(None)).count()
        return {
            "total_users": total_users,
            "total_portfolios": total_portfolios,
            "today_portfolios": 0,
            "active_users": total_users
        }
    finally:
        db.close()


@app.get("/admin/users")
def get_all_users(skip: int = 0, limit: int = 50, search: str = None, admin_email: str = Depends(verify_admin)):
    """사용자 목록 조회"""
    db = SessionLocal()
    try:
        query = db.query(User)
        if search:
            query = query.filter((User.email.contains(search)) | (User.name.contains(search)))
        
        users = query.offset(skip).limit(limit).all()
        total = query.count()
        
        users_data = []
        for user in users:
            portfolio_count = 0
            if user.portfolio_data:
                try:
                    data = json.loads(user.portfolio_data)
                    portfolio_count = len(data.get('portfolios', []))
                except:
                    pass
            
            users_data.append({
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "portfolio_count": portfolio_count
            })
        
        return {"users": users_data, "total": total, "skip": skip, "limit": limit}
    finally:
        db.close()


@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, admin_email: str = Depends(verify_admin)):
    """사용자 삭제"""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")
        
        db.delete(user)
        db.commit()
        return {"message": "사용자가 삭제되었습니다", "user_id": user_id}
    finally:
        db.close()


@app.get("/admin/portfolios")
def get_all_portfolios(skip: int = 0, limit: int = 50, search: str = None, admin_email: str = Depends(verify_admin)):
    """포트폴리오 목록 조회"""
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.portfolio_data.isnot(None)).all()
        portfolios_data = []
        
        for user in users:
            try:
                data = json.loads(user.portfolio_data)
                for portfolio in data.get('portfolios', []):
                    if search and search.lower() not in portfolio.get('name', '').lower():
                        continue
                    
                    portfolios_data.append({
                        "id": portfolio.get('id'),
                        "name": portfolio.get('name'),
                        "user_email": user.email,
                        "user_name": user.name,
                        "job": portfolio.get('job'),
                        "template": portfolio.get('template')
                    })
            except:
                continue
        
        total = len(portfolios_data)
        portfolios_page = portfolios_data[skip:skip+limit]
        return {"portfolios": portfolios_page, "total": total, "skip": skip, "limit": limit}
    finally:
        db.close()
'''

# main.py에 추가
with open('main.py', 'a', encoding='utf-8') as f:
    f.write(admin_code)

print("Admin API 코드 추가 완료")
