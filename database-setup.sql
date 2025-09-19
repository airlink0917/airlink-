-- スタッフメンバーテーブル
CREATE TABLE staff_members (
  id SERIAL PRIMARY KEY,
  position INT NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(position)
);

-- イベントテーブル
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  person VARCHAR(255),
  description TEXT,
  color VARCHAR(50),
  note TEXT,
  is_campaign BOOLEAN DEFAULT FALSE,
  campaign_members TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 特拡メモテーブル
CREATE TABLE campaign_memos (
  id SERIAL PRIMARY KEY,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaign_memos_updated_at BEFORE UPDATE ON campaign_memos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_events_person ON events(person);
CREATE INDEX idx_events_is_campaign ON events(is_campaign);

-- RLSを有効化
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_memos ENABLE ROW LEVEL SECURITY;

-- 誰でも読み書き可能なポリシー（開発用）
CREATE POLICY "Public Access" ON staff_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Access" ON events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Access" ON campaign_memos
  FOR ALL USING (true) WITH CHECK (true);