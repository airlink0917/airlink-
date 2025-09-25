-- ===================================
-- Supabase権限設定SQL
-- ===================================
-- このSQLをSupabaseのSQL Editorで実行してください

-- schedule_eventsテーブルの権限設定
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み書きできるポリシー（global_userのデータのみ）
CREATE POLICY "Enable all operations for global_user" ON schedule_events
    FOR ALL
    USING (user_id = 'global_user')
    WITH CHECK (user_id = 'global_user');

-- staff_membersテーブルの権限設定
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが読み書きできるポリシー（global_userのデータのみ）
CREATE POLICY "Enable all operations for global_user" ON staff_members
    FOR ALL
    USING (user_id = 'global_user')
    WITH CHECK (user_id = 'global_user');

-- 既存のポリシーがある場合は削除してから実行
-- DROP POLICY IF EXISTS "Enable all operations for global_user" ON schedule_events;
-- DROP POLICY IF EXISTS "Enable all operations for global_user" ON staff_members;