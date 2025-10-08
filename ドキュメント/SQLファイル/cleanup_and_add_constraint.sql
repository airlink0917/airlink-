-- ===================================
-- Supabase重複データ削除とユニーク制約追加
-- ===================================
-- 実行日: 2025-10-02
-- 目的: 重複データを削除し、ユニーク制約を追加してupsert機能を有効化

-- ステップ1: 重複データを確認
-- ===================================
SELECT user_id, event_id, COUNT(*) as count,
       STRING_AGG(CAST(id AS TEXT), ', ') as ids,
       STRING_AGG(title, ' | ') as titles
FROM schedule_events
GROUP BY user_id, event_id
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ステップ2: バックアップテーブルを作成（念のため）
-- ===================================
CREATE TABLE IF NOT EXISTS schedule_events_backup AS
SELECT * FROM schedule_events;

-- 確認: バックアップが作成されたか
SELECT COUNT(*) as backup_count FROM schedule_events_backup;

-- ステップ3: 重複データを削除（最新のIDのみ残す）
-- ===================================
DELETE FROM schedule_events
WHERE id NOT IN (
    SELECT MAX(id)
    FROM schedule_events
    GROUP BY user_id, event_id
);

-- 確認: 削除後のデータ件数
SELECT COUNT(*) as total_after_cleanup FROM schedule_events;

-- 確認: 重複が完全に削除されたか
SELECT user_id, event_id, COUNT(*) as count
FROM schedule_events
GROUP BY user_id, event_id
HAVING COUNT(*) > 1;

-- ステップ4: ユニーク制約を追加
-- ===================================
ALTER TABLE schedule_events
ADD CONSTRAINT unique_user_event
UNIQUE (user_id, event_id);

-- 確認: 制約が追加されたか
SELECT
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'schedule_events'
    AND tc.constraint_type = 'UNIQUE';

-- ===================================
-- エラーが発生した場合の復元方法
-- ===================================
-- 以下のコマンドを実行してバックアップから復元:
-- DROP TABLE schedule_events;
-- ALTER TABLE schedule_events_backup RENAME TO schedule_events;

-- ===================================
-- 完了後の確認項目
-- ===================================
-- 1. https://airlink-schedule.vercel.app で新規イベント作成
-- 2. 同じイベントを編集して保存
-- 3. エラーが出ないことを確認
-- 4. 特拡登録が正常に動作することを確認
