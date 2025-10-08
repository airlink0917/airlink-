-- イベントテーブル作成
CREATE TABLE IF NOT EXISTS schedule_events (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    title TEXT,
    date DATE NOT NULL,
    time TIME,
    person TEXT,
    color TEXT,
    note TEXT,
    is_campaign BOOLEAN DEFAULT false,
    campaign_members TEXT[],
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_date
ON schedule_events(user_id, date);

CREATE INDEX IF NOT EXISTS idx_schedule_events_is_deleted
ON schedule_events(user_id, is_deleted);

-- ユニーク制約追加（重複防止）
ALTER TABLE schedule_events
ADD CONSTRAINT unique_user_event
UNIQUE (user_id, event_id);

-- RLS（Row Level Security）を有効化
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーが読み書きできるポリシーを作成
CREATE POLICY "Enable all access for all users"
ON schedule_events FOR ALL
USING (true)
WITH CHECK (true);
