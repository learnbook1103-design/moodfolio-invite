
-- 1. 공지사항 테이블 (notices)
create table public.notices (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS 활성화
alter table public.notices enable row level security;

-- 누구나 읽기 가능
create policy "Anyone can read active notices"
  on public.notices for select
  using (is_active = true);

-- 관리자는 모든 권한 (Service Key 사용 시 RLS 우회하므로 별도 정책 불필요할 수 있으나 명시적 추가)
-- (단, Service Role Key는 RLS를 무시하므로 정책이 없어도 됨)


-- 2. AI 사용량 로그 테이블 (ai_logs)
create table public.ai_logs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  prompt_type text not null, -- 'popo' or 'mumu' or 'auto_generate'
  model_name text default 'gemini-flash',
  status text default 'success',
  created_at timestamptz default now()
);

-- RLS 활성화
alter table public.ai_logs enable row level security;

-- 백엔드(Service Role)만 쓰기 가능하도록 (Service Role은 RLS 우회)
-- 일반 사용자는 접근 불가


-- 3. 템플릿 설정 테이블 (template_config)
create table public.template_config (
  key text primary key, -- 예: 'developer_tech_typeA' (job_id_theme)
  is_active boolean default true,
  updated_at timestamptz default now()
);

-- RLS 활성화
alter table public.template_config enable row level security;

-- 누구나 읽기 가능
create policy "Anyone can read template config"
  on public.template_config for select
  using (true);

-- 초기 데이터 삽입 (기본적으로 모두 활성화)
-- (실제로는 필요할 때마다 insert 하거나, 처음 한 번만 실행)
