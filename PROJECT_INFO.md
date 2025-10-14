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
├── index.html                 # メインHTML
├── script.js                  # メインロジック (Supabase接続設定含む)
├── styles.css                 # スタイル（印刷用CSSを含む）
├── vercel.json                # Vercel設定
├── .gitignore                 # Git除外設定
├── PROJECT_INFO.md            # プロジェクト情報（このファイル）
├── supabaseアカウント情報.txt # Supabase接続情報
├── backups/                   # バックアップファイル
├── ドキュメント/               # 技術ドキュメント
│   ├── SQLファイル/           # テーブル作成SQL
│   └── 管理者パスワード.txt   # 管理者パスワード
├── テスト用/                   # テストツール（デバッグ用）
└── 開発用ツール/               # 開発支援ツール（SQL等）
```

---

## 主要機能

### 1. スケジュール管理
- カレンダー形式で予約・日程を表示
- 担当者別の色分け表示
- 地区別の色分け（東販連、東部、中央、城南、城北、多摩、埼玉、その他）
- 特拡（特別拡張）登録機能

### 2. データ同期
- **自動同期**: 10秒ごとにSupabaseと同期
- **手動保存**: ボタンクリックで即座に全端末に反映
- **ページ更新**: 🔄ボタンでページリロード

### 3. ボタンレイアウト
```
[担当者を設定] [特拡を登録] [🔄]
```
- モバイル対応の1行レイアウト
- 更新ボタンは赤色の丸形（50px × 50px）
- ホバー時に180度回転アニメーション

### 4. バックアップ・復元・印刷
- 📥 バックアップ: JSONファイルとしてダウンロード
- 📤 復元: パスワード保護（airlink）
- 🖨️ 印刷: A4横向きで全担当者の日程を1ページに印刷

---

## 同期設定
- **同期間隔**: 10秒
- **同期方式**: 全データ取得 + JSON比較
- **手動保存**: script.js の manualSaveNow() 関数
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

---

## 最近の更新

### 2025年10月14日
- ✅ A4印刷機能追加（全担当者の日程が1ページに収まる）
- ✅ 印刷ボタンを復元ボタンの横に配置
- ✅ Flexboxレイアウトで印刷時の表示を最適化

### 2025年10月8日
- ✅ 手動保存ボタン追加（即座に全端末に反映）
- ✅ ページ更新ボタン追加（🔄リフレッシュ）
- ✅ 3つのボタンを1行に配置（モバイル対応）
- ✅ プロジェクト整理・ドキュメント化
- ✅ 新しいSupabaseアカウントに移行（容量分散）
- ✅ モバイルでの特拡表示を修正

---

最終更新: 2025年10月14日
