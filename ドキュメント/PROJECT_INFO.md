# 📅 日程管理システム プロジェクト情報

最終更新: 2025年1月23日

## 🌐 アクセス情報

### オンラインURL
**https://airlink-schedule.vercel.app**

- PC、スマートフォン、タブレットからアクセス可能
- 全端末でリアルタイム同期（5秒ごと）
- ログイン不要

### ローカルアクセス
`C:\Users\user\OneDrive\デスクトップ\日程システム\index.html`

---

## 🔧 技術仕様

### データベース（Supabase）
- **プロジェクトID**: igjkroqjhwhewtrprhds
- **URL**: https://igjkroqjhwhewtrprhds.supabase.co
- **APIキー**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnamtyb3FqaHdoZXd0cnByaGRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTQ5ODEsImV4cCI6MjA3MzgzMDk4MX0.7pD4mWSbr8FvGKIjkNSrQuLdUPISxayZGANZ27TuqzI`

### ホスティング（Vercel）
- **プロジェクト名**: airlink-schedule
- **デプロイURL**: https://airlink-schedule.vercel.app
- **自動デプロイ**: GitHubプッシュ時

### ソース管理（GitHub）
- **リポジトリ**: airlink0917/airlink-
- **ブランチ**: main

---

## 📊 データベース構造

### テーブル: schedule_events
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | BIGSERIAL | 主キー |
| event_id | VARCHAR | イベント識別子 |
| user_id | VARCHAR | ユーザーID（global_user） |
| title | VARCHAR | イベントタイトル |
| date | DATE | 日付 |
| time | VARCHAR | 時刻 |
| person | VARCHAR | 担当者 |
| description | TEXT | 詳細 |
| color | VARCHAR | 色 |
| note | TEXT | 備考 |
| is_campaign | BOOLEAN | 特拡フラグ |
| campaign_members | TEXT[] | 参加メンバー |

### テーブル: staff_members
| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | BIGSERIAL | 主キー |
| user_id | VARCHAR | ユーザーID（global_user） |
| staff_index | INTEGER | スタッフ位置 |
| name | VARCHAR | スタッフ名 |

---

## 🚀 同期システム

### 仕組み
- **共通ユーザーID**: `global_user`を全端末で使用
- **自動同期**: 5秒ごとにデータベースと同期
- **リアルタイム更新**: 変更は自動的に全端末に反映

### ファイル構成
```
simple_sync_fix.js  # 同期システム（メイン）
script.js          # アプリケーションロジック
styles.css         # スタイル
index.html         # メインHTML
```

---

## 📱 機能一覧

### 基本機能
- 9〜20人の担当者管理
- 日程の登録・編集・削除
- 色分け表示（8色）
- 備考機能

### 特拡（特別拡張作戦）機能
- 7種類の特拡タイプ
- 参加メンバー管理
- 一括選択機能

### モバイル対応
- レスポンシブデザイン
- iOS/Android最適化
- タッチ操作対応

---

## 🛠 メンテナンス

### 更新方法
1. ファイルを編集
2. `git add .`
3. `git commit -m "更新内容"`
4. `git push`
5. Vercelが自動デプロイ

### バックアップ
- ローカルストレージに自動保存
- Supabaseにクラウド保存
- 定期的なエクスポート推奨

---

## ⚠️ 注意事項

- パスワード保護なし（誰でもアクセス可能）
- データは全ユーザー共有
- 無料プランの制限あり（Supabase/Vercel）

---

## 📞 サポート

問題が発生した場合：
1. ブラウザのキャッシュをクリア
2. ページを再読み込み（Ctrl+F5）
3. それでも解決しない場合はファイルを確認