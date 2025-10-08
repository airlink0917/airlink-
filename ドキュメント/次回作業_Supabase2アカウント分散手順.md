# Supabase 2アカウント分散作業手順書

作成日: 2025-10-02

## 🎯 目的
データ容量を分散するため、Supabaseを2つのアカウントに分けて運用する

## 📊 作業後の構成

```
【新規作成】Supabase アカウントA
├── 容量: 500MB
├── 帯域幅: 5GB/月
└── airlink-schedule プロジェクト
    └── URL: https://airlink-schedule.vercel.app

【現在使用中】Supabase アカウントB
├── 容量: 500MB（そのまま）
├── 帯域幅: 5GB/月（そのまま）
└── new-system-id68 プロジェクト
    └── URL: https://new-system-id68.vercel.app
```

**合計容量**: 1GB（500MB × 2）
**合計帯域幅**: 10GB/月（5GB × 2）

## ⚠️ 超重要な注意事項

### 絶対に守ること

```
✅ airlink-schedule → 新しいSupabaseアカウントAに移行
✅ new-system-id68 → 現在のSupabaseアカウントB（変更なし）
```

### 編集するファイル

| プロジェクト | GitHubリポジトリ | 編集するか |
|------------|----------------|-----------|
| airlink-schedule | airlink0917/airlink- | ✅ **編集する** |
| new-system-id68 | （別のリポジトリ） | ❌ **絶対に触らない** |

**重要**:
- **airlink-scheduleのリポジトリ（airlink-）のみ**を編集
- **new-system-id68のリポジトリは一切触らない**

---

## 📝 作業手順（全12ステップ）

### ステップ1: 現在のデータをバックアップ（必須）

1. **airlink-scheduleのサイトにアクセス**
   - URL: https://airlink-schedule.vercel.app

2. **バックアップボタンをクリック**
   - 「📥 バックアップ」ボタンをクリック
   - JSONファイルがダウンロードされる

3. **安全な場所に保存**
   - デスクトップに保存
   - ファイル名例: `日程システム_バックアップ_20251002_1430.json`

**重要**: このバックアップファイルは絶対に削除しないでください

---

### ステップ2: 現在のSupabase接続情報を記録

念のため、現在の接続情報を記録しておきます（削除前の保険）。

**記録欄**:
```
【現在使用中】Supabaseアカウント（アカウントB）
SUPABASE_URL: https://igjkroqjhwhewtrprhds.supabase.co
SUPABASE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI

使用プロジェクト:
- airlink-schedule（移行予定）
- new-system-id68（継続使用）
```

---

### ステップ3: 新しいSupabaseアカウントを作成

1. **Supabaseにアクセス**
   - URL: https://supabase.com
   - 右上の「Start your project」をクリック

2. **新しいメールアドレスでサインアップ**
   - **重要**: 現在使用中とは**異なるメールアドレス**を使用
   - 「Sign Up」をクリック

   **オプション**:
   - GitHubアカウントでサインアップ（推奨）
   - または、メールアドレス + パスワード

3. **メール認証**
   - 登録したメールアドレスに確認メールが届く
   - メール内のリンクをクリックして認証

4. **ログイン完了**
   - Supabaseダッシュボードが表示される

**記録欄**:
```
【新規作成】Supabaseアカウント（アカウントA）
メールアドレス: _______________________________
パスワード: ___________________________________
（安全な場所に記録してください）
```

---

### ステップ4: 新しいSupabaseプロジェクトを作成

1. **「New project」をクリック**
   - ダッシュボード画面の「New project」ボタン

2. **Organization作成（初回のみ）**
   - Organization name: `airlink-org`（任意の名前）
   - 「Create organization」をクリック

3. **プロジェクト情報を入力**
   - **Name**: `airlink-schedule`
   - **Database Password**: 強力なパスワードを設定
     - 例: `Airlink2025!Schedule#Secure`
     - **必ず記録してください**
   - **Region**: `Northeast Asia (Tokyo)` を選択
     - 日本に最も近いサーバー
   - **Pricing Plan**: `Free` を選択

4. **「Create new project」をクリック**

5. **プロジェクト起動を待つ**
   - 1-2分かかります
   - 「Setting up project...」と表示される
   - 完了すると「Project is ready!」と表示される

**記録欄**:
```
【新規作成】Supabaseプロジェクト
プロジェクト名: airlink-schedule
Database Password: _____________________________
Region: Northeast Asia (Tokyo)
作成日: ________________________________________
```

---

### ステップ5: 新しいSupabaseにテーブルを作成

1. **SQL Editorを開く**
   - 左メニューから「SQL Editor」をクリック
   - 「+ New query」をクリック

2. **以下のSQLを順番に実行**

#### SQL 1: schedule_eventsテーブル作成

**コピーして実行**:
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

**実行方法**:
- SQLをエディタに貼り付け
- 右下の「Run」ボタンをクリック
- 「Success. No rows returned」と表示されればOK ✅

#### SQL 2: staff_membersテーブル作成

**コピーして実行**:
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

**実行方法**:
- SQLをエディタに貼り付け
- 「Run」ボタンをクリック
- 「Success. No rows returned」と表示されればOK ✅

3. **テーブルが作成されたか確認**
   - 左メニューから「Table Editor」をクリック
   - `schedule_events`と`staff_members`が表示されればOK ✅

---

### ステップ6: 新しいSupabaseの接続情報を取得

1. **Settings → API を開く**
   - 左下の「⚙️ Project Settings」をクリック
   - 左メニューから「API」をクリック

2. **以下の情報をコピー**

   **Project URL**:
   - 「Project URL」の欄をコピー
   - 例: `https://xxxxxxxxxxxxx.supabase.co`

   **API Keys - anon public**:
   - 「anon public」の「Copy」ボタンをクリック
   - 例: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`（非常に長い文字列）

3. **接続情報を記録**

**記録欄**:
```
【新規作成】Supabaseアカウント（アカウントA）の接続情報

SUPABASE_URL: _______________________________________

SUPABASE_KEY: _______________________________________
_________________________________________________________
_________________________________________________________
（非常に長い文字列です。すべてコピーしてください）
```

**重要**: この情報は次のステップで使用します

---

### ステップ7: GitHubリポジトリの確認

**重要**: 編集するリポジトリを間違えないための確認です

1. **Vercelダッシュボードを開く**
   - https://vercel.com/airlink0917s-projects

2. **airlink-scheduleの設定を開く**
   - 「airlink-schedule」プロジェクトをクリック
   - 「Settings」タブをクリック
   - 左メニューから「Git」をクリック

3. **GitHubリポジトリを確認**
   - 「Connected Git Repository」に表示されているリポジトリ名を確認
   - おそらく: `airlink0917/airlink-`

4. **new-system-id68のリポジトリも確認**
   - 同様に「new-system-id68」→「Settings」→「Git」
   - リポジトリ名を確認

**記録欄**:
```
airlink-schedule のリポジトリ: ___________________
new-system-id68 のリポジトリ: ____________________

確認: 2つが異なるリポジトリか？
□ はい、異なる → 安全に作業可能
□ いいえ、同じ → 要注意（作業前に相談）
```

---

### ステップ8: script.jsの接続情報を更新

**重要**: **airlink-scheduleのリポジトリ（airlink-）のみ**を編集します

#### 方法A: GitHubで直接編集（推奨）

1. **GitHubのairlink-リポジトリを開く**
   - https://github.com/airlink0917/airlink-

2. **script.jsファイルを開く**
   - ファイル一覧から`script.js`をクリック

3. **編集ボタンをクリック**
   - 右上の鉛筆アイコン（✏️ Edit this file）をクリック

4. **5-8行目を変更**

**変更前**（現在）:
```javascript
const SUPABASE_URL = 'https://igjkroqjhwhewtrprhds.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI';
const USER_ID = 'global_user';
```

**変更後**（ステップ6で取得した新しい接続情報に置き換え）:
```javascript
const SUPABASE_URL = '[ステップ6で取得したProject URL]';
const SUPABASE_KEY = '[ステップ6で取得したanon public key]';
const USER_ID = 'global_user';  // これは変更なし
```

**例**:
```javascript
const SUPABASE_URL = 'https://abcdefghijk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const USER_ID = 'global_user';
```

5. **変更を確認**
   - SUPABASE_URLとSUPABASE_KEYが新しい値に変更されているか確認
   - USER_IDは`'global_user'`のまま（変更なし）

6. **コミット**
   - ページ下部の「Commit changes」をクリック
   - コミットメッセージ: `新しいSupabaseアカウントに接続情報を更新`
   - 「Commit changes」ボタンをクリック

#### 方法B: ローカルで編集してプッシュ

```bash
cd "C:\Users\user\OneDrive\デスクトップ\日程システム"

# script.jsを編集（上記の変更を適用）

git add script.js
git commit -m "新しいSupabaseアカウントに接続情報を更新"
git push
```

**重要な確認**:
- ✅ 編集したのは**airlink-リポジトリのscript.jsのみ**
- ✅ new-system-id68のリポジトリは一切触っていない

---

### ステップ9: Vercelで自動デプロイを確認

1. **Vercelダッシュボードを開く**
   - https://vercel.com/airlink0917s-projects

2. **airlink-scheduleプロジェクトをクリック**

3. **デプロイ状況を確認**
   - 「Deployments」タブに移動
   - 一番上に新しいデプロイが表示される
   - ステータスが「Building...」→「Ready」に変わるのを待つ（1-2分）

4. **デプロイ完了を確認**
   - 「✅ Ready」と表示されればOK
   - エラーが出た場合は、ステップ8の編集を確認

---

### ステップ10: 動作確認（重要）

1. **airlink-scheduleにアクセス**
   - URL: https://airlink-schedule.vercel.app

2. **初期状態を確認**
   - カレンダーが表示される
   - デフォルト担当者が表示される（大西、小林、上田、北野、大浜）
   - イベントデータは空（バックアップから復元する前）

3. **ブラウザのコンソールを開いて確認**
   - F12キーを押す
   - 「Console」タブをクリック
   - 以下のメッセージが表示されればOK:
     ```
     Supabaseクライアント初期化成功
     初回同期完了
     自動同期を有効化（論理削除対応済み）
     ```

4. **テストイベントを作成**
   - カレンダーのセルをクリック
   - イベントを1つ作成
     - タイトル: 「テスト」
     - 色: 任意
   - 「保存」をクリック

5. **新しいSupabaseでデータを確認**
   - 新しいSupabaseダッシュボード → Table Editor → schedule_events
   - 作成したイベントが表示されればOK ✅

**重要**: この時点で新しいSupabaseへの接続が成功しています

---

### ステップ11: バックアップデータを復元

1. **復元ボタンをクリック**
   - https://airlink-schedule.vercel.app
   - 「📤 復元」ボタンをクリック

2. **パスワード入力**
   - パスワード: `airlink`
   - 「OK」をクリック

3. **ステップ1でダウンロードしたJSONファイルを選択**
   - ファイル選択ダイアログが開く
   - バックアップファイルを選択

4. **確認メッセージで「OK」をクリック**
   - 「〇〇〇〇年〇月〇日のバックアップデータを復元しますか？」
   - 「OK」をクリック

5. **復元完了を確認**
   - 「データを復元しました」と表示される
   - すべてのイベントが表示される
   - 担当者名が復元される
   - 特拡が復元される

6. **新しいSupabaseでデータを確認**
   - 新しいSupabaseダッシュボード → Table Editor
   - schedule_events: すべてのイベントが保存されている
   - staff_members: すべての担当者が保存されている

---

### ステップ12: new-system-id68の動作確認（重要）

**最重要**: new-system-id68が正常に動作していることを確認

1. **new-system-id68にアクセス**
   - URL: https://new-system-id68.vercel.app

2. **動作確認**
   - ページが正常に表示されるか
   - データが正常に表示されるか
   - 新規データを作成できるか

3. **問題がある場合**
   - **すぐに作業を中止**
   - 誤ってnew-system-id68のリポジトリを編集していないか確認
   - 必要に応じて元に戻す

**確認項目**:
- ✅ new-system-id68が正常に動作している
- ✅ データが表示される
- ✅ 新規作成・編集・削除ができる

---

### ステップ13: 複数端末で動作確認

1. **別の端末からアクセス**
   - スマホ、タブレット、別のPCなど

2. **airlink-scheduleで確認**
   - https://airlink-schedule.vercel.app
   - 片方の端末でイベントを作成
   - もう片方の端末で10秒以内に表示される

3. **new-system-id68でも確認**
   - https://new-system-id68.vercel.app
   - 同様に動作確認

---

### ステップ14: 旧Supabaseアカウントの整理（オプション）

**重要**: すべての動作確認が完了し、最低1週間問題なく運用できてから実施

#### オプションA: airlink-scheduleプロジェクトのみ削除（推奨）

旧Supabaseアカウントには2つのプロジェクトがあります:
- airlink-schedule（新Supabaseに移行済み）
- new-system-id68（継続使用中）

**削除するもの**: airlink-scheduleプロジェクトのみ

**手順**:
1. 旧Supabaseアカウントにログイン
2. airlink-scheduleプロジェクトを選択
3. Settings → General → Delete Project
4. プロジェクト名を入力して削除

**結果**:
- ✅ airlink-scheduleプロジェクトが削除される
- ✅ new-system-id68プロジェクトは残る
- ✅ 旧Supabaseアカウント自体は残る

#### オプションB: そのまま残す

特に問題がなければ、旧Supabaseのairlink-scheduleプロジェクトは残しておいても構いません。

**メリット**:
- バックアップとして残る
- 何か問題があった時に戻せる

**デメリット**:
- 無料プランの容量を使用する（ただし新しいデータは保存されない）

---

## 📊 作業完了後の構成

### 最終的な構成

```
【新規作成】Supabaseアカウント A
├── メールアドレス: 新しいアドレス
└── airlink-schedule プロジェクト
    ├── 容量: 500MB
    ├── データ: 日程管理システムのデータ
    └── 接続元: https://airlink-schedule.vercel.app

【現在使用中】Supabaseアカウント B
├── メールアドレス: 現在のアドレス
├── new-system-id68 プロジェクト（継続使用）
│   ├── 容量: 500MB
│   ├── データ: new-system-id68のデータ
│   └── 接続元: https://new-system-id68.vercel.app
└── airlink-schedule プロジェクト（削除可）
    └── 古いデータ（使用されていない）
```

### 容量の分散状況

| | 容量 | 使用プロジェクト |
|---|---|---|
| **Supabaseアカウント A** | 500MB | airlink-schedule |
| **Supabaseアカウント B** | 500MB | new-system-id68 |
| **合計** | **1GB** | 2プロジェクト |

---

## ⚠️ トラブルシューティング

### Q1: 新しいSupabaseに接続できない

**エラー**: 「Supabaseクライアント初期化成功」が表示されない

**確認事項**:
1. ステップ6で取得したURLとKEYが正しいか
2. script.jsの編集内容が正しいか
3. Vercelのデプロイが完了しているか

**解決方法**:
- ブラウザのキャッシュをクリア（Ctrl + Shift + Delete）
- ページを再読み込み（Ctrl + F5）
- ステップ8をやり直す

### Q2: データが保存されない

**エラー**: イベントを作成しても保存されない

**確認事項**:
1. ブラウザのコンソールにエラーが表示されていないか（F12）
2. Supabaseのテーブルが正しく作成されているか
3. RLSポリシーが設定されているか

**解決方法**:
- ステップ5のSQLを再実行
- RLSポリシーを確認

### Q3: 復元が失敗する

**エラー**: 「復元に失敗しました」

**確認事項**:
1. パスワードが「airlink」か
2. JSONファイルが正しいか
3. ブラウザのコンソールにエラーが表示されていないか

**解決方法**:
- ページを再読み込み
- 再度復元を試みる

### Q4: new-system-id68が動作しない

**超重要**: すぐに作業を中止してください

**原因**:
- 誤ってnew-system-id68のリポジトリを編集した可能性

**確認方法**:
1. GitHubでnew-system-id68のリポジトリを確認
2. 最新のコミットを確認
3. 誤った編集がないか確認

**解決方法**:
- GitHubでコミットを取り消す（Revert）
- または、バックアップから復元

---

## ✅ 作業チェックリスト

作業完了後、以下をチェックしてください：

### 必須チェック項目

- [ ] ステップ1: バックアップ完了
- [ ] ステップ2: 旧接続情報記録
- [ ] ステップ3: 新Supabaseアカウント作成
- [ ] ステップ4: 新プロジェクト作成
- [ ] ステップ5: テーブル作成
- [ ] ステップ6: 接続情報取得
- [ ] ステップ7: GitHubリポジトリ確認
- [ ] ステップ8: script.js更新（airlink-のみ）
- [ ] ステップ9: Vercelデプロイ確認
- [ ] ステップ10: 動作確認
- [ ] ステップ11: データ復元
- [ ] ステップ12: new-system-id68動作確認（重要）
- [ ] ステップ13: 複数端末確認

### 最終確認項目

- [ ] airlink-scheduleが正常に動作している
- [ ] new-system-id68が正常に動作している（変更なし）
- [ ] 両方のシステムでデータの作成・編集・削除ができる
- [ ] 複数端末で同期が機能している
- [ ] バックアップファイルを安全な場所に保管している

---

## 📝 作業記録欄

### 実施日
日付: _____________

### 新しいSupabaseアカウント情報
```
【Supabaseアカウント A】
メールアドレス: ___________________________________
パスワード: _______________________________________

【プロジェクト情報】
プロジェクト名: airlink-schedule
Database Password: ________________________________
Region: Northeast Asia (Tokyo)

【接続情報】
SUPABASE_URL: _____________________________________
SUPABASE_KEY: _____________________________________
___________________________________________________
___________________________________________________
```

### 動作確認結果

**airlink-schedule**:
- [ ] カレンダー表示: OK
- [ ] イベント作成: OK
- [ ] イベント編集: OK
- [ ] イベント削除: OK
- [ ] 特拡登録: OK
- [ ] データ復元: OK

**new-system-id68**:
- [ ] 正常に動作: OK
- [ ] データ表示: OK
- [ ] 機能動作: OK

### 問題・メモ
```
問題が発生した場合や気づいた点を記録:




```

---

## 📞 サポート情報

### 参考ドキュメント
- `ドキュメント/管理者パスワード.txt` - パスワード: airlink
- `ドキュメント/ファイル構成.md` - プロジェクト構成
- `SQLファイル/cleanup_and_add_constraint.sql` - SQL参考

### 作業時の注意
- **焦らず1つずつ確実に進める**
- **new-system-id68は絶対に触らない**
- **バックアップを必ず取る**
- **問題が発生したらすぐに記録**

---

## 🎉 作業完了後

### 確認事項
1. ✅ データ容量が1GBに分散された
2. ✅ airlink-scheduleが新しいSupabaseで動作
3. ✅ new-system-id68が引き続き動作
4. ✅ 両システムとも無料プランで運用可能

### 今後の運用
- 各システムは独立して500MBの容量を使用可能
- データのバックアップは定期的に実施を推奨
- 1週間問題なく動作したら、旧Supabaseのairlink-scheduleプロジェクトを削除可能

---

**作成者**: Claude Code
**最終更新**: 2025-10-02
**推定作業時間**: 30分-1時間
**難易度**: ⭐⭐☆☆☆（簡単）
