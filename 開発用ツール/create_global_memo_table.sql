-- ===================================
-- global_memo テーブル作成SQL
-- ===================================
-- このSQLをSupabaseのSQL Editorで実行してください

-- テーブル作成
CREATE TABLE IF NOT EXISTS global_memo (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    memo_content TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE global_memo ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがアクセス可能なポリシー
CREATE POLICY "Allow all access to global_memo"
ON global_memo
FOR ALL
USING (true)
WITH CHECK (true);

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_global_memo_user_id ON global_memo(user_id);

-- 完了メッセージ
SELECT 'global_memo テーブルの作成が完了しました' AS status;
