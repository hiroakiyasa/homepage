# マイグレーション実行ガイド

## 📋 準備完了

Phase 1のデータベーススキーマ、RLS、トリガーが準備できました。
以下の手順でSupabaseプロジェクトにマイグレーションを適用します。

## 🚀 実行方法: Supabase Dashboard（推奨）

### ステップ1: SQL Editorを開く

以下のURLにアクセスしてください:
```
https://supabase.com/dashboard/project/jhqnypyxrkwdrgutzttf/sql
```

### ステップ2: マイグレーションSQLをコピー

`supabase/migrations/all_migrations.sql` ファイルの内容を全てコピーしてください。

または、ターミナルで以下を実行してクリップボードにコピー:
```bash
# macOS
cat supabase/migrations/all_migrations.sql | pbcopy

# または手動でファイルを開く
open supabase/migrations/all_migrations.sql
```

### ステップ3: SQL Editorに貼り付けて実行

1. Supabase DashboardのSQL Editorに貼り付け
2. 右下の **「Run」** ボタンをクリック
3. 実行完了を待つ（数秒で完了します）

### ステップ4: 実行結果を確認

成功すると、以下のメッセージが表示されます:
- Extensions enabled
- Tables created
- Triggers created
- RLS enabled
- Policies created

## 📊 実行内容の詳細

### マイグレーション001: 拡張機能
- ✅ `uuid-ossp` - UUID生成
- ✅ `postgis` - 地理空間データ

### マイグレーション002: テーブル作成
- ✅ `profiles` - ユーザープロフィール
- ✅ `regions` - 地域マスタ (808地域)
- ✅ `parking_spots` - 駐車場情報
- ✅ `restaurants` - レストラン情報
- ✅ `likes` - いいね統合テーブル
- ✅ `comments` - コメント

### マイグレーション003: トリガー
- ✅ いいね数自動更新
- ✅ コメント数自動更新
- ✅ Realtime Broadcast統合

### マイグレーション004: RLS
- ✅ すべてのテーブルでRLS有効化
- ✅ 認証・匿名ユーザー対応ポリシー
- ✅ パフォーマンス最適化

## 🧪 テストデータ投入（オプション）

マイグレーション実行後、テストデータを投入する場合:

1. Supabase DashboardのSQL Editorで新しいクエリを開く
2. `supabase/seed.sql` の内容をコピー＆ペースト
3. 実行

テストデータには以下が含まれます:
- 3地域（あおば通、仙台駅、京都駅）
- 3駐車場
- 3レストラン

## ✅ 確認方法

### 1. テーブルが作成されたか確認

Supabase Dashboard → Database → Tables で以下を確認:
- ✅ profiles
- ✅ regions
- ✅ parking_spots
- ✅ restaurants
- ✅ likes
- ✅ comments

### 2. RLSが有効化されているか確認

各テーブルの右側に **🔒 RLS enabled** マークが表示されているか確認

### 3. ポリシーが作成されているか確認

各テーブルをクリック → **Policies** タブで以下を確認:
- ✅ profiles: 2ポリシー
- ✅ regions: 1ポリシー
- ✅ parking_spots: 1ポリシー
- ✅ restaurants: 1ポリシー
- ✅ likes: 4ポリシー
- ✅ comments: 4ポリシー

### 4. トリガーが作成されているか確認

Supabase Dashboard → Database → Functions で以下を確認:
- ✅ handle_updated_at()
- ✅ handle_new_user()
- ✅ update_like_count()
- ✅ update_comment_count()
- ✅ broadcast_like_changes()
- ✅ broadcast_comment_changes()

## 🐛 トラブルシューティング

### エラー: "extension ... already exists"

**原因**: 拡張機能が既に有効になっている
**対処**: 問題ありません。次に進んでください。

### エラー: "relation ... already exists"

**原因**: テーブルが既に存在する
**対処**: 既存のテーブルを削除するか、マイグレーションをスキップ

既存テーブルを削除する場合:
```sql
-- 警告: すべてのデータが削除されます
drop table if exists public.comments cascade;
drop table if exists public.likes cascade;
drop table if exists public.restaurants cascade;
drop table if exists public.parking_spots cascade;
drop table if exists public.regions cascade;
drop table if exists public.profiles cascade;
```

### エラー: "permission denied"

**原因**: 実行権限がない
**対処**: Supabase Dashboardでログインしているユーザーが管理者権限を持っているか確認

## 🎯 次のステップ

マイグレーションが完了したら:

1. ✅ **Phase 1完了**: データベース基盤構築
2. ➡️ **Phase 2開始**: 認証システム構築
   - Google OAuth設定
   - 認証UIコンポーネント作成
   - FingerprintJS統合

詳細は `IMPLEMENTATION_SCHEME.md` を参照してください。

## 📞 サポート

問題が発生した場合:
1. エラーメッセージをコピー
2. `PHASE1_COMPLETE.md`の検証項目を確認
3. 必要に応じてマイグレーションを再実行

---

**プロジェクト**: camping-spot-publisher
**Phase**: 1 - Database Foundation
**Last Updated**: 2025-10-25
