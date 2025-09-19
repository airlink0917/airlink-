# Supabase データベース連携セットアップガイド

## 1. Supabaseアカウント作成とプロジェクト設定

### 1.1 アカウント作成
1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHubアカウントでサインイン（推奨）またはメールで登録

### 1.2 新規プロジェクト作成
1. 「New project」をクリック
2. 以下を設定：
   - **Project name**: `schedule-system`
   - **Database Password**: 強力なパスワードを生成
   - **Region**: `Northeast Asia (Tokyo)` を選択
3. 「Create new project」をクリック

## 2. データベーステーブル作成

### 2.1 SQLエディタで以下のテーブルを作成

```sql
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
```

### 2.2 Row Level Security (RLS) の設定

```sql
-- RLSを有効化
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_memos ENABLE ROW LEVEL SECURITY;

-- 誰でも読み書き可能なポリシー（開発用）
-- 本番環境では認証を追加してください
CREATE POLICY "Public Access" ON staff_members
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Access" ON events
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public Access" ON campaign_memos
  FOR ALL USING (true) WITH CHECK (true);
```

## 3. API設定の取得

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 4. 環境設定

`.env`ファイルを作成（GitHubには上げない）:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 5. リアルタイム同期の有効化

1. Supabaseダッシュボードで「Database」→「Replication」を開く
2. 以下のテーブルでリアルタイムを有効化：
   - `events`
   - `staff_members`
   - `campaign_memos`

## 6. セキュリティ設定

### 本番環境での推奨設定：
1. 認証を追加（Supabase Auth使用）
2. RLSポリシーを更新して認証ユーザーのみアクセス可能に
3. CORS設定を適切に設定
4. APIキーを環境変数で管理

## トラブルシューティング

### よくある問題：

**Q: データが同期されない**
A:
- ブラウザのコンソールでエラーを確認
- Supabaseのダッシュボードでリアルタイムが有効になっているか確認
- ネットワーク接続を確認

**Q: CORS エラーが発生する**
A:
- Supabaseダッシュボードで「Authentication」→「URL Configuration」を確認
- 許可するドメインを追加

**Q: データが保存されない**
A:
- RLSポリシーを確認
- APIキーが正しいか確認
- テーブル構造が正しいか確認