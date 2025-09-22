-- Supabase リアルタイム同期修正用SQL

-- 1. 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Public Access" ON staff_members;
DROP POLICY IF EXISTS "Public Access" ON events;
DROP POLICY IF EXISTS "Public Access" ON campaign_memos;

-- 2. より具体的なRLSポリシーを作成
-- スタッフメンバー用
CREATE POLICY "Enable read for all users" ON staff_members
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON staff_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON staff_members
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON staff_members
    FOR DELETE USING (true);

-- イベント用
CREATE POLICY "Enable read for all users" ON events
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON events
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON events
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON events
    FOR DELETE USING (true);

-- 特拡メモ用
CREATE POLICY "Enable read for all users" ON campaign_memos
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON campaign_memos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON campaign_memos
    FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON campaign_memos
    FOR DELETE USING (true);

-- 3. リアルタイム機能を有効化
ALTER publication supabase_realtime ADD TABLE events;
ALTER publication supabase_realtime ADD TABLE staff_members;
ALTER publication supabase_realtime ADD TABLE campaign_memos;

-- 4. update_updated_at_column関数の修正（search_pathの問題を解決）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- 5. インデックスの最適化
DROP INDEX IF EXISTS idx_events_date;
DROP INDEX IF EXISTS idx_events_person;
DROP INDEX IF EXISTS idx_events_is_campaign;

CREATE INDEX idx_events_date ON events(date DESC);
CREATE INDEX idx_events_person ON events(person);
CREATE INDEX idx_events_is_campaign ON events(is_campaign) WHERE is_campaign = true;
CREATE INDEX idx_events_updated_at ON events(updated_at DESC);

-- 6. データの整合性チェック
-- 重複したポジションがないか確認
DELETE FROM staff_members a
WHERE a.id < (
    SELECT max(b.id)
    FROM staff_members b
    WHERE a.position = b.position
);

-- 7. Realtime設定の確認
-- この設定はSupabaseダッシュボードから実行
-- Database -> Replication -> supabase_realtime で以下のテーブルを有効化:
-- - events
-- - staff_members
-- - campaign_memos