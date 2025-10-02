-- ===================================
-- is_deleted カラムを追加するマイグレーション
-- ===================================
-- このSQLをSupabaseのSQL Editorで実行してください
-- 実行日: 2025-10-01

-- 1. schedule_eventsテーブルにis_deletedカラムを追加
ALTER TABLE schedule_events
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- 2. 既存のすべてのレコードをis_deleted = falseに設定（念のため）
UPDATE schedule_events
SET is_deleted = false
WHERE is_deleted IS NULL;

-- 3. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_schedule_events_is_deleted
ON schedule_events(user_id, is_deleted);

-- 4. 確認クエリ（実行後に確認用）
-- SELECT COUNT(*) as total_events,
--        COUNT(CASE WHEN is_deleted = true THEN 1 END) as deleted_events,
--        COUNT(CASE WHEN is_deleted = false OR is_deleted IS NULL THEN 1 END) as active_events
-- FROM schedule_events
-- WHERE user_id = 'global_user';