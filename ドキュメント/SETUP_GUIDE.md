# 日程管理システム - セットアップガイド

## 複数端末からのアクセス設定

### 1. Supabaseの権限設定

Supabaseダッシュボードにログインして、以下の手順で権限を設定してください：

1. [Supabaseダッシュボード](https://app.supabase.com)にアクセス
2. プロジェクト「igjkroqjhwhewtrprhds」を選択
3. 左メニューから「SQL Editor」をクリック
4. 以下のSQLを実行：

```sql
-- RLSを有効化
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（エラーが出ても問題ありません）
DROP POLICY IF EXISTS "Enable all operations for global_user" ON schedule_events;
DROP POLICY IF EXISTS "Enable all operations for global_user" ON staff_members;

-- 新しいポリシーを作成
CREATE POLICY "Enable all operations for global_user" ON schedule_events
    FOR ALL
    USING (user_id = 'global_user')
    WITH CHECK (user_id = 'global_user');

CREATE POLICY "Enable all operations for global_user" ON staff_members
    FOR ALL
    USING (user_id = 'global_user')
    WITH CHECK (user_id = 'global_user');
```

### 2. 動作確認

#### PCでの確認
1. https://airlink-schedule.vercel.app にアクセス
2. F12キーで開発者ツールを開く
3. Consoleタブで「同期完了」メッセージを確認
4. 担当者名を入力してテスト

#### モバイルでの確認
1. スマートフォンで https://airlink-schedule.vercel.app にアクセス
2. キャッシュをクリア（重要）
   - Safari: 設定 > Safari > 履歴とWebサイトデータを消去
   - Chrome: メニュー > 履歴 > 閲覧履歴データを削除
3. ページを再読み込み
4. 日程入力をテスト

### 3. トラブルシューティング

#### データが同期されない場合
1. ブラウザのキャッシュをクリア
2. ページを強制リロード（Ctrl+F5 または Cmd+Shift+R）
3. 5秒待って自動同期を確認

#### モバイルから入力できない場合
1. JavaScriptが有効になっているか確認
2. プライベートブラウジングモードではないか確認
3. ネットワーク接続を確認

#### エラーが表示される場合
1. ブラウザのコンソールでエラーメッセージを確認
2. 「同期エラー」が表示される場合は、Supabaseの権限設定を再確認

### 4. データの仕組み

- **ユーザーID**: 全端末で「global_user」を使用（共有アカウント）
- **同期間隔**: 5秒ごとに自動同期
- **データ保存**:
  - LocalStorage（ローカルキャッシュ）
  - Supabase（クラウド保存）
- **優先順位**: Supabaseのデータが常に優先される

### 5. 注意事項

- パスワード保護はありません（誰でもアクセス可能）
- 全ユーザーがデータを共有します
- 同時編集時は最後の保存が有効になります
- 大量のデータ入力は避けてください（無料プランの制限）

### 6. サポート

問題が発生した場合：
1. キャッシュクリア
2. ページ再読み込み
3. 5分待って再度アクセス
4. それでも解決しない場合は、ブラウザを変更してテスト