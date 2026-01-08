# -*- coding: utf-8 -*-
# 파일 인코딩 수정 스크립트

# main.py에서 깨진 admin API 부분 제거
with open('main.py', 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

# 502번 줄까지만 유지 (admin API 추가 전)
clean_lines = lines[:502]

# UTF-8로 다시 저장
with open('main.py', 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)

print("main.py 파일 정리 완료")
