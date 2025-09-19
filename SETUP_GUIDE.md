# 日程管理システム - Supabase連携設定ガイド

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてアカウントを作成
2. 「Start your project」をクリック
3. 新規プロジェクトを作成：
   - **Project name**: `schedule-system`（任意）
   - **Database Password**: 強力なパスワードを設定
   - **Region**: `Northeast Asia (Tokyo)` を選択

### 2. データベーステーブルの作成

1. Supabaseダッシュボードの「SQL Editor」を開く
2. 「SUPABASE_SETUP.md」ファイルに記載されているSQL文を実行：
   - スタッフメンバーテーブル
   - イベントテーブル
   - 特拡メモテーブル
   - トリガーとインデックス
   - Row Level Security (RLS) ポリシー

### 3. APIキーの取得と設定

1. Supabaseダッシュボードで「Settings」→「API」を開く
2. 以下の情報をコピー：
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

3. `supabase-client.js`ファイルを編集して、取得した情報を設定：

```javascript
// supabase-client.js の6-7行目を編集
this.SUPABASE_URL = 'https://あなたのプロジェクト.supabase.co';
this.SUPABASE_ANON_KEY = 'あなたのAnonキー';
```

### 4. リアルタイム同期の有効化

1. Supabaseダッシュボードで「Database」→「Replication」を開く
2. 「Enable Replication」をクリック
3. 以下のテーブルでリアルタイムを有効化：
   - ✅ `events`
   - ✅ `staff_members`
   - ✅ `campaign_memos`

### 5. 動作確認

1. ブラウザで`index.html`を開く
2. ブラウザのコンソール（F12）を確認
3. 以下のメッセージが表示されれば成功：
   - `Supabase: 接続しました`
   - `Supabase: 初期データを読み込みました`

## 使用方法

### データの同期

設定が完了すると、以下が自動的に行われます：

- **自動保存**: 入力したデータが自動的にクラウドに保存
- **リアルタイム同期**: PC・スマートフォン間でデータが即座に同期
- **オフライン対応**: ネットワークが切れてもローカルストレージで動作継続

### 複数デバイスでの使用

1. 同じSupabaseプロジェクトのAPIキーを設定
2. 各デバイスでindex.htmlを開く
3. データが自動的に同期される

## トラブルシューティング

### データが同期されない場合

1. **APIキーの確認**：
   - `supabase-client.js`のURLとキーが正しいか確認
   - 余計なスペースが入っていないか確認

2. **ネットワーク接続**：
   - インターネット接続を確認
   - ファイアウォールやプロキシの設定を確認

3. **ブラウザコンソール**：
   - F12でコンソールを開いてエラーメッセージを確認
   - 赤色のエラーメッセージがある場合は内容を確認

### ローカルモードで使用したい場合

Supabaseを使わずにローカルストレージのみで使用する場合：
- `supabase-client.js`のAPIキーを設定しない（デフォルトのまま）
- `Supabase: ローカルストレージモードで動作します`と表示される

## セキュリティに関する注意

- **APIキーの管理**: 公開リポジトリにアップロードする場合は、APIキーを含めない
- **本番環境**: 本番環境では適切な認証とRow Level Securityを設定
- **バックアップ**: 重要なデータは定期的にバックアップを取る

## サポート

問題が解決しない場合は、以下を確認：
- [Supabase Documentation](https://supabase.com/docs)
- ブラウザのコンソールログ
- ネットワークタブでAPIリクエストの状態を確認