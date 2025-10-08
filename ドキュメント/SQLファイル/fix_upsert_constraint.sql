-- ===================================
-- upsert用のユニーク制約を追加
-- ===================================
-- 実行日: 2025-10-01

-- 1. 既存の重複データを確認（もしあれば）
SELECT user_id, event_id, COUNT(*) as count
FROM schedule_events
GROUP BY user_id, event_id
HAVING COUNT(*) > 1;

-- 2. ユニーク制約を追加（user_idとevent_idの組み合わせ）
ALTER TABLE schedule_events
ADD CONSTRAINT unique_user_event
UNIQUE (user_id, event_id);

-- 3. 制約が追加されたことを確認
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'schedule_events'
    AND tc.constraint_type = 'UNIQUE';