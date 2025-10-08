-- スタッフテーブル作成
CREATE TABLE IF NOT EXISTS staff_members (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    staff_index INTEGER NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, staff_index)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_staff_members_user
ON staff_members(user_id, staff_index);

-- RLS（Row Level Security）を有効化
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーが読み書きできるポリシーを作成
CREATE POLICY "Enable all access for all users"
ON staff_members FOR ALL
USING (true)
WITH CHECK (true);
