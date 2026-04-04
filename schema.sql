-- 할일 테이블
CREATE TABLE tasks (
  task_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT NOT NULL,
  due_date DATE,
  status TEXT DEFAULT '진행중' CHECK (status IN ('진행중', '완료')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 일일 지표 테이블
CREATE TABLE daily_metrics (
  date DATE PRIMARY KEY,
  contracts_count INTEGER DEFAULT 0,
  db_count INTEGER DEFAULT 0,
  saturday_visitors INTEGER DEFAULT 0,
  sunday_visitors INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 일일 메모 테이블
CREATE TABLE daily_memos (
  date DATE PRIMARY KEY,
  content TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
