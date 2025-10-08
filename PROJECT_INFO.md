# 日程管理システム (airlink-schedule)

## プロジェクト概要
予約・スケジュール管理システム
複数端末でリアルタイム同期可能

---

## 重要な接続情報

### GitHub リポジトリ
- **URL**: https://github.com/airlink0917/airlink-.git
- **ブランチ**: main

### Vercel デプロイメント
- **プロジェクト名**: airlink-schedule
- **自動デプロイ**: main ブランチへのpush時に自動デプロイ

### Supabase 設定
- **プロジェクト名**: airlink-schedule
- **Project URL**: https://vcbkuurfvwtwapqxrklc.supabase.co
- **リージョン**: Tokyo (ap-northeast-1)
- **Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjYmt1dXJmdnd0d2FwcXhya2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjY3ODAsImV4cCI6MjA3NTQ0Mjc4MH0.g0rstC6tArVZqqavOzB4dmqqdDZ-MLMmnNP8yzPV3NM
- **User ID**: global_user (全端末共通)

#### データベーステーブル
1. **schedule_events** - イベント/予約データ
2. **staff_members** - スタッフ情報

---

## 主要ファイル構成

```
日程システム/
├── index.html          # メインHTML
├── script.js           # メインロジック (Supabase接続設定含む)
├── styles.css          # スタイル
├── vercel.json         # Vercel設定
├── .gitignore          # Git除外設定
├── PROJECT_INFO.md     # このファイル
├── backups/            # バックアップファイル
├── ドキュメント/        # 技術ドキュメント・手順書
│   ├── SQLファイル/    # テーブル作成SQL
│   └── 次回作業_*.md   # 作業手順メモ
├── テスト用/            # テストツール
└── 開発用ツール/        # 開発支援ツール
```

---

## 同期設定
- **同期間隔**: 10秒
- **同期方式**: 全データ取得 + JSON比較
- **RLS (Row Level Security)**: 有効（全ユーザーアクセス可能）

---

## 次回作業時の手順

### 1. プロジェクトを開く
```bash
cd "C:\Users\user\OneDrive\デスクトップ\日程システム"
```

### 2. 最新コードを取得
```bash
git pull
```

### 3. 変更を確認
```bash
git status
```

### 4. 開発サーバーで確認
ブラウザで `index.html` を開くか、Vercelデプロイ済みURLにアクセス

### 5. 変更をコミット・デプロイ
```bash
git add .
git commit -m "変更内容の説明"
git push
```
→ Vercelが自動デプロイ

---

## トラブルシューティング

### Supabase接続エラー
1. ブラウザのコンソールでエラー確認
2. script.js の SUPABASE_URL と SUPABASE_KEY を確認
3. Supabaseプロジェクトが稼働中か確認

### 同期が遅い場合
- script.js の SYNC_INTERVAL (現在10秒) を調整可能

### データが消えた場合
1. backups/ フォルダを確認
2. Supabase ダッシュボードでデータ確認
3. ブラウザのローカルストレージ確認

---

## 重要な注意事項
- **容量制限**: Supabase無料プラン 500MB
- **帯域制限**: 月5GB転送まで
- **バックアップ**: 定期的にbackups/フォルダに保存推奨
- **認証**: 現在は全ユーザーが同じデータにアクセス可能
