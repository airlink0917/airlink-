# Supabase移行作業手順書

作成日: 2025-10-02

## 🎯 目的
現在のSupabaseアカウントから新しいSupabaseアカウントへシステムを移行する

## ✅ 重要な確認事項

### GitHub・Vercelとの連携について
**結論: 問題なく連携できます**

- **GitHub**: 1つのリポジトリ（変更なし）
- **Vercel**: 1つのアカウント（変更なし）
- **Supabase**: 新しいアカウントに変更
  - GitHubとVercelへの影響: **なし**
  - 変更するのは`script.js`の接続情報のみ

### 作業の流れ
```
現在: GitHub → Vercel → Supabase（旧アカウント）
  ↓
移行後: GitHub → Vercel → Supabase（新アカウント）
```

---

## 📝 作業手順

### ステップ1: 現在のデータをバックアップ（必須）

1. https://airlink-schedule.vercel.app にアクセス
2. 「📥 バックアップ」ボタンをクリック
3. JSONファイルをダウンロード
4. 安全な場所に保存（デスクトップ等）

**ファイル名例**: `日程システム_バックアップ_20251002_1430.json`

---

### ステップ2: 現在のSupabase接続情報を記録

現在の接続情報（削除前に記録しておく）:
```
SUPABASE_URL: https://igjkroqjhwhewtrprhds.supabase.co
SUPABASE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**保存場所**: このファイルの最後に記載

---

### ステップ3: 新しいSupabaseアカウント作成

1. **新しいメールアドレスでSupabaseにサインアップ**
   - URL: https://supabase.com
   - 「Start your project」をクリック
   - 新しいアカウントで登録

2. **新しいプロジェクトを作成**
   - Organization name: 任意（例: airlink-org）
   - Project name: 任意（例: airlink-schedule）
   - Database Password: 安全なパスワードを設定（必ず記録）
   - Region: Northeast Asia (Tokyo) - 日本に近いサーバー
   - 「Create new project」をクリック

3. **プロジェクトが起動するまで待つ**（1-2分）

---

### ステップ4: 新しいSupabaseにテーブルを作成

1. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック
   - 「+ New query」をクリック

2. **以下のSQLを順番に実行**

#### 2-1. schedule_events テーブル作成
```sql
-- イベントテーブル作成
CREATE TABLE IF NOT EXISTS schedule_events (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    title TEXT,
    date DATE NOT NULL,
    time TIME,
    person TEXT,
    color TEXT,
    note TEXT,
    is_campaign BOOLEAN DEFAULT false,
    campaign_members TEXT[],
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_schedule_events_user_date
ON schedule_events(user_id, date);

CREATE INDEX IF NOT EXISTS idx_schedule_events_is_deleted
ON schedule_events(user_id, is_deleted);

-- ユニーク制約追加（重複防止）
ALTER TABLE schedule_events
ADD CONSTRAINT unique_user_event
UNIQUE (user_id, event_id);

-- RLS（Row Level Security）を有効化
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;

-- すべてのユーザーが読み書きできるポリシーを作成
CREATE POLICY "Enable all access for all users"
ON schedule_events FOR ALL
USING (true)
WITH CHECK (true);
```

#### 2-2. staff_members テーブル作成
```sql
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
```

3. **テーブルが作成されたか確認**
   - 左メニューから「Table Editor」をクリック
   - `schedule_events`と`staff_members`が表示されればOK

---

### ステップ5: 新しいSupabaseの接続情報を取得

1. **Settings → API を開く**
   - 左下の「⚙️ Project Settings」をクリック
   - 「API」タブをクリック

2. **以下の情報をコピー**
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（長い文字列）

3. **接続情報を記録**（後で使用）
```
新しいSupabase接続情報:
SUPABASE_URL: [ここにProject URLを貼り付け]
SUPABASE_KEY: [ここにanon public keyを貼り付け]
```

---

### ステップ6: script.jsの接続情報を更新

1. **script.jsを開く**
   - `C:\Users\user\OneDrive\デスクトップ\日程システム\script.js`

2. **5-8行目を新しい接続情報に変更**

変更前（現在）:
```javascript
const SUPABASE_URL = 'https://igjkroqjhwhewtrprhds.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI';
const USER_ID = 'global_user';
```

変更後（新しい接続情報に置き換え）:
```javascript
const SUPABASE_URL = '[ステップ5で取得したProject URL]';
const SUPABASE_KEY = '[ステップ5で取得したanon public key]';
const USER_ID = 'global_user';  // これは変更なし
```

3. **ファイルを保存**

---

### ステップ7: GitHubにプッシュ

```bash
cd "C:\Users\user\OneDrive\デスクトップ\日程システム"
git add script.js
git commit -m "新しいSupabaseアカウントに接続情報を更新"
git push
```

---

### ステップ8: Vercelで自動デプロイを確認

1. **Vercelダッシュボードを確認**
   - https://vercel.com/dashboard にアクセス
   - 自動デプロイが開始されるのを確認（1-2分）

2. **デプロイ完了を確認**
   - 「✅ Ready」と表示されればOK

---

### ステップ9: 動作確認

1. **サイトにアクセス**
   - https://airlink-schedule.vercel.app

2. **初期状態を確認**
   - カレンダーが表示される（デフォルト担当者: 大西、小林、上田、北野、大浜）
   - イベントデータは空（バックアップから復元する前）

3. **テストイベントを作成**
   - カレンダーのセルをクリック
   - イベントを1つ作成
   - 保存できることを確認

4. **新しいSupabaseでデータを確認**
   - Supabase → Table Editor → schedule_events
   - 作成したイベントが表示されればOK ✅

---

### ステップ10: バックアップデータを復元

1. **復元ボタンをクリック**
   - 「📤 復元」ボタンをクリック
   - パスワード入力: `airlink`

2. **ステップ1でダウンロードしたJSONファイルを選択**

3. **確認メッセージで「OK」をクリック**

4. **データが復元されたことを確認**
   - すべてのイベントが表示される
   - 担当者名が復元される
   - 特拡が復元される

---

### ステップ11: 複数端末で動作確認

1. **別の端末からアクセス**
   - スマホ、タブレット、別のPCなど

2. **10秒以内に同期されることを確認**
   - 片方の端末でイベントを作成
   - もう片方の端末で自動的に表示される

3. **すべての機能をテスト**
   - イベント作成
   - イベント編集
   - イベント削除
   - 特拡登録
   - バックアップ/復元

---

### ステップ12: 旧Supabaseプロジェクトを削除

**重要**: 新しいSupabaseで完全に動作確認が完了してから実施してください

1. **旧Supabaseアカウントにログイン**
   - https://supabase.com

2. **プロジェクト設定を開く**
   - 削除したいプロジェクトを選択
   - Settings → General

3. **プロジェクトを削除**
   - 一番下までスクロール
   - 「Delete Project」セクション
   - プロジェクト名を入力して削除を確定

4. **削除完了**
   - プロジェクトが完全に削除される
   - データも完全に削除される（復元不可）

---

## ⚠️ 注意事項

### 作業前
1. **必ずバックアップを取る**（ステップ1）
2. **現在の接続情報を記録する**（ステップ2）
3. **作業は本番環境で行う**（テスト環境はない）

### 作業中
1. **1つずつ確認しながら進める**
2. **SQLは順番通りに実行する**
3. **エラーが出たら進まない**（この手順書を参照）

### 作業後
1. **旧Supabaseはすぐに削除しない**
2. **最低1週間は動作確認期間を設ける**
3. **問題なければ旧アカウントを削除**

---

## 🔧 トラブルシューティング

### Q1: 新しいSupabaseに接続できない
**A**: 以下を確認
- SUPABASE_URLが正しいか
- SUPABASE_KEYが正しいか（anon public key）
- RLSポリシーが設定されているか

### Q2: データが保存されない
**A**: 以下を確認
- テーブルが正しく作成されているか
- ユニーク制約でエラーが出ていないか
- ブラウザのコンソール（F12）でエラーを確認

### Q3: 復元が失敗する
**A**: 以下を確認
- パスワードが「airlink」か
- JSONファイルが正しいか
- ブラウザを更新して再試行

### Q4: 同期されない
**A**: 以下を確認
- 新しいSupabaseに接続されているか（コンソールログ確認）
- ネットワーク接続が正常か
- ページを更新（F5）してみる

---

## 📞 サポート情報

### 参考ドキュメント
- `ドキュメント/管理者パスワード.txt` - パスワード情報
- `ドキュメント/修正履歴と現状.md` - システムの状態
- `SQLファイル/cleanup_and_add_constraint.sql` - SQL参考

### 作業時の連絡
問題が発生したら、以下の情報を記録:
1. どのステップで発生したか
2. エラーメッセージ（あれば）
3. ブラウザのコンソールログ（F12で確認）

---

## 📝 作業記録欄

### 実施日
日付: _____________

### 新しいSupabase接続情報（記録用）
```
SUPABASE_URL: ___________________________________
SUPABASE_KEY: ___________________________________
Database Password: ______________________________
```

### 旧Supabaseプロジェクト情報（削除前に記録）
```
SUPABASE_URL: https://igjkroqjhwhewtrprhds.supabase.co
SUPABASE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI
削除日: _____________
```

### チェックリスト
- [ ] ステップ1: バックアップ完了
- [ ] ステップ2: 旧接続情報記録
- [ ] ステップ3: 新アカウント作成
- [ ] ステップ4: テーブル作成
- [ ] ステップ5: 接続情報取得
- [ ] ステップ6: script.js更新
- [ ] ステップ7: GitHubプッシュ
- [ ] ステップ8: Vercelデプロイ確認
- [ ] ステップ9: 動作確認
- [ ] ステップ10: データ復元
- [ ] ステップ11: 複数端末確認
- [ ] ステップ12: 旧アカウント削除

### メモ欄
```
問題点や気づいたことを記録:




```

---

**作成者**: Claude Code
**最終更新**: 2025-10-02
