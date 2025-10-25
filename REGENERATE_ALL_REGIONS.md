# 340地域すべてを再生成する手順

## 📋 実行前の準備

このコマンドは340地域すべてのHTMLページを再生成します。
データの欠損やエラーをチェックしながら実行します。

## 🚀 実行方法

### 方法1: 別ターミナルで実行（推奨）

1. **新しいターミナルを開く**
   ```bash
   # macOSの場合：Cmd + N で新しいターミナルウィンドウを開く
   ```

2. **ディレクトリに移動**
   ```bash
   cd /Users/user/WebApp/camping_note/camping-spot-publisher
   ```

3. **スクリプトを実行**
   ```bash
   node generate-all-regions-full.js 2>&1 | tee regenerate-$(date +%Y%m%d-%H%M%S).log
   ```

   - `2>&1`: エラーメッセージも含めてすべて出力
   - `| tee`: 画面に表示しながらログファイルに保存
   - `regenerate-YYYYMMDD-HHMMSS.log`: タイムスタンプ付きログファイル

### 方法2: バックグラウンドで実行

長時間実行する場合は、バックグラウンドで実行することもできます：

```bash
cd /Users/user/WebApp/camping_note/camping-spot-publisher
nohup node generate-all-regions-full.js > regenerate-$(date +%Y%m%d-%H%M%S).log 2>&1 &
```

実行状況を確認：
```bash
tail -f regenerate-*.log
```

## 📊 実行中の確認事項

スクリプトは以下を自動でチェックします：

1. **駐車場データの取得**
   - ✅ 駐車場データが見つかった地域
   - ⚠️ 駐車場データが見つからない地域（スキップ）

2. **周辺施設データ**
   - コンビニ情報
   - トイレ情報
   - 温泉情報
   - レストラン情報

3. **プログレスバー**
   ```
   [████████████████░░░░░░] 70% (250/340) 横浜
   ```
   - 現在の進捗状況
   - 処理中の地域名

## 📁 出力先

生成されたファイルは以下に保存されます：

```
/Users/user/WebApp/camping_note/camping-spot-publisher/data/regions/
├── 地域名.html          (詳細ページ)
├── 地域名-map.html      (マップページ)
...
```

## ⏱️ 実行時間の目安

- **340地域すべて**: 約30-60分
- 1地域あたり約5-10秒

## 🔍 エラーチェック

実行後、ログファイルでエラーをチェック：

```bash
# エラーがあるかチェック
grep "⚠" regenerate-*.log

# スキップされた地域をチェック
grep "スキップ" regenerate-*.log

# 完了を確認
tail regenerate-*.log
```

## ✅ 実行後の確認

1. **生成されたファイル数を確認**
   ```bash
   cd /Users/user/WebApp/camping_note/camping-spot-publisher/data/regions
   ls -1 *.html | grep -v '\-map\.html$' | wc -l
   ```
   → 340未満の場合、一部の地域が生成されていません

2. **デプロイディレクトリにコピー**
   ```bash
   cp -r /Users/user/WebApp/camping_note/camping-spot-publisher/data/* /Users/user/WebApp/homepage/camping_note/
   ```

3. **変更をコミット・プッシュ**
   ```bash
   cd /Users/user/WebApp/homepage
   git add camping_note/
   git commit -m "340地域を再生成（駐車料金注意喚起追加）"
   git push origin master
   ```

## 🛑 実行を停止する場合

実行中のプロセスを停止：
```bash
# フォアグラウンドの場合: Ctrl + C

# バックグラウンドの場合:
ps aux | grep generate-all-regions-full
kill <PID>
```

## 📝 ログファイルの確認

生成されたログファイルを確認：
```bash
# 最新のログファイルを確認
ls -lt regenerate-*.log | head -1

# ログファイルの内容を確認
less regenerate-YYYYMMDD-HHMMSS.log
```

## 💡 トラブルシューティング

### エラー: "ECONNREFUSED"
→ Supabaseへの接続エラー。ネット接続を確認してください。

### エラー: "メモリ不足"
→ Node.jsのメモリを増やして実行：
```bash
NODE_OPTIONS="--max-old-space-size=4096" node generate-all-regions-full.js
```

### 一部の地域だけ再生成したい場合
スクリプトを修正して特定の地域のみを処理できます。
