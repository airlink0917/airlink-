-- ===================================
-- monthly_memos テーブル作成SQL
-- ===================================
-- このSQLをSupabaseのSQL Editorで実行してください

-- テーブル作成（月別メモ用）
CREATE TABLE IF NOT EXISTS monthly_memos (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    month_key TEXT NOT NULL,
    memo_content TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, month_key)
);

-- RLS (Row Level Security) を有効化
ALTER TABLE monthly_memos ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがアクセス可能なポリシー
CREATE POLICY "Allow all access to monthly_memos"
ON monthly_memos
FOR ALL
USING (true)
WITH CHECK (true);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_monthly_memos_user_id ON monthly_memos(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_memos_month_key ON monthly_memos(month_key);

-- 完了メッセージ
SELECT 'monthly_memos テーブルの作成が完了しました' AS status;
